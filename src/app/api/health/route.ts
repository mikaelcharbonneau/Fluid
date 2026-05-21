import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

// Liveness probe: confirms the process is up. Intentionally has no external
// dependencies so it stays green whenever the server can serve requests.
// Database connectivity is checked separately by /api/health/ready.
export async function GET() {
  return NextResponse.json({ status: "ok", timestamp: new Date().toISOString() });
}
