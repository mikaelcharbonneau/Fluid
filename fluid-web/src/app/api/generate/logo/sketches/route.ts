import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { styleContext } from "@/lib/ai/step2";
import { generateCreativePlatform, getPlatform } from "@/lib/ai/platform";
import { generateLogoSketches, type LogoSketch } from "@/lib/ai/sketches";
import { hasTokens, spendTokens, TOKEN_COST } from "@/lib/credits";

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
  };
  const brandId = typeof body.brandId === "string" ? body.brandId : "";
  const likedIds = Array.isArray(body.likedIds)
    ? body.likedIds.filter((x): x is string => typeof x === "string")
    : [];
  if (!brandId) {
    return NextResponse.json({ error: "Missing brandId." }, { status: 400 });
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
  const ctx = styleContext(brand);
  const brandName = (brand.name_choice || brand.name) as string | null;

  try {
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
      brief: String(brand.brief),
      name: brandName,
      platform,
      styleContext: ctx,
      likedSketches: liked.length ? liked : null,
      avoidNames: prior.map((s) => s.name),
    });

    await spendTokens(user.id, TOKEN_COST.asset);

    // A fresh board starts with a clean slate of likes.
    const nextData = {
      ...data,
      creative_platform: platform,
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

    return NextResponse.json({ platform, sketches });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Sketch generation failed.";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
