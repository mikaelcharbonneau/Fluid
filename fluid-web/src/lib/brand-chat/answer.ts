// Folding an answer into the brand context.
//
// Every value here arrives from a browser, so nothing is trusted: a step is
// only allowed to write its own field, and each one is checked against what
// that field can hold. The rest of the pipeline treats the context as true —
// it is what the skills reason from — so this is the only place that decides
// what gets in.

import {
  DEFAULT_PERSONALITY,
  type BrandContext,
  type Personality,
  type Position,
} from "./context";
import { FLOWS, type WidgetKind } from "./flow";

const MAX_TEXT = 2_000;
const MAX_CHIP = 120;
const MAX_LIST = 24;

function text(value: unknown, field: string): string {
  if (typeof value !== "string") throw new Error(`${field} must be text.`);
  const clean = value.trim();
  if (!clean) throw new Error(`${field} cannot be empty.`);
  return clean.slice(0, MAX_TEXT);
}

function chips(value: unknown, field: string): string[] {
  if (!Array.isArray(value)) throw new Error(`${field} must be a list.`);
  const out: string[] = [];
  const seen = new Set<string>();
  for (const item of value) {
    if (typeof item !== "string") continue;
    const clean = item.trim().slice(0, MAX_CHIP);
    if (!clean) continue;
    const key = clean.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(clean);
    if (out.length >= MAX_LIST) break;
  }
  if (out.length === 0) throw new Error(`${field} cannot be empty.`);
  return out;
}

function unit(value: unknown, field: string): number {
  const n = Number(value);
  if (!Number.isFinite(n)) throw new Error(`${field} must be a number.`);
  return Math.min(1, Math.max(0, n));
}

function position(value: unknown): Position {
  if (!value || typeof value !== "object") throw new Error("Position must be a point.");
  const o = value as Record<string, unknown>;
  return { x: unit(o.x, "Position x"), y: unit(o.y, "Position y") };
}

function personality(value: unknown): Personality {
  if (!value || typeof value !== "object") throw new Error("Personality must be a set of sliders.");
  const o = value as Record<string, unknown>;
  const one = (key: keyof Personality): number => {
    const n = Math.round(Number(o[key]));
    // A slider that arrives missing or mangled falls back to its neutral
    // default rather than failing the turn: the user moved four of five and
    // should not lose the answer over the one that did not serialise.
    if (!Number.isFinite(n)) return DEFAULT_PERSONALITY[key];
    return Math.min(8, Math.max(1, n));
  };
  return {
    tone: one("tone"),
    formality: one("formality"),
    price: one("price"),
    era: one("era"),
    volume: one("volume"),
  };
}

/**
 * Apply one answer, returning the new context.
 *
 * Returns a fresh object rather than mutating: the caller compares against
 * what it loaded to decide whether anything actually needs writing.
 */
export function applyAnswer(
  step: WidgetKind,
  value: unknown,
  ctx: BrandContext,
): BrandContext {
  switch (step) {
    case "path": {
      const id = text(value, "Path");
      if (!FLOWS.some((f) => f.id === id)) throw new Error("Unknown path.");
      return { ...ctx, path: id };
    }
    case "brief":
      return { ...ctx, brief: text(value, "Brief") };
    case "category":
      return { ...ctx, category: text(value, "Category") };
    case "stage":
      return { ...ctx, stage: text(value, "Stage") };
    case "audience":
      return { ...ctx, audience: chips(value, "Audience") };
    case "problem":
      return { ...ctx, problem: text(value, "Problem") };
    case "competitors":
      return { ...ctx, competitors: chips(value, "Competitors") };
    case "position":
      return { ...ctx, position: position(value) };
    case "differentiator":
      // The only genuinely skippable question in the thread — the widget has a
      // Skip button, and an empty differentiator is a real answer meaning
      // "I don't have one yet", not a validation failure.
      return {
        ...ctx,
        differentiator: typeof value === "string" ? value.trim().slice(0, MAX_TEXT) : "",
      };
    case "personality":
      return { ...ctx, personality: personality(value) };
    case "values":
      return { ...ctx, values: chips(value, "Values").slice(0, 5) };
    case "goal":
      return { ...ctx, goal: text(value, "Goal") };
    case "name":
      return { ...ctx, name: text(value, "Name").slice(0, MAX_CHIP) };
    case "direction":
      return { ...ctx, direction: text(value, "Direction") };
    case "avoid":
      // "Nothing off-limits" is an answer; an empty list is allowed here.
      return { ...ctx, avoid: Array.isArray(value) ? chipsAllowEmpty(value) : [] };
    case "logoType":
      return { ...ctx, logoType: text(value, "Mark type") };
    case "logo":
      // The chosen mark is an asset, not context — it is stored by the logo
      // pipeline against the brand, and the context only needs to know a
      // choice was made so downstream steps can stop asking.
      return ctx;
    case "voice": {
      // The register's id means nothing to a skill, and its name alone means
      // little more. What carries the decision is the line it was chosen on,
      // so both are stored and both reach the context document.
      const o = (value ?? {}) as Record<string, unknown>;
      return {
        ...ctx,
        voice: text(o.name, "Voice"),
        voiceSample: typeof o.sample === "string" ? o.sample.trim().slice(0, MAX_TEXT) : undefined,
      };
    }
    case "tagline":
      return { ...ctx, tagline: text(value, "Tagline").slice(0, MAX_TEXT) };
    case "launch": {
      const o = (value ?? {}) as Record<string, unknown>;
      return {
        ...ctx,
        launchTiming: text(o.timing, "Launch timing"),
        launchChannels: Array.isArray(o.channels) ? chipsAllowEmpty(o.channels) : [],
      };
    }
    case "kit":
      return ctx;
    default: {
      // Exhaustiveness: a new WidgetKind that nobody taught this function about
      // is a compile error, not a silently dropped answer.
      const never: never = step;
      throw new Error(`Unhandled step: ${String(never)}`);
    }
  }
}

function chipsAllowEmpty(value: unknown[]): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  for (const item of value) {
    if (typeof item !== "string") continue;
    const clean = item.trim().slice(0, MAX_CHIP);
    if (!clean) continue;
    const key = clean.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(clean);
    if (out.length >= MAX_LIST) break;
  }
  return out;
}
