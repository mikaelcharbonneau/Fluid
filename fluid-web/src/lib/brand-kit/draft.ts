// One AI-drafted answer per step.
//
// Each contract asks for only what that step needs — small, cheap, fast
// calls (`effort: "low"`) — rather than the one big strategy blob the
// previous pass generated in a single shot. Every call still gets the whole
// skill body for grounding (category table, anti-generic rules, palette and
// tagline discipline), same as before; only the ask is scoped down.

import { runBrandKitSkill } from "./run";
import { renderDraft, type BrandKitDraft } from "./context";
import { CATEGORIES, VISUAL_MODES, type PaletteSwatch, type VisualMode } from "./types";
import type { Activity } from "@/lib/ai/activity";
import type { StepKey } from "./steps";

const VISUAL_MODE_IDS = new Set(VISUAL_MODES.map((m) => m.id));

function str(v: unknown, field: string): string {
  if (typeof v !== "string" || !v.trim()) throw new Error(`Draft response is missing "${field}".`);
  return v.trim();
}

/**
 * The skill's own category table (Developer tool, Security, Drone /
 * robotics, ...) is illustrative, not this app's fixed chip vocabulary — a
 * model asked to "propose a category" free-form will happily answer from
 * the skill's table instead of `CATEGORIES`, and nothing then matches a
 * real chip. Constrained to the exact list, with a normalizing fallback for
 * near-misses (casing, stray punctuation) rather than a hard failure.
 */
function parseCategory(v: unknown): string {
  const raw = str(v, "category");
  const exact = CATEGORIES.find((c) => c.toLowerCase() === raw.toLowerCase());
  if (exact) return exact;
  const loose = CATEGORIES.find((c) => c.toLowerCase().replace(/[^a-z]/g, "") === raw.toLowerCase().replace(/[^a-z]/g, ""));
  return loose ?? "Something else";
}

function parsePalette(v: unknown): PaletteSwatch[] {
  if (!Array.isArray(v) || v.length === 0) throw new Error("Draft response is missing a palette.");
  const palette = v
    .map((entry) => {
      if (!entry || typeof entry !== "object") return null;
      const e = entry as Record<string, unknown>;
      const hex = typeof e.hex === "string" ? e.hex.trim() : "";
      const role = typeof e.role === "string" ? e.role.trim() : "";
      if (!/^#[0-9A-Fa-f]{6}$/.test(hex) || !role) return null;
      return { hex: hex.toUpperCase(), role };
    })
    .filter((s): s is PaletteSwatch => s !== null)
    .slice(0, 5);
  if (palette.length === 0) throw new Error("Draft response's palette had no usable swatches.");
  return palette;
}

function parseVisualMode(v: unknown): VisualMode {
  const raw = str(v, "visualMode").toLowerCase().replace(/[^a-z0-9]+/g, "-");
  return VISUAL_MODE_IDS.has(raw as VisualMode) ? (raw as VisualMode) : "dark-developer";
}

interface DraftSpec {
  contract: string;
  effort?: "low" | "medium";
  maxTokens?: number;
  parse: (json: unknown) => Partial<BrandKitDraft>;
}

const SPECS: Partial<Record<StepKey, DraftSpec>> = {
  category: {
    contract: `Propose the single closest shelf this brand sits on. Return JSON:
{ "category": string } — exactly one of this exact list, verbatim:
${CATEGORIES.filter((c) => c !== "Something else").map((c) => `"${c}"`).join(", ")}.
Only use "Something else" if truly nothing else on the list fits.`,
    parse: (j) => ({ category: parseCategory((j as Record<string, unknown>).category) }),
  },
  audience: {
    contract: `Propose who this is for — specific, not "everyone who wants quality".
Return JSON: { "audience": string }.`,
    parse: (j) => ({ audience: str((j as Record<string, unknown>).audience, "audience") }),
  },
  personality: {
    contract: `Work through the skill's brand-strategy thinking on personality and
emotional promise. Return JSON:
{ "personality": string,       // 3-5 traits, comma separated — how it would behave in a room
  "emotionalPromise": string } // one sentence: the feeling this brand promises to deliver`,
    parse: (j) => {
      const v = j as Record<string, unknown>;
      return {
        personality: str(v.personality, "personality"),
        emotionalPromise: str(v.emotionalPromise, "emotionalPromise"),
      };
    },
  },
  visualMode: {
    contract: `Recommend one visual mode from the skill's VISUAL MODES section. Return
JSON: { "visualMode": string } — exactly one of: ${VISUAL_MODES.map((m) => m.id).join(", ")}.`,
    parse: (j) => ({ visualMode: parseVisualMode((j as Record<string, unknown>).visualMode) }),
  },
  palette: {
    contract: `Propose a disciplined palette per the skill's COLOR DISCIPLINE section — 3
to 5 swatches, no random rainbow. Return JSON:
{ "palette": [ { "hex": "#RRGGBB", "role": string }, ... ] }`,
    parse: (j) => ({ palette: parsePalette((j as Record<string, unknown>).palette) }),
  },
  tagline: {
    contract: `Propose one line per the skill's TAGLINE STYLE section — short and
specific, not generic corporate slogan. Return JSON: { "tagline": string }.`,
    maxTokens: 800,
    parse: (j) => ({ tagline: str((j as Record<string, unknown>).tagline, "tagline") }),
  },
};

/** `null` for steps with nothing to draft (brief, avoid, layout, review). */
export async function generateStepDraft(
  step: StepKey,
  draft: BrandKitDraft,
  activity: Activity,
): Promise<Partial<BrandKitDraft> | null> {
  const spec = SPECS[step];
  if (!spec) return null;

  activity.emit("note", `Drafting ${step}`);
  return runBrandKitSkill({
    skill: "brandkit",
    contextText: renderDraft(draft),
    contract: spec.contract,
    parse: spec.parse,
    activity,
    effort: spec.effort ?? "low",
    maxTokens: spec.maxTokens ?? 1_200,
    timeoutMs: 45_000,
  });
}

const POSITIONING_CONTRACT = `Work through the skill's brand-strategy thinking on cultural position and
trust level. Return JSON:
{ "culturalPosition": string, // one sentence: where this sits culturally relative to its category
  "trustLevel": string }      // one sentence: how much trust this needs to earn, and from whom`;

function parsePositioning(json: unknown): { culturalPosition: string; trustLevel: string } {
  const v = (json ?? {}) as Record<string, unknown>;
  return {
    culturalPosition: str(v.culturalPosition, "culturalPosition"),
    trustLevel: str(v.trustLevel, "trustLevel"),
  };
}

/**
 * Not a chat step (see steps.ts's file header) — inferred silently from
 * whatever's confirmed so far, called once right after `personality` is
 * answered so everything drafted after it still has cultural position and
 * trust level in context, same as if it had been asked.
 */
export async function inferPositioning(
  draft: BrandKitDraft,
  activity: Activity,
): Promise<{ culturalPosition: string; trustLevel: string }> {
  activity.emit("note", "Inferring cultural position and trust level");
  return runBrandKitSkill({
    skill: "brandkit",
    contextText: renderDraft(draft),
    contract: POSITIONING_CONTRACT,
    parse: parsePositioning,
    activity,
    effort: "low",
    maxTokens: 1_200,
    timeoutMs: 45_000,
  });
}
