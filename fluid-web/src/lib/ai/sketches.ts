// Phase 1 · Divergence — one low-fidelity concept sketch (croquis) at a time.
//
// One call, one concept, one render. The client reviews it and either likes it
// or asks for another — each additional call draws one more concept and adds
// it to the board rather than replacing it, so the collection grows exactly
// as fast as the client wants to look. Every concept carries structured
// metadata (territory, mark type, formal attributes, rationale) — the
// metadata is what lets the user's likes actually orient Phase 2, rather than
// just pointing at pictures.
//
// What a given call explores depends on the client's Step 4 brief and on how
// many concepts have been shown already (so repeated regeneration still walks
// across the taxonomy over time instead of circling one territory):
//   • Mark type chosen → the concept is that type; successive calls rotate
//     across the platform's strategic TERRITORIES instead.
//   • No mark type → successive calls rotate across mark-type families too,
//     so a run of regenerations still spreads across the taxonomy.

import Anthropic from "@anthropic-ai/sdk";
import { renderLogoImage } from "./images";
import type { Clock } from "./budget";
import type { CreativePlatform } from "./platform";
import {
  type LogoConfig,
  logoConfigContext,
  markTypeById,
} from "../logo-styles";
import {
  MARK_TYPES,
  DESIGN_PRINCIPLES,
  ANTI_CLICHE,
  CRITIQUE_RUBRIC,
} from "./design";

export interface LogoSketch {
  id: string;
  name: string; // concept name, e.g. "Ledger stripe"
  territory: string; // territory key from the platform
  territory_name: string;
  mark_type: string; // wordmark | lettermark | pictorial | abstract | emblem | combination | dynamic
  attributes: string[]; // formal attributes, e.g. ["geometric", "bold", "structural"]
  idea: string; // one-line rationale
  art: string; // the art direction that produced the image
  image_url: string; // rendered PNG in Supabase storage
}

export interface SketchBrief {
  brandId: string;
  brief: string;
  name?: string | null;
  platform: CreativePlatform;
  styleContext?: string | null;
  config?: LogoConfig | null; // the client's Step 4 brief
  likedSketches?: LogoSketch[] | null; // bias regeneration toward these
  avoidNames?: string[] | null; // previously shown concepts — don't repeat
  clock?: Clock | null; // phase timing, so the slow step shows up in the logs
}

const MODEL = "claude-opus-4-8";

// Successive single-concept calls rotate through mark-type families (when the
// client hasn't fixed one), so a run of regenerations still spreads across the
// taxonomy instead of clustering on abstract symbols.
const TYPE_GROUPS: { label: string; types: string }[] = [
  { label: "typographic", types: "wordmark and lettermark marks" },
  { label: "symbol", types: "pictorial and abstract marks" },
  { label: "structural", types: "combination, emblem, or dynamic marks" },
];

const SYSTEM = `You are a senior identity designer at Fluid, a brand studio
operating at the level of Pentagram or Wolff Olins. You are in the DIVERGENCE
phase: sketching ONE quick concept (a croquis) for the client to react to.
This is a marker-on-paper thumbnail of an IDEA, not a finished mark — the
client will react to it and either like it or ask for another, so clarity of
concept beats beauty of render.

${MARK_TYPES}

${DESIGN_PRINCIPLES}

${ANTI_CLICHE}

Your sketch will later be judged against this rubric — design accordingly:
${CRITIQUE_RUBRIC}

Produce EXACTLY 1 concept. Output EXACTLY this format, nothing else — no
prose, no code fences:

===CONCEPT===
NAME: <short evocative concept name, 1-3 words>
TYPE: <one mark-type key>
ATTRS: <3-5 comma-separated formal attributes, e.g. geometric, quiet, structural>
IDEA: <one sentence: the concept and why it expresses the territory>
ART: <a precise art-direction brief describing the mark to be drawn: the exact
forms, their arrangement, proportion, weight, and colour. Write it so an
illustrator could execute it without seeing your head. Describe ONLY the mark
itself — never the background, framing, or rendering style.>`;

