// What each generating step asks its skill for, and how the answer is read.
//
// Contract and parser live side by side because neither is meaningful alone:
// loosen a contract and its parser has to know, and a parser that quietly
// accepts a missing field is how a widget ends up rendering nine names and a
// blank row.
//
// Nothing here talks to a model or a database — it is all pure, so
// `npm run verify:brand-chat` can exercise every parser against malformed
// answers without a network.

// ---- shapes ----------------------------------------------------------

export interface NameCandidate {
  name: string;
  /** One line of strategic reasoning — the skill is emphatic that names carry logic. */
  why: string;
  /** A domain worth checking. Availability is NOT claimed; see below. */
  domain: string;
}

export interface DirectionOption {
  id: string;
  name: string;
  note: string;
}

export interface PositionRead {
  /** Fluid's read of where the brand should sit, in prose. */
  read: string;
  /** Each named competitor placed on the same two axes, 0–1. */
  competitors: Array<{ label: string; x: number; y: number }>;
  /** Where the skill would put this brand, if the user asks it to choose. */
  suggested?: { x: number; y: number };
}

export interface VoiceOption {
  id: string;
  name: string;
  /** e.g. "warm 3 · formal 2 · witty 1" */
  axes: string;
  /** A line of copy actually written in this register. */
  sample: string;
  note: string;
}

export interface TaglineOption {
  text: string;
  style: string;
  why: string;
}

export interface LaunchPlan {
  /** Channels the skill recommends landing on first, best first. */
  channels: string[];
  note: string;
}

export interface BrandKit {
  palette: Array<{ hex: string; role: string }>;
  /** A short excerpt of the standards — the full document is a separate job. */
  guidelines: string;
}

/** One mark to draw: what it is, and enough geometry to actually draw it. */
export interface MarkDirection {
  /** Two to four words naming the approach, e.g. "Interlocking K". */
  label: string;
  /** A paragraph of art direction. This is what reaches the renderer. */
  art: string;
}

/**
 * The visual identity brief the marks are drawn from.
 *
 * One skill call produces the whole thing, so the six marks are siblings —
 * variations on one identity — rather than six unrelated ideas that happen to
 * share a name.
 */
export interface IdentityBrief {
  /** The visual idea, in two or three sentences. */
  concept: string;
  palette: Array<{ hex: string; role: string }>;
  marks: MarkDirection[];
}

// ---- parsing helpers -------------------------------------------------
//
// Shared because every parser needs the same four, and each one hand-rolling
// them is how a field ends up trusted in one step and validated in the next.

export function str(value: unknown, field: string): string {
  const s = typeof value === "string" ? value.trim() : "";
  if (!s) throw new Error(`The studio's answer was missing "${field}".`);
  return s;
}

export function optStr(value: unknown): string | undefined {
  const s = typeof value === "string" ? value.trim() : "";
  return s || undefined;
}

export function arr(value: unknown, field: string): unknown[] {
  if (!Array.isArray(value) || value.length === 0) {
    throw new Error(`The studio's answer was missing "${field}".`);
  }
  return value;
}

export function obj(value: unknown, field: string): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(`The studio's answer was missing "${field}".`);
  }
  return value as Record<string, unknown>;
}

const HEX = /^#[0-9a-f]{6}$/i;

function unitOr(value: unknown, fallback: number): number {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(1, Math.max(0, n));
}

function slug(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9-]/g, "");
}

// ---- names -----------------------------------------------------------

/**
 * Domain *availability* is deliberately never requested.
 *
 * The model cannot query a registry, and `brand-naming`'s own closing
 * checklist tells the user to verify domains themselves. A confident "free"
 * beside an already-registered name would be worse than no signal at all — the
 * user would stop checking.
 */
