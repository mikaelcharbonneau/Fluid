// Reading and rewriting the traced logo SVG.
//
// The tracer emits a narrow, predictable shape: a viewBox, then a flat list of
// <path> elements with a solid `fill` and a `d` of absolute M/L/C/z. That
// narrowness is what makes single-colour variants and a real vector PDF
// possible without pulling in a rendering engine.
//
// Parsing is by regex rather than DOM on purpose: this has to run in the
// browser, on the server, and in a plain node test with no jsdom.

export interface SvgPath {
  fill: string; // `#rrggbb`
  d: string;
}

export interface ParsedSvg {
  /** The user-space box the path coordinates live in. */
  viewBox: { x: number; y: number; w: number; h: number };
  paths: SvgPath[];
}

const PATH_RE = /<path\b([^>]*)\/?>/gi;
const ATTR = (attrs: string, name: string) =>
  attrs.match(new RegExp(`${name}\\s*=\\s*"([^"]*)"`, "i"))?.[1] ??
  attrs.match(new RegExp(`${name}\\s*=\\s*'([^']*)'`, "i"))?.[1] ??
  null;

/** `rgb(r,g,b)`, `#rgb` and `#rrggbb` all appear in the wild. Normalise them. */
export function toHex(fill: string | null): string {
  if (!fill) return "#000000";
  const raw = fill.trim();
  const rgb = raw.match(/^rgb\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*\)$/i);
  if (rgb) {
    const hex = [rgb[1], rgb[2], rgb[3]]
      .map((n) => Math.max(0, Math.min(255, Number(n))).toString(16).padStart(2, "0"))
      .join("");
    return `#${hex}`;
  }
  if (/^#[0-9a-f]{3}$/i.test(raw)) {
    return `#${raw[1]}${raw[1]}${raw[2]}${raw[2]}${raw[3]}${raw[3]}`.toLowerCase();
  }
  if (/^#[0-9a-f]{6}$/i.test(raw)) return raw.toLowerCase();
  return "#000000";
}

export function parseLogoSvg(svg: string): ParsedSvg | null {
  if (!svg || typeof svg !== "string") return null;
  const vbRaw = svg.match(/viewBox\s*=\s*["']([^"']+)["']/i)?.[1];
  const nums = (vbRaw ?? "").trim().split(/[\s,]+/).map(Number);
  const viewBox =
    nums.length === 4 && nums.every(Number.isFinite)
      ? { x: nums[0], y: nums[1], w: nums[2], h: nums[3] }
      : null;
  if (!viewBox || viewBox.w <= 0 || viewBox.h <= 0) return null;

  const paths: SvgPath[] = [];
  let m: RegExpExecArray | null;
  PATH_RE.lastIndex = 0;
  while ((m = PATH_RE.exec(svg))) {
    const attrs = m[1] ?? "";
    const d = ATTR(attrs, "d");
    if (!d || !d.trim()) continue;
    paths.push({ fill: toHex(ATTR(attrs, "fill")), d: d.trim() });
  }
  return paths.length ? { viewBox, paths } : null;
}

/** Every coordinate pair in a path, for bounding-box work. */
function pointsOf(d: string): number[][] {
  const nums = d.match(/-?\d*\.?\d+(?:e[-+]?\d+)?/gi)?.map(Number) ?? [];
  const out: number[][] = [];
  for (let i = 0; i + 1 < nums.length; i += 2) out.push([nums[i], nums[i + 1]]);
  return out;
}

/**
 * Is this the tracer's background plate?
 *
 * The tracer opens every file with a rectangle covering the whole canvas, which
 * is why a "transparent" PNG of one of these marks comes out on a solid block.
 * A plate is a straight-edged path (no curves) whose corners reach the edges of
 * the viewBox — a real mark that happens to be rectangular still has to touch
 * all four edges to be mistaken for one, which is a shape nobody draws.
 */
export function isBackgroundPlate(path: SvgPath, vb: ParsedSvg["viewBox"]): boolean {
  if (/[csqta]/i.test(path.d)) return false;
  const pts = pointsOf(path.d);
  if (pts.length < 4) return false;
  const xs = pts.map((p) => p[0]);
  const ys = pts.map((p) => p[1]);
  const tolX = vb.w * 0.02;
  const tolY = vb.h * 0.02;
  return (
    Math.min(...xs) <= vb.x + tolX &&
    Math.max(...xs) >= vb.x + vb.w - tolX &&
    Math.min(...ys) <= vb.y + tolY &&
    Math.max(...ys) >= vb.y + vb.h - tolY
  );
}

/** The mark itself: everything that is not the background plate. */
export function markPaths(parsed: ParsedSvg): SvgPath[] {
  return parsed.paths.filter((p) => !isBackgroundPlate(p, parsed.viewBox));
}

export function serializeSvg(vb: ParsedSvg["viewBox"], paths: SvgPath[]): string {
  const body = paths
    .map((p) => `  <path fill="${p.fill}" d="${p.d}"/>`)
    .join("\n");
  return [
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${vb.x} ${vb.y} ${vb.w} ${vb.h}" width="${vb.w}" height="${vb.h}">`,
    body,
    `</svg>`,
  ].join("\n");
}

/** The mark on transparency, in its own colours. */
export function transparentSvg(svg: string): string | null {
  const parsed = parseLogoSvg(svg);
  if (!parsed) return null;
  return serializeSvg(parsed.viewBox, markPaths(parsed));
}

/** The mark in one colour on transparency. */
export function monochromeSvg(svg: string, ink = "#000000"): string | null {
  const parsed = parseLogoSvg(svg);
  if (!parsed) return null;
  const paths = markPaths(parsed).map((p) => ({ ...p, fill: ink }));
  return paths.length ? serializeSvg(parsed.viewBox, paths) : null;
}

/**
 * The mark light, on a dark plate.
 *
 * The plate is rebuilt from the viewBox rather than reusing whatever rectangle
 * the tracer left, so the ground is exactly the canvas even when the original
 * plate was slightly inset.
 */
export function reversedSvg(svg: string, ink = "#ffffff", ground = "#0e0f12"): string | null {
  const parsed = parseLogoSvg(svg);
  if (!parsed) return null;
  const marks = markPaths(parsed).map((p) => ({ ...p, fill: ink }));
  if (!marks.length) return null;
  const { x, y, w, h } = parsed.viewBox;
  const plate: SvgPath = {
    fill: ground,
    d: `M ${x} ${y} L ${x + w} ${y} L ${x + w} ${y + h} L ${x} ${y + h} z`,
  };
  return serializeSvg(parsed.viewBox, [plate, ...marks]);
}
