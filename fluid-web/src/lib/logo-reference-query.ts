import { SUPABASE_URL } from "@/lib/supabase/config";

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

// Each visual direction in Step 2 is described to the generators by a sentence
// of guidance (STANDALONE_STYLE_GUIDANCE in logo-styles.ts). These are the
// catalogued attributes that express the same qualities, so a direction can be
// matched against real marks rather than only against prompt text.
export const STYLE_ATTRIBUTES: Record<string, string[]> = {
  // "reduced, geometric construction, crisp edges, generous negative space"
  "placeholder-01": ["geometric", "minimal", "negative-space", "monoline", "symmetrical"],
  // "expressive custom typography, one confident typographic gesture"
  "placeholder-02": ["custom-letterform", "display", "ligature", "high-contrast", "script"],
  // "organic, editorial: softened forms, tactile variation, warm but disciplined"
  "placeholder-03": ["organic", "rounded", "warm", "hand-drawn", "serif"],
  // "bold, high-contrast, strong scale shifts, assertive focal point"
  "placeholder-04": ["heavy", "high-contrast", "angular", "blobby", "uppercase"],
  // "understated premium: refined proportions, restrained detail, calm"
  "placeholder-05": ["premium", "elegant", "light", "minimal", "serif"],
  // "energetic modular system, clear movement, contemporary digital feel"
  "placeholder-06": ["modular", "technical", "geometric", "gradient", "radial"],
  // Delegated — deliberately no attribute filter, so the whole library is open.
  "fluid-choice": [],
};

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
