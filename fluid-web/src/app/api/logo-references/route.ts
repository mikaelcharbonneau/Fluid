import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  attributesForStyles,
  rankReferences,
  type LogoReferenceRow,
} from "@/lib/logo-reference-query";

export const runtime = "nodejs";

const MAX_LIMIT = 48;
const DEFAULT_LIMIT = 12;

function parseList(raw: string | null): string[] {
  return (raw ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, 8);
}

// GET /api/logo-references?types=wordmark,abstract&styles=placeholder-03&limit=12
//
// The Step 4 gallery. Returns real catalogued marks filtered to the mark types
// chosen in Step 3 and ranked against the visual directions chosen in Step 2,
// so the references on screen reflect what the client actually asked for.
//
// Both selections are optional: "Let Fluid choose" simply sends neither, which
// opens the gallery to the whole library.
export async function GET(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

  const url = new URL(request.url);
  const types = parseList(url.searchParams.get("types"));
  const styles = parseList(url.searchParams.get("styles"));
  const requested = Number(url.searchParams.get("limit"));
  const limit = Math.min(
    Math.max(Number.isFinite(requested) && requested > 0 ? requested : DEFAULT_LIMIT, 1),
    MAX_LIMIT,
  );

  // The catalogue is small (a few hundred rows), so filter by type in the
  // query and score the attribute match in memory — that keeps the ranking
  // rules in one readable place instead of splitting them across SQL.
  let query = supabase
    .from("logo_references")
    .select("name, mark_type, image_path, attributes, industry, sort_order, aspect_ratio, refinement")
    .eq("is_active", true);
  if (types.length) query = query.in("mark_type", types);

  const { data, error } = await query;
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const wanted = attributesForStyles(styles);
  const references = rankReferences((data ?? []) as LogoReferenceRow[], wanted, limit);

  return NextResponse.json({
    references,
    // What the filter actually applied, so the UI can be honest about it.
    filter: { types, styles, attributes: wanted },
    total: (data ?? []).length,
  });
}
