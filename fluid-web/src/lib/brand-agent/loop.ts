// The per-HTTP-turn driver: one user message in, one model-decided chunk of
// work out.
//
// A "turn" here can mean several model round-trips chained together — e.g.
// record one answer, then immediately propose names — because the model
// itself decides when it has enough to act, not a fixed step order. This
// loop just bounds how many round-trips one HTTP request will chase before
// giving up and returning whatever it has, so a model that keeps calling
// tools without ever asking anything can't hang the route.

import { generateOpenAIAgentTurn, type ResponsesItem } from "@/lib/ai/openai";
import { hasTokens, spendTokens, TOKEN_COST } from "@/lib/credits";
import type { Activity } from "@/lib/ai/activity";
import type { StepPayload } from "@/lib/brand-chat/step";
import type { AgentState, PendingQuestion } from "./transcript";
import { ALL_TOOL_DEFS, isGeneratorTool, runTool, type ToolContext } from "./tools";
import { buildAgentInstructions } from "./prompt";

// The prompt instructs "ask, don't dump" — most turns are one record plus
// maybe one generator call. Six is a safety rail for the rare case the model
// chains several actions before asking anything, not the common path: each
// round-trip is one model call plus, for a generator, a full skill run (up
// to ~220s per generate.ts's own budgets), so a worst case of six back-to-
// back generators could approach the route's 300s ceiling.
const MAX_MODEL_ROUNDTRIPS_PER_TURN = 6;

export interface AgentTurnOutcome {
  state: AgentState;
  assistantText: string;
  payload?: StepPayload;
  pendingQuestion?: PendingQuestion;
  done: boolean;
  degraded?: string;
}

function userMessageItem(text: string): ResponsesItem {
  return { type: "message", role: "user", content: [{ type: "input_text", text }] };
}

/** `output` must already be a JSON string — callers that have a plain
 * object stringify it themselves; callers passing along a ToolRunResult's
 * `output` (already stringified by tools.ts) pass it straight through, so
 * nothing here ever double-encodes it. */
function toolOutputItem(callId: string, output: string): ResponsesItem {
  return { type: "function_call_output", call_id: callId, output };
}

export async function runAgentTurn(opts: {
  state: AgentState;
  /** The user's reply. Omit only to open/resume a thread with no new answer
   * — the model then produces its opening question. */
  userMessage: string | null;
  userId: string;
  brandId: string;
  activity: Activity;
  /** Called after every context-changing step, before any risky generator
   * call — so a crash mid-generation never loses answers already given. */
  onSave: (state: AgentState) => Promise<void>;
}): Promise<AgentTurnOutcome> {
  let state = opts.state;
  const tc: ToolContext = { brandId: opts.brandId, activity: opts.activity };

  if (opts.userMessage !== null) {
    state = { ...state, transcript: [...state.transcript, userMessageItem(opts.userMessage)] };
  }

  let assistantText = "";
  let payload: StepPayload | undefined;
  let pendingQuestion: PendingQuestion | undefined;

  for (let round = 0; round < MAX_MODEL_ROUNDTRIPS_PER_TURN; round++) {
    const endPhase = opts.activity.phase("Thinking");
    let result;
    try {
      result = await generateOpenAIAgentTurn({
        instructions: buildAgentInstructions(state),
        input: state.transcript,
        tools: ALL_TOOL_DEFS,
        reasoningEffort: "low",
        maxOutputTokens: 4_000,
        timeoutMs: 60_000,
      });
    } finally {
      endPhase();
    }

    state = {
      ...state,
      transcript: [...state.transcript, ...result.outputItems],
      turns: state.turns + 1,
    };

    if (result.isFinal) {
      assistantText = result.outputText;
      break;
    }

    let sawAskQuestion = false;

    for (const call of result.toolCalls) {
      if (call.name === "ask_question") {
        const args = (call.arguments ?? {}) as { text?: string; input_type?: string; options?: unknown };
        const inputType =
          args.input_type === "single_select" || args.input_type === "multi_select"
            ? args.input_type
            : "text";
        pendingQuestion = {
          text: typeof args.text === "string" && args.text.trim() ? args.text.trim() : "What should we cover next?",
          inputType,
          options: Array.isArray(args.options)
            ? args.options.filter((o): o is string => typeof o === "string")
            : undefined,
        };
        assistantText = pendingQuestion.text;
        state = { ...state, transcript: [...state.transcript, toolOutputItem(call.callId, JSON.stringify({ status: "asked" }))] };
        sawAskQuestion = true;
        continue;
      }

      if (call.arguments === null) {
        state = {
          ...state,
          transcript: [...state.transcript, toolOutputItem(call.callId, JSON.stringify({ error: "Arguments were not valid JSON." }))],
        };
        continue;
      }

      if (isGeneratorTool(call.name)) {
        const canAfford = await hasTokens(opts.userId, TOKEN_COST.asset);
        if (!canAfford) {
          state = { ...state, transcript: [...state.transcript, toolOutputItem(call.callId, JSON.stringify({ error: "out_of_tokens" }))] };
          continue;
        }

        const outcome = await runTool(call.name, call.arguments, state, tc);
        const remaining = await spendTokens(opts.userId, TOKEN_COST.asset);
        if (remaining === null) {
          // Lost a race against another request between the check and the
          // spend. Report exactly like a failed pre-check rather than
          // handing back a result nothing was paid for.
          state = { ...state, transcript: [...state.transcript, toolOutputItem(call.callId, JSON.stringify({ error: "out_of_tokens" }))] };
          continue;
        }

        state = {
          ...state,
          context: outcome.context,
          proposedNames: outcome.proposedNames,
          done: outcome.done ?? state.done,
          transcript: [...state.transcript, toolOutputItem(call.callId, outcome.output)],
        };
        if (outcome.clientPayload) payload = outcome.clientPayload;
        continue;
      }

      // record_answer / select_* — free, immediate, no billing.
      const outcome = await runTool(call.name, call.arguments, state, tc);
      state = {
        ...state,
        context: outcome.context,
        proposedNames: outcome.proposedNames,
        transcript: [...state.transcript, toolOutputItem(call.callId, outcome.output)],
      };
    }

    await opts.onSave(state);

    if (sawAskQuestion || state.done) break;
  }

  let degraded: string | undefined;
  if (!assistantText && !pendingQuestion) {
    degraded = "That took a few more steps than usual — here's where things stand.";
    assistantText = degraded;
  }

  // A resumed/reloaded thread has no live model call to ask again, so
  // whatever the thread is waiting on has to be stored, not recomputed. A
  // plain closing message with no explicit ask_question still counts as
  // "waiting on a reply" unless the thread is actually done — the model
  // isn't required to call the tool for every question it asks in prose.
  if (!state.done && !pendingQuestion) {
    pendingQuestion = { text: assistantText, inputType: "text" };
  }
  state = { ...state, pendingQuestion: state.done ? undefined : pendingQuestion };

  await opts.onSave(state);

  return { state, assistantText, payload, pendingQuestion: state.pendingQuestion, done: state.done, degraded };
}
