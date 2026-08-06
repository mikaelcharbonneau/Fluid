import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { styleContext } from "@/lib/ai/step2";
import { getPlatform, type CreativePlatform } from "@/lib/ai/platform";
import type { BoardSketch } from "@/lib/ai/sketch-board";
import {
  generateLogoFinalists,
  PLAN_VERSION,
  type FinalistPlan,
  type RefinableSketch,
} from "@/lib/ai/refine";
import { parseVersions, sameVersions } from "@/lib/logo-refine";
import { hasTokens, spendTokens, TOKEN_COST } from "@/lib/credits";
import { chosenBrandName } from "@/lib/brands";
import { getLogoConfig } from "@/lib/logo-styles";
import { startClock } from "@/lib/ai/budget";
import { streamActivity } from "@/lib/sse";
import type { Activity } from "@/lib/ai/activity";

export const runtime = "nodejs";
export const maxDuration = 300;

// The standalone logo flow deliberately skips the old research/platform phase.
// Refinement still benefits from a stable brand idea, but it must not block a
// real board simply because that legacy record was never created.
function refinementPlatform(
  stored: CreativePlatform | null,
  brief: string,
): CreativePlatform {
  if (stored) return stored;
  return {
    brand_idea: brief.trim(),
    personality: [],
    territories: [],
    design_notes: "Develop the selected concept faithfully; do not introduce a new logo direction.",
  };
}

// POST /api/generate/logo/refine — Phase 2 of the logo studio: develop ONE
// chosen concept into the versions the client briefed, each in the colours
// they specified, then run the creative-director critique for the notes.
// Body: { brandId: string, conceptId: string, versions: [{ colors: string[] }] }.
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
    conceptId?: unknown;
    versions?: unknown;
  };
  const brandId = typeof body.brandId === "string" ? body.brandId : "";
  const conceptId = typeof body.conceptId === "string" ? body.conceptId : "";
  if (!brandId) {
    return NextResponse.json({ error: "Missing brandId." }, { status: 400 });
  }

  // Colours are the client's decision, so a malformed brief is refused rather
  // than repaired — inventing one would put a colour on their logo that they
  // never chose.
  const versions = parseVersions(body.versions);
  if (!versions) {
    return NextResponse.json(
      { error: "Choose how many versions you want and set the colours for each." },
      { status: 400 },
    );
  }

  const { data: brand, error: loadError } = await supabase
    .from("brands")
    .select("id, brief, name, name_choice, style_id, data")
    .eq("id", brandId)
    .maybeSingle();

  if (loadError) {
    return NextResponse.json({ error: loadError.message }, { status: 500 });
  }
  if (!brand) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }
  if (!String(brand.brief ?? "").trim()) {
    return NextResponse.json(
      { error: "Add a brief before refining logo concepts." },
      { status: 400 },
    );
  }

  const data = (brand.data as Record<string, unknown>) ?? {};
  const platform = refinementPlatform(getPlatform(data), String(brand.brief));

  // Concepts come from the board — the only place they have ever come from
  // since the wizard's own logo step became this same studio. The older
  // `logo_sketches` store went with it; no brand ever held one.
  const sketches: RefinableSketch[] = (data.logo_board as BoardSketch[] | undefined) ?? [];

  // Refinement develops exactly one concept. The request names it; a brand
  // whose brief was saved earlier falls back to that, and a single liked
  // concept is unambiguous enough to use on its own.
  const storedChoice = typeof data.logo_refine_concept === "string"
    ? data.logo_refine_concept
    : "";
  const storedLikes = (data.logo_board_likes as string[] | undefined) ?? [];
  const wantedId =
    conceptId || storedChoice || (storedLikes.length === 1 ? storedLikes[0] : "");
  const concept = sketches.find((s) => s.id === wantedId) ?? null;

  if (sketches.length === 0) {
    return NextResponse.json(
      { error: "Sketch concepts first, then refine the one you want." },
      { status: 400 },
    );
  }
  if (!concept) {
    return NextResponse.json(
      { error: "Choose the one concept you want refined." },
      { status: 400 },
    );
  }

  // A misconfigured server (a missing service-role key, say) makes this throw,
  // and an unhandled throw here is a bare 500 with no body — which the client
  // can only report as a generic failure. Name the cause instead.
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

  // Leave enough room below Vercel's 300s function limit to stream the final
  // result after a long image render has completed.
  const clock = startClock("logo/refine", 280_000);

  // A plan cached by an attempt that ran out of time rendering. Reusable only
  // when it answers the same brief — same concept, same versions, same colours,
  // same composition. Change any of those and the marks are designed again
  // rather than resumed into something the client did not ask for.
  const cachedPlan = data.logo_finalist_plan as FinalistPlan | undefined;
  const reusable =
    !!cachedPlan &&
    cachedPlan.v === PLAN_VERSION &&
    cachedPlan.concept_id === concept.id &&
    sameVersions(cachedPlan.versions ?? [], versions);
  const plan = reusable ? cachedPlan : null;

  return streamActivity(async (activity: Activity) => {
    activity.emit(
      "note",
      plan
        ? `Resuming "${concept.name}" from a cached plan — the thinking is already paid for`
        : `Developing "${concept.name}" into ${versions.length} version${versions.length === 1 ? "" : "s"}`,
      versions.map((v, i) => `Version ${i + 1}: ${v.colors.join(", ")}`).join("\n"),
    );
    const finalists = await generateLogoFinalists({
      brandId,
      brief: String(brand.brief),
      name: chosenBrandName(brand),
      platform,
      concept,
      versions,
      // refine.ts prints the creative platform itself via platformLines().
      styleContext: styleContext(brand, { omitPlatform: true }),
      config: getLogoConfig(data),
      clock,
      activity,
      plan,
      // Cached the moment the thinking is done, so a run killed while
      // rendering leaves something for the retry to start from.
      onPlan: async (next) => {
        const { error } = await supabase.rpc("brands_merge_data", {
          p_id: brandId,
          p_patch: { logo_finalist_plan: next },
        });
        if (error) console.error("Failed to cache the finalist plan:", error.message);
      },
    });

    await spendTokens(user.id, TOKEN_COST.asset);

    // Persist the finalists, remember the likes that produced them, and mirror
    // into data.logos so the Brand Kit (Step 5), export, and brand cards keep
    // working unchanged.
    const nextPatch = {
      logo_finalists: finalists,
      // The brief that produced them, so the screen can show what was asked
      // for and a later run can tell whether anything changed.
      logo_refine_concept: concept.id,
      logo_refine_versions: versions,
      // The marks are rendered, so the plan has nothing left to resume.
      logo_finalist_plan: null,
      logos: finalists.map((f) => ({
        name: f.name,
        descriptor: f.idea,
        svg: f.svg ?? "",
        image_url: f.image_url,
      })),
    };
    const { error: saveError } = await supabase.rpc("brands_merge_data", { p_id: brandId, p_patch: nextPatch });
    if (saveError) {
      console.error("Failed to cache logo finalists:", saveError.message);
      activity.emit("warn", `The marks rendered but could not be saved: ${saveError.message}`);
    } else {
      activity.emit("note", `Saved — ${finalists.length} finished mark${finalists.length === 1 ? "" : "s"}`);
    }

    return { finalists };
  }, {
    onError: (err) => ({
      message: err instanceof Error ? err.message : "Logo refinement failed.",
    }),
  });
}
