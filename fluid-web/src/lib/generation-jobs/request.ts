import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  enqueueGenerationJob,
  idempotencyKey,
  isGenerationAction,
  type GenerationAction,
} from "./queue";

function isObject(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

function normalizeInput(action: GenerationAction, body: Record<string, unknown>) {
  const config = isObject(body.config) ? body.config : {};
  return { config, reset: body.reset === true };
}

export async function enqueueGenerationRequest(
  request: Request,
  forcedAction?: GenerationAction,
) {
  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  const action = forcedAction ?? (isGenerationAction(body.action) ? body.action : null);
  const brandId = typeof body.brandId === "string" ? body.brandId : "";
  if (!action || !brandId) {
    return NextResponse.json({ error: "Missing action or brandId." }, { status: 400 });
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });

  const { data: brand, error: brandError } = await supabase
    .from("brands")
    .select("id")
    .eq("id", brandId)
    .maybeSingle();
  if (brandError) return NextResponse.json({ error: brandError.message }, { status: 500 });
  if (!brand) return NextResponse.json({ error: "Not found." }, { status: 404 });

  const input = normalizeInput(action, body);
  try {
    const job = await enqueueGenerationJob({
      userId: user.id,
      brandId,
      action,
      input,
      idempotency: idempotencyKey(body.idempotencyKey, action, brandId, input),
    });
    const status = job.status === "succeeded" ? 200 : 202;
    return NextResponse.json({ job, retryAfter: 2 }, { status });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not queue generation.";
    if (message.includes("insufficient_tokens")) {
      return NextResponse.json(
        { error: "You're out of tokens. Top up in Settings → Billing.", code: "no_tokens" },
        { status: 402 },
      );
    }
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
