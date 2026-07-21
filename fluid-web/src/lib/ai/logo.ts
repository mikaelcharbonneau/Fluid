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
  styleContext?: string | null; // resolved Step 2 choices
}

const MODEL = "claude-opus-4-8";
const COUNT = 3;

// We use a plain delimiter format (not JSON) because SVG is full of quotes and
// slashes that make JSON-in-JSON escaping fragile and error-prone.
const SYSTEM = `You are Fluid, an expert logo designer. Given a brand brief you
design distinct logo marks and express each as clean, self-contained SVG code.

Hard rules for every SVG:
- Root element is <svg> with viewBox="0 0 120 120", width="120", height="120",
  and xmlns="http://www.w3.org/2000/svg".
- Self-contained only: no <script>, no <foreignObject>, no <image>, no external
  href/url references, no CSS @import. Inline shapes, paths, and gradients only.
- Keep it simple and confident — a mark that reads at small sizes. Aim for clean
  geometry, monograms, or minimal wordmarks. Avoid clutter and tiny detail.
- Assume a light background. Use color purposefully; the brand's primary color
  is provided when available.

Design ${COUNT} genuinely different concepts (e.g. an abstract mark, a monogram,
and a wordmark or symbol).

Output EXACTLY this format and nothing else — no prose, no code fences. Repeat
the block ${COUNT} times:

===LOGO===
NAME: <short concept name>
NOTE: <one sentence on the idea and where it works best>
<svg viewBox="0 0 120 120" width="120" height="120" xmlns="http://www.w3.org/2000/svg">...</svg>`;

function buildUserPrompt(input: LogoBrief): string {
  const lines = [`Brand brief: ${input.brief.trim()}`];
  const name = (input.name ?? "").trim();
  const color = (input.primaryColor ?? "").trim();
  const ctx = (input.styleContext ?? "").trim();
  if (name) lines.push(`Brand name: ${name}`);
  if (color) lines.push(`Brand primary color: ${color}`);
  if (ctx) lines.push(`\nThe user's design choices so far:\n${ctx}`);
  lines.push(`\nDesign ${COUNT} logo concepts in the required format.`);
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
  const raw = text.replace(/```[a-z]*\n?|```/gi, "").trim();

  // Split on the delimiter; fall back to splitting on <svg boundaries if the
  // model omitted the delimiter but still produced multiple SVGs.
  let segments = raw.split(/===\s*LOGO\s*===/i).map((s) => s.trim()).filter(Boolean);
  if (segments.length <= 1) {
    // One blob: split before each <svg so each segment carries its own mark.
    segments = raw.split(/(?=<svg\b)/i).map((s) => s.trim()).filter(Boolean);
  }

  const concepts: LogoConcept[] = [];
  for (const seg of segments) {
    const svg = sanitizeSvg(seg);
    if (!svg) continue; // no usable SVG in this segment
    const nameMatch = seg.match(/NAME:\s*(.+)/i);
    const noteMatch = seg.match(/NOTE:\s*(.+)/i);
    concepts.push({
      name: (nameMatch ? nameMatch[1].trim() : "") || "Concept",
      descriptor: noteMatch ? noteMatch[1].trim() : "",
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
  // No extended thinking here: SVG generation doesn't need it and it materially
  // reduces latency, which kept logo generation from finishing in time.
  const response = await client.messages.create({
    model: MODEL,
    max_tokens: 8000,
    system: SYSTEM,
    messages: [{ role: "user", content: buildUserPrompt(input) }],
  });

  const text = response.content
    .filter((b): b is Anthropic.TextBlock => b.type === "text")
    .map((b) => b.text)
    .join("\n");

  return extractLogos(text);
}
