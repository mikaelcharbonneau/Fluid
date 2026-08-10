// The accumulating state of one stepper run.
//
// Every field starts undefined and fills in one step at a time, in the order
// `steps.ts` defines. Unlike the old brand-chat's BrandContext, almost every
// field here eventually gets an AI-drafted default before the user edits it
// — see draft.ts.

import type { BrandKitBrief, BrandKitLayout, BrandKitStrategy, LogoConcept, PaletteSwatch, VisualMode } from "./types";

export interface BrandKitDraft {
  name?: string;
  brief?: string;
  category?: string;
  audience?: string;
  personality?: string;
  emotionalPromise?: string;
  culturalPosition?: string;
  trustLevel?: string;
  coreMetaphor?: string;
  logoIdea?: string;
  visualMode?: VisualMode;
  palette?: PaletteSwatch[];
  /** The rendered pool of 6 — kept once generated, so re-picking is free. */
  logoConcepts?: LogoConcept[];
  /** Which concept in `logoConcepts` is picked. The step isn't answered until this is set. */
  logoConceptId?: string;
  tagline?: string;
  avoid?: string[];
  layout?: BrandKitLayout;
}

export function readDraft(data: unknown): BrandKitDraft {
  const raw = (data as { brandkitDraft?: unknown } | null)?.brandkitDraft;
  return raw && typeof raw === "object" ? { ...(raw as BrandKitDraft) } : {};
}

/** The patch shape `brands_merge_data` expects — always the whole draft, replaced. */
export function draftPatch(draft: BrandKitDraft): { brandkitDraft: BrandKitDraft } {
  return { brandkitDraft: draft };
}

/** The plain-text context block every per-step draft call reads. */
export function renderDraft(draft: BrandKitDraft): string {
  const lines: string[] = [];
  if (draft.name) lines.push(`Brand name: ${draft.name}`);
  if (draft.brief) lines.push(`Brief: ${draft.brief}`);
  if (draft.category) lines.push(`Category: ${draft.category}`);
  if (draft.audience) lines.push(`Audience: ${draft.audience}`);
  if (draft.personality) lines.push(`Personality: ${draft.personality}`);
  if (draft.emotionalPromise) lines.push(`Emotional promise: ${draft.emotionalPromise}`);
  if (draft.culturalPosition) lines.push(`Cultural position: ${draft.culturalPosition}`);
  if (draft.trustLevel) lines.push(`Trust level needed: ${draft.trustLevel}`);
  if (draft.coreMetaphor) lines.push(`Core metaphor: ${draft.coreMetaphor}`);
  if (draft.logoIdea) lines.push(`Logo idea: ${draft.logoIdea}`);
  if (draft.visualMode) lines.push(`Visual mode: ${draft.visualMode}`);
  if (draft.palette?.length) {
    lines.push(`Palette so far: ${draft.palette.map((p) => `${p.hex} (${p.role})`).join(", ")}`);
  }
  if (draft.avoid?.length) lines.push(`Must never appear: ${draft.avoid.join(", ")}`);
  if (draft.logoConceptId) {
    const chosen = draft.logoConcepts?.find((c) => c.id === draft.logoConceptId);
    if (chosen) lines.push(`Logo chosen: ${chosen.label} — ${chosen.idea}`);
  }
  if (draft.tagline) lines.push(`Tagline: ${draft.tagline}`);
  if (draft.layout) lines.push(`Layout: ${draft.layout}`);
  return lines.join("\n");
}

/**
 * The confirmed draft, split back into what `generate.ts` needs to render.
 * Throws if something required is missing — a bug in `steps.ts`'s ordering,
 * not a state a real user should be able to reach.
 */
export function finalizeDraft(draft: BrandKitDraft): { brief: BrandKitBrief; strategy: BrandKitStrategy } {
  const need = <T>(value: T | undefined, field: string): T => {
    if (value === undefined || value === null || (typeof value === "string" && !value.trim())) {
      throw new Error(`The brand kit is missing "${field}" — go back and answer that step.`);
    }
    return value;
  };

  const chosenLogo = draft.logoConcepts?.find((c) => c.id === draft.logoConceptId);

  return {
    brief: {
      name: need(draft.name, "name"),
      brief: need(draft.brief, "brief"),
      layout: draft.layout,
      avoid: draft.avoid,
    },
    strategy: {
      category: need(draft.category, "category"),
      audience: need(draft.audience, "audience"),
      personality: need(draft.personality, "personality"),
      emotionalPromise: need(draft.emotionalPromise, "emotionalPromise"),
      culturalPosition: need(draft.culturalPosition, "culturalPosition"),
      trustLevel: need(draft.trustLevel, "trustLevel"),
      coreMetaphor: need(draft.coreMetaphor, "coreMetaphor"),
      logoIdea: need(draft.logoIdea, "logoIdea"),
      logoImageUrl: need(chosenLogo?.imageUrl, "logoImageUrl"),
      visualMode: need(draft.visualMode, "visualMode"),
      palette: need(draft.palette, "palette"),
      tagline: need(draft.tagline, "tagline"),
    },
  };
}
