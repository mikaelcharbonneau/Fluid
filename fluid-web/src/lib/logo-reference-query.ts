import { SUPABASE_URL } from "@/lib/supabase/config";
import { STANDALONE_STYLE_OPTIONS } from "@/lib/logo-styles";

// The reference library lives in Supabase: rows in public.logo_references,
// images in the public "logo-references" storage bucket. Every row carries a
// mark_type and a set of formal attributes describing how the mark actually
// looks (geometric, monoline, heavy, organic…), catalogued from the artwork.
//
// Step 4 has to show references that match what the client chose in Steps 2
// and 3, so this module maps a visual-direction selection onto those
// attributes and scores rows against it.

export interface LogoReferenceRow {
  name: string;
  mark_type: string;
  image_path: string;
  attributes: string[] | null;
  industry: string | null;
  sort_order: number;
  aspect_ratio: number | string | null;
  refinement: Record<string, unknown> | null;
}

export interface RankedReference {
  id: string;
  name: string;
  markType: string;
  imageUrl: string;
  attributes: string[];
  /** Attributes shared with the chosen visual direction. */
  matched: string[];
  /**
   * Image width / height. The masonry gallery uses it to reserve the right
   * box before a lazily-loaded image arrives, so columns don't jump. Null
   * when unknown — the card then falls back to natural sizing.
   */
  aspectRatio: number | null;
  /** Axis positions, so the client can show what a set of picks implies. */
  refinement: Record<string, unknown> | null;
}

// Postgres numeric arrives as a string over the wire. Guard against a stored
// 0 or a malformed value, which would collapse the card to zero height.
function toAspectRatio(raw: number | string | null): number | null {
  const n = typeof raw === "string" ? Number(raw) : raw;
  return typeof n === "number" && Number.isFinite(n) && n > 0 ? n : null;
}

// Each visual direction carries the catalogued attributes it is built from, so
// a style can be matched against real marks rather than only against prompt
// text. Deriving this from the style definitions keeps the two in step: adding
// a direction can't silently leave the gallery with nothing to show for it.
export const STYLE_ATTRIBUTES: Record<string, string[]> = Object.fromEntries(
  STANDALONE_STYLE_OPTIONS.map((s) => [s.id, s.attributes]),
);

// The union of attributes for the directions the client picked. An empty array
// means "no attribute preference", which callers treat as no filter rather
// than as a filter that matches nothing.
export function attributesForStyles(styleIds: readonly string[]): string[] {
  const out: string[] = [];
  for (const id of styleIds) {
    for (const attr of STYLE_ATTRIBUTES[id] ?? []) {
      if (!out.includes(attr)) out.push(attr);
    }
  }
  return out;
}

// Public URL for a bucket object. Each path segment is encoded separately so
// the "/" between folder and file survives — many filenames contain spaces.
export function referenceImageUrl(imagePath: string): string {
  const encoded = imagePath.split("/").map(encodeURIComponent).join("/");
  return `${SUPABASE_URL}/storage/v1/object/public/logo-references/${encoded}`;
}

// ── Refinement axes ───────────────────────────────────────────────────
//
// Step 4 is a slider the client never touches. Each reference carries a
// position on every axis; liking a mark votes for its values, disliking votes
// against, and the aggregate is the refinement they would otherwise have had
// to dial in by hand.

export const AXES = ["boldness", "energy", "warmth", "detail"] as const;
export type Axis = (typeof AXES)[number];

// Poles, and the wording used to describe a position to the generators. A bare
// number means nothing to an image model — "bold (0.75)" does.
export const AXIS_POLES: Record<Axis, { low: string; high: string; note: string }> = {
  boldness: { low: "quiet", high: "bold", note: "weight, scale and presence" },
  energy: { low: "calm", high: "energetic", note: "stillness versus motion" },
  warmth: { low: "cool", high: "warm", note: "clinical precision versus approachability" },
  detail: { low: "simple", high: "detailed", note: "one reduced gesture versus richer construction" },
};

export interface AxisReading {
  axis: Axis;
  value: number; // 0..1
  label: string; // "bold", "leaning quiet", "balanced"…
  note: string;
}

export interface ReferenceTaste {
  /** Axes where the client's picks actually agree. Unreliable axes are absent. */
  axes: AxisReading[];
  /** How many likes and dislikes the reading is built from. */
  sampled: { liked: number; disliked: number };
  /** True when every contributing reference still carries placeholder values. */
  placeholder: boolean;
}

// How far a dislike pushes away from itself, relative to the gap between what
// was liked and what was rejected. Liking bold marks AND rejecting quiet ones
// is a stronger signal than liking bold alone — the client has said it twice.
const REJECTION_PUSH = 0.5;

