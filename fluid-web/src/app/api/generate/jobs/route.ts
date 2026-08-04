import { enqueueGenerationRequest } from "@/lib/generation-jobs/request";

export const runtime = "nodejs";

// Enqueue only. The cron worker performs generation after this response ends.
export async function POST(request: Request) {
  return enqueueGenerationRequest(request);
}
