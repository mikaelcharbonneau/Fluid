// Talking to the brand-kit stepper.
//
// One call per step: submit an answer (or resume, or ask the AI to redraft
// the current step), get back the next step and — if it's AI-drafted — its
// proposed value already filled in. The SSE frame parsing is unchanged from
// the old brand-chat client — still exactly one terminal `result` or `error`
// message per run.

import type { ActivityEvent } from "@/lib/ai/activity";
import type { BrandKitDraft } from "@/lib/brand-kit/context";
import type { StepKey } from "@/lib/brand-kit/steps";
import type { BrandKitResult } from "@/lib/brand-kit/types";

export interface TurnResult {
  done?: boolean;
  brandId?: string;
  step?: StepKey;
  draft?: BrandKitDraft;
  proposed?: Partial<BrandKitDraft> | null;
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
): Promise<TurnResult> {
  const type = response.headers.get("content-type") ?? "";

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

  return outcome ?? { error: DROPPED };
}

/** Advance, resume, or redraft one step of the stepper. */
export async function postTurn(
  body: { brandId?: string | null; step?: StepKey; value?: unknown; regenerate?: boolean },
  onActivity?: (event: ActivityEvent) => void,
): Promise<TurnResult> {
  try {
    const response = await fetch("/api/brand-kit/turn", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...body, brandId: body.brandId ?? undefined }),
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

export interface DomainAvailability {
  domain: string;
  available: boolean | null;
}

/** Best-effort — a failed or unconfigured check should never block naming. */
export async function checkDomains(domains: string[]): Promise<DomainAvailability[]> {
  if (domains.length === 0) return [];
  try {
    const response = await fetch("/api/domains/check", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ domains }),
    });
    if (!response.ok) return [];
    const json = (await response.json().catch(() => ({}))) as { results?: DomainAvailability[] };
    return json.results ?? [];
  } catch {
    return [];
  }
}
