// A vector PDF of the mark, written by hand.
//
// This is worth doing rather than embedding a big PNG: a print shop or sign
// maker asked for vector because they intend to scale it to a wall, and a
// raster in a PDF wrapper is a raster. The tracer's output is a flat list of
// filled paths using only moveto/lineto/curveto/close, and those map one-to-one
// onto PDF's `m`/`l`/`c`/`h` operators — so the conversion is a transcription,
// not a rendering.
//
// Anything outside that subset (arcs, quadratics, smooth shorthands) throws
// rather than being approximated. A silently wrong logo is worse than a missing
// file, because it only shows up on the sign.

import { parseLogoSvg, type ParsedSvg, type SvgPath } from "./logo-svg";

export class UnsupportedPathError extends Error {
  constructor(command: string) {
    super(
      `This mark uses a path command ("${command}") the PDF writer doesn't support, so no PDF was produced. The SVG is exact — use that.`,
    );
    this.name = "UnsupportedPathError";
  }
}

/** The longest side of the page, in points. 512pt ≈ 18cm — a sane document. */
const PAGE_MAX_PT = 512;

const fmt = (n: number) => {
  // PDF wants a plain decimal; exponent notation is not valid syntax there.
  const r = Math.round(n * 1000) / 1000;
  return Object.is(r, -0) ? "0" : String(r);
};

function hexToRgbUnit(hex: string): [number, number, number] {
  const h = hex.replace("#", "");
  return [
    parseInt(h.slice(0, 2), 16) / 255,
    parseInt(h.slice(2, 4), 16) / 255,
    parseInt(h.slice(4, 6), 16) / 255,
  ];
}

/**
 * Turn one SVG path's `d` into PDF path operators.
 *
 * SVG allows a command letter to be followed by several coordinate sets — `L 1
 * 2 3 4` is two linetos — and a repeated moveto's extra pairs are linetos, so
 * both are handled. Relative forms are resolved against the current point.
 */
function pathToPdfOps(d: string): string[] {
  const ops: string[] = [];
  const tokens = d.match(/[a-z]|-?\d*\.?\d+(?:e[-+]?\d+)?/gi) ?? [];
  let i = 0;
  let cx = 0;
  let cy = 0;
  let startX = 0;
  let startY = 0;
  let cmd = "";

  const num = () => {
    const v = Number(tokens[i++]);
    if (!Number.isFinite(v)) throw new UnsupportedPathError(cmd || "?");
    return v;
  };

  while (i < tokens.length) {
    const tok = tokens[i];
    if (/^[a-z]$/i.test(tok)) {
      cmd = tok;
      i++;
    } else if (!cmd) {
      throw new UnsupportedPathError("(coordinates before any command)");
    } else if (cmd === "M") {
      // Implicit repeats after a moveto are linetos, per the SVG grammar.
      cmd = "L";
    } else if (cmd === "m") {
      cmd = "l";
    }

    const rel = cmd === cmd.toLowerCase();
    switch (cmd.toUpperCase()) {
      case "M": {
        const x = num() + (rel ? cx : 0);
        const y = num() + (rel ? cy : 0);
        ops.push(`${fmt(x)} ${fmt(y)} m`);
        cx = startX = x;
        cy = startY = y;
        break;
      }
      case "L": {
        const x = num() + (rel ? cx : 0);
        const y = num() + (rel ? cy : 0);
        ops.push(`${fmt(x)} ${fmt(y)} l`);
        cx = x;
        cy = y;
        break;
      }
      case "H": {
        const x = num() + (rel ? cx : 0);
        ops.push(`${fmt(x)} ${fmt(cy)} l`);
        cx = x;
        break;
      }
      case "V": {
        const y = num() + (rel ? cy : 0);
        ops.push(`${fmt(cx)} ${fmt(y)} l`);
        cy = y;
        break;
      }
      case "C": {
        const x1 = num() + (rel ? cx : 0);
        const y1 = num() + (rel ? cy : 0);
        const x2 = num() + (rel ? cx : 0);
        const y2 = num() + (rel ? cy : 0);
        const x = num() + (rel ? cx : 0);
        const y = num() + (rel ? cy : 0);
        ops.push(
          `${fmt(x1)} ${fmt(y1)} ${fmt(x2)} ${fmt(y2)} ${fmt(x)} ${fmt(y)} c`,
        );
        cx = x;
        cy = y;
        break;
      }
      case "Z": {
        ops.push("h");
        cx = startX;
        cy = startY;
        break;
      }
      default:
        throw new UnsupportedPathError(cmd);
    }
  }
  return ops;
}

function contentStream(parsed: ParsedSvg, paths: SvgPath[], scale: number): string {
  const { x, y, h } = parsed.viewBox;
  const out: string[] = [];
  // PDF's origin is bottom-left with y going up; SVG's is top-left with y going
  // down. One flip on the way in means every coordinate below is used as-is.
  out.push("q");
  out.push(`${fmt(scale)} 0 0 ${fmt(-scale)} ${fmt(-x * scale)} ${fmt((y + h) * scale)} cm`);
  for (const p of paths) {
    const [r, g, b] = hexToRgbUnit(p.fill);
    out.push(`${fmt(r)} ${fmt(g)} ${fmt(b)} rg`);
    out.push(...pathToPdfOps(p.d));
    // Nonzero winding, which is SVG's default fill-rule — so counters stay
    // holes instead of filling in.
    out.push("f");
  }
  out.push("Q");
  return out.join("\n");
}

/**
 * A one-page PDF containing the mark.
 *
 * Throws UnsupportedPathError if the artwork uses path commands this writer
 * cannot transcribe exactly.
 */
export function svgToPdfBytes(svg: string, paths?: SvgPath[]): Uint8Array {
  const parsed = parseLogoSvg(svg);
  if (!parsed) throw new Error("That mark has no vector artwork to export.");
  const drawn = paths ?? parsed.paths;
  if (!drawn.length) throw new Error("That mark has no vector artwork to export.");

  const { w, h } = parsed.viewBox;
  const scale = PAGE_MAX_PT / Math.max(w, h);
  const pageW = w * scale;
  const pageH = h * scale;
  const stream = contentStream(parsed, drawn, scale);

  const objects = [
    `<</Type/Catalog/Pages 2 0 R>>`,
    `<</Type/Pages/Kids[3 0 R]/Count 1>>`,
    `<</Type/Page/Parent 2 0 R/MediaBox[0 0 ${fmt(pageW)} ${fmt(pageH)}]/Resources<<>>/Contents 4 0 R>>`,
    `<</Length ${stream.length}>>\nstream\n${stream}\nendstream`,
  ];

  let pdf = "%PDF-1.4\n";
  const offsets: number[] = [];
  objects.forEach((body, idx) => {
    offsets.push(pdf.length);
    pdf += `${idx + 1} 0 obj\n${body}\nendobj\n`;
  });

  const xrefAt = pdf.length;
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  for (const off of offsets) {
    pdf += `${String(off).padStart(10, "0")} 00000 n \n`;
  }
  pdf += `trailer\n<</Size ${objects.length + 1}/Root 1 0 R>>\nstartxref\n${xrefAt}\n%%EOF\n`;

  // The content is ASCII by construction — no text, no names outside the
  // writer's own vocabulary — so a byte-per-char encoding is exact here.
  const bytes = new Uint8Array(pdf.length);
  for (let i = 0; i < pdf.length; i++) bytes[i] = pdf.charCodeAt(i) & 0xff;
  return bytes;
}
