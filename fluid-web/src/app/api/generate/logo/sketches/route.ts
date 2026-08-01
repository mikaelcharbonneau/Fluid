import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { styleContext, delegatedChoices } from "@/lib/ai/step2";
import { researchCategory, getResearch } from "@/lib/ai/research";
import { generateCreativePlatform, getPlatform } from "@/lib/ai/platform";
import { generateLogoSketches, type LogoSketch } from "@/lib/ai/sketches";
import { hasTokens, spendTokens, TOKEN_COST } from "@/lib/credits";
import { chosenBrandName } from "@/lib/brands";
import { startClock } from "@/lib/ai/budget";
import {
  readAxes,
  type ReferenceTaste,
  type LogoReferenceRow,
} from "@/lib/logo-reference-query";
import {
  type LogoConfig,
  markTypeById,
  designStyleById,
  normalizeMarkTypes,
  normalizeStandaloneStyles,
  selectionForAttempt,
  logoConfigSignature,
} from "@/lib/logo-styles";

export const runtime = "nodejs";
export const maxDuration = 300;

// Step 4 records which catalogued references the client liked and disliked.
// Look those rows up and reduce them to a taste signal for the generator.
//
// Best-effort: the reference gallery is an aid, so a failure here must not
// stop a concept being drawn — it just means one less hint.
async function loadReferenceTaste(
  supabase: Awaited<ReturnType<typeof createClient>>,
  data: Record<string, unknown>,
): Promise<ReferenceTaste | null> {
  const ids = (key: string) =>
    Array.isArray(data[key]) ? (data[key] as unknown[]).filter((x): x is string => typeof x === "string") : [];
  const likedPaths = ids("logo_reference_likes");
  const dislikedPaths = ids("logo_reference_dislikes");
  if (!likedPaths.length && !dislikedPaths.length) return null;

  try {
    const { data: rows } = await supabase
      .from("logo_references")
      .select("name, mark_type, image_path, attributes, industry, sort_order, aspect_ratio, refinement")
      .in("image_path", [...likedPaths, ...dislikedPaths]);
    const all = (rows ?? []) as LogoReferenceRow[];
    if (!all.length) return null;

    const taste = readAxes(
      all.filter((r) => likedPaths.includes(r.image_path)),
      all.filter((r) => dislikedPaths.includes(r.image_path)),
    );
    return taste.axes.length ? taste : null;
  } catch {
    return null;
  }
}

