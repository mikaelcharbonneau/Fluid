// Phase 3 · Brand typography generation.
// One focused Claude call: given the brief, recommend a heading + body type
// pairing drawn from Google Fonts (so the Brand Kit can render a real specimen),
// with weights, usage, and a rationale.

import Anthropic from "@anthropic-ai/sdk";

export interface TypeFace {
  family: string; // exact Google Fonts family name, e.g. "Fraunces"
  category: string; // serif | sans-serif | display | monospace (CSS fallback)
  weights: string; // human note on weights to use, e.g. "600 / 700 for headings"
  usage: string; // where it's used
}

export interface TypographyResult {
  heading: TypeFace;
  body: TypeFace;
  rationale: string;
}

export interface TypographyBrief {
  brief: string;
  audience?: string | null;
  name?: string | null;
  style?: string | null;
}

const MODEL = "claude-opus-4-8";

const CATEGORIES = ["serif", "sans-serif", "display", "monospace"];

const SYSTEM = `You are Fluid, an expert brand designer specializing in typography.
Given a brand brief, you recommend a two-font pairing: one for headings/display
and one for body text.

Rules:
- Both fonts MUST be real families available on Google Fonts. Use the exact
  family name as it appears on Google Fonts (e.g. "Fraunces", "Inter",
  "Space Grotesk", "Libre Franklin"). Do not invent fonts or name commercial
  fonts that aren't on Google Fonts.
- The pairing must suit the brief's tone, audience, and category, and the two
  fonts must genuinely contrast yet harmonize (don't pair two near-identical
  sans-serifs).
- Favor highly legible body fonts.

For each of "heading" and "body" provide:
- "family": the exact Google Fonts family name.
- "category": one of ${CATEGORIES.join(", ")} (the closest CSS fallback class).
- "weights": a short note on which weights to use (e.g. "700 for display, 600 for subheads").
- "usage": a short phrase on where the font is used.

Also provide "rationale": one or two sentences on why this pairing fits the brief.

Respond with ONLY a JSON object of the form
{"heading": {...}, "body": {...}, "rationale": "..."}
No prose before or after, no markdown code fences.`;

function buildUserPrompt(input: TypographyBrief): string {
  const lines = [`Brand brief: ${input.brief.trim()}`];
  const name = (input.name ?? "").trim();
  const audience = (input.audience ?? "").trim();
  const style = (input.style ?? "").trim();
  if (name) lines.push(`Brand name: ${name}`);
  if (audience) lines.push(`Target audience: ${audience}`);
  if (style) lines.push(`Chosen visual direction: ${style}`);
  lines.push(`\nRecommend the type pairing as a JSON object.`);
  return lines.join("\n");
}

function coerceFace(value: unknown, fallbackCategory: string): TypeFace {
  const o = (value ?? {}) as Record<string, unknown>;
  const family = String(o.family ?? "").trim();
  if (!family) throw new Error("Missing font family in model response.");
  let category = String(o.category ?? "").trim().toLowerCase();
  if (!CATEGORIES.includes(category)) category = fallbackCategory;
  return {
    family,
    category,
    weights: String(o.weights ?? "").trim(),
    usage: String(o.usage ?? "").trim(),
  };
}

function extractTypography(text: string): TypographyResult {
  let raw = text.trim();
  const fence = raw.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fence) raw = fence[1].trim();
  const start = raw.indexOf("{");
  const end = raw.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) {
    throw new Error("No JSON object found in model response.");
  }
  const obj = JSON.parse(raw.slice(start, end + 1)) as Record<string, unknown>;
  return {
    heading: coerceFace(obj.heading, "sans-serif"),
    body: coerceFace(obj.body, "sans-serif"),
    rationale: String(obj.rationale ?? "").trim(),
  };
}

export async function generateBrandTypography(
  input: TypographyBrief,
): Promise<TypographyResult> {
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new Error("ANTHROPIC_API_KEY is not configured.");
  }

  const client = new Anthropic();
  const response = await client.messages.create({
    model: MODEL,
    max_tokens: 3000,
    thinking: { type: "adaptive" },
    system: SYSTEM,
    messages: [{ role: "user", content: buildUserPrompt(input) }],
  });

  const text = response.content
    .filter((b): b is Anthropic.TextBlock => b.type === "text")
    .map((b) => b.text)
    .join("\n");

  return extractTypography(text);
}
