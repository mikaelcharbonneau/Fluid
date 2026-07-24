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
  type LogoConfig,
  markTypeById,
  designStyleById,
} from "@/lib/logo-styles";

export const runtime = "nodejs";
export const maxDuration = 300;

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

  // The Step 4 brief: mark type, visual language, and free-text direction.
  const rawConfig = (body.config ?? {}) as Record<string, unknown>;
  const str = (v: unknown) => (typeof v === "string" ? v.trim() : "");
  const config: LogoConfig = {
    mark_type: markTypeById(str(rawConfig.mark_type))?.id ?? null,
    design_style: designStyleById(str(rawConfig.design_style))?.id ?? null,
    instructions: str(rawConfig.instructions).slice(0, 1000) || null,
  };
  if (!config.mark_type) {
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

  const clock = startClock("logo/sketches", 270_000);

  try {
    // Research (Phase -1) and the creative platform (Phase 0) normally arrive
    // already cached, because the client calls /logo/research first. Running
    // all four phases in one request is what pushed this route past the 300s
    // ceiling. They're still generated here if missing, so the route works
    // standalone — but with guards, so a cold start fails with a real message
    // instead of being killed silently.
    let research = getResearch(data);
    if (!research) {
      clock.guard("research the category", 150_000);
      try {
        research = await researchCategory({
          brief: String(brand.brief),
          name: brandName,
          audience: brand.audience as string | null,
          competitors: brand.competitors as string | null,
          delegated: delegatedChoices(brand),
        });
      } catch (err) {
        console.error("Category research failed; continuing without it:", err);
        research = null;
      }
      clock.lap("research");
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
    // ask for a reset — concepts drawn under a different mark type or style
    // don't belong on the same board.
    const priorConfig = (data.logo_config ?? null) as LogoConfig | null;
    const configChanged =
      priorConfig !== null &&
      (priorConfig.mark_type !== config.mark_type ||
        priorConfig.design_style !== config.design_style);
    const reset = resetRequested || configChanged;

    // Regeneration bias: liked concepts inform the new one; every previously
    // shown concept name is excluded to prevent repeats. `prior` is the whole
    // board built up so far this session — one call draws one more concept and
    // adds it here, it doesn't replace the board.
    const priorAll = (data.logo_sketches as LogoSketch[] | undefined) ?? [];
    const prior = reset ? [] : priorAll;
    const liked = prior.filter((s) => likedIds.includes(s.id));

    clock.guard("draw the concept", 170_000);
    const drawn = await generateLogoSketches({
      brandId,
      brief: String(brand.brief),
      name: brandName,
      platform,
      styleContext: ctx,
      config,
      likedSketches: liked.length ? liked : null,
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
      logo_config: config,
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
