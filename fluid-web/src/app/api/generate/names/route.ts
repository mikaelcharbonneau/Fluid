import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { generateBrandNames } from "@/lib/ai/names";
import { hasTokens, spendTokens, TOKEN_COST } from "@/lib/credits";

// Claude runs server-side and extended thinking can take a while, so give the
// function room beyond the short default and pin it to the Node runtime.
export const runtime = "nodejs";
export const maxDuration = 60;

// POST /api/generate/names — generate name candidates for one of the caller's
// brands and cache them on the brand record. Body: { brandId: string }.
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
  };
  const brandId = typeof body.brandId === "string" ? body.brandId : "";
  if (!brandId) {
    return NextResponse.json({ error: "Missing brandId." }, { status: 400 });
  }

  // Load the brand (RLS ensures it belongs to the caller) for its brief.
  const { data: brand, error: loadError } = await supabase
    .from("brands")
    .select("id, brief, audience, competitors, data")
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
      { error: "Add a brief before generating names." },
      { status: 400 },
    );
  }

  if (!(await hasTokens(user.id, TOKEN_COST.asset))) {
    return NextResponse.json(
      { error: "You're out of tokens. Top up in Settings → Billing.", code: "no_tokens" },
      { status: 402 },
    );
  }

  let names;
  try {
    names = await generateBrandNames({
      brief: String(brand.brief),
      audience: brand.audience as string | null,
      competitors: brand.competitors as string | null,
    });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Name generation failed.";
    return NextResponse.json({ error: message }, { status: 502 });
  }
  await spendTokens(user.id, TOKEN_COST.asset);

  // Cache onto the brand so resuming the wizard shows the same set.
  const nextData = { ...(brand.data as Record<string, unknown>), names };
  const { error: saveError } = await supabase
    .from("brands")
    .update({ data: nextData })
    .eq("id", brandId);
  if (saveError) {
    // Non-fatal: the caller can still use the freshly generated names.
    console.error("Failed to cache generated names:", saveError.message);
  }

  return NextResponse.json({ names });
}
