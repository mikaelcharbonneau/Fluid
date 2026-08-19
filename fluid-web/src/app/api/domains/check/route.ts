import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { checkDomainAvailability } from "@/lib/domains";
import { capabilities } from "@/lib/env/server";

export const runtime = "nodejs";
export const maxDuration = 15;

// POST /api/domains/check — { domains: string[] } → { results: [{domain, available}] }
//
// Requires auth like every other route here, mostly so this doesn't become
// an open proxy onto Vercel's registrar API for anyone who finds the path.
export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

  const body = (await request.json().catch(() => ({}))) as { domains?: unknown };
  const domains = Array.isArray(body.domains)
    ? body.domains.filter((d): d is string => typeof d === "string" && d.trim().length > 0)
    : [];
  if (domains.length === 0) {
    return NextResponse.json({ results: [] });
  }
  // No Vercel registrar token configured: degrade explicitly rather than
  // throwing mid-request. `available: null` is the same shape the client
  // already handles for a single failed lookup — it just shows the name
  // suggestion without an availability badge.
  if (!capabilities.domainAvailability) {
    return NextResponse.json({ results: domains.map((domain) => ({ domain, available: null })) });
  }

  try {
    const results = await checkDomainAvailability(domains);
    return NextResponse.json({ results });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Could not check domain availability." },
      { status: 500 },
    );
  }
}
