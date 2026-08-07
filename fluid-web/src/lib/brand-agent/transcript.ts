// Persisted state for one agent-driven thread.
//
// Mirrors src/lib/brand-chat/context.ts's readBrandContext/brandContextPatch
// pair exactly, but under a sibling top-level key: `data.chat` is the classic
// hardcoded flow's namespace, `data.agent` is this one. Both are written
// through the same brands_merge_data RPC (a shallow, top-level jsonb merge —
// see supabase/migrations/0012_brands_merge_data.sql), so the two flows never
// collide even against the same brand row.

// Relative, not the usual `@/` alias — like brand-chat's own pure modules
// (context.ts, flow.ts, answer.ts, contracts.ts), this keeps the module
// resolvable by a bare `tsc <file>` with no project config, which is what
// lets scripts/verify-brand-agent.mjs compile and require it with no
// network, no tsconfig paths, and no bundler in the loop.
import type { BrandContext } from "../brand-chat/context";
import type { ResponsesItem } from "../ai/openai";

export interface PendingQuestion {
  text: string;
  inputType: "text" | "single_select" | "multi_select";
  options?: string[];
}

export interface AgentState {
  /** Full Responses-API item history, replayed into every model call. The
   * system prompt is NOT stored here — it is rebuilt fresh each turn from
   * `context`, so it never goes stale relative to answers already on file. */
  transcript: ResponsesItem[];
  /** The same shape the classic chat trusts, built exclusively through
   * answer.ts's applyAnswer — every existing generator and the logo quality
   * gate accept this as-is. */
  context: BrandContext;
  /** Model round-trips across the whole thread, not just one HTTP turn.
   * Informational only (activity/debug), not the per-turn iteration cap. */
  turns: number;
  /** Set once generate_kit has run — the natural end of the conversation. */
  done: boolean;
  /** Every name ever proposed by propose_names, across every call this
   * thread — always passed back as `exclude` so "call it again" doesn't
   * re-bill for near-duplicate results. Not part of BrandContext: it's
   * bookkeeping for one tool, not a fact about the brand. */
  proposedNames: string[];
  /** The question the thread is currently waiting on, if any — the only way
   * a resumed/reloaded thread (no live model call) knows what to show and
   * what a free-text reply should be answering. Cleared once `done`. */
  pendingQuestion?: PendingQuestion;
}

export const EMPTY_AGENT_STATE: AgentState = {
  transcript: [],
  context: {},
  turns: 0,
  done: false,
  proposedNames: [],
};

export function readAgentState(data: unknown): AgentState {
  const blob = (data ?? {}) as Record<string, unknown>;
  const agent = blob.agent;
  if (!agent || typeof agent !== "object" || Array.isArray(agent)) return EMPTY_AGENT_STATE;
  const a = agent as Partial<AgentState>;
  return {
    transcript: Array.isArray(a.transcript) ? (a.transcript as ResponsesItem[]) : [],
    context: (a.context && typeof a.context === "object" && !Array.isArray(a.context)
      ? a.context
      : {}) as BrandContext,
    turns: typeof a.turns === "number" && Number.isFinite(a.turns) ? a.turns : 0,
    done: a.done === true,
    proposedNames: Array.isArray(a.proposedNames)
      ? a.proposedNames.filter((n): n is string => typeof n === "string")
      : [],
    pendingQuestion: readPendingQuestion(a.pendingQuestion),
  };
}

function readPendingQuestion(value: unknown): PendingQuestion | undefined {
  if (!value || typeof value !== "object" || Array.isArray(value)) return undefined;
  const o = value as Record<string, unknown>;
  if (typeof o.text !== "string" || !o.text) return undefined;
  const inputType =
    o.inputType === "single_select" || o.inputType === "multi_select" ? o.inputType : "text";
  const options = Array.isArray(o.options)
    ? o.options.filter((x): x is string => typeof x === "string")
    : undefined;
  return { text: o.text, inputType, options };
}

/** The `data` patch for `brands_merge_data`. Always pass the WHOLE state —
 * the RPC replaces the `agent` key wholesale, it does not deep-merge it, so
 * a partial patch here would silently drop transcript/context already saved. */
export function agentStatePatch(state: AgentState): Record<string, unknown> {
  return { agent: state };
}
