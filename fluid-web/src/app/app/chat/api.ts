// Talking to the brand-kit route.
//
// One call: brief in, activity stream while it works, one board image out.
// The SSE frame parsing is unchanged from the old brand-chat client — still
// exactly one terminal `result` or `error` message per run.

import type { ActivityEvent } from "@/lib/ai/activity";
import type { BrandKitBrief, BrandKitResult } from "@/lib/brand-kit/types";

export interface GenerateResult {
  done?: boolean;
  brandId?: string;
  brandkit?: BrandKitResult;
  error?: string;
  code?: string;
}

const NETWORK_ERROR =
  "Couldn't reach the studio. Check your connection and try again.";

const DROPPED =
  "The connection closed before that finished. Try again — nothing was charged.";

async function readStream(
  response: Response,
  onActivity?: (event: ActivityEvent) => void,
): Promise<GenerateResult> {
  const type = response.headers.get("content-type") ?? "";

  if (!type.includes("text/event-stream")) {
    const body = (await response.json().catch(() => ({}))) as GenerateResult;
    if (!response.ok) {
      return { error: body.error ?? `That request failed (${response.status}).`, code: body.code };
    }
    return body;
  }

  const reader = response.body?.getReader();
  if (!reader) return { error: DROPPED };
  const decoder = new TextDecoder();
  let buffer = "";
  let outcome: GenerateResult | null = null;

  for (;;) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    let cut: number;
    while ((cut = buffer.indexOf("\n\n")) !== -1) {
      const frame = buffer.slice(0, cut);
      buffer = buffer.slice(cut + 2);
      const line = frame.split("\n").find((l) => l.startsWith("data:"));
      if (!line) continue;
      let msg: { type?: string; event?: ActivityEvent; data?: GenerateResult; error?: string; code?: string };
      try {
        msg = JSON.parse(line.slice(5).trim());
      } catch {
        continue;
      }
      if (msg.type === "activity" && msg.event) onActivity?.(msg.event);
      else if (msg.type === "result") outcome = msg.data ?? {};
      else if (msg.type === "error") outcome = { error: msg.error, code: msg.code };
    }
  }

  return outcome ?? { error: DROPPED };
}

/** Generate (or regenerate) a brand kit. Creates the brand row server-side if `brandId` is omitted. */
export async function postGenerate(
  brandId: string | null,
  brief: BrandKitBrief,
  onActivity?: (event: ActivityEvent) => void,
): Promise<GenerateResult> {
  try {
    const response = await fetch("/api/brand-kit/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ brandId: brandId ?? undefined, ...brief }),
    });
    return await readStream(response, onActivity);
  } catch {
    return { error: NETWORK_ERROR };
  }
}

export interface BrandRow {
  id: string;
  name: string;
  brief: string | null;
  audience: string | null;
  data: { brandkit?: BrandKitResult } & Record<string, unknown>;
}

/** Fetch a brand by id, for resuming `?brand=<id>`. */
export async function fetchBrand(id: string): Promise<{ brand?: BrandRow; error?: string }> {
  try {
    const response = await fetch(`/api/brands/${id}`);
    const json = (await response.json().catch(() => ({}))) as { brand?: BrandRow; error?: string };
    if (!response.ok) {
      return { error: json.error ?? "Could not load that brand." };
    }
    return json;
  } catch {
    return { error: NETWORK_ERROR };
  }
}
