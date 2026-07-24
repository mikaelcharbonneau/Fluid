import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { styleContext, getStep2, paletteBasis } from "@/lib/ai/step2";
import { getPlatform } from "@/lib/ai/platform";
import type { LogoSketch } from "@/lib/ai/sketches";
import { generateLogoFinalists } from "@/lib/ai/refine";
import { hasTokens, spendTokens, TOKEN_COST } from "@/lib/credits";
import { chosenBrandName } from "@/lib/brands";
import { getLogoConfig } from "@/lib/logo-styles";
import { startClock } from "@/lib/ai/budget";

export const runtime = "nodejs";
export const maxDuration = 300;

// POST /api/generate/logo/refine — Phase 2 of the logo studio: develop the
// liked sketches into finished vectors, expand the pool with new concepts in
// the same direction, and run the creative-director critique to keep the best
// 9. Body: { brandId: string, likedIds: string[] }.
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
  const platform = getPlatform(data);
  const sketches = (data.logo_sketches as LogoSketch[] | undefined) ?? [];
  const liked = sketches.filter((s) => likedIds.includes(s.id));

  if (!platform || sketches.length === 0) {
    return NextResponse.json(
      { error: "Sketch concepts first, then refine the ones you like." },
      { status: 400 },
    );
  }
  if (liked.length === 0) {
    return NextResponse.json(
      { error: "Like at least one sketch to guide the refinement." },
      { status: 400 },
    );
  }

  if (!(await hasTokens(user.id, TOKEN_COST.asset))) {
    return NextResponse.json(
      { error: "You're out of tokens. Top up in Settings → Billing.", code: "no_tokens" },
      { status: 402 },
    );
  }

  // Brand colors: prefer the generated palette, fall back to the Step 2 pick.
  const palette = data.palette as { colors?: { hex?: string }[] } | undefined;
  const paletteColors =
    palette?.colors?.map((c) => c.hex).filter((h): h is string => !!h) ??
    paletteBasis(getStep2(data)) ??
    undefined;

  const clock = startClock("logo/refine", 270_000);

  try {
    const finalists = await generateLogoFinalists({
      brandId,
      brief: String(brand.brief),
      name: chosenBrandName(brand),
      platform,
      liked,
      styleContext: styleContext(brand),
      config: getLogoConfig(data),
      paletteColors,
      clock,
    });

    await spendTokens(user.id, TOKEN_COST.asset);

    // Persist the finalists, remember the likes that produced them, and mirror
    // into data.logos so the Brand Kit (Step 5), export, and brand cards keep
    // working unchanged.
    const nextData = {
      ...data,
      logo_finalists: finalists,
      logo_sketch_likes: likedIds,
      logos: finalists.map((f) => ({
        name: f.name,
        descriptor: f.idea,
        svg: f.svg ?? "",
        image_url: f.image_url,
      })),
    };
    const { error: saveError } = await supabase
      .from("brands")
      .update({ data: nextData })
      .eq("id", brandId);
    if (saveError) {
      console.error("Failed to cache logo finalists:", saveError.message);
    }

    return NextResponse.json({ finalists });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Logo refinement failed.";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
