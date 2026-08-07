// Talking to /api/brand-agent/turn.
//
// The SSE-frame parsing here is a deliberate, small duplication of
// src/app/app/chat/api.ts's readStream(): that function isn't exported, and
// chat/api.ts is off-limits to edit (this mode has to stay purely additive,
// see src/lib/brand-agent/loop.ts's header). The parsing itself assumes
// nothing about brand-chat's payload shapes, so duplicating it is copying a
// generic frame reader, not forking behavior.

import type { BrandContext } from "@/lib/brand-chat/context";
import type { StepPayload } from "@/lib/brand-chat/step";
import type { ActivityEvent } from "@/lib/ai/activity";
import type { PendingQuestion } from "@/lib/brand-agent/transcript";

export { createBrand } from "@/app/app/chat/api";

export interface AgentTurnResult {
  done?: boolean;
  assistantText?: string;
  pendingQuestion?: PendingQuestion;
  payload?: StepPayload;
  context?: BrandContext;
  degraded?: string;
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
): Promise<AgentTurnResult> {
  const type = response.headers.get("content-type") ?? "";

  if (!type.includes("text/event-stream")) {
    const body = (await response.json().catch(() => ({}))) as AgentTurnResult;
    if (!response.ok) {
      return { error: body.error ?? `That request failed (${response.status}).`, code: body.code };
    }
    return body;
  }

  const reader = response.body?.getReader();
  if (!reader) return { error: DROPPED };
  const decoder = new TextDecoder();
  let buffer = "";
  let outcome: AgentTurnResult | null = null;

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
      let msg: { type?: string; event?: ActivityEvent; data?: AgentTurnResult; error?: string; code?: string };
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

/** Advance the agent-driven thread. Omit `message` to open or resume it. */
export async function postAgentTurn(
  body: { brandId: string; message?: string },
  onActivity?: (event: ActivityEvent) => void,
): Promise<AgentTurnResult> {
  try {
    const response = await fetch("/api/brand-agent/turn", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    return await readStream(response, onActivity);
  } catch {
    return { error: NETWORK_ERROR };
  }
}
