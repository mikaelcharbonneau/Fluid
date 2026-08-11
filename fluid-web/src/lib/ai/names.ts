// Phase 3 · Brand-name generation.
// A single, focused OpenAI call per wizard step (the "workflow" approach) —
// not a multi-agent system. Given the brief the user captured, ask OpenAI for
// a short list of distinct name candidates and return them as structured data
// the wizard's name grid can render directly.

import { generateOpenAIText } from "./openai";

// One generated name candidate. Kept lean — the grid shows just the name.
export interface GeneratedName {
  name: string;
  fit: number; // 0–100 self-assessed fit, used only for ordering
}

export interface NameBrief {
  brief: string;
  audience?: string | null;
  competitors?: string | null;
  styles?: string[];
  additionalDetails?: string | null;
}

const COUNT = 10;

// Leave enough room for the route to persist the results after the OpenAI
// response returns, while failing before Vercel's function deadline.
const CALL_TIMEOUT_MS = 105_000;

const SYSTEM = `You are Fluid, an expert brand strategist and naming consultant.
Given a short brand brief, you generate a varied set of distinct, memorable
brand name candidates.

Rules for the names you propose:
- Return exactly ${COUNT} candidates, ordered best-fit first.
- Make them genuinely varied in approach: mix literal, abstract, invented,
  metaphorical, compound, and evocative directions. Avoid near-duplicates.
- Prefer names that are short, easy to say, and easy to spell.
- Ground them in the specific brief — its audience, tone, and category.
- Do not comment on domain availability; you cannot verify it.

For each candidate provide:
- "name": the brand name itself (just the word or words, no punctuation).
- "fit": an integer 0–100 estimating how well it fits the brief (be discerning;
  use the full range, don't cluster everything near 90).

Respond with ONLY a JSON array of ${COUNT} objects with those two keys.
No prose before or after, no markdown code fences.`;

function buildUserPrompt(input: NameBrief): string {
  const lines = [`Brand brief: ${input.brief.trim()}`];
  const audience = (input.audience ?? "").trim();
  const competitors = (input.competitors ?? "").trim();
  const styles = (input.styles ?? []).map((style) => style.trim()).filter(Boolean);
  const additionalDetails = (input.additionalDetails ?? "").trim();
  if (audience) lines.push(`Target audience: ${audience}`);
  if (competitors) lines.push(`Competitors / adjacent brands: ${competitors}`);
  if (styles.length) {
    lines.push(
      `Prioritize these naming directions across the set: ${styles.join(", ")}.`,
      `Treat them as creative guides, not literal words to include in every name.`,
      `Make the candidates meaningfully cover the selected directions.`,
      `Do not introduce unrequested naming styles as the main direction.`,
      ``,
      `Additional naming details: ${additionalDetails || "None."}`,
      ``,
    );
  }
  if (!styles.length && additionalDetails) {
    lines.push(`Additional naming details: ${additionalDetails}`, ``);
  }
  lines.push(`\nGenerate ${COUNT} name candidates as a JSON array.`);
  return lines.join("\n");
}

// Pull a JSON array out of model text. Reasoning models sometimes hit the
// output-token ceiling mid-array; when that happens we still salvage every
// complete object rather than failing the whole generation.
function parseNameArray(text: string): unknown[] {
  let raw = text.trim();
  const fence = raw.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fence) raw = fence[1].trim();

  const start = raw.indexOf("[");
  if (start === -1) throw new Error("No JSON array found in model response.");
  raw = raw.slice(start);

  const tryParse = (slice: string): unknown[] | null => {
    try {
      const parsed = JSON.parse(slice) as unknown;
      return Array.isArray(parsed) ? parsed : null;
    } catch {
      return null;
    }
  };

  const end = raw.lastIndexOf("]");
  if (end > 0) {
    const complete = tryParse(raw.slice(0, end + 1));
    if (complete) return complete;
  }

  // Truncated mid-array: close after the last complete object.
  const lastObj = raw.lastIndexOf("}");
  if (lastObj === -1) throw new Error("No JSON array found in model response.");
  const repaired = `${raw.slice(0, lastObj + 1).replace(/,\s*$/, "")}]`;
  const partial = tryParse(repaired);
  if (partial) return partial;

  throw new Error("No JSON array found in model response.");
}

// Pull the JSON array out of the model's text response, tolerating stray prose
// or markdown fences even though we ask for neither.
function extractNames(text: string): GeneratedName[] {
  const parsed = parseNameArray(text);

  const cleaned: GeneratedName[] = [];
  const seen = new Set<string>();
  for (const item of parsed) {
    if (!item || typeof item !== "object") continue;
    const o = item as Record<string, unknown>;
    const name = String(o.name ?? "").trim();
    if (!name) continue;
    const key = name.toLowerCase();
    if (seen.has(key)) continue; // drop duplicates
    seen.add(key);
    let fit = Math.round(Number(o.fit));
    if (!Number.isFinite(fit)) fit = 70;
    fit = Math.max(0, Math.min(100, fit));
    cleaned.push({ name, fit });
  }
  if (cleaned.length === 0) throw new Error("Model returned no usable names.");
  return cleaned.slice(0, COUNT);
}

// Generate brand-name candidates for a brief. Throws on missing credentials or
// an unparseable response; the caller maps that to an HTTP error.
export async function generateBrandNames(
  input: NameBrief,
): Promise<GeneratedName[]> {
  // Reasoning models charge thinking tokens against max_output_tokens. Ten
  // short name objects are cheap; the thinking budget is not. Leave headroom
  // and accept a partial array if the model still truncates.
  const text = await generateOpenAIText({
    instructions: SYSTEM,
    input: buildUserPrompt(input),
    maxOutputTokens: 32_000,
    reasoningEffort: "low",
    timeoutMs: CALL_TIMEOUT_MS,
    acceptPartial: true,
  });

  return extractNames(text);
}
