// The stepper's script: what gets asked, in what order, and whether the AI
// drafts an answer before the user sees the step.
//
// Chosen to cover every bullet in the skill's "BRAND STRATEGY FIRST" list
// without going back to twenty screens — related bullets share one step with
// clearly labeled sub-fields.
//
// Two exceptions:
//
// `emotionalPromise`/`culturalPosition`/`trustLevel` (the skill's "what
// feeling", "cultural position" and "trust level" bullets) are not a chat
// step at all. `emotionalPromise` used to be asked alongside `personality`,
// but it's abstract marketing-speak to anyone who isn't a designer — "what
// feeling does this promise" is a harder question than just describing how
// the brand behaves, and the answer is largely implied by `personality`
// anyway. `culturalPosition`/`trustLevel` never earned a dedicated screen
// either — no concrete visual lever the way category/palette/visualMode
// have. Rather than drop any of them (and the skill's own checklist)
// entirely, all three are inferred silently — see `draft.ts`'s
// `inferStrategySignals` and its call site in the turn route — right after
// `personality` is confirmed, so every step after it still sees them in
// context exactly as if they'd been asked.
//
// `coreMetaphor`/`logoIdea` used to be a step too, asking the user to
// pre-describe the logo in text before any image existed. Once
// `logoConcepts` started rendering 6 real options, that pre-commitment
// stopped helping — the final board no longer even reads a text
// description of the logo, it's locked to the picked concept's reference
// image — and pre-fixing one metaphor before the 6-concept step runs only
// biased that step toward variations on one idea instead of letting it
// genuinely diverge. There's no field for it in `BrandKitDraft` at all;
// `BrandKitStrategy.logoIdea` is derived straight from whichever concept
// gets picked (see `context.ts`'s `finalizeDraft`).

import { LAYOUTS, NAME_STYLES, VISUAL_MODES, type BrandKitLayout, type LogoConcept, type NameCandidate, type NamePreferences, type NameStyle, type PaletteSwatch, type VisualMode } from "./types";
import type { BrandKitDraft } from "./context";

export type StepKey =
  | "brief"
  | "namePreferences"
  | "name"
  | "category"
  | "audience"
  | "personality"
  | "visualMode"
  | "palette"
  | "avoid"
  | "logoConcepts"
  | "tagline"
  | "layout"
  | "review";

export interface StepDef {
  key: StepKey;
  /** Shown above the step's field(s). */
  question: string;
  /** Whether the server drafts a value before the user sees this step. */
  aiDrafted: boolean;
}

export const STEPS: StepDef[] = [
  { key: "brief", question: "What's this, in a sentence or two?", aiDrafted: false },
  { key: "namePreferences", question: "Any preferences for the name?", aiDrafted: false },
  { key: "name", question: "What should we call it?", aiDrafted: true },
  { key: "category", question: "What shelf does it sit on?", aiDrafted: true },
  { key: "audience", question: "Who's this for?", aiDrafted: true },
  { key: "personality", question: "If the brand walked into a room, how would it behave?", aiDrafted: true },
  { key: "visualMode", question: "Which visual world does this belong to?", aiDrafted: true },
  { key: "palette", question: "What's the palette?", aiDrafted: true },
  { key: "avoid", question: "Anything that must never show up?", aiDrafted: false },
  { key: "logoConcepts", question: "Six directions for the mark. Pick one.", aiDrafted: true },
  { key: "tagline", question: "What's the one line?", aiDrafted: true },
  { key: "layout", question: "How should the board be laid out?", aiDrafted: false },
  { key: "review", question: "Here's the whole brand. Ready to draw it?", aiDrafted: false },
];

const ORDER: StepKey[] = STEPS.map((s) => s.key);

/** Fields each step is responsible for — used to answer and to clear forward. */
const FIELDS_BY_STEP: Record<StepKey, Array<keyof BrandKitDraft>> = {
  brief: ["brief"],
  namePreferences: ["namePreferences"],
  name: ["name", "nameCandidates"],
  category: ["category"],
  audience: ["audience"],
  personality: ["personality"],
  visualMode: ["visualMode"],
  palette: ["palette"],
  avoid: ["avoid"],
  logoConcepts: ["logoConcepts", "logoConceptId"],
  tagline: ["tagline"],
  layout: ["layout"],
  review: [],
};

export function getStep(key: string): StepDef | undefined {
  return STEPS.find((s) => s.key === key);
}

