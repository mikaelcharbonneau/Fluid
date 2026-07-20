import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { generateBrandLogos } from "@/lib/ai/logo";

export const runtime = "nodejs";
export const maxDuration = 60;

// POST /api/generate/logo — generate SVG logo concepts for one of the caller's
// brands and cache them on the brand record. Body: { brandId: string }.
export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

  const body = (await request.json().catch(() => ({}))) as { brandId?: unknown };
  const brandId = typeof body.brandId === "string" ? body.brandId : "";
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
      { error: "Add a brief before generating a logo." },
      { status: 400 },
    );
  }

  const data = (brand.data as Record<string, unknown>) ?? {};
  const palette = data.palette as { colors?: { hex?: string }[] } | undefined;
  const primaryColor = palette?.colors?.[0]?.hex ?? null;

  let logos;
  try {
    logos = await generateBrandLogos({
      brief: String(brand.brief),
      name: (brand.name_choice || brand.name) as string | null,
      style: brand.style_id as string | null,
      primaryColor,
    });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Logo generation failed.";
    return NextResponse.json({ error: message }, { status: 502 });
  }

  const nextData = { ...data, logos };
  const { error: saveError } = await supabase
    .from("brands")
    .update({ data: nextData })
    .eq("id", brandId);
  if (saveError) {
    console.error("Failed to cache generated logos:", saveError.message);
  }

  return NextResponse.json({ logos });
}
