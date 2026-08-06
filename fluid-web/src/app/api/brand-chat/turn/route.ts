import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { streamActivity } from "@/lib/sse";
import { hasTokens, spendTokens, TOKEN_COST } from "@/lib/credits";
import { applyAnswer } from "@/lib/brand-chat/answer";
import { brandContextPatch, readBrandContext } from "@/lib/brand-chat/context";
import { getStep, nextStep, flowSteps, type WidgetKind } from "@/lib/brand-chat/flow";
import { renderStep, stepGenerates } from "@/lib/brand-chat/step";
import { silentActivity, type Activity } from "@/lib/ai/activity";

export const runtime = "nodejs";
export const maxDuration = 300;

// POST /api/brand-chat/turn — advance the conversation by one step.
//
// Body: { brandId, step?, value? }
//   • no `step`     — open (or resume) the thread; returns the first unanswered
//                     step. Costs nothing.
//   • step + value  — record that answer, then return whatever comes next.
//
// The answer is persisted BEFORE the next step is generated. Generation is the
// slow, failure-prone half of the turn: if it dies, the user's answer is
// already saved and retrying resumes rather than re-asking.
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
  };
  const brandId = typeof body.brandId === "string" ? body.brandId : "";
  const answeredKey = typeof body.step === "string" ? body.step : "";
  if (!brandId) {
    return NextResponse.json({ error: "Missing brandId." }, { status: 400 });
  }
  if (answeredKey && !getStep(answeredKey)) {
    return NextResponse.json({ error: "Unknown step." }, { status: 400 });
  }

  // RLS scopes this to the caller's own brands, so a miss is "not yours or not
  // there" and the 404 is correct either way.
  const { data: brand, error: loadError } = await supabase
    .from("brands")
    .select("id, data")
    .eq("id", brandId)
    .maybeSingle();
  if (loadError) {
    return NextResponse.json({ error: loadError.message }, { status: 500 });
  }
  if (!brand) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }

  let context = readBrandContext(brand.data);

  // Record the answer first — see the note above about ordering.
  if (answeredKey) {
    try {
      context = applyAnswer(answeredKey as WidgetKind, body.value, context);
    } catch (err) {
      return NextResponse.json(
        { error: err instanceof Error ? err.message : "That answer could not be read." },
        { status: 400 },
      );
    }
    const { error: saveError } = await supabase.rpc("brands_merge_data", {
      p_id: brandId,
      p_patch: brandContextPatch(context),
    });

    // The brief and the name are the brand's own columns, not chat state:
    // the Brands list, the brand cards and the older inline assists all read
    // them. A brand built here should look like any other, so they are
    // mirrored across rather than left to say "Untitled brand" forever.
    if (!saveError && (answeredKey === "brief" || answeredKey === "name")) {
      const column = answeredKey === "brief" ? { brief: context.brief } : { name: context.name };
      const { error: mirrorError } = await supabase
        .from("brands")
        .update(column)
        .eq("id", brandId);
      // Not fatal: the answer itself is stored, and the thread reads the
      // context, not the column. Losing the mirror costs a nice list entry.
      if (mirrorError) {
        console.error(`Could not mirror ${answeredKey} to its column:`, mirrorError.message);
      }
    }

    if (saveError) {
      // Refusing here is deliberate. Generating the next question against an
      // answer that was not stored would produce work the brand cannot keep.
      return NextResponse.json(
        { error: `Your answer could not be saved: ${saveError.message}` },
        { status: 500 },
      );
    }
  }

  const step = answeredKey
    ? nextStep(context.path, answeredKey)
    : firstUnanswered(context);

  // The context travels back with every turn. A thread resumed in a new tab
  // has to repopulate its widgets from something, and re-deriving it on the
  // client from the message history would be a second source of truth.
  const state = context;

  // The end of a thread is a normal outcome, not an error: a single-job flow
  // finishes where its job finishes.
  if (!step) {
    return NextResponse.json({ done: true, step: null, context: state });
  }

  const billable = stepGenerates(step, context);
  if (billable) {
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
  }

  // A step with nothing to generate is a plain JSON reply. Opening a stream to
  // send one object would make every chip question wait on a stream setup it
  // has no use for.
  if (!billable) {
    return NextResponse.json({
      done: false,
      context: state,
      step: await renderStep(step, context, silentActivity, brandId),
    });
  }

  return streamActivity(
    async (activity: Activity) => {
      activity.emit("note", `Working on: ${step.key}`);
      const rendered = await renderStep(step, context, activity, brandId);
      await spendTokens(user.id, TOKEN_COST.asset);

      // Six image renders are the most expensive thing in this flow. Keeping
      // the set means a step backwards and forwards again is free, and a
      // reload does not redraw what the client already paid for.
      if (rendered.payload.kind === "logo") {
        const logo = rendered.payload.logo;
        const withSet = {
          ...context,
          logoSet: logo,
          // Persist the skill-native brief as its own field so later skills
          // and reloads see the same document Claude would have written.
          visualIdentityBrief: logo.visualIdentityBrief,
          visualIdentityBriefKey: logo.key,
        };
        const { error } = await supabase.rpc("brands_merge_data", {
          p_id: brandId,
          p_patch: brandContextPatch(withSet),
        });
        if (error) {
          // The marks are rendered and on screen either way; only the saving
          // failed, so this warns rather than throwing the run away.
          console.error("Could not cache the mark set:", error.message);
          activity.emit("warn", "The marks were drawn but could not be saved for next time.");
        } else {
          return { done: false, context: withSet, step: rendered };
        }
      }
      return { done: false, context: state, step: rendered };
    },
    {
      onError: (err) => ({
        message: err instanceof Error ? err.message : "That step could not be generated.",
      }),
    },
  );
}

/**
 * Where to resume a thread.
 *
 * Derived from the context rather than stored, so a brand that was edited
 * elsewhere — or whose flow changed shape between releases — resumes at the
 * first thing it genuinely does not know instead of at a remembered index
 * that may no longer point anywhere sensible.
 */
function firstUnanswered(context: ReturnType<typeof readBrandContext>) {
  const steps = flowSteps(context.path);
  const answered: Record<string, boolean> = {
    path: !!context.path,
    brief: !!context.brief,
    category: !!context.category,
    stage: !!context.stage,
    audience: !!context.audience?.length,
    problem: !!context.problem,
    competitors: !!context.competitors?.length,
    position: !!context.position,
    differentiator: context.differentiator !== undefined,
    personality: !!context.personality,
    values: !!context.values?.length,
    goal: !!context.goal,
    name: !!context.name,
    direction: !!context.direction,
    avoid: !!context.avoid,
    logoType: !!context.logoType,
    logo: !!context.logo,
    voice: !!context.voice,
    tagline: !!context.tagline,
    launch: !!context.launchTiming,
  };
  // `kit` produces a document rather than a context field, so it is never
  // "answered" — a resumed thread stops there.
  return steps.find((s) => !answered[s.key]) ?? null;
}
