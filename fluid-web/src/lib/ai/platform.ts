// Phase 0 · Creative platform — the strategy step that runs before any asset
// is designed. One call turns the brief + the user's Step 2 choices into the
// document a creative director would write before designers start sketching:
// the brand idea, personality, and 2–4 strategic territories to explore.
//
// The platform is generated once, cached on brands.data.creative_platform, and
// consumed by every downstream generator (logo sketches, refinement, palette,
// typography, guidelines) so the whole brand expresses one idea — cohesion is
// the product.

import Anthropic from "@anthropic-ai/sdk";

export interface CreativeTerritory {
  key: string; // slug, e.g. "quiet-precision"
  name: string; // short label, e.g. "Quiet precision"
  description: string; // 1–2 sentences on the visual/verbal direction
}

export interface CreativePlatform {
  brand_idea: string; // the single organizing thought, one sentence
  personality: string[]; // 3–5 attributes
  territories: CreativeTerritory[]; // 2–4 strategic directions
  design_notes: string; // guidance for visual expression across all assets
}

export interface PlatformBrief {
  brief: string;
  name?: string | null;
  audience?: string | null;
  competitors?: string | null;
  styleContext?: string | null; // resolved Step 2 choices
}

const MODEL = "claude-opus-4-8";

const SYSTEM = `You are the strategy director of Fluid, a brand studio operating
at the level of Pentagram or Wolff Olins. Before any designer sketches, you
write the creative platform: the single organizing idea behind the brand, and
the distinct strategic territories worth exploring visually.

Rules:
- "brand_idea": ONE sentence capturing what this brand fundamentally stands for.
  Not a tagline, not a description of the product — the organizing thought
  (e.g. for a robot-rental marketplace: "Trust between neighbors, extended to
  machines").
- "personality": 3–5 precise attributes. Avoid empty words like "innovative",
  "modern", "professional" — prefer words with a point of view ("plainspoken",
  "meticulous", "wry", "unhurried").
- "territories": 2–4 genuinely DIFFERENT strategic directions a design team
  could take this brand. Each is a lens, not a style: e.g. "Engineering
  honesty" vs "Neighborhood warmth" lead to different marks, palettes, and
  voices. Give each a "key" (kebab-case slug), "name", and "description"
  (1–2 sentences on how it would look and speak).
- "design_notes": 2–3 sentences of visual guidance that apply across ALL
  territories — what this brand should never look like, and the register it
  must hold (e.g. "premium but never precious; avoid startup gradients").

Respond with ONLY a JSON object:
{"brand_idea": "...", "personality": ["..."], "territories": [{"key": "...",
"name": "...", "description": "..."}], "design_notes": "..."}
No prose before or after, no markdown code fences.`;

function buildUserPrompt(input: PlatformBrief): string {
  const lines = [`Brand brief: ${input.brief.trim()}`];
  const name = (input.name ?? "").trim();
  const audience = (input.audience ?? "").trim();
  const competitors = (input.competitors ?? "").trim();
  const ctx = (input.styleContext ?? "").trim();
  if (name) lines.push(`Brand name: ${name}`);
  if (audience) lines.push(`Target audience: ${audience}`);
  if (competitors) lines.push(`Competitors / adjacent brands: ${competitors}`);
  if (ctx) lines.push(`\nThe user's design choices so far:\n${ctx}`);
  lines.push(`\nWrite the creative platform as a JSON object.`);
  return lines.join("\n");
}

function extractPlatform(text: string): CreativePlatform {
  let raw = text.trim();
  const fence = raw.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fence) raw = fence[1].trim();
  const start = raw.indexOf("{");
  const end = raw.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) {
    throw new Error("No JSON object found in platform response.");
  }
  const parsed = JSON.parse(raw.slice(start, end + 1)) as Record<string, unknown>;

  const brandIdea = String(parsed.brand_idea ?? "").trim();
  if (!brandIdea) throw new Error("Platform response missing brand_idea.");

  const personality = (Array.isArray(parsed.personality) ? parsed.personality : [])
    .map((p) => String(p).trim())
    .filter(Boolean)
    .slice(0, 5);

  const territories: CreativeTerritory[] = (
    Array.isArray(parsed.territories) ? parsed.territories : []
  )
    .map((t) => {
      const o = (t ?? {}) as Record<string, unknown>;
      return {
        key: String(o.key ?? "").trim() || "direction",
        name: String(o.name ?? "").trim(),
        description: String(o.description ?? "").trim(),
      };
    })
    .filter((t) => t.name)
    .slice(0, 4);
  if (territories.length === 0) {
    throw new Error("Platform response contained no territories.");
  }

  return {
    brand_idea: brandIdea,
    personality,
    territories,
    design_notes: String(parsed.design_notes ?? "").trim(),
  };
}

export async function generateCreativePlatform(
  input: PlatformBrief,
): Promise<CreativePlatform> {
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new Error("ANTHROPIC_API_KEY is not configured.");
  }
  const client = new Anthropic();
  const response = await client.messages.create({
    model: MODEL,
    max_tokens: 2000,
    thinking: { type: "adaptive" },
    system: SYSTEM,
    messages: [{ role: "user", content: buildUserPrompt(input) }],
  });
  const text = response.content
    .filter((b): b is Anthropic.TextBlock => b.type === "text")
    .map((b) => b.text)
    .join("\n");
  return extractPlatform(text);
}

// Read a cached platform off a brand's data column, or null.
export function getPlatform(data: unknown): CreativePlatform | null {
  const d = (data ?? {}) as Record<string, unknown>;
  const p = d.creative_platform as CreativePlatform | undefined;
  return p && p.brand_idea ? p : null;
}

// Format the platform for injection into downstream prompts (palette, type,
// guidelines, logo). Appended to the Step 2 styleContext string so every
// generator designs from the same strategy.
export function platformContext(data: unknown): string {
  const p = getPlatform(data);
  if (!p) return "";
  const lines = [
    `Creative platform (all design work must express this):`,
    `- Brand idea: ${p.brand_idea}`,
  ];
  if (p.personality.length) lines.push(`- Personality: ${p.personality.join(", ")}`);
  if (p.design_notes) lines.push(`- Design notes: ${p.design_notes}`);
  return lines.join("\n");
}
