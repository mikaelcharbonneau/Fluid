// Phase 3 · Brand-name generation.
// A single, focused Claude call per wizard step (the "workflow" approach) —
// not a multi-agent system. Given the brief the user captured, ask Claude for
// a set of distinct name candidates, each with a short rationale and a
// self-assessed fit score, and return them as structured data the wizard's
// name grid can render directly.

import Anthropic from "@anthropic-ai/sdk";

// One generated name candidate, shaped to match the wizard's ANameCard props.
export interface GeneratedName {
  name: string;
  kind: string; // short category label, e.g. "invented", "metaphor"
  why: string; // one-sentence rationale tied to the brief
  fit: number; // 0–100 self-assessed fit
}

export interface NameBrief {
  brief: string;
  audience?: string | null;
  competitors?: string | null;
}

const MODEL = "claude-opus-4-8";
const COUNT = 9;

const SYSTEM = `You are Fluid, an expert brand strategist and naming consultant.
Given a short brand brief, you generate distinct, memorable brand name candidates.

Rules for the names you propose:
- Return exactly ${COUNT} candidates, ordered best-fit first.
- Make them genuinely varied in approach: mix literal, abstract, invented,
  metaphorical, and evocative directions. No two should feel interchangeable.
- Prefer names that are short, easy to say, and easy to spell.
- Ground each rationale in the specific brief — reference the audience, tone, or
  category the user described. Never write generic filler.
- Do not comment on domain availability; you cannot verify it.

For each candidate provide:
- "name": the brand name itself (just the word or words, no punctuation flourishes).
- "kind": a two-or-three word lowercase label for the naming approach
  (e.g. "invented", "nature metaphor", "literal / category").
- "why": a single sentence, in quotes-free plain prose, explaining why it fits
  this brief specifically.
- "fit": an integer 0–100 estimating how well it fits the brief (be discerning;
  use the full range, don't cluster everything near 90).

Respond with ONLY a JSON array of ${COUNT} objects with those four keys.
No prose before or after, no markdown code fences.`;

function buildUserPrompt(input: NameBrief): string {
  const lines = [`Brand brief: ${input.brief.trim()}`];
  const audience = (input.audience ?? "").trim();
  const competitors = (input.competitors ?? "").trim();
  if (audience) lines.push(`Target audience: ${audience}`);
  if (competitors) lines.push(`Competitors / adjacent brands: ${competitors}`);
  lines.push(`\nGenerate ${COUNT} name candidates as a JSON array.`);
  return lines.join("\n");
}

// Pull the JSON array out of the model's text response, tolerating stray prose
// or markdown fences even though we ask for neither.
function extractNames(text: string): GeneratedName[] {
  let raw = text.trim();
  const fence = raw.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fence) raw = fence[1].trim();
  const start = raw.indexOf("[");
  const end = raw.lastIndexOf("]");
  if (start === -1 || end === -1 || end <= start) {
    throw new Error("No JSON array found in model response.");
  }

  const parsed = JSON.parse(raw.slice(start, end + 1)) as unknown;
  if (!Array.isArray(parsed)) throw new Error("Model response was not an array.");

  const cleaned: GeneratedName[] = [];
  for (const item of parsed) {
    if (!item || typeof item !== "object") continue;
    const o = item as Record<string, unknown>;
    const name = String(o.name ?? "").trim();
    if (!name) continue;
    let fit = Math.round(Number(o.fit));
    if (!Number.isFinite(fit)) fit = 70;
    fit = Math.max(0, Math.min(100, fit));
    cleaned.push({
      name,
      kind: String(o.kind ?? "").trim() || "concept",
      why: String(o.why ?? "").trim(),
      fit,
    });
  }
  if (cleaned.length === 0) throw new Error("Model returned no usable names.");
  return cleaned.slice(0, COUNT);
}

// Generate brand-name candidates for a brief. Throws on missing credentials or
// an unparseable response; the caller maps that to an HTTP error.
export async function generateBrandNames(
  input: NameBrief,
): Promise<GeneratedName[]> {
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new Error("ANTHROPIC_API_KEY is not configured.");
  }

  const client = new Anthropic();
  const response = await client.messages.create({
    model: MODEL,
    max_tokens: 4000,
    thinking: { type: "adaptive" },
    system: SYSTEM,
    messages: [{ role: "user", content: buildUserPrompt(input) }],
  });

  const text = response.content
    .filter((b): b is Anthropic.TextBlock => b.type === "text")
    .map((b) => b.text)
    .join("\n");

  return extractNames(text);
}
