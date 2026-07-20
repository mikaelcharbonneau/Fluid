// Phase 3 · Brand color-palette generation.
// One focused Claude call: given the brief (and the name / visual direction the
// user already chose), propose a small, coherent color system with roles and
// usage notes, returned as structured data the Brand Kit can render as swatches.

import Anthropic from "@anthropic-ai/sdk";

export interface PaletteColor {
  name: string; // human label, e.g. "Signal coral"
  hex: string; // "#RRGGBB"
  role: string; // e.g. "Primary", "Accent", "Neutral — ink", "Surface"
  usage: string; // one short line on where to use it
}

export interface PaletteResult {
  colors: PaletteColor[];
  rationale: string;
}

export interface PaletteBrief {
  brief: string;
  audience?: string | null;
  name?: string | null;
  style?: string | null;
}

const MODEL = "claude-opus-4-8";

const SYSTEM = `You are Fluid, an expert brand designer specializing in color.
Given a brand brief, you design a small, coherent color palette.

Design rules:
- Propose 5 colors that work together as a system: one primary, one accent, and
  three neutrals (typically a near-black ink, a mid neutral, and a light surface).
- The palette must suit the brief's tone, audience, and category. A calm wellness
  brand and a bold fintech brand should look nothing alike.
- Ensure the primary and ink colors have enough contrast against the light
  surface to be usable for text and UI.
- Use real, specific hex values (uppercase "#RRGGBB"). No pure #000000 or #FFFFFF
  unless truly warranted — prefer slightly warmed/cooled neutrals.

For each color provide:
- "name": an evocative but clear label (e.g. "Deep pine", "Paper").
- "hex": the color as "#RRGGBB".
- "role": one of Primary, Accent, or a neutral role ("Neutral — ink",
  "Neutral — mid", "Surface").
- "usage": a short phrase on where it's used (e.g. "Primary actions & links").

Also provide a "rationale": one or two sentences explaining how the palette
reflects the brief.

Respond with ONLY a JSON object of the form
{"colors": [ ... 5 objects ... ], "rationale": "..."}
No prose before or after, no markdown code fences.`;

function buildUserPrompt(input: PaletteBrief): string {
  const lines = [`Brand brief: ${input.brief.trim()}`];
  const name = (input.name ?? "").trim();
  const audience = (input.audience ?? "").trim();
  const style = (input.style ?? "").trim();
  if (name) lines.push(`Brand name: ${name}`);
  if (audience) lines.push(`Target audience: ${audience}`);
  if (style) lines.push(`Chosen visual direction: ${style}`);
  lines.push(`\nDesign the palette as a JSON object.`);
  return lines.join("\n");
}

const HEX_RE = /^#[0-9a-fA-F]{6}$/;

function extractPalette(text: string): PaletteResult {
  let raw = text.trim();
  const fence = raw.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fence) raw = fence[1].trim();
  const start = raw.indexOf("{");
  const end = raw.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) {
    throw new Error("No JSON object found in model response.");
  }

  const parsed = JSON.parse(raw.slice(start, end + 1)) as unknown;
  if (!parsed || typeof parsed !== "object") {
    throw new Error("Model response was not an object.");
  }
  const obj = parsed as Record<string, unknown>;
  const list = Array.isArray(obj.colors) ? obj.colors : [];

  const colors: PaletteColor[] = [];
  for (const item of list) {
    if (!item || typeof item !== "object") continue;
    const o = item as Record<string, unknown>;
    const hex = String(o.hex ?? "").trim().toUpperCase();
    if (!HEX_RE.test(hex)) continue; // skip anything that isn't a real hex
    colors.push({
      name: String(o.name ?? "").trim() || "Color",
      hex,
      role: String(o.role ?? "").trim() || "Neutral",
      usage: String(o.usage ?? "").trim(),
    });
  }
  if (colors.length === 0) throw new Error("Model returned no usable colors.");

  return {
    colors: colors.slice(0, 6),
    rationale: String(obj.rationale ?? "").trim(),
  };
}

export async function generateBrandPalette(
  input: PaletteBrief,
): Promise<PaletteResult> {
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

  return extractPalette(text);
}
