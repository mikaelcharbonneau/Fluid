import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { vectorizeImage } from "@/lib/ai/vectorize";
import { hasTokens, spendTokens, TOKEN_COST } from "@/lib/credits";

export const runtime = "nodejs";
export const maxDuration = 120;

// POST /api/generate/logo/vectorize — the final handoff: trace the client's
// chosen concept into a real vector file. Body: { brandId, conceptId }.
//
// Costs one small credit, not a full asset: this is a single trace, not a
// generation, and the client has already paid for the concept itself.
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
  };
  const brandId = typeof body.brandId === "string" ? body.brandId : "";
  const conceptId = typeof body.conceptId === "string" ? body.conceptId : "";
  if (!brandId || !conceptId) {
    return NextResponse.json(
      { error: "Missing brandId or conceptId." },
      { status: 400 },
    );
  }

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

  const data = (brand.data as Record<string, unknown>) ?? {};
  const finalists = (data.logo_finalists as
    | { id: string; name: string; image_url?: string; svg?: string }[]
    | undefined) ?? [];
  const concept = finalists.find((f) => f.id === conceptId);

  if (!concept) {
    return NextResponse.json({ error: "That concept isn't on the board." }, { status: 404 });
  }
  if (!concept.image_url) {
    return NextResponse.json(
      { error: "That concept has no image to vectorize." },
      { status: 400 },
    );
  }
  // Already traced — return it rather than charging twice.
  if (concept.svg) {
    return NextResponse.json({ svg: concept.svg, cached: true });
  }

  if (!(await hasTokens(user.id, TOKEN_COST.small))) {
    return NextResponse.json(
      { error: "You're out of tokens. Top up in Settings → Billing.", code: "no_tokens" },
      { status: 402 },
    );
  }

  try {
    const { svg, url } = await vectorizeImage({
      brandId,
      slot: conceptId,
      imageUrl: concept.image_url,
    });

    await spendTokens(user.id, TOKEN_COST.small);

    // Persist onto the finalist, and mirror into data.logos so Step 5, export,
    // and the brand cards pick up the vector automatically.
    const nextFinalists = finalists.map((f) =>
      f.id === conceptId ? { ...f, svg, vector_url: url } : f,
    );
    const nextData = {
      ...data,
      logo_finalists: nextFinalists,
      logos: nextFinalists.map((f) => ({
        name: f.name,
        descriptor: (f as { idea?: string }).idea ?? "",
        svg: f.svg ?? "",
        image_url: f.image_url ?? null,
      })),
    };
    const { error: saveError } = await supabase
      .from("brands")
      .update({ data: nextData })
      .eq("id", brandId);
    if (saveError) {
      console.error("Failed to cache vectorized logo:", saveError.message);
    }

    return NextResponse.json({ svg, url });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Vectorization failed.";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
