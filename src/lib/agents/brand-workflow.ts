import { Agent, Runner } from "@openai/agents";
import { z } from "zod";

export const brandBasicsSchema = z.object({
  about: z.string().min(1),
  audience: z.string().min(1),
  difference: z.string().optional(),
  competitors: z.array(z.string()).default([]),
  styleDirection: z.string().optional(),
});

export const brandStrategyOutputSchema = z.object({
  positioning: z.string(),
  audienceInsight: z.string(),
  personality: z.array(z.string()),
  namingTerritories: z.array(z.string()),
  visualDirection: z.string(),
  recommendedStyle: z.enum(["modern", "minimal", "bold", "classic", "playful", "luxurious"]),
  suggestedNames: z.array(z.string()).min(4).max(8),
  tagline: z.string(),
});

const brandStrategistAgent = new Agent({
  name: "Fluid Brand Strategist",
  instructions:
    "You are a senior brand strategist for Fluid. Turn early brand inputs into concise, premium, usable brand strategy. Avoid generic startup language. Be specific, tasteful, and commercially useful. Return names that are short, ownable, and appropriate for a contemporary digital brand.",
  outputType: brandStrategyOutputSchema,
});

const brandWorkflowRunner = new Runner({
  workflowName: "Fluid brand strategy",
});

export async function createBrandStrategy(
  input: z.infer<typeof brandBasicsSchema>,
): Promise<z.infer<typeof brandStrategyOutputSchema>> {
  const parsedInput = brandBasicsSchema.parse(input);

  if (!process.env.OPENAI_API_KEY) {
    return createDemoBrandStrategy(parsedInput);
  }

  const result = await brandWorkflowRunner.run(
    brandStrategistAgent,
    `Create a brand strategy foundation for this company:\n${JSON.stringify(parsedInput, null, 2)}`,
  );

  if (!result.finalOutput) {
    throw new Error("Brand strategy generation returned no output.");
  }

  return result.finalOutput;
}

function clamp(value: string, max = 120) {
  const trimmed = value.trim();
  return trimmed.length > max ? `${trimmed.slice(0, max)}…` : trimmed;
}

function createDemoBrandStrategy(input: z.infer<typeof brandBasicsSchema>) {
  const audience = clamp(input.audience) || "ambitious teams";
  const focus = clamp(input.about) || "a company creating clarity for its customers";

  return {
    positioning: `A focused, high-trust brand for ${audience}, built around clarity, momentum, and confident decision-making.`,
    audienceInsight: `${audience} want tools and partners that reduce ambiguity without making the work feel rigid or generic.`,
    personality: ["Clear", "Fresh", "Assured", "Useful"],
    namingTerritories: ["Clarity and flow", "Momentum", "Signal", "Simple systems"],
    visualDirection: `A modern identity with soft motion, generous whitespace, and fluid gradient accents that make ${focus} feel precise but approachable.`,
    recommendedStyle: "modern" as const,
    suggestedNames: [
      "ClarityFlow",
      "Lumiq",
      "Intentra",
      "Novaform",
      "Mindscape",
      "Peakora",
      "Virelo",
      "Elevan",
    ],
    tagline: "Empowering teams with clarity and flow.",
  };
}