export const NAMES_CONTRACT = `Return {"names": [...]} with exactly 10 objects, strongest first.
Each object has:
- "name": the name itself, nothing else.
- "why": one sentence of strategic reasoning. Say what it means or references
  and why it fits this brief. Be honest — if a name has a weakness worth
  knowing, that sentence is where it goes.
- "domain": one domain worth checking for it, e.g. "cadence.so". Do NOT state
  whether it is available; you cannot check, and a guess would be presented to
  the user as fact.
Apply the skill's 7 tests and its list of names and suffixes to avoid.`;

export function parseNames(value: unknown): NameCandidate[] {
  const names = arr(obj(value, "names").names, "names");
  const out = names.slice(0, 10).map((item) => {
    const o = obj(item, "names[]");
    return {
      name: str(o.name, "name"),
      why: str(o.why, "why"),
      domain: str(o.domain, "domain").toLowerCase().replace(/^https?:\/\//, ""),
    };
  });
  if (out.length < 10) throw new Error("The studio returned fewer than ten names.");
  return out;
}

// ---- visual direction ------------------------------------------------

export const DIRECTIONS_CONTRACT = `Return {"directions": [...], "recommended": "<id>"} with exactly 6
directions, each one you would genuinely defend for this brief — not a survey
of every style that exists.
Each direction has:
- "id": lowercase single word, unique, e.g. "editorial".
- "name": one or two words, title case.
- "note": at most six words on its visual character, e.g. "Swiss grid ·
  generous air". Not a sentence.
"recommended" must be the id of the one you would argue for, and it must appear
in the list. Base it on the personality and positioning in the context.`;

export function parseDirections(value: unknown): {
  directions: DirectionOption[];
  recommended: string;
} {
  const root = obj(value, "directions");
  const directions = arr(root.directions, "directions")
    .slice(0, 6)
    .map((item) => {
      const o = obj(item, "directions[]");
      return {
        id: slug(str(o.id, "id")),
        name: str(o.name, "name"),
        note: str(o.note, "note"),
      };
    });
  if (directions.length < 6) {
    throw new Error("The studio returned fewer than six directions.");
  }
  const recommended = slug(str(root.recommended, "recommended"));
  return {
    directions,
    // A recommendation for something not on the list would render as no
    // recommendation at all; fall back to the one it led with.
    recommended: directions.some((d) => d.id === recommended)
      ? recommended
      : directions[0].id,
  };
}

// ---- positioning -----------------------------------------------------

export function positionContract(competitors: string[]): string {
  return `The user is about to place their brand on a two-axis map.
Horizontal (x): 0 = accessible, 1 = premium — what people pay for.
Vertical (y): 0 = functional, 1 = emotional — what they feel.

Return {"read": "...", "competitors": [...], "suggested": {"x": n, "y": n}}.
- "read": two or three sentences on how this category is arranged and which
  territory is actually open. Name the trade-off, don't describe the axes back.
- "competitors": one object per named competitor — {"label", "x", "y"} — with
  x and y between 0 and 1, placing each where its brand behaves today. Use
  exactly these labels: ${competitors.length ? competitors.join(", ") : "(none named — return an empty array)"}.
- "suggested": where you would put this brand. This is your recommendation, not
  a prediction of what the user will choose.`;
}

export function parsePosition(value: unknown): PositionRead {
  const root = obj(value, "read");
  const competitors = Array.isArray(root.competitors)
    ? root.competitors.flatMap((item) => {
        if (!item || typeof item !== "object" || Array.isArray(item)) return [];
        const o = item as Record<string, unknown>;
        const label = optStr(o.label);
        // A dot with no coordinates would silently land at the origin, which
        // reads as a real placement. Drop it instead.
        if (!label || !Number.isFinite(Number(o.x)) || !Number.isFinite(Number(o.y))) {
          return [];
        }
        return [{ label, x: unitOr(o.x, 0.5), y: unitOr(o.y, 0.5) }];
      })
    : [];

  const s =
    root.suggested && typeof root.suggested === "object" && !Array.isArray(root.suggested)
      ? (root.suggested as Record<string, unknown>)
      : null;
  const hasSuggestion =
    !!s && Number.isFinite(Number(s.x)) && Number.isFinite(Number(s.y));

  return {
    read: str(root.read, "read"),
    competitors,
    suggested: hasSuggestion ? { x: unitOr(s.x, 0.5), y: unitOr(s.y, 0.5) } : undefined,
  };
}

// ---- voice -----------------------------------------------------------

export const VOICES_CONTRACT = `Return {"voices": [...]} with exactly 6 registers this brand could
credibly speak in. They must be genuinely different from each other, not one
voice at six volumes.
Each has:
- "id": lowercase single word, unique.
- "name": two words at most, e.g. "Quiet Coach".
- "axes": three ratings out of 5 in the form "warm 3 · formal 2 · witty 1".
- "sample": ONE line of real copy for THIS brand, written in that register.
  Not a description of the register — the actual sentence a customer would
  read. This is the field the user decides on.
- "note": one sentence on when it works and what it costs.`;

export function parseVoices(value: unknown): VoiceOption[] {
  const voices = arr(obj(value, "voices").voices, "voices")
    .slice(0, 6)
    .map((item) => {
      const o = obj(item, "voices[]");
      return {
        id: slug(str(o.id, "id")),
        name: str(o.name, "name"),
        axes: str(o.axes, "axes"),
        sample: str(o.sample, "sample"),
        note: str(o.note, "note"),
      };
    });
  if (voices.length < 6) throw new Error("The studio returned fewer than six voices.");
  return voices;
}

// ---- tagline ---------------------------------------------------------

export const TAGLINES_CONTRACT = `Return {"taglines": [...]} with exactly 5 lines, strongest first.
Each has:
- "text": the line. Short enough to sit under a logo.
- "style": one word — functional, aspirational, witty, or emotional.
- "why": one sentence on what it does that a description would not.
A tagline is not a summary of the product. At least two of the five should
argue with the category rather than describe the brand.`;

export function parseTaglines(value: unknown): TaglineOption[] {
  const taglines = arr(obj(value, "taglines").taglines, "taglines")
    .slice(0, 5)
    .map((item) => {
      const o = obj(item, "taglines[]");
      return {
        text: str(o.text, "text"),
        style: str(o.style, "style").toLowerCase(),
        why: str(o.why, "why"),
      };
    });
  if (taglines.length < 5) {
    throw new Error("The studio returned fewer than five taglines.");
  }
  return taglines;
}

// ---- launch ----------------------------------------------------------

export const LAUNCH_CONTRACT = `Return {"channels": [...], "note": "..."}.
- "channels": between 3 and 6 channel names, best first, for where this brand
  should land first. Plain names a founder would recognise — "LinkedIn",
  "Product Hunt", "Email list".
- "note": one sentence on why that first channel, given the audience.`;

export function parseLaunch(value: unknown): LaunchPlan {
  const root = obj(value, "channels");
  const channels = arr(root.channels, "channels")
    .slice(0, 6)
    .map((c) => str(c, "channels[]"));
  return { channels, note: str(root.note, "note") };
}

// ---- kit -------------------------------------------------------------

export const KIT_CONTRACT = `Return {"palette": [...], "guidelines": "..."}.
- "palette": exactly 5 colours, each {"hex": "#RRGGBB", "role": "..."}. Roles
  are one or two words describing the job — "ink", "primary accent",
  "background". Order them dark to light. Hex must be six digits with a
  leading #.
- "guidelines": one paragraph, at most 60 words, of the rules that keep this
  identity intact once other people use it. Concrete and enforceable — clear
  space, where the accent may and may not appear. Not principles.`;

export function parseKit(value: unknown): BrandKit {
  const root = obj(value, "palette");
  const palette = arr(root.palette, "palette")
    .slice(0, 5)
    .map((item) => {
      const o = obj(item, "palette[]");
      const hex = str(o.hex, "hex");
      // A malformed colour would be written straight into a `background:`
      // rule, where it fails silently as "transparent".
      if (!HEX.test(hex)) throw new Error(`"${hex}" is not a six-digit hex colour.`);
      return { hex: hex.toUpperCase(), role: str(o.role, "role") };
    });
  if (palette.length < 5) throw new Error("The studio returned fewer than five colours.");
  return { palette, guidelines: str(root.guidelines, "guidelines") };
}

// ---- visual identity brief -------------------------------------------

/**
 * What `brand-identity` is asked for before any mark is drawn.
 *
 * The art direction is the load-bearing field. An image model given "a modern
 * minimal mark" returns a different lottery ticket every time; given a
 * described construction it returns that construction. So the contract asks
 * for geometry, and refuses adjectives standing in for a drawing.
 */
export function identityContract(name: string, markType: string, avoid: string[]): string {
  return `The brand is called "${name}" and the mark is a ${markType}.

Return {"concept": "...", "palette": [...], "marks": [...]}.

- "concept": two or three sentences on the visual idea this identity is built
  on. What it takes from the positioning and the personality, and what it
  deliberately refuses.
- "palette": exactly 5 colours, each {"hex": "#RRGGBB", "role": "..."}, ordered
  dark to light. Six hex digits with a leading #.
- "marks": exactly 6 objects, each {"label", "art"} — six takes on ONE identity,
  not six unrelated ideas.
  - "label": two to four words naming the approach, e.g. "Interlocking K" or
    "Single arc, off-centre".
  - "art": one paragraph describing the mark's actual construction — the
    shapes, how they meet, what happens in the negative space, the weight of
    the strokes, whether it is symmetrical. Concrete enough that two designers
    given this paragraph would draw close to the same thing. Adjectives like
    "modern", "clean" or "premium" describe a mood, not a mark: they do not
    belong in this field on their own.
${avoid.length ? `\nThe client has ruled these out entirely — none may appear in any mark: ${avoid.join(", ")}.` : ""}`;
}

export function parseIdentity(value: unknown): IdentityBrief {
  const root = obj(value, "concept");
  const palette = arr(root.palette, "palette")
    .slice(0, 5)
    .map((item) => {
      const o = obj(item, "palette[]");
      const hex = str(o.hex, "hex");
      if (!HEX.test(hex)) throw new Error(`"${hex}" is not a six-digit hex colour.`);
      return { hex: hex.toUpperCase(), role: str(o.role, "role") };
    });
  if (palette.length < 5) throw new Error("The studio returned fewer than five colours.");

  const marks = arr(root.marks, "marks")
    .slice(0, 6)
    .map((item) => {
      const o = obj(item, "marks[]");
      const art = str(o.art, "art");
      // A one-line "art" field is a mood, not a construction, and produces a
      // different mark on every render. Catch it here rather than paying for
      // six images to find out.
      if (art.length < 80) {
        throw new Error("The studio's art direction was too thin to draw from.");
      }
      return { label: str(o.label, "label"), art };
    });
  if (marks.length < 6) throw new Error("The studio returned fewer than six marks.");

  return { concept: str(root.concept, "concept"), palette, marks };
}

// ---- assists ---------------------------------------------------------

export const AUDIENCE_CONTRACT = `Return {"audience": [...]} with 3 short audience descriptions read
off the brief — the kind that fit on a chip, e.g. "Solo founders 25–40".
Specific enough to exclude somebody. No sentences.`;

export function parseAudience(value: unknown): string[] {
  return arr(obj(value, "audience").audience, "audience")
    .slice(0, 3)
    .map((a) => str(a, "audience[]"));
}

export const COMPETITORS_CONTRACT = `Return {"competitors": [...]} with 3 real, existing brands this one
would be compared against. Names only. Do not invent companies — if you are not
confident a brand exists, leave it out and return fewer.`;

export function parseCompetitors(value: unknown): string[] {
  return arr(obj(value, "competitors").competitors, "competitors")
    .slice(0, 3)
    .map((c) => str(c, "competitors[]"));
}