// Below this many samples on an axis there is nothing to read: one like is a
// data point, not a preference.
const MIN_SAMPLES = 2;

// Spread above which the likes are judged to disagree with each other. A client
// who liked marks at 0.1 and 0.9 has told us they do not care about that axis,
// and inventing 0.5 would be false precision presented as a finding.
const MAX_SPREAD = 0.30;

function mean(xs: number[]): number {
  return xs.reduce((a, b) => a + b, 0) / xs.length;
}

function stdev(xs: number[]): number {
  if (xs.length < 2) return 0;
  const m = mean(xs);
  return Math.sqrt(mean(xs.map((x) => (x - m) ** 2)));
}

function describe(axis: Axis, value: number): string {
  const { low, high } = AXIS_POLES[axis];
  if (value < 0.2) return `very ${low}`;
  if (value < 0.4) return `leaning ${low}`;
  if (value <= 0.6) return "balanced";
  if (value <= 0.8) return high;
  return `very ${high}`;
}

function axisValues(rows: readonly LogoReferenceRow[], axis: Axis): number[] {
  return rows
    .map((r) => {
      const raw = (r.refinement ?? {})[axis];
      const n = typeof raw === "string" ? Number(raw) : raw;
      return typeof n === "number" && Number.isFinite(n) ? Math.min(1, Math.max(0, n)) : null;
    })
    .filter((n): n is number => n !== null);
}

// Read the client's refinement preferences off what they liked and disliked.
//
// An axis is only reported when the likes genuinely agree on it. Reporting a
// weak average as a confident position is worse than saying nothing: it would
// steer the mark on a dimension the client never expressed a view about.
export function readAxes(
  liked: readonly LogoReferenceRow[],
  disliked: readonly LogoReferenceRow[],
): ReferenceTaste {
  const axes: AxisReading[] = [];

  for (const axis of AXES) {
    const likedValues = axisValues(liked, axis);
    const dislikedValues = axisValues(disliked, axis);
    if (likedValues.length < MIN_SAMPLES) continue;
    if (stdev(likedValues) > MAX_SPREAD) continue;

    const preferred = mean(likedValues);
    // Only push away from dislikes when they themselves agree — a scattered
    // set of dislikes says nothing about direction.
    const push =
      dislikedValues.length >= MIN_SAMPLES && stdev(dislikedValues) <= MAX_SPREAD
        ? REJECTION_PUSH * (preferred - mean(dislikedValues))
        : 0;

    const value = Math.min(1, Math.max(0, preferred + push));
    axes.push({
      axis,
      value: Math.round(value * 100) / 100,
      label: describe(axis, value),
      note: AXIS_POLES[axis].note,
    });
  }

  const contributing = [...liked, ...disliked];
  return {
    axes,
    sampled: { liked: liked.length, disliked: disliked.length },
    placeholder:
      contributing.length > 0 &&
      contributing.every((r) => (r.refinement ?? {})._placeholder === true),
  };
}

// Rank rows against the chosen direction. Rows sharing more attributes with
// the selection come first; ties keep the catalogue's own ordering so the
// gallery is stable between visits.
//
// Rows that match nothing are kept as padding but always sort last, so the
// grid still fills when a narrow selection has few genuine matches — showing
// nine tiles of the right type beats showing two.
export function rankReferences(
  rows: readonly LogoReferenceRow[],
  wantedAttributes: readonly string[],
  limit: number,
): RankedReference[] {
  const wanted = new Set(wantedAttributes);
  const scored = rows.map((row) => {
    const attributes = Array.isArray(row.attributes) ? row.attributes : [];
    const matched = wanted.size ? attributes.filter((a) => wanted.has(a)) : [];
    return { row, attributes, matched };
  });

  scored.sort((a, b) => {
    if (b.matched.length !== a.matched.length) return b.matched.length - a.matched.length;
    return a.row.sort_order - b.row.sort_order;
  });

  // With a direction chosen, prefer to show only real matches — but never
  // starve the grid: fall back to same-type rows once matches run out.
  const matches = scored.filter((s) => s.matched.length > 0);
  const pool = wanted.size && matches.length >= limit ? matches : scored;

  return pool.slice(0, limit).map((s) => ({
    id: s.row.image_path,
    name: s.row.name,
    markType: s.row.mark_type,
    imageUrl: referenceImageUrl(s.row.image_path),
    attributes: s.attributes,
    matched: s.matched,
    aspectRatio: toAspectRatio(s.row.aspect_ratio),
    refinement: s.row.refinement ?? null,
  }));
}
