const OPENAI_RESPONSES_URL = "https://api.openai.com/v1/responses";

type OpenAIResponse = {
  output_text?: string;
  output?: Array<{ content?: Array<{ type?: string; text?: string }> }>;
  status?: string;
  error?: { message?: string };
  incomplete_details?: { reason?: string };
};

function apiKey(): string {
  const key = (process.env.OPENAI_API_KEY ?? "").trim();
  if (!key) throw new Error("OPENAI_API_KEY is not configured.");
  return key;
}

function outputText(response: OpenAIResponse): string {
  if (response.output_text?.trim()) return response.output_text;
  return (response.output ?? [])
    .flatMap((item) => item.content ?? [])
    .filter((item) => item.type === "output_text")
    .map((item) => item.text ?? "")
    .join("\n")
    .trim();
}

/** POST one request body to the Responses API and return the parsed JSON.
 * Shared by every caller in this file — text-only and tool-calling alike —
 * so the auth header, timeout, and non-2xx error mapping stay in one place. */
async function postResponses(
  body: Record<string, unknown>,
  timeoutMs: number,
): Promise<Record<string, unknown>> {
  const response = await fetch(OPENAI_RESPONSES_URL, {
    method: "POST",
    signal: AbortSignal.timeout(timeoutMs),
    headers: {
      Authorization: `Bearer ${apiKey()}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    throw new Error(`OpenAI generation failed (${response.status}): ${detail.slice(0, 300)}`);
  }
  return response.json();
}

export async function generateOpenAIText({
  instructions,
  input,
  model,
  maxOutputTokens,
  reasoningEffort,
  timeoutMs = 120_000,
  json = false,
  prompt,
  acceptPartial = false,
}: {
  instructions?: string;
  input: string | unknown[];
  model?: string;
  maxOutputTokens?: number;
  reasoningEffort?: "low" | "medium" | "high";
  timeoutMs?: number;
  json?: boolean;
  /** A reusable prompt saved in the OpenAI platform. */
  prompt?: { id: string; version?: string };
  /**
   * When the model hits max_output_tokens mid-response, return whatever text
   * was produced instead of failing. Useful for large JSON lists where a
   * truncated array is still usable.
   */
  acceptPartial?: boolean;
}): Promise<string> {
  // Dashboard prompts own their configured model and reasoning settings. The
  // standard code-managed calls retain the app's established defaults.
  const selectedModel = prompt
    ? model?.trim() || ""
    : model?.trim() || process.env.OPENAI_TEXT_MODEL?.trim() || "gpt-5";
  const selectedReasoning = reasoningEffort ?? (prompt ? undefined : "medium");
  const payload = await postResponses(
    {
      input,
      ...(selectedModel ? { model: selectedModel } : {}),
      ...(instructions?.trim() ? { instructions: instructions.trim() } : {}),
      ...(prompt ? { prompt } : {}),
      ...(selectedReasoning ? { reasoning: { effort: selectedReasoning } } : {}),
      ...(maxOutputTokens ? { max_output_tokens: maxOutputTokens } : {}),
      ...(json ? { text: { format: { type: "json_object" } } } : {}),
    },
    timeoutMs,
  ) as OpenAIResponse;
  if (payload.status && payload.status !== "completed") {
    const partial = outputText(payload);
    if (
      acceptPartial &&
      partial &&
      payload.incomplete_details?.reason === "max_output_tokens"
    ) {
      console.warn(
        "[openai] response truncated at max_output_tokens; returning partial text",
        { model: selectedModel || "(prompt)", chars: partial.length },
      );
      return partial;
    }
    if (payload.incomplete_details?.reason === "max_output_tokens") {
      throw new Error("OpenAI stopped before completing the response because it reached its output-token limit.");
    }
    throw new Error(payload.error?.message ?? payload.incomplete_details?.reason ?? `OpenAI generation ended as ${payload.status}.`);
  }
  const text = outputText(payload);
  if (!text) throw new Error("OpenAI returned no text.");
  return text;
}

// ---- tool-calling turns ------------------------------------------------
//
// `generateOpenAIText` above is single-shot: one instructions+input pair in,
// one string out. An agent loop needs the opposite shape — a model that can
// either answer or ask to run one of a fixed set of tools, with the caller
// deciding what those tools actually do. This section adds that without
// touching the function above or its ~10 existing callers.

/** One function tool the model may call. Responses-API tools are flat —
 * unlike Chat Completions, there is no nested `function` wrapper. */
export interface ToolDef {
  type: "function";
  name: string;
  description: string;
  /** JSON Schema for the call's arguments. */
  parameters: Record<string, unknown>;
  strict?: boolean;
}

/** One item of a Responses-API conversation (`message`, `function_call`,
 * `function_call_output`, `reasoning`, ...). Opaque here on purpose — the
 * agent loop never inspects these, it only accumulates and replays them
 * verbatim, exactly as OpenAI's own multi-turn tool-use pattern expects. */
export type ResponsesItem = Record<string, unknown>;

export interface RequestedToolCall {
  callId: string;
  name: string;
  /** Parsed from the raw JSON string; `null` on malformed JSON so the loop
   * can report a tool-argument error back to the model instead of crashing. */
  arguments: unknown;
  argumentsRaw: string;
}

export interface AgentTurnResult {
  responseId: string;
  /** Concatenated assistant text, "" if the model only called tools. */
  outputText: string;
  /** Every item the model produced this call, in API order — message,
   * function_call, and any reasoning items alike. The caller MUST append
   * these to its transcript before appending function_call_output items for
   * the next call, or the API's call_id pairing desyncs. */
  outputItems: ResponsesItem[];
  toolCalls: RequestedToolCall[];
  /** True when the model produced a normal turn (text for the user) rather
   * than requesting work — i.e. toolCalls is empty. */
  isFinal: boolean;
}

/** Pure transform of one Responses API payload into an AgentTurnResult.
 * Split out from generateOpenAIAgentTurn so it can be exercised against
 * fixture JSON (message-only / single-tool-call / malformed-arguments)
 * without a real API call — see scripts/verify-brand-agent.mjs. */
export function parseAgentOutput(payload: Record<string, unknown>): AgentTurnResult {
  const output = Array.isArray(payload.output)
    ? (payload.output as Array<Record<string, unknown>>)
    : [];

  const textParts: string[] = [];
  const toolCalls: RequestedToolCall[] = [];

  for (const item of output) {
    if (item.type === "message") {
      const content = Array.isArray(item.content) ? item.content : [];
      for (const c of content as Array<Record<string, unknown>>) {
        if (c.type === "output_text" && typeof c.text === "string") textParts.push(c.text);
      }
    } else if (item.type === "function_call") {
      const raw = typeof item.arguments === "string" ? item.arguments : "";
      let parsed: unknown = null;
      try {
        parsed = raw ? JSON.parse(raw) : {};
      } catch {
        parsed = null;
      }
      toolCalls.push({
        callId: String(item.call_id ?? ""),
        name: String(item.name ?? ""),
        arguments: parsed,
        argumentsRaw: raw,
      });
    }
  }

  return {
    responseId: String(payload.id ?? ""),
    outputText: textParts.join("\n").trim(),
    outputItems: output,
    toolCalls,
    isFinal: toolCalls.length === 0,
  };
}

export async function generateOpenAIAgentTurn({
  instructions,
  input,
  tools,
  model,
  maxOutputTokens,
  reasoningEffort = "low",
  timeoutMs = 120_000,
  toolChoice = "auto",
}: {
  instructions?: string;
  /** The full replayed item history. Required — this function only makes
   * sense as one step of a multi-turn loop, never a single isolated call. */
  input: ResponsesItem[];
  tools: ToolDef[];
  model?: string;
  maxOutputTokens?: number;
  reasoningEffort?: "low" | "medium" | "high";
  timeoutMs?: number;
  toolChoice?: "auto" | "required" | { type: "function"; name: string };
}): Promise<AgentTurnResult> {
  const selectedModel = model?.trim() || process.env.OPENAI_TEXT_MODEL?.trim() || "gpt-5";
  const payload = await postResponses(
    {
      input,
      model: selectedModel,
      tools,
      tool_choice: toolChoice,
      ...(instructions?.trim() ? { instructions: instructions.trim() } : {}),
      ...(reasoningEffort ? { reasoning: { effort: reasoningEffort } } : {}),
      ...(maxOutputTokens ? { max_output_tokens: maxOutputTokens } : {}),
    },
    timeoutMs,
  );

  const status = payload.status as string | undefined;
  if (status && status !== "completed") {
    const details = (payload.incomplete_details as { reason?: string } | undefined) ?? {};
    const error = (payload.error as { message?: string } | undefined) ?? {};
    throw new Error(error.message ?? details.reason ?? `OpenAI generation ended as ${status}.`);
  }

  return parseAgentOutput(payload);
}
