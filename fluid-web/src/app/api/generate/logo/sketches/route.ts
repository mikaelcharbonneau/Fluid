import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { styleContext, delegatedChoices } from "@/lib/ai/step2";
import { researchCategory, getResearch } from "@/lib/ai/research";
import { generateCreativePlatform, getPlatform } from "@/lib/ai/platform";
import { generateLogoSketches, type LogoSketch } from "@/lib/ai/sketches";
import { hasTokens, spendTokens, TOKEN_COST } from "@/lib/credits";
import { chosenBrandName } from "@/lib/brands";
import {
  type LogoConfig,
  markTypeById,
  designStyleById,
} from "@/lib/logo-styles";

export const runtime = "nodejs";
export const maxDuration = 300;

// POST /api/generate/logo/sketches — Phase 1 of the logo studio: generate the
// creative platform (once, cached) and a 9-up board of low-fidelity concept
// sketches. Body: { brandId: string, likedIds?: string[] } — likedIds bias a
// regeneration toward the client's demonstrated taste.
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
  };
  const brandId = typeof body.brandId === "string" ? body.brandId : "";
  const likedIds = Array.isArray(body.likedIds)
    ? body.likedIds.filter((x): x is string => typeof x === "string")
    : [];
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

  try {
    // Phase -1 — category research. The one agentic step: Claude drives its own
    // web searches until it understands the competitive set. Cached, because it
    // is the slowest step and the findings don't change between regenerations.
    //
    // Degrades gracefully: if research fails (search unavailable, bad JSON) the
    // studio still designs, just without category grounding. Losing the whole
    // paid generation over a failed search would be a worse outcome.
    let research = getResearch(data);
    if (!research) {
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
    }

    // styleContext() assembles every piece of design context (Step 2 picks,
    // delegated-decision brief, research, platform) into one string. Research
    // is merged in here because on a first run it exists only in memory — it
    // isn't written to brand.data until the end of this request.
    const ctx = styleContext(
      research ? { ...brand, data: { ...data, research } } : brand,
    );

    // Phase 0 — the creative platform, generated once and reused by every
    // downstream asset generator.
    let platform = getPlatform(data);
    if (!platform) {
      platform = await generateCreativePlatform({
        brief: String(brand.brief),
        name: brandName,
        audience: brand.audience as string | null,
        competitors: brand.competitors as string | null,
        styleContext: ctx,
      });
    }

    // Regeneration bias: liked sketches inform the new spread; every
    // previously shown concept name is excluded to prevent repeats.
    const prior = (data.logo_sketches as LogoSketch[] | undefined) ?? [];
    const liked = prior.filter((s) => likedIds.includes(s.id));

    const sketches = await generateLogoSketches({
      brandId,
      brief: String(brand.brief),
      name: brandName,
      platform,
      styleContext: ctx,
      config,
      likedSketches: liked.length ? liked : null,
      avoidNames: prior.map((s) => s.name),
    });

    await spendTokens(user.id, TOKEN_COST.asset);

    // A fresh board starts with a clean slate of likes. The brief is stored so
    // Phase 2 refines under the same constraints.
    const nextData = {
      ...data,
      ...(research ? { research } : {}),
      creative_platform: platform,
      logo_config: config,
      logo_sketches: sketches,
      logo_sketch_likes: [],
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
