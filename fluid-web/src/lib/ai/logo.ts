// Phase 3 · Brand logo generation (SVG marks).
// One focused Claude call: given the brief (and the name / palette already
// chosen), produce a few self-contained SVG logo concepts. LLMs are strong at
// clean geometric/typographic vector marks, so we generate SVG code rather than
// raster images — crisp at any size, on-brand, and editable.
//
// SECURITY: the SVG is model-generated. We sanitize it here, and the client
// renders it via an <img> data-URI (which disables scripting in the SVG). Both
// layers matter — never inject this SVG into the DOM with innerHTML.

import Anthropic from "@anthropic-ai/sdk";

export interface LogoConcept {
  name: string; // e.g. "Ascending monogram"
  descriptor: string; // one-line designer note
  svg: string; // sanitized, self-contained SVG markup
}

export interface LogoBrief {
  brief: string;
  name?: string | null;
  style?: string | null;
  primaryColor?: string | null; // hex from the generated palette, if any
}

const MODEL = "claude-opus-4-8";
const COUNT = 3;

const SYSTEM = `You are Fluid, an expert logo designer. Given a brand brief you
design distinct logo marks and express each as clean, self-contained SVG code.

Hard rules for every SVG:
- Root element is <svg> with viewBox='0 0 120 120', width='120', height='120',
  and xmlns='http://www.w3.org/2000/svg'.
- Use SINGLE QUOTES for all attribute values (not double quotes).
- Self-contained only: no <script>, no <foreignObject>, no <image>, no external
  href/url references, no CSS <style> with @import. Inline shapes, paths, and
  gradients only.
- Keep it simple and confident — a mark that reads at small sizes. Aim for
  clean geometry, monograms, or minimal wordmarks. Avoid clutter and tiny detail.
- Assume a light background. Use color purposefully; the brand's primary color
  is provided when available.

Design ${COUNT} genuinely different concepts (e.g. an abstract mark, a monogram,
and a wordmark or symbol). For each provide:
- "name": a short concept name.
- "descriptor": one sentence on the idea and where it works best.
- "svg": the SVG markup as a single string, following the rules above.

Respond with ONLY a JSON array of ${COUNT} objects with those keys.
No prose before or after, no markdown code fences.`;

function buildUserPrompt(input: LogoBrief): string {
  const lines = [`Brand brief: ${input.brief.trim()}`];
  const name = (input.name ?? "").trim();
  const style = (input.style ?? "").trim();
  const color = (input.primaryColor ?? "").trim();
  if (name) lines.push(`Brand name: ${name}`);
  if (style) lines.push(`Chosen visual direction: ${style}`);
  if (color) lines.push(`Brand primary color: ${color}`);
  lines.push(`\nDesign ${COUNT} logo concepts as a JSON array.`);
  return lines.join("\n");
}

// Defensively strip anything unsafe or non-self-contained from model SVG. We
// also render via <img> data-URI on the client, so this is defense-in-depth.
export function sanitizeSvg(input: string): string | null {
  let svg = String(input || "").trim();
  if (!svg) return null;

  const open = svg.toLowerCase().indexOf("<svg");
  const close = svg.toLowerCase().lastIndexOf("</svg>");
  if (open === -1 || close === -1) return null;
  svg = svg.slice(open, close + "</svg>".length);

  // Remove dangerous / non-self-contained constructs.
  svg = svg.replace(/<script[\s\S]*?<\/script>/gi, "");
  svg = svg.replace(/<foreignObject[\s\S]*?<\/foreignObject>/gi, "");
  svg = svg.replace(/<!--[\s\S]*?-->/g, "");
  // Strip inline event handlers: on...='...' or on...="..."
  svg = svg.replace(/\son[a-z]+\s*=\s*(?:"[^"]*"|'[^']*')/gi, "");
  // Strip javascript: URIs.
  svg = svg.replace(/javascript:/gi, "");

  // Reject if anything clearly unsafe remains.
  if (/<script|<foreignObject|javascript:|<image\b/i.test(svg)) return null;
  if (/\s(?:xlink:href|href)\s*=\s*['"]\s*(?:https?:)?\/\//i.test(svg)) return null;
  if (svg.length > 20000) return null;

  return svg;
}

function extractLogos(text: string): LogoConcept[] {
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

  const concepts: LogoConcept[] = [];
  for (const item of parsed) {
    if (!item || typeof item !== "object") continue;
    const o = item as Record<string, unknown>;
    const svg = sanitizeSvg(String(o.svg ?? ""));
    if (!svg) continue; // drop concepts whose SVG didn't pass sanitization
    concepts.push({
      name: String(o.name ?? "").trim() || "Concept",
      descriptor: String(o.descriptor ?? "").trim(),
      svg,
    });
  }
  if (concepts.length === 0) throw new Error("Model returned no usable logos.");
  return concepts.slice(0, COUNT);
}

export async function generateBrandLogos(
  input: LogoBrief,
): Promise<LogoConcept[]> {
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new Error("ANTHROPIC_API_KEY is not configured.");
  }

  const client = new Anthropic();
  const response = await client.messages.create({
    model: MODEL,
    max_tokens: 8000,
    thinking: { type: "adaptive" },
    system: SYSTEM,
    messages: [{ role: "user", content: buildUserPrompt(input) }],
  });

  const text = response.content
    .filter((b): b is Anthropic.TextBlock => b.type === "text")
    .map((b) => b.text)
    .join("\n");

  return extractLogos(text);
}
