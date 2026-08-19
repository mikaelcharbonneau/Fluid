import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { enqueueGenerationJob, type GenerationJob } from "@/lib/generation-jobs/queue";
import { cronSecret } from "@/lib/env/server";

type Params = { params: Promise<{ id: string }> };

function isAuthorized(request: Request) {
  const secret = cronSecret();
  return !!secret && request.headers.get("authorization") === `Bearer ${secret}`;
}

// Operators replay a dead-letter job explicitly. It creates a fresh, auditable
// job and reservation instead of mutating the original terminal record.
export async function POST(request: Request, { params }: Params) {
  if (!isAuthorized(request)) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  const { id } = await params;
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("generation_jobs")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  const job = data as GenerationJob | null;
  if (!job) return NextResponse.json({ error: "Not found." }, { status: 404 });
  if (job.status !== "failed" && job.status !== "cancelled") {
    return NextResponse.json({ error: "Only terminal failed or cancelled jobs can be replayed." }, { status: 409 });
  }
  try {
    const replay = await enqueueGenerationJob({
      userId: job.user_id,
      brandId: job.brand_id,
      action: job.action,
      input: job.input,
      idempotency: `replay:${job.id}:${Date.now()}`,
    });
    return NextResponse.json({ job: replay }, { status: 202 });
  } catch (replayError) {
    return NextResponse.json(
      { error: replayError instanceof Error ? replayError.message : "Could not replay generation job." },
      { status: 500 },
    );
  }
}
