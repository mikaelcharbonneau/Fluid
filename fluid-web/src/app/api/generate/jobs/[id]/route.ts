import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { cancelGenerationJob, getGenerationJob } from "@/lib/generation-jobs/queue";

type Params = { params: Promise<{ id: string }> };

async function currentUser() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  return user;
}

export async function GET(_: Request, { params }: Params) {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  const { id } = await params;
  try {
    const job = await getGenerationJob(user.id, id);
    if (!job) return NextResponse.json({ error: "Not found." }, { status: 404 });
    return NextResponse.json({ job, retryAfter: job.status === "queued" || job.status === "running" ? 2 : 0 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not load generation job." },
      { status: 500 },
    );
  }
}

export async function DELETE(_: Request, { params }: Params) {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  const { id } = await params;
  try {
    const job = await cancelGenerationJob(user.id, id);
    return NextResponse.json({ job });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not cancel generation job.";
    return NextResponse.json({ error: message }, { status: message.includes("job_not_found") ? 404 : 500 });
  }
}
