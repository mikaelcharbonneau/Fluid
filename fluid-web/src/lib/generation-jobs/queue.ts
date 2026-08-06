import { createHash } from "node:crypto";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  JOB_CREDIT_COST,
  type GenerationAction,
  type GenerationJob,
} from "./types";

export { isGenerationAction } from "./types";
export type { GenerationAction, GenerationJob } from "./types";

export function idempotencyKey(
  supplied: unknown,
  action: GenerationAction,
  brandId: string,
  input: Record<string, unknown>,
) {
  if (typeof supplied === "string" && supplied.length >= 8 && supplied.length <= 160) {
    return supplied;
  }
  const fingerprint = createHash("sha256")
    .update(JSON.stringify({ action, brandId, input }))
    .digest("hex");
  return `${action}:${fingerprint}`;
}

export async function enqueueGenerationJob({
  userId,
  brandId,
  action,
  input,
  idempotency,
}: {
  userId: string;
  brandId: string;
  action: GenerationAction;
  input: Record<string, unknown>;
  idempotency: string;
}): Promise<GenerationJob> {
  const admin = createAdminClient();
  const { data, error } = await admin.rpc("enqueue_generation_job", {
    p_user: userId,
    p_brand: brandId,
    p_action: action,
<<<<<<< HEAD
    p_vendor: "anthropic",
=======
    p_vendor: "openai",
>>>>>>> 526f552e43aa092f99e217410cabf41e6b9dbf9f
    p_input: input,
    p_idempotency_key: idempotency,
    p_credit_amount: JOB_CREDIT_COST[action],
  });
  if (error) throw new Error(error.message);
  return data as GenerationJob;
}

export async function getGenerationJob(
  userId: string,
  jobId: string,
): Promise<GenerationJob | null> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("generation_jobs")
    .select("*")
    .eq("id", jobId)
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data as GenerationJob | null;
}

export async function cancelGenerationJob(userId: string, jobId: string) {
  const admin = createAdminClient();
  const { data, error } = await admin.rpc("cancel_generation_job", {
    p_job: jobId,
    p_user: userId,
  });
  if (error) throw new Error(error.message);
  return data as GenerationJob;
}

export async function claimGenerationJob(): Promise<GenerationJob | null> {
  const admin = createAdminClient();
  const { data, error } = await admin.rpc("claim_generation_job", {
    p_lease_seconds: 295,
  });
  if (error) throw new Error(error.message);
  return (Array.isArray(data) ? data[0] : data) as GenerationJob | null;
}

export async function setGenerationProgress(
  jobId: string,
  phase: string,
  progress: number,
) {
  const admin = createAdminClient();
  const { error } = await admin
    .from("generation_jobs")
    .update({ phase, progress })
    .eq("id", jobId)
    .eq("status", "running");
  if (error) throw new Error(error.message);
}

// This checkpoint is written immediately before non-idempotent provider work.
// A lease recovery after this point must not automatically replay the call.
export async function markProviderStarted(jobId: string, phase: string, progress: number) {
  const admin = createAdminClient();
  const { error } = await admin
    .from("generation_jobs")
    .update({ phase, progress, provider_started_at: new Date().toISOString() })
    .eq("id", jobId)
    .eq("status", "running");
  if (error) throw new Error(error.message);
}

export async function completeGenerationJob(jobId: string, result: Record<string, unknown>) {
  const admin = createAdminClient();
  const { error } = await admin.rpc("complete_generation_job", {
    p_job: jobId,
    p_result: result,
  });
  if (error) throw new Error(error.message);
}

export async function failGenerationJob(
  jobId: string,
  error: unknown,
  retryable: boolean,
) {
  const message = error instanceof Error ? error.message : "Generation failed.";
  const admin = createAdminClient();
  const { error: rpcError } = await admin.rpc("fail_generation_job", {
    p_job: jobId,
    p_error: { message },
    p_retryable: retryable,
  });
  if (rpcError) throw new Error(rpcError.message);
}
