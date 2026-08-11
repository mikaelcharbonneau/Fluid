import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { streamActivity } from "@/lib/sse";
import { hasTokens, spendTokens, TOKEN_COST } from "@/lib/credits";
import { generateBrandKit } from "@/lib/brand-kit/generate";
import { generateStepDraft, inferStrategySignals } from "@/lib/brand-kit/draft";
import { generateLogoConcepts } from "@/lib/brand-kit/logo-concepts";
import { draftPatch, finalizeDraft, readDraft, type BrandKitDraft } from "@/lib/brand-kit/context";
import { applyAnswer, clearFrom, getStep, nextStep } from "@/lib/brand-kit/steps";
import type { Activity } from "@/lib/ai/activity";

export const runtime = "nodejs";
export const maxDuration = 300;

// POST /api/brand-kit/turn — advance the stepper by one step.
//
// Body: { brandId?, step?, value?, regenerate? }
//   • no `step`             — resume: returns whatever the draft's next
//                              unanswered step is (drafting it if the step
//                              is AI-drafted). Free if that step is user-only.
//   • step + value          — record that answer (creating the brand row on
//                              the first, "brief", step), clear anything
//                              drafted after it, then return what's next.
//   • step + regenerate     — re-draft the same step again without saving
//                              or advancing ("ask again").
//   • step:"review" + value — confirm: render the board from the fully
//                              confirmed draft. This is the one step that
//                              spends a full `asset` token, not `small`.
//
// The answer (or the render) is always saved/charged only after it
// succeeds — same ordering the old brand-chat used.
export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

  const body = (await request.json().catch(() => ({}))) as {
    brandId?: unknown;
    step?: unknown;
    value?: unknown;
    regenerate?: unknown;
  };
  const stepKey = typeof body.step === "string" ? body.step : "";
  const step = stepKey ? getStep(stepKey) : undefined;
  if (stepKey && !step) {
    return NextResponse.json({ error: "Unknown step." }, { status: 400 });
  }
  const regenerate = body.regenerate === true;
  let brandId = typeof body.brandId === "string" ? body.brandId : "";

  // ---- load or create the row, and land on the current draft -----------

  let draft: BrandKitDraft;

  if (step?.key === "brief" && !regenerate) {
    if (brandId) {
      const { data: brand, error: loadError } = await supabase
        .from("brands")
        .select("id, data")
        .eq("id", brandId)
        .maybeSingle();
      if (loadError) return NextResponse.json({ error: loadError.message }, { status: 500 });
      if (!brand) return NextResponse.json({ error: "Not found." }, { status: 404 });
      draft = readDraft(brand.data);
    } else {
      draft = {};
    }
    try {
      draft = clearFrom(applyAnswer("brief", body.value, draft), "brief");
    } catch (err) {
      return NextResponse.json(
        { error: err instanceof Error ? err.message : "That answer could not be read." },
        { status: 400 },
      );
    }

    if (brandId) {
      const { error: updateError } = await supabase
        .from("brands")
        .update({ name: draft.name, brief: draft.brief })
        .eq("id", brandId);
      if (updateError) return NextResponse.json({ error: updateError.message }, { status: 500 });
    } else {
      const { data: created, error: createError } = await supabase
        .from("brands")
        .insert({ name: draft.name, brief: draft.brief, status: "draft", user_id: user.id })
        .select("id")
        .single();
      if (createError || !created) {
        return NextResponse.json(
          { error: createError?.message ?? "Could not start a new brand." },
          { status: 500 },
        );
      }
      brandId = created.id;
    }

    const { error: saveError } = await supabase.rpc("brands_merge_data", {
      p_id: brandId,
      p_patch: draftPatch(draft),
    });
    if (saveError) {
      return NextResponse.json({ error: `Your answer could not be saved: ${saveError.message}` }, { status: 500 });
    }
  } else {
    if (!brandId) {
      return NextResponse.json({ error: "Missing brandId." }, { status: 400 });
    }
    const { data: brand, error: loadError } = await supabase
      .from("brands")
      .select("id, data")
      .eq("id", brandId)
      .maybeSingle();
    if (loadError) return NextResponse.json({ error: loadError.message }, { status: 500 });
    if (!brand) return NextResponse.json({ error: "Not found." }, { status: 404 });
    draft = readDraft(brand.data);

    if (step && step.key !== "review" && !regenerate) {
      try {
        draft = clearFrom(applyAnswer(step.key, body.value, draft), step.key);
      } catch (err) {
        return NextResponse.json(
          { error: err instanceof Error ? err.message : "That answer could not be read." },
          { status: 400 },
        );
      }
      const { error: saveError } = await supabase.rpc("brands_merge_data", {
        p_id: brandId,
        p_patch: draftPatch(draft),
      });
      if (saveError) {
        return NextResponse.json({ error: `Your answer could not be saved: ${saveError.message}` }, { status: 500 });
      }
    }
  }

  const finalBrandId = brandId;

  // emotionalPromise/culturalPosition/trustLevel aren't a chat step (see
  // steps.ts) — inferred silently, once, right after personality is
  // confirmed. A no-op once they're already set. Called at every point that
  // needs a complete draft so it's never possible to reach `review` without
  // them regardless of exactly which turn first crossed that threshold.
  const ensureStrategySignals = async (current: BrandKitDraft, activity: Activity): Promise<BrandKitDraft> => {
    if (!current.personality || current.culturalPosition) return current;
    const signals = await inferStrategySignals(current, activity);
    const next = { ...current, ...signals };
    const { error } = await supabase.rpc("brands_merge_data", {
      p_id: finalBrandId,
      p_patch: draftPatch(next),
    });
    if (error) activity.emit("warn", "Inferred brand signals could not be saved for next time.", error.message);
    return next;
  };

  // ---- confirm at review: render the board ------------------------------

  if (step?.key === "review" && !regenerate) {
    let affordable: boolean;
    try {
      affordable = await hasTokens(user.id, TOKEN_COST.asset);
    } catch (err) {
      return NextResponse.json(
        { error: err instanceof Error ? err.message : "Could not check your token balance." },
        { status: 500 },
      );
    }
    if (!affordable) {
      return NextResponse.json(
        { error: "You're out of tokens. Top up in Settings → Billing.", code: "no_tokens" },
        { status: 402 },
      );
    }

    return streamActivity(
      async (activity: Activity) => {
        const enrichedDraft = await ensureStrategySignals(draft, activity);
        let finalized: ReturnType<typeof finalizeDraft>;
        try {
          finalized = finalizeDraft(enrichedDraft);
        } catch (err) {
          throw err instanceof Error ? err : new Error("The brand isn't fully answered yet.");
        }
        const result = await generateBrandKit({
          brandId: finalBrandId,
          brief: finalized.brief,
          strategy: finalized.strategy,
          activity,
        });
        await spendTokens(user.id, TOKEN_COST.asset);

        const { error: saveError } = await supabase.rpc("brands_merge_data", {
          p_id: finalBrandId,
          p_patch: { brandkit: result, palette: { colors: result.strategy.palette } },
        });
        if (saveError) {
          activity.emit("warn", "The board was drawn but could not be saved for next time.", saveError.message);
        } else {
          await supabase.from("brands").update({ status: "live" }).eq("id", finalBrandId);
        }

        return { done: true, brandId: finalBrandId, brandkit: result };
      },
      { onError: (err) => ({ message: err instanceof Error ? err.message : "The board could not be generated." }) },
    );
  }

  // ---- regenerate: re-draft the current step, nothing saved -------------

  if (regenerate) {
    if (!step || !step.aiDrafted) {
      return NextResponse.json({ error: "That step has nothing to redraft." }, { status: 400 });
    }
    // logoConcepts is a full re-roll of all 6 renders, priced like the
    // initial draw rather than the cheap text-only `small` steps.
    const cost = step.key === "logoConcepts" ? TOKEN_COST.logoConcepts : TOKEN_COST.small;
    let affordable: boolean;
    try {
      affordable = await hasTokens(user.id, cost);
    } catch (err) {
      return NextResponse.json(
        { error: err instanceof Error ? err.message : "Could not check your token balance." },
        { status: 500 },
      );
    }
    if (!affordable) {
      return NextResponse.json(
        { error: "You're out of tokens. Top up in Settings → Billing.", code: "no_tokens" },
        { status: 402 },
      );
    }
    return streamActivity(
      async (activity: Activity) => {
        const enrichedDraft = await ensureStrategySignals(draft, activity);
        const proposed =
          step.key === "logoConcepts"
            ? { logoConcepts: await generateLogoConcepts(enrichedDraft, finalBrandId, activity) }
            : await generateStepDraft(step.key, enrichedDraft, activity);
        await spendTokens(user.id, cost);
        return { done: false, brandId: finalBrandId, step: step.key, draft: enrichedDraft, proposed };
      },
      { onError: (err) => ({ message: err instanceof Error ? err.message : "That step could not be redrafted." }) },
    );
  }

  // ---- otherwise: figure out and return what's next ----------------------

  const target = nextStep(draft);

  if (target.key === "review") {
    return NextResponse.json({ done: false, brandId: finalBrandId, step: target.key, draft, proposed: null });
  }

  if (!target.aiDrafted) {
    return NextResponse.json({ done: false, brandId: finalBrandId, step: target.key, draft, proposed: null });
  }

  // logoConcepts renders 6 images (plus a planning call) — priced and
  // generated differently from the cheap text-only `small` steps.
  const cost = target.key === "logoConcepts" ? TOKEN_COST.logoConcepts : TOKEN_COST.small;

  let affordable: boolean;
  try {
    affordable = await hasTokens(user.id, cost);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Could not check your token balance." },
      { status: 500 },
    );
  }
  if (!affordable) {
    return NextResponse.json(
      { error: "You're out of tokens. Top up in Settings → Billing.", code: "no_tokens" },
      { status: 402 },
    );
  }

  return streamActivity(
    async (activity: Activity) => {
      const enrichedDraft = await ensureStrategySignals(draft, activity);
      const proposed =
        target.key === "logoConcepts"
          ? { logoConcepts: await generateLogoConcepts(enrichedDraft, finalBrandId, activity) }
          : await generateStepDraft(target.key, enrichedDraft, activity);
      await spendTokens(user.id, cost);
      return { done: false, brandId: finalBrandId, step: target.key, draft: enrichedDraft, proposed };
    },
    { onError: (err) => ({ message: err instanceof Error ? err.message : "That step could not be generated." }) },
  );
}
