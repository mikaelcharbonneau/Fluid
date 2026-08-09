// The strategy read: the brandkit skill's "BRAND STRATEGY FIRST" section,
// turned into a JSON contract so `prompt.ts` has concrete fields to build
// the final image prompt from instead of handing raw strategy straight to
// the image model (which produces generic mush — see prompt.ts).

import { runBrandKitSkill } from "./run";
import type { Activity } from "@/lib/ai/activity";
import { VISUAL_MODES, type BrandKitBrief, type BrandKitStrategy, type VisualMode } from "./types";

const VISUAL_MODE_IDS = new Set(VISUAL_MODES.map((m) => m.id));

const CONTRACT = `Work through the skill's "BRAND STRATEGY FIRST" section for this
brand, then return a JSON object with exactly these fields:

{
  "category": string,        // the shelf this sits on
  "audience": string,        // who this is for, specifically
  "personality": string,     // 3-5 traits, comma separated
  "coreMetaphor": string,    // the one symbolic idea the mark should express
  "logoIdea": string,        // one sentence: how the mark combines symbol + name + category meaning
  "visualMode": string,      // exactly one of: ${VISUAL_MODES.map((m) => m.id).join(", ")}
  "palette": [ { "hex": "#RRGGBB", "role": string }, ... ],  // 3-5 swatches, disciplined per the skill's COLOR DISCIPLINE section
  "tagline": string          // one short line, per the skill's TAGLINE STYLE section
}

Honour the skill's ANTI-GENERIC RULES when choosing coreMetaphor and logoIdea —
no generic swooshes, globes, lightbulbs, or rounded-monogram-in-a-pill marks.`;

function parseStrategy(value: unknown): BrandKitStrategy {
  if (!value || typeof value !== "object") throw new Error("Strategy response was not an object.");
  const v = value as Record<string, unknown>;

  const str = (key: string): string => {
    const val = v[key];
    if (typeof val !== "string" || !val.trim()) {
      throw new Error(`Strategy response is missing "${key}".`);
    }
    return val.trim();
  };

  const visualModeRaw = str("visualMode").toLowerCase().replace(/[^a-z0-9]+/g, "-");
  const visualMode: VisualMode = VISUAL_MODE_IDS.has(visualModeRaw as VisualMode)
    ? (visualModeRaw as VisualMode)
    : "dark-developer";

  const paletteRaw = v.palette;
  if (!Array.isArray(paletteRaw) || paletteRaw.length === 0) {
    throw new Error("Strategy response is missing a palette.");
  }
  const palette = paletteRaw
    .map((entry) => {
      if (!entry || typeof entry !== "object") return null;
      const e = entry as Record<string, unknown>;
      const hex = typeof e.hex === "string" ? e.hex.trim() : "";
      const role = typeof e.role === "string" ? e.role.trim() : "";
      if (!/^#[0-9A-Fa-f]{6}$/.test(hex) || !role) return null;
      return { hex: hex.toUpperCase(), role };
    })
    .filter((s): s is { hex: string; role: string } => s !== null)
    .slice(0, 6);
  if (palette.length === 0) {
    throw new Error("Strategy response's palette had no usable swatches.");
  }

  return {
    category: str("category"),
    audience: str("audience"),
    personality: str("personality"),
    coreMetaphor: str("coreMetaphor"),
    logoIdea: str("logoIdea"),
    visualMode,
    palette,
    tagline: str("tagline"),
  };
}

export async function generateBrandKitStrategy(
  brief: BrandKitBrief,
  activity: Activity,
): Promise<BrandKitStrategy> {
  activity.emit("note", "Working out the brand strategy (brandkit skill)");
  const strategy = await runBrandKitSkill({
    skill: "brandkit",
    brief,
    contract: CONTRACT,
    parse: parseStrategy,
    activity,
    effort: "medium",
    maxTokens: 4_000,
    timeoutMs: 120_000,
  });
  // A user-chosen visual mode is a locked decision, not a suggestion for the
  // model to override.
  return brief.visualMode ? { ...strategy, visualMode: brief.visualMode } : strategy;
}
