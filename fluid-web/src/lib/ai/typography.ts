// Phase 3 · Brand typography generation.
// One focused OpenAI call: given the brief, recommend a heading + body type
// pairing drawn from Google Fonts (so the Brand Kit can render a real specimen),
// with weights, usage, and a rationale.

import { generateOpenAIText } from "./openai";

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
  styleContext?: string | null; // resolved Step 2 choices
  chosenFonts?: { heading: string; body: string } | null; // Step 2 font pick
}


// api/generate/typography has a 60s maxDuration and makes one call; bounded
// under that so a stuck call fails clearly instead of the platform killing
// the function mid-response (the SDK's own default is 10 minutes).
const CALL_TIMEOUT_MS = 50_000;

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
  const ctx = (input.styleContext ?? "").trim();
  if (name) lines.push(`Brand name: ${name}`);
  if (audience) lines.push(`Target audience: ${audience}`);
  if (ctx) lines.push(`\nThe user's design choices so far:\n${ctx}`);
  if (input.chosenFonts) {
    lines.push(
      `\nThe user has ALREADY chosen the fonts: heading = "${input.chosenFonts.heading}", ` +
        `body = "${input.chosenFonts.body}". Use exactly these families — do not pick different ` +
        `ones. Fill in the category, weights, usage, and rationale around them.`,
    );
  }
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
  const text = await generateOpenAIText({
    instructions: SYSTEM,
    input: buildUserPrompt(input),
    maxOutputTokens: 3_000,
    timeoutMs: CALL_TIMEOUT_MS,
  });

  return extractTypography(text);
}