function buildUserPrompt(
  input: SketchBrief,
  territory: { name: string; description: string },
  group: (typeof TYPE_GROUPS)[number] | null,
): string {
  const p = input.platform;
  const lines = [
    `Brand brief: ${input.brief.trim()}`,
    input.name?.trim() ? `Brand name: ${input.name.trim()}` : "",
    ``,
    `Creative platform:`,
    `- Brand idea: ${p.brand_idea}`,
    p.personality.length ? `- Personality: ${p.personality.join(", ")}` : "",
    p.design_notes ? `- Design notes: ${p.design_notes}` : "",
  ];

  // The client's Step 4 brief outranks everything else — it's an explicit
  // instruction, not a suggestion.
  const configCtx = logoConfigContext(input.config ?? {});
  if (configCtx) {
    lines.push(``, `THE CLIENT'S BRIEF — these choices are mandatory:`, configCtx);
  }

  lines.push(``, `YOUR ASSIGNMENT for this concept:`);
  lines.push(`- Territory to express: "${territory.name}" — ${territory.description}`);
  if (group) {
    lines.push(`- Mark-type focus: this concept should come from ${group.types}.`);
  } else {
    lines.push(`- Use the client's chosen mark type. Answer this territory with one clear idea.`);
  }

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
  lines.push(``, `Sketch the concept in the required format.`);
  return lines.filter((l) => l !== null && l !== undefined).join("\n");
}

// Parse one call's ===CONCEPT=== blocks into sketches.
function extractSketches(
  text: string,
  territory: { key: string; name: string },
  fixedType: string | null,
): Omit<LogoSketch, "id" | "image_url">[] {
  const raw = text.replace(/```[a-z]*\n?|```/gi, "").trim();
  const segments = raw.split(/===\s*CONCEPT\s*===/i).map((s) => s.trim()).filter(Boolean);
  const out: Omit<LogoSketch, "id" | "image_url">[] = [];
  for (const seg of segments) {
    const art = seg.match(/ART:\s*([\s\S]+?)(?=\n[A-Z]{3,}:|$)/i)?.[1]?.trim() ?? "";
    if (!art) continue;
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
      // When the client fixed the mark type, trust the brief over whatever the
      // model labelled the concept — the metadata drives Phase 2's targeting.
      mark_type: fixedType ?? type,
      attributes: attrs,
      idea,
      art,
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

  // With a mark type fixed by the client, spreading across mark-type families
  // would violate it — rotate across strategic territories instead. avoidNames
  // is the running count of concepts already shown this session, so successive
  // regenerations walk forward through both lists rather than repeating the
  // same territory or family every time.
  const territories = input.platform.territories;
  const fixedType = markTypeById(input.config?.mark_type);
  const attempt = (input.avoidNames ?? []).length;
  const territory = territories[attempt % territories.length];
  const group = fixedType ? null : TYPE_GROUPS[attempt % TYPE_GROUPS.length];

  const response = await client.messages.create({
    model: MODEL,
    max_tokens: 4000,
    thinking: { type: "adaptive" },
    system: SYSTEM,
    messages: [{ role: "user", content: buildUserPrompt(input, territory, group) }],
  });
  const text = response.content
    .filter((b): b is Anthropic.TextBlock => b.type === "text")
    .map((b) => b.text)
    .join("\n");
  input.clock?.lap("design");

  const parsed = extractSketches(text, territory, fixedType?.id ?? null);
  if (parsed.length === 0) {
    throw new Error("The studio returned no usable concept.");
  }
  const id = `sk_${Date.now().toString(36)}`;
  const concept = { ...parsed[0], id };

  const img = await renderLogoImage({
    brandId: input.brandId,
    phase: "concept",
    slot: id,
    direction: concept.art,
    quality: "medium",
  });
  input.clock?.lap("render");

  return [{ ...concept, image_url: img.url }];
}
