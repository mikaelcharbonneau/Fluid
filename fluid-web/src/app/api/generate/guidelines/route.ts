import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { generateBrandGuidelines } from "@/lib/ai/guidelines";
import { styleContext, isDelegated } from "@/lib/ai/step2";
import { hasTokens, spendTokens, TOKEN_COST } from "@/lib/credits";
import { chosenBrandName } from "@/lib/brands";

export const runtime = "nodejs";
export const maxDuration = 60;

interface PaletteShape {
  colors?: { name?: string; hex?: string; role?: string }[];
}
interface TypeShape {
  heading?: { family?: string };
  body?: { family?: string };
}

// POST /api/generate/guidelines — synthesize a brand guide for one of the
// caller's brands and cache it on the brand record. Body: { brandId: string }.
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
    .select("id, brief, audience, name, name_choice, style_id, logo_choice, data")
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
      { error: "Add a brief before generating guidelines." },
      { status: 400 },
    );
  }

  // Summarize the assets already generated so the guide references specifics.
  const data = (brand.data as Record<string, unknown>) ?? {};
  const palette = data.palette as PaletteShape | undefined;
  const paletteSummary = palette?.colors
    ?.map((c) => `${c.name} ${c.hex} (${c.role})`)
    .join(", ");
  const type = data.typography as TypeShape | undefined;
  const typeSummary =
    type?.heading?.family || type?.body?.family
      ? `${type?.heading?.family ?? "—"} for headings, ${type?.body?.family ?? "—"} for body`
      : null;

  if (!(await hasTokens(user.id, TOKEN_COST.asset))) {
    return NextResponse.json(
      { error: "You're out of tokens. Top up in Settings → Billing.", code: "no_tokens" },
      { status: 402 },
    );
  }

  let guidelines;
  try {
    guidelines = await generateBrandGuidelines({
      brief: String(brand.brief),
      audience: brand.audience as string | null,
      name: chosenBrandName(brand),
      // A delegated style is described by styleContext() as an open brief;
      // passing the raw sentinel here would print "__ai__" into the prompt.
      style: isDelegated(brand.style_id as string | null)
        ? null
        : (brand.style_id as string | null),
      paletteSummary: paletteSummary ?? null,
      typeSummary,
      logoChoice: brand.logo_choice as string | null,
      styleContext: styleContext(brand),
    });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Guidelines generation failed.";
    return NextResponse.json({ error: message }, { status: 502 });
  }
  await spendTokens(user.id, TOKEN_COST.asset);

  const nextData = { ...data, guidelines };
  const { error: saveError } = await supabase
    .from("brands")
    .update({ data: nextData })
    .eq("id", brandId);
  if (saveError) {
    console.error("Failed to cache generated guidelines:", saveError.message);
  }

  return NextResponse.json({ guidelines });
}
