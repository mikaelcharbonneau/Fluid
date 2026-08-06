// The refinement brief: which concept is being developed, into how many
// versions, and what colours each version is drawn in.
//
// Refinement takes exactly ONE concept. The board's likes are a shelf — like as
// many as you want, they keep — but converging means committing to a single
// idea and asking to see it resolved several ways. Refining several concepts at
// once is divergence wearing convergence's clothes, and it is what made this
// step slow and unfocused.
//
// Client-safe on purpose: the screen that collects the brief and the studio
// that executes it must agree on the limits, so both import them from here.

/** The most versions of one concept a single refinement will draw. */
export const MAX_REFINE_VERSIONS = 4;

/** Colours allowed on one version. A mark that needs more is a poster. */
export const MAX_VERSION_COLORS = 6;

/** One requested version of the chosen concept. */
export interface RefineVersion {
  colors: string[]; // hex, at least one, in priority order
}

const HEX = /^#[0-9a-f]{6}$/i;

/** Normalise to `#rrggbb`, or null if it is not a colour we can hand a renderer. */
export function normaliseHex(value: unknown): string | null {
  if (typeof value !== "string") return null;
  let hex = value.trim();
  if (!hex) return null;
  if (!hex.startsWith("#")) hex = `#${hex}`;
  // #abc is a legal CSS shorthand and a plausible thing to type.
  if (/^#[0-9a-f]{3}$/i.test(hex)) {
    hex = `#${hex[1]}${hex[1]}${hex[2]}${hex[2]}${hex[3]}${hex[3]}`;
  }
  return HEX.test(hex) ? hex.toLowerCase() : null;
}

/**
 * Starting colours for the version slots.
 *
 * The brand's own palette leads when it has one — but every version would then
 * start identical, and identical inputs invite four near-identical marks. So
 * each slot after the first drops one colour from the front, which gives the
 * slots visibly different starting points while staying inside the brand's
 * colours. With no palette saved, fall back to a spread that is obviously
 * placeholder: black first, because a mark that survives in one colour is the
 * one worth having.
 */
const FALLBACK_STARTS: string[][] = [
  ["#0e0f12"],
  ["#0e0f12", "#fd7947"],
  ["#1b4d3e", "#e8e3d8"],
  ["#2b2fe8", "#f5f5f5"],
];

export function defaultVersionPalettes(
  count: number,
  brandColors?: string[] | null,
): RefineVersion[] {
  const brand = (brandColors ?? [])
    .map(normaliseHex)
    .filter((c): c is string => !!c);
  const n = clampVersionCount(count);
  return Array.from({ length: n }, (_, i) => {
    if (brand.length) {
      // Rotate the emphasis rather than reordering randomly, so slot 2 leads
      // with the brand's second colour and so on.
      const rotated = [...brand.slice(i % brand.length), ...brand.slice(0, i % brand.length)];
      return { colors: rotated.slice(0, MAX_VERSION_COLORS) };
    }
    return { colors: [...FALLBACK_STARTS[i % FALLBACK_STARTS.length]] };
  });
}

export function clampVersionCount(count: unknown): number {
  const n = Math.floor(Number(count));
  if (!Number.isFinite(n)) return 1;
  return Math.min(MAX_REFINE_VERSIONS, Math.max(1, n));
}

/**
 * Coerce whatever the client sent into versions the studio can draw.
 *
 * Returns null rather than repairing when a version has no usable colour: the
 * screen requires colours before it will let the request through, so an empty
 * one means the request did not come from that screen and quietly inventing a
 * palette would put a colour on the client's logo that they never chose.
 */
export function parseVersions(raw: unknown): RefineVersion[] | null {
  if (!Array.isArray(raw) || raw.length === 0) return null;
  const versions: RefineVersion[] = [];
  for (const entry of raw.slice(0, MAX_REFINE_VERSIONS)) {
    const colors = Array.isArray((entry as RefineVersion)?.colors)
      ? (entry as RefineVersion).colors
          .map(normaliseHex)
          .filter((c): c is string => !!c)
          .slice(0, MAX_VERSION_COLORS)
      : [];
    if (colors.length === 0) return null;
    versions.push({ colors });
  }
  return versions.length ? versions : null;
}

/** True when two briefs ask for the same thing, so a cached plan still fits. */
export function sameVersions(a: RefineVersion[], b: RefineVersion[]): boolean {
  if (a.length !== b.length) return false;
  return a.every((v, i) => {
    const other = b[i];
    return (
      !!other &&
      v.colors.length === other.colors.length &&
      v.colors.every((c, j) => c.toLowerCase() === other.colors[j]?.toLowerCase())
    );
  });
}
