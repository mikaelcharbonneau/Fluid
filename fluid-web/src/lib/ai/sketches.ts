// Phase 1 · Divergence — 9 low-fidelity concept sketches (croquis).
//
// Real variety comes from fan-out, not from asking one call for 9 concepts
// (which mode-collapses into near-duplicates). We run 3 parallel "designer"
// calls, each assigned a strategic territory from the creative platform and a
// family of mark types, each producing 3 concepts. Every concept carries
// structured metadata (territory, mark type, formal attributes, rationale) —
// the metadata is what lets the user's likes actually orient Phase 2, rather
// than just pointing at pictures.

import Anthropic from "@anthropic-ai/sdk";
import { sanitizeSvg } from "./logo";
import type { CreativePlatform } from "./platform";
import {
  MARK_TYPES,
  DESIGN_PRINCIPLES,
  ANTI_CLICHE,
  CRITIQUE_RUBRIC,
  CROQUIS_STYLE,
} from "./design";

export interface LogoSketch {
  id: string;
  name: string; // concept name, e.g. "Ledger stripe"
  territory: string; // territory key from the platform
  territory_name: string;
  mark_type: string; // wordmark | lettermark | pictorial | abstract | emblem | combination | dynamic
  attributes: string[]; // formal attributes, e.g. ["geometric", "bold", "structural"]
  idea: string; // one-line rationale
  svg: string; // sanitized croquis SVG
}

export interface SketchBrief {
  brief: string;
  name?: string | null;
  platform: CreativePlatform;
  styleContext?: string | null;
  likedSketches?: LogoSketch[] | null; // bias regeneration toward these
  avoidNames?: string[] | null; // previously shown concepts — don't repeat
}

const MODEL = "claude-opus-4-8";

// Each parallel call explores one family of mark types, so the 9-up board
// spreads across the taxonomy instead of clustering on abstract symbols.
const TYPE_GROUPS: { label: string; types: string }[] = [
  { label: "typographic", types: "wordmark and lettermark marks" },
  { label: "symbol", types: "pictorial and abstract marks" },
  { label: "structural", types: "combination, emblem, or dynamic marks" },
];

const SYSTEM = `You are a senior identity designer at Fluid, a brand studio
operating at the level of Pentagram or Wolff Olins. You are in the DIVERGENCE
phase: producing quick concept sketches (croquis) for a 9-up exploration board.
These are marker-on-paper thumbnails of IDEAS, not finished marks — the client
will pick directions from them, so clarity of concept beats beauty of render.

${MARK_TYPES}

${DESIGN_PRINCIPLES}

${ANTI_CLICHE}

Your sketches will later be judged against this rubric — design accordingly:
${CRITIQUE_RUBRIC}

${CROQUIS_STYLE}

Produce EXACTLY 3 concepts, each a genuinely different idea (not one idea in
three weights). Output EXACTLY this format, nothing else — no prose, no code
fences. Repeat the block 3 times:

===CONCEPT===
NAME: <short evocative concept name, 1-3 words>
TYPE: <one mark-type key>
ATTRS: <3-5 comma-separated formal attributes, e.g. geometric, quiet, structural>
IDEA: <one sentence: the concept and why it expresses the territory>
<svg viewBox="0 0 120 120" width="120" height="120" xmlns="http://www.w3.org/2000/svg">...</svg>`;

