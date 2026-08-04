import { enqueueGenerationRequest } from "@/lib/generation-jobs/request";

export const runtime = "nodejs";

// Backwards-compatible action endpoint. Refinement is persisted as a job
// rather than tied to the request that started it.
export async function POST(request: Request) {
  return enqueueGenerationRequest(request, "logo_refine");
}
