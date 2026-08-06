// Talking to the brand-chat routes.
//
// A turn is either a plain JSON reply (the step had nothing to generate) or an
// SSE stream (it did). The caller should not care which, so both come back as
// the same shape and the streamed activity is handed to a callback for the
// thinking line to display.

import type { RenderedStep } from "@/lib/brand-chat/step";
import type { BrandContext } from "@/lib/brand-chat/context";
import type { ActivityEvent } from "@/lib/ai/activity";

export interface TurnResult {
  done?: boolean;
  step?: RenderedStep | null;
  /** Everything answered so far, so a resumed thread can repopulate widgets. */
  context?: BrandContext;
  error?: string;
  code?: string;
}

const NETWORK_ERROR =
  "Couldn't reach the studio. Check your connection and try again — nothing you answered is lost.";

const DROPPED =
  "The connection closed before that finished. Your answers are saved — try again and it picks up where it left off.";

async function readStream(
  response: Response,
  onActivity?: (event: ActivityEvent) => void,
): Promise<TurnResult> {
  const type = response.headers.get("content-type") ?? "";

  // A refusal that never opened a stream — auth, credits, a bad answer. These
  // still carry a real status code, which is the better error to show.
  if (!type.includes("text/event-stream")) {
    const body = (await response.json().catch(() => ({}))) as TurnResult;
    if (!response.ok) {
      return { error: body.error ?? `That request failed (${response.status}).`, code: body.code };
    }
    return body;
  }

  const reader = response.body?.getReader();
  if (!reader) return { error: DROPPED };
  const decoder = new TextDecoder();
  let buffer = "";
  let outcome: TurnResult | null = null;

  // Frames are separated by a blank line, and a chunk can split one anywhere,
  // so the tail stays buffered until its terminator arrives.
  for (;;) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    let cut: number;
    while ((cut = buffer.indexOf("\n\n")) !== -1) {
      const frame = buffer.slice(0, cut);
      buffer = buffer.slice(cut + 2);
      // Keepalive comment lines start with ":" and are skipped here.
      const line = frame.split("\n").find((l) => l.startsWith("data:"));
      if (!line) continue;
      let msg: { type?: string; event?: ActivityEvent; data?: TurnResult; error?: string; code?: string };
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

  // The stream ended without a terminal message: a dropped connection, or the
  // function was killed mid-run. Say so rather than resolving with nothing.
  return outcome ?? { error: DROPPED };
}

/** Advance the conversation. Omit `step` to open or resume the thread. */
export async function postTurn(
  body: { brandId: string; step?: string; value?: unknown },
  onActivity?: (event: ActivityEvent) => void,
): Promise<TurnResult> {
  try {
    const response = await fetch("/api/brand-chat/turn", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    return await readStream(response, onActivity);
  } catch {
    return { error: NETWORK_ERROR };
  }
}

export interface AssistResult {
  audience?: string[];
  competitors?: string[];
  names?: Array<{ name: string; why: string; domain: string }>;
  error?: string;
}

/** An in-widget helper. Never advances the thread. */
export async function postAssist(body: {
  brandId: string;
  kind: "audience" | "competitors" | "names";
  exclude?: string[];
}): Promise<AssistResult> {
  try {
    const response = await fetch("/api/brand-chat/assist", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const json = (await response.json().catch(() => ({}))) as AssistResult;
    if (!response.ok) {
      return { error: json.error ?? "That suggestion could not be generated." };
    }
    return json;
  } catch {
    return { error: NETWORK_ERROR };
  }
}

/** Create the draft this thread writes into. Called on the first answer. */
export async function createBrand(): Promise<{ id?: string; error?: string }> {
  try {
    const response = await fetch("/api/brands", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "Untitled brand" }),
    });
    const json = (await response.json().catch(() => ({}))) as {
      brand?: { id?: string };
      error?: string;
    };
    if (!response.ok || !json.brand?.id) {
      return { error: json.error ?? "Could not start a new brand." };
    }
    return { id: json.brand.id };
  } catch {
    return { error: NETWORK_ERROR };
  }
}