// POST /api/generate/logo/sketches — Phase 1 of the logo studio: generate the
// creative platform (once, cached) and ONE low-fidelity concept sketch. Body:
// { brandId: string, likedIds?: string[], reset?: boolean } — likedIds bias
// the concept toward the client's demonstrated taste; reset starts a fresh
// board (used when the client just changed the Step 4 brief) instead of
// adding the new concept to the existing one.
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
    likedIds?: unknown;
    config?: unknown;
    reset?: unknown;
  };
  const brandId = typeof body.brandId === "string" ? body.brandId : "";
  const likedIds = Array.isArray(body.likedIds)
    ? body.likedIds.filter((x): x is string => typeof x === "string")
    : [];
  const resetRequested = body.reset === true;
  if (!brandId) {
    return NextResponse.json({ error: "Missing brandId." }, { status: 400 });
  }

  // The brief: mark type(s), visual language, and free-text direction.
  //
  // The main wizard submits one mark_type. The standalone flow submits up to
  // three mark_types and three standalone_styles, and the board rotates
  // through them one concept at a time (see selectionForAttempt below).
  const rawConfig = (body.config ?? {}) as Record<string, unknown>;
  const str = (v: unknown) => (typeof v === "string" ? v.trim() : "");
  const markTypes = normalizeMarkTypes(rawConfig.mark_types);
  const standaloneStyles = normalizeStandaloneStyles(rawConfig.standalone_styles);
  const singleType = markTypeById(str(rawConfig.mark_type))?.id ?? null;

  const selection: LogoConfig = {
    mark_type: singleType,
    mark_types: markTypes.length ? markTypes : null,
    design_style: designStyleById(str(rawConfig.design_style))?.id ?? null,
    standalone_style: str(rawConfig.standalone_style).slice(0, 80) || null,
    standalone_styles: standaloneStyles.length ? standaloneStyles : null,
    instructions: str(rawConfig.instructions).slice(0, 1000) || null,
  };
  if (!markTypes.length && !singleType) {
    return NextResponse.json(
      { error: "Choose a logo type before sketching concepts." },
      { status: 400 },
    );
  }

  const { data: brand, error: loadError } = await supabase
    .from("brands")
    .select("id, brief, audience, competitors, name, name_choice, style_id, data")
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
      { error: "Add a brief before sketching logo concepts." },
      { status: 400 },
    );
  }

  if (!(await hasTokens(user.id, TOKEN_COST.asset))) {
    return NextResponse.json(
      { error: "You're out of tokens. Top up in Settings → Billing.", code: "no_tokens" },
      { status: 402 },
    );
  }

  const data = (brand.data as Record<string, unknown>) ?? {};
  const brandName = chosenBrandName(brand);

  const clock = startClock("logo/sketches", 240_000);
  const RESEARCH_BUDGET_MS = 90_000;

  try {
    // Research (Phase -1) and the creative platform (Phase 0) normally arrive
    // already cached, because the client calls /logo/research first. Running
    // all four phases in one request is what pushed this route past the 300s
    // ceiling. They're still generated here if missing, so the route works
    // standalone — but on a tighter research budget than the dedicated route,
    // since this request still has to draw and render afterwards.
    let research = getResearch(data);
    if (!research) {
      clock.guard("research the category", 100_000);
      try {
        research = await researchCategory(
          {
            brief: String(brand.brief),
            name: brandName,
            audience: brand.audience as string | null,
            competitors: brand.competitors as string | null,
            delegated: delegatedChoices(brand),
          },
          RESEARCH_BUDGET_MS,
        );
      } catch (err) {
        console.error("Category research failed; continuing without it:", err);
        research = null;
      }
      clock.lap("research");

      // Persist research before the passes that can still run out of time, so
      // a retry doesn't pay for the whole search again. See the same guard in
      // /logo/research for why this ordering matters.
      if (research) {
        const { error: cacheError } = await supabase
          .from("brands")
          .update({ data: { ...data, research } })
          .eq("id", brandId);
        if (cacheError) {
          console.error("Failed to cache research:", cacheError.message);
        }
      }
    }

    // styleContext() assembles every piece of design context (Step 2 picks,
    // delegated-decision brief, research, platform) into one string. Research
    // is merged in here because on a first run it exists only in memory — it
    // isn't written to brand.data until the end of this request.
    const ctx = styleContext(
      research ? { ...brand, data: { ...data, research } } : brand,
    );

    let platform = getPlatform(data);
    if (!platform) {
      clock.guard("write the creative platform", 60_000);
      platform = await generateCreativePlatform({
        brief: String(brand.brief),
        name: brandName,
        audience: brand.audience as string | null,
        competitors: brand.competitors as string | null,
        styleContext: ctx,
      });
      clock.lap("platform");
    }

    // A changed brief invalidates the prior board even if the client forgot to
    // ask for a reset — concepts drawn under different types or styles don't
    // belong on the same board.
    //
    // Compared by signature, not field by field: the standalone flow rotates
    // `mark_type` through the client's selection on every call, so comparing
    // that field directly wiped the board on each concept and the board could
    // never grow past one.
    const priorConfig = (data.logo_config ?? null) as LogoConfig | null;
    const configChanged =
      priorConfig !== null &&
      logoConfigSignature(priorConfig) !== logoConfigSignature(selection);
    const reset = resetRequested || configChanged;

    // Regeneration bias: liked concepts inform the new one; every previously
    // shown concept name is excluded to prevent repeats. `prior` is the whole
    // board built up so far this session — one call draws one more concept and
    // adds it here, it doesn't replace the board.
    const priorAll = (data.logo_sketches as LogoSketch[] | undefined) ?? [];
    const prior = reset ? [] : priorAll;
    const liked = prior.filter((s) => likedIds.includes(s.id));

    // Step 4 taste: what the client liked and disliked among real catalogued
    // marks. Until now these were collected and dropped. Reduced to formal
    // qualities rather than brand names — see summariseTaste.
    const referenceTaste = await loadReferenceTaste(supabase, data);

    // Rotate through the selection based on how much of the board exists, so
    // a run of "draw another" spreads across every type and style chosen.
    const pick = selectionForAttempt(selection, prior.length);
    const config: LogoConfig = {
      ...selection,
      mark_type: pick.mark_type ?? selection.mark_type ?? null,
      standalone_style: pick.standalone_style ?? selection.standalone_style ?? null,
    };

    // One design call plus one image render. This reserve was 170s back when
    // the route drew and rendered a full nine-up board; at that size it would
    // now falsely abort a cold run that still had ample time for one concept.
    clock.guard("draw the concept", 90_000);
    const drawn = await generateLogoSketches({
      brandId,
      brief: String(brand.brief),
      name: brandName,
      platform,
      styleContext: ctx,
      config,
      likedSketches: liked.length ? liked : null,
      referenceTaste,
      avoidNames: prior.map((s) => s.name),
      clock,
    });
    const sketches = [...prior, ...drawn];

    await spendTokens(user.id, TOKEN_COST.asset);

    // A reset board starts with a clean slate of likes; adding one more
    // concept to an existing board keeps whatever the client already liked.
    const nextData = {
      ...data,
      ...(research ? { research } : {}),
      creative_platform: platform,
      // Persist the SELECTION, not the rotated pick — the next call needs the
      // full selection to keep rotating, and the signature check above must
      // compare like with like.
      logo_config: selection,
      logo_sketches: sketches,
      logo_sketch_likes: reset ? [] : likedIds,
    };
    const { error: saveError } = await supabase
      .from("brands")
      .update({ data: nextData })
      .eq("id", brandId);
    if (saveError) {
      console.error("Failed to cache logo sketches:", saveError.message);
    }

    return NextResponse.json({ platform, sketches, research });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Sketch generation failed.";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