function isAnswered(draft: BrandKitDraft, key: StepKey): boolean {
  switch (key) {
    case "brief":
      return !!draft.brief?.trim();
    case "namePreferences":
      return draft.namePreferences !== undefined;
    case "name":
      return !!draft.name?.trim();
    case "category":
      return !!draft.category;
    case "audience":
      return !!draft.audience;
    case "personality":
      return !!draft.personality;
    case "visualMode":
      return !!draft.visualMode;
    case "palette":
      return !!draft.palette?.length;
    case "avoid":
      return draft.avoid !== undefined;
    case "logoConcepts":
      // Generating the pool isn't enough — the step needs a real decision,
      // same as `review` never auto-answering itself.
      return !!draft.logoConceptId;
    case "tagline":
      return !!draft.tagline;
    case "layout":
      return !!draft.layout;
    case "review":
      return false;
  }
}

/** The first thing the draft doesn't have an answer for yet. */
export function nextStep(draft: BrandKitDraft): StepDef {
  return STEPS.find((s) => !isAnswered(draft, s.key)) ?? STEPS[STEPS.length - 1];
}

const PERSONALITY_IDX = ORDER.indexOf("personality");

/**
 * Re-answering a step invalidates anything drafted after it — those drafts
 * were built from context that just changed. Mirrors the old flow's
 * "re-answering truncates what depended on it" rule.
 *
 * `emotionalPromise`/`culturalPosition`/`trustLevel` aren't tied to a step
 * (see the file header note) but are inferred from `personality`, so
 * they're cleared under the same condition as everything else that depends
 * on it.
 */
export function clearFrom(draft: BrandKitDraft, key: StepKey): BrandKitDraft {
  const idx = ORDER.indexOf(key);
  const next: BrandKitDraft = { ...draft };
  for (let i = idx + 1; i < ORDER.length; i++) {
    for (const field of FIELDS_BY_STEP[ORDER[i]]) {
      delete next[field];
    }
  }
  if (idx <= PERSONALITY_IDX) {
    delete next.emotionalPromise;
    delete next.culturalPosition;
    delete next.trustLevel;
  }
  return next;
}

const VISUAL_MODE_IDS = new Set(VISUAL_MODES.map((m) => m.id));
const LAYOUT_IDS = new Set(LAYOUTS.map((l) => l.id));

function str(value: unknown): string {
  if (typeof value !== "string" || !value.trim()) throw new Error("That answer can't be empty.");
  return value.trim();
}

function parsePalette(value: unknown): PaletteSwatch[] {
  if (!Array.isArray(value) || value.length === 0) throw new Error("Give the palette at least one swatch.");
  const palette = value
    .map((entry) => {
      if (!entry || typeof entry !== "object") return null;
      const e = entry as Record<string, unknown>;
      const hex = typeof e.hex === "string" ? e.hex.trim() : "";
      const role = typeof e.role === "string" ? e.role.trim() : "";
      if (!/^#[0-9A-Fa-f]{6}$/.test(hex) || !role) return null;
      return { hex: hex.toUpperCase(), role };
    })
    .filter((s): s is PaletteSwatch => s !== null);
  if (palette.length === 0) throw new Error("The palette needs at least one valid {hex, role} swatch.");
  return palette;
}

const NAME_STYLE_IDS = new Set(NAME_STYLES.map((s) => s.id));

function parsePositiveInt(value: unknown): number | undefined {
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) && n > 0 ? Math.round(n) : undefined;
}

/** Trimmed, deduplicated (case-insensitively), order-preserving. */
function parseWordList(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  const seen = new Set<string>();
  const out: string[] = [];
  for (const item of value) {
    if (typeof item !== "string") continue;
    const w = item.trim();
    if (!w || seen.has(w.toLowerCase())) continue;
    seen.add(w.toLowerCase());
    out.push(w);
  }
  return out;
}

/** Every field is optional — submitting with nothing set is a valid "no preference" answer. */
function parseNamePreferences(value: unknown): NamePreferences {
  const v = (value ?? {}) as Record<string, unknown>;
  const rawStyles = Array.isArray(v.styles) ? v.styles : [];
  const styles = rawStyles.filter(
    (s): s is NameStyle => typeof s === "string" && NAME_STYLE_IDS.has(s as NameStyle),
  );
  return {
    styles: styles.length ? styles : ["all"],
    maxSyllables: parsePositiveInt(v.maxSyllables),
    maxCharacters: parsePositiveInt(v.maxCharacters),
    maxWords: parsePositiveInt(v.maxWords),
    blacklist: parseWordList(v.blacklist),
    mustInclude: parseWordList(v.mustInclude),
  };
}

