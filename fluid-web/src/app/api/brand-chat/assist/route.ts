import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { hasTokens, spendTokens, TOKEN_COST } from "@/lib/credits";
import { readBrandContext } from "@/lib/brand-chat/context";
import {
  generateNames,
  suggestAudience,
  suggestCompetitors,
} from "@/lib/brand-chat/generate";
import { silentActivity } from "@/lib/ai/activity";

export const runtime = "nodejs";
export const maxDuration = 120;

// POST /api/brand-chat/assist — the helper buttons inside a widget.
//
// Body: { brandId, kind: "audience" | "competitors" | "names", exclude?: string[] }
//
// Separate from /turn because these do not advance the conversation: they hand
// the user something to edit inside the step they are already on, and nothing
// is written to the brand until they submit it themselves. Priced as `small`
// rather than `asset` for the same reason — except "10 more names", which is a
// full naming run under a friendlier label.
const KINDS = ["audience", "competitors", "names"] as const;
type Kind = (typeof KINDS)[number];

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
    kind?: unknown;
    exclude?: unknown;
  };
  const brandId = typeof body.brandId === "string" ? body.brandId : "";
  const kind = KINDS.find((k) => k === body.kind) as Kind | undefined;
  if (!brandId) {
    return NextResponse.json({ error: "Missing brandId." }, { status: 400 });
  }
  if (!kind) {
    return NextResponse.json({ error: "Unknown assist." }, { status: 400 });
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

  const context = readBrandContext(brand.data);
  if (!context.brief) {
    return NextResponse.json(
      { error: "Write the brief first — there's nothing to suggest from yet." },
      { status: 400 },
    );
  }

  const cost = kind === "names" ? TOKEN_COST.asset : TOKEN_COST.small;
  let affordable: boolean;
  try {
    affordable = await hasTokens(user.id, cost);
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

  const exclude = Array.isArray(body.exclude)
    ? body.exclude.filter((n): n is string => typeof n === "string").slice(0, 100)
    : [];

  try {
    const input = { context, activity: silentActivity };
    const result =
      kind === "audience"
        ? { audience: await suggestAudience(input) }
        : kind === "competitors"
          ? { competitors: await suggestCompetitors(input) }
          : { names: await generateNames(input, exclude) };

    await spendTokens(user.id, cost);
    return NextResponse.json(result);
  } catch (err) {
    // A failed suggestion is not a failed step — the user can still type the
    // answer themselves, so this reports and gets out of the way.
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "That suggestion could not be generated." },
      { status: 502 },
    );
  }
}
