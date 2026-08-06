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
  const response = await fetch(OPENAI_RESPONSES_URL, {
    method: "POST",
    signal: AbortSignal.timeout(timeoutMs),
    headers: {
      Authorization: `Bearer ${apiKey()}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      input,
      ...(selectedModel ? { model: selectedModel } : {}),
      ...(instructions?.trim() ? { instructions: instructions.trim() } : {}),
      ...(prompt ? { prompt } : {}),
      ...(selectedReasoning ? { reasoning: { effort: selectedReasoning } } : {}),
      ...(maxOutputTokens ? { max_output_tokens: maxOutputTokens } : {}),
      ...(json ? { text: { format: { type: "json_object" } } } : {}),
    }),
  });

  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    throw new Error(`OpenAI generation failed (${response.status}): ${detail.slice(0, 300)}`);
  }

  const payload = await response.json() as OpenAIResponse;
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
