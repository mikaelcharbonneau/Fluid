import { NextResponse } from "next/server";
import { reportError } from "@/lib/monitoring/log";
import { serverEnv } from "@/lib/env/server";

export const runtime = "nodejs";

// GET /api/internal/test-error — throws a deliberate, clearly-labeled error
// so a maintainer can confirm the monitoring pipeline (capture → redact →
// source-mapped stack trace → alert) actually works end to end in preview.
// Disabled in production; optionally gated by a shared secret so preview
// URLs (which are guessable/discoverable) can't be used to spam Sentry.
export async function GET(request: Request) {
  if (process.env.VERCEL_ENV === "production") {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }

  const secret = serverEnv.TEST_ERROR_SECRET;
  if (secret && request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const error = new Error("Deliberate test error — confirms Sentry capture + source maps.");
  reportError("Deliberate preview test error", error, { triggeredAt: new Date().toISOString() });
  throw error;
}
