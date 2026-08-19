import { generateOpenAIText } from "./openai";
import { serverEnv } from "@/lib/env/server";

// This is the reusable prompt created and maintained in the OpenAI platform.
// Deliberately do not pin a version: publishing a newer version there should
// update Fluid without a code deployment. Set the optional environment values
// only when a preview needs to stay on a specific prompt revision.
const PROMPT_ID =
  serverEnv.OPENAI_LETTERMARK_ANALYSIS_PROMPT_ID || "pmpt_6a71ddea001c8195bc04aa26d6cb7cf30ece838170135934";
const PROMPT_VERSION = serverEnv.OPENAI_LETTERMARK_ANALYSIS_PROMPT_VERSION;

function cleanPrompt(raw: string): string {
  return raw
    .replace(/^```(?:text|markdown)?\s*/i, "")
    .replace(/\s*```$/, "")
    .trim();
}

/**
 * Turn one liked lettermark into the reusable image-generation direction
 * authored in the OpenAI platform. The image URL is a public object from the
 * app's own reference catalogue, never user-controlled arbitrary input.
 */
export async function analyzeLettermarkReference(imageUrl: string): Promise<string> {
  // Platform prompts still need an explicit ceiling: without one (or with a
  // low dashboard default), reasoning models stop mid-direction with
  // max_output_tokens. This call feeds the croquis board directly.
  const result = await generateOpenAIText({
    prompt: {
      id: PROMPT_ID,
      ...(PROMPT_VERSION ? { version: PROMPT_VERSION } : {}),
    },
    input: [
      {
        role: "user",
        content: [
          {
            type: "input_image",
            image_url: imageUrl,
            detail: "high",
          },
        ],
      },
    ],
    maxOutputTokens: 16_000,
    timeoutMs: 120_000,
    acceptPartial: true,
  });

  const prompt = cleanPrompt(result);
  if (!prompt) throw new Error("The lettermark analysis prompt returned no usable generation direction.");
  if (!prompt.includes("{{letter}}")) {
    throw new Error("The lettermark analysis prompt must use the {{letter}} placeholder.");
  }
  return prompt;
}