function buildUserPrompt(
  input: SketchBrief,
  territoryIdx: number,
  group: (typeof TYPE_GROUPS)[number],
): string {
  const p = input.platform;
  const territory = p.territories[territoryIdx % p.territories.length];
  const lines = [
    `Brand brief: ${input.brief.trim()}`,
    input.name?.trim() ? `Brand name: ${input.name.trim()}` : "",
    ``,
    `Creative platform:`,
    `- Brand idea: ${p.brand_idea}`,
    p.personality.length ? `- Personality: ${p.personality.join(", ")}` : "",
    p.design_notes ? `- Design notes: ${p.design_notes}` : "",
    ``,
    `YOUR ASSIGNMENT for this board section:`,
    `- Territory to express: "${territory.name}" — ${territory.description}`,
    `- Mark-type focus: ${group.types}. All 3 concepts from this family, but`,
    `  each must be a different approach within it.`,
  ];
  const ctx = (input.styleContext ?? "").trim();
  if (ctx) lines.push(``, `The user's design choices so far:`, ctx);
  const liked = input.likedSketches ?? [];
  if (liked.length) {
    lines.push(
      ``,
      `The client responded well to these earlier directions — let their`,
      `formal qualities inform (not copy) your new concepts:`,
      ...liked.map(
        (s) => `- "${s.name}" (${s.mark_type}; ${s.attributes.join(", ")}): ${s.idea}`,
      ),
    );
  }
  const avoid = (input.avoidNames ?? []).filter(Boolean);
  if (avoid.length) {
    lines.push(
      ``,
      `Concepts already shown — do NOT repeat these ideas: ${avoid.join(", ")}.`,
    );
  }
  lines.push(``, `Sketch 3 concepts in the required format.`);
  return lines.filter((l) => l !== null && l !== undefined).join("\n");
}

// Parse one call's ===CONCEPT=== blocks into sketches.
function extractSketches(
  text: string,
  territory: { key: string; name: string },
): Omit<LogoSketch, "id">[] {
  const raw = text.replace(/```[a-z]*\n?|```/gi, "").trim();
  let segments = raw.split(/===\s*CONCEPT\s*===/i).map((s) => s.trim()).filter(Boolean);
  if (segments.length <= 1) {
    segments = raw.split(/(?=<svg\b)/i).map((s) => s.trim()).filter(Boolean);
  }
  const out: Omit<LogoSketch, "id">[] = [];
  for (const seg of segments) {
    const svg = sanitizeSvg(seg);
    if (!svg) continue;
    const name = seg.match(/NAME:\s*(.+)/i)?.[1]?.trim() ?? "";
    const type = seg.match(/TYPE:\s*(.+)/i)?.[1]?.trim().toLowerCase() ?? "abstract";
    const attrs = (seg.match(/ATTRS:\s*(.+)/i)?.[1] ?? "")
      .split(",")
      .map((a) => a.trim())
      .filter(Boolean);
    const idea = seg.match(/IDEA:\s*(.+)/i)?.[1]?.trim() ?? "";
    out.push({
      name: name || "Concept",
      territory: territory.key,
      territory_name: territory.name,
      mark_type: type,
      attributes: attrs,
      idea,
      svg,
    });
  }
  return out;
}

export async function generateLogoSketches(
  input: SketchBrief,
): Promise<LogoSketch[]> {
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new Error("ANTHROPIC_API_KEY is not configured.");
  }
  const client = new Anthropic();

  // 3 parallel designers: territory rotates through the platform's territories,
  // mark-type family differs per call.
  const jobs = TYPE_GROUPS.map(async (group, i) => {
    const territory =
      input.platform.territories[i % input.platform.territories.length];
    const response = await client.messages.create({
      model: MODEL,
      max_tokens: 8000,
      thinking: { type: "adaptive" },
      system: SYSTEM,
      messages: [{ role: "user", content: buildUserPrompt(input, i, group) }],
    });
    const text = response.content
      .filter((b): b is Anthropic.TextBlock => b.type === "text")
      .map((b) => b.text)
      .join("\n");
    return extractSketches(text, territory);
  });

  const settled = await Promise.allSettled(jobs);
  const sketches: LogoSketch[] = [];
  const seen = new Set<string>();
  let n = 0;
  for (const result of settled) {
    if (result.status !== "fulfilled") continue;
    for (const s of result.value) {
      // De-duplicate concept names across calls so likes reference uniquely.
      let name = s.name;
      let suffix = 2;
      while (seen.has(name.toLowerCase())) name = `${s.name} ${suffix++}`;
      seen.add(name.toLowerCase());
      n += 1;
      sketches.push({ ...s, name, id: `sk_${Date.now().toString(36)}_${n}` });
    }
  }
  if (sketches.length === 0) {
    // Surface the first failure if every call died; otherwise the model
    // returned nothing usable.
    const firstError = settled.find(
      (r): r is PromiseRejectedResult => r.status === "rejected",
    );
    if (firstError) throw firstError.reason;
    throw new Error("The studio returned no usable sketches.");
  }
  return sketches.slice(0, 9);
}
