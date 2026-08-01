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

export interface ReferenceTaste {
  /** Qualities the client's likes converge on. */
  prefer: string[];
  /** Qualities their dislikes converge on, and their likes don't. */
  avoid: string[];
}

// Turn Step 4's likes and dislikes into a taste signal the generators can use.
//
// Deliberately reduced to ATTRIBUTES rather than brand names. The references
// are real third-party marks; naming them in a generation prompt ("the client
// liked Kodak") invites imitation of a trademarked logo. The formal qualities
// carry the same signal — what the client is drawn to — with none of that risk.
//
// An attribute the client both liked and disliked carries no signal, so it is
// dropped from both lists rather than pulling in two directions at once.
export function summariseTaste(
  liked: readonly LogoReferenceRow[],
  disliked: readonly LogoReferenceRow[],
  limit = 6,
): ReferenceTaste {
  const tally = (rows: readonly LogoReferenceRow[]) => {
    const counts = new Map<string, number>();
    for (const row of rows) {
      for (const attr of row.attributes ?? []) {
        counts.set(attr, (counts.get(attr) ?? 0) + 1);
      }
    }
    return counts;
  };
  const likedCounts = tally(liked);
  const dislikedCounts = tally(disliked);

  const rank = (counts: Map<string, number>, opposing: Map<string, number>) =>
    [...counts.entries()]
      .filter(([attr]) => !opposing.has(attr))
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
      .slice(0, limit)
      .map(([attr]) => attr);

  return {
    prefer: rank(likedCounts, dislikedCounts),
    avoid: rank(dislikedCounts, likedCounts),
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
  }));
}
