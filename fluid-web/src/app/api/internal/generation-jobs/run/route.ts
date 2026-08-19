import { NextResponse } from "next/server";
import { runOneGenerationJob } from "@/lib/generation-jobs/worker";
import { reportError } from "@/lib/monitoring/log";

export const runtime = "nodejs";
export const maxDuration = 300;

function isAuthorized(request: Request) {
  const secret = process.env.CRON_SECRET || process.env.GENERATION_JOBS_CRON_SECRET;
  if (!secret) return false;
  return request.headers.get("authorization") === `Bearer ${secret}`;
}

// Vercel Cron calls this endpoint once per minute. It intentionally handles a
// single claimed job so leases and account/vendor concurrency remain simple.
export async function GET(request: Request) {
  if (!isAuthorized(request)) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  try {
    const job = await runOneGenerationJob();
    return NextResponse.json({ job });
  } catch (error) {
    reportError("Generation worker failed", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Generation worker failed." },
      { status: 500 },
    );
  }
}
