// The stepper's script: what gets asked, in what order, and whether the AI
// drafts an answer before the user sees the step.
//
// Chosen to cover every bullet in the skill's "BRAND STRATEGY FIRST" list
// without going back to twenty screens — related bullets share one step with
// clearly labeled sub-fields (e.g. `personality` asks for both the traits and
// the emotional promise in one screen).

import { LAYOUTS, VISUAL_MODES, type BrandKitLayout, type LogoConcept, type PaletteSwatch, type VisualMode } from "./types";
import type { BrandKitDraft } from "./context";

export type StepKey =
  | "brief"
  | "category"
  | "audience"
  | "personality"
  | "positioning"
  | "concept"
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
  { key: "category", question: "What shelf does it sit on?", aiDrafted: true },
  { key: "audience", question: "Who's this for?", aiDrafted: true },
  {
    key: "personality",
    question: "If the brand walked into a room, how would it behave — and what does it promise people will feel?",
    aiDrafted: true,
  },
  {
    key: "positioning",
    question: "Where does it sit culturally, and how much trust does it need to earn?",
    aiDrafted: true,
  },
  {
    key: "concept",
    question: "What's the core metaphor, and how does the mark express it?",
    aiDrafted: true,
  },
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
  brief: ["name", "brief"],
  category: ["category"],
  audience: ["audience"],
  personality: ["personality", "emotionalPromise"],
  positioning: ["culturalPosition", "trustLevel"],
  concept: ["coreMetaphor", "logoIdea"],
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
      return !!draft.name?.trim() && !!draft.brief?.trim();
    case "category":
      return !!draft.category;
    case "audience":
      return !!draft.audience;
    case "personality":
      return !!draft.personality && !!draft.emotionalPromise;
    case "positioning":
      return !!draft.culturalPosition && !!draft.trustLevel;
    case "concept":
      return !!draft.coreMetaphor && !!draft.logoIdea;
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

/**
 * Re-answering a step invalidates anything drafted after it — those drafts
 * were built from context that just changed. Mirrors the old flow's
 * "re-answering truncates what depended on it" rule.
 */
export function clearFrom(draft: BrandKitDraft, key: StepKey): BrandKitDraft {
  const idx = ORDER.indexOf(key);
  const next: BrandKitDraft = { ...draft };
  for (let i = idx + 1; i < ORDER.length; i++) {
    for (const field of FIELDS_BY_STEP[ORDER[i]]) {
      delete next[field];
    }
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

/** Validate and merge one step's answer into the draft. Throws on a malformed value. */
export function applyAnswer(step: StepKey, value: unknown, draft: BrandKitDraft): BrandKitDraft {
  const v = (value ?? {}) as Record<string, unknown>;

  switch (step) {
    case "brief":
      return { ...draft, name: str(v.name), brief: str(v.brief) };
    case "category":
      return { ...draft, category: str(value) };
    case "audience":
      return { ...draft, audience: str(value) };
    case "personality":
      return { ...draft, personality: str(v.personality), emotionalPromise: str(v.emotionalPromise) };
    case "positioning":
      return { ...draft, culturalPosition: str(v.culturalPosition), trustLevel: str(v.trustLevel) };
    case "concept":
      return { ...draft, coreMetaphor: str(v.coreMetaphor), logoIdea: str(v.logoIdea) };
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