/**
 * `{concepts, selectedId}` — the client sends back the whole pool it was
 * shown plus which one was clicked, same convention `palette` already uses.
 * The server never needs to remember what it last proposed.
 */
function parseLogoConceptPick(value: unknown): { logoConcepts: LogoConcept[]; logoConceptId: string } {
  const v = (value ?? {}) as Record<string, unknown>;
  const raw = v.concepts;
  if (!Array.isArray(raw) || raw.length === 0) throw new Error("No logo concepts to pick from.");
  const concepts = raw
    .map((entry) => {
      if (!entry || typeof entry !== "object") return null;
      const e = entry as Record<string, unknown>;
      const id = typeof e.id === "string" ? e.id.trim() : "";
      const label = typeof e.label === "string" ? e.label.trim() : "";
      const idea = typeof e.idea === "string" ? e.idea.trim() : "";
      const imageUrl = typeof e.imageUrl === "string" ? e.imageUrl.trim() : "";
      if (!id || !label || !imageUrl) return null;
      return { id, label, idea, imageUrl };
    })
    .filter((c): c is LogoConcept => c !== null);
  if (concepts.length === 0) throw new Error("The logo concepts were malformed.");

  const selectedId = str(v.selectedId);
  if (!concepts.some((c) => c.id === selectedId)) throw new Error("Pick one of the generated concepts.");
  return { logoConcepts: concepts, logoConceptId: selectedId };
}

/**
 * `{candidates, name}` — the client sends back the suggested pool it was
 * shown (kept so re-picking is free) plus the chosen name, same convention
 * `logoConcepts` uses. Unlike `logoConcepts`, the choice doesn't have to be
 * one of the candidates — typing a custom name is always allowed, so an
 * empty or malformed pool doesn't block the pick.
 */
function parseNamePick(value: unknown): { nameCandidates: NameCandidate[]; name: string } {
  const v = (value ?? {}) as Record<string, unknown>;
  const raw = v.candidates;
  const candidates = Array.isArray(raw)
    ? raw
        .map((entry) => {
          if (!entry || typeof entry !== "object") return null;
          const e = entry as Record<string, unknown>;
          const name = typeof e.name === "string" ? e.name.trim() : "";
          const why = typeof e.why === "string" ? e.why.trim() : "";
          const domain = typeof e.domain === "string" ? e.domain.trim() : "";
          if (!name) return null;
          return { name, why, domain };
        })
        .filter((c): c is NameCandidate => c !== null)
    : [];
  return { nameCandidates: candidates, name: str(v.name) };
}

/** Validate and merge one step's answer into the draft. Throws on a malformed value. */
export function applyAnswer(step: StepKey, value: unknown, draft: BrandKitDraft): BrandKitDraft {
  switch (step) {
    case "brief":
      return { ...draft, brief: str(value) };
    case "namePreferences":
      return { ...draft, namePreferences: parseNamePreferences(value) };
    case "name":
      return { ...draft, ...parseNamePick(value) };
    case "category":
      return { ...draft, category: str(value) };
    case "audience":
      return { ...draft, audience: str(value) };
    case "personality":
      return { ...draft, personality: str(value) };
    case "visualMode": {
      const mode = str(value);
      if (!VISUAL_MODE_IDS.has(mode as VisualMode)) throw new Error("Unknown visual mode.");
      return { ...draft, visualMode: mode as VisualMode };
    }
    case "palette":
      return { ...draft, palette: parsePalette(value) };
    case "avoid":
      return { ...draft, avoid: Array.isArray(value) ? value.filter((a): a is string => typeof a === "string") : [] };
    case "logoConcepts":
      return { ...draft, ...parseLogoConceptPick(value) };
    case "tagline":
      return { ...draft, tagline: str(value) };
    case "layout": {
      const layout = str(value);
      if (!LAYOUT_IDS.has(layout as BrandKitLayout)) throw new Error("Unknown layout.");
      return { ...draft, layout: layout as BrandKitLayout };
    }
    case "review":
      return draft;
  }
}
