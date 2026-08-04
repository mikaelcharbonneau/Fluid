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
  maxOutputTokens = 4_000,
  reasoningEffort = "medium",
  timeoutMs = 120_000,
  json = false,
}: {
  instructions: string;
  input: string | unknown[];
  maxOutputTokens?: number;
  reasoningEffort?: "low" | "medium" | "high";
  timeoutMs?: number;
  json?: boolean;
}): Promise<string> {
  const response = await fetch(OPENAI_RESPONSES_URL, {
    method: "POST",
    signal: AbortSignal.timeout(timeoutMs),
    headers: {
      Authorization: `Bearer ${apiKey()}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: process.env.OPENAI_TEXT_MODEL?.trim() || "gpt-5",
      instructions,
      input,
      reasoning: { effort: reasoningEffort },
      max_output_tokens: maxOutputTokens,
      ...(json ? { text: { format: { type: "json_object" } } } : {}),
    }),
  });

  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    throw new Error(`OpenAI generation failed (${response.status}): ${detail.slice(0, 300)}`);
  }

  const payload = await response.json() as OpenAIResponse;
  if (payload.status && payload.status !== "completed") {
    throw new Error(payload.error?.message ?? payload.incomplete_details?.reason ?? `OpenAI generation ended as ${payload.status}.`);
  }
  const text = outputText(payload);
  if (!text) throw new Error("OpenAI returned no text.");
  return text;
}
