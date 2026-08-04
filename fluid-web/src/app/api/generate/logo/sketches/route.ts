import { enqueueGenerationRequest } from "@/lib/generation-jobs/request";

export const runtime = "nodejs";

// Backwards-compatible action endpoint. Concept rendering runs in the durable
// worker and can be resumed after disconnects or deployments.
export async function POST(request: Request) {
  return enqueueGenerationRequest(request, "logo_sketches");
}
