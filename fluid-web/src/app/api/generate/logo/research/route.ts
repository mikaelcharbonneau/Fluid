import { enqueueGenerationRequest } from "@/lib/generation-jobs/request";

export const runtime = "nodejs";

// Backwards-compatible action endpoint. It now returns a durable job instead
// of holding the client connection while research runs.
export async function POST(request: Request) {
  return enqueueGenerationRequest(request, "logo_research");
}
