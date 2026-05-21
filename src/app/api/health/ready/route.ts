import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { logger } from "@/lib/logger";

export const dynamic = "force-dynamic";

// Readiness probe: verifies the database is reachable via the Supabase
// (PostgREST) API. Returns 503 when the database cannot be queried so
// orchestrators can route traffic away from an instance that is up but not
// ready to serve. RLS scopes the result to nothing for the anon role, so this
// confirms reachability without exposing data.
export async function GET() {
  const timestamp = new Date().toISOString();

  try {
    const supabase = await createClient();
    const { error } = await supabase.from("Brand").select("id").limit(1);
    if (error) throw error;
  } catch (error) {
    logger.error({ err: error }, "Readiness check database probe failed");
    return NextResponse.json({ status: "error", database: "down", timestamp }, { status: 503 });
  }

  return NextResponse.json({ status: "ok", database: "up", timestamp });
}
