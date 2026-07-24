// Resolves the wizard's Step 2 picks (stored on brand data.step2) into concrete
// guidance the generators can honor, so the Brand Kit reflects what the user
// actually chose instead of generating in a vacuum.
//
// NOTE: the option tables below mirror the curated lists in the Step 2 UI
// (Prototype.jsx: VISUAL_STYLE_OPTIONS / PALETTE_OPTIONS / OPEN_SOURCE_FONT_PAIRS).
// Keep them in sync if those lists change.

import { platformContext } from "./platform";

export interface CustomFont {
  id: string;
  family: string;
  dataUrl?: string;
}

export interface Step2 {
  inspiration?: string | null;
  palette?: string | null;
  font?: string | null;
  refine?: { bold?: number; modern?: number; cool?: number };
  custom_fonts?: CustomFont[];
}

const STYLE_NAMES: Record<string, string> = {
  "modern-minimal": "Modern Minimal — clean, refined, spacious, highly usable",
  "bold-graphic": "Bold Graphic — striking, energetic, confident",
  "premium-editorial": "Premium Editorial — sophisticated, refined, tasteful",
  "futuristic-digital": "Futuristic Digital — advanced, AI-native, forward-looking",
};

const PALETTES: Record<string, { mood: string; colors: string[] }> = {
  "Quiet earth": { mood: "warm · paper", colors: ["#1F232A", "#A8421F", "#FDBA50", "#F4EFE7", "#E8D9B5"] },
  "Sun & sea": { mood: "optimistic · bright", colors: ["#0F1115", "#FD7947", "#FDBA50", "#44D9C7", "#F4EFE7"] },
  "Studio mono": { mood: "quiet · single accent", colors: ["#000000", "#1A1A1A", "#7A7A7A", "#E8E8E8", "#FD7947"] },
  "Cool clinical": { mood: "technical · trustworthy", colors: ["#0F1115", "#22272F", "#A4ADBA", "#E5E7EB", "#3B82F6"] },
  "Garden": { mood: "organic · soft", colors: ["#1F2A22", "#5C7A4F", "#A8B89A", "#F4EFE7", "#FDBBC0"] },
};

const FONT_PAIRS: Record<string, { heading: string; body: string }> = {
  "fraunces-inter": { heading: "Fraunces", body: "Inter" },
  "space-inter": { heading: "Space Grotesk", body: "Inter" },
  "playfair-source": { heading: "Playfair Display", body: "Source Sans 3" },
  "archivo-libre": { heading: "Archivo", body: "Libre Franklin" },
  "dmserif-dmsans": { heading: "DM Serif Display", body: "DM Sans" },
  "sora-plex": { heading: "Sora", body: "IBM Plex Sans" },
};

export function getStep2(data: unknown): Step2 {
  const d = (data ?? {}) as Record<string, unknown>;
  return (d.step2 as Step2) ?? {};
}

// Sentinel written by Step 2's "Let AI choose" — the client is DELEGATING the
// decision to the studio, not leaving it blank. The distinction matters:
//   • undefined/null → the user simply hasn't decided; generators get no
//     guidance and fall back to their own judgement.
//   • DELEGATED      → an explicit instruction to decide this during research,
//     free of the app's curated option lists.
// Anything that reads a Step 2 field must handle all three states.
export const DELEGATED = "__ai__";

export function isDelegated(value: string | null | undefined): boolean {
  return value === DELEGATED;
}

// Which Step 2 decisions the client handed to the studio.
export function delegatedChoices(brand: {
  style_id?: string | null;
  data?: unknown;
}): { style: boolean; palette: boolean; font: boolean; any: boolean } {
  const s2 = getStep2(brand.data);
  const style = isDelegated(brand.style_id);
  const palette = isDelegated(s2.palette);
  const font = isDelegated(s2.font);
  return { style, palette, font, any: style || palette || font };
}

// The five hex values behind a chosen Step 2 palette, or null. Delegated and
// unset both yield null — callers wanting to tell them apart use isDelegated.
export function paletteBasis(s2: Step2): string[] | null {
  if (!s2.palette || isDelegated(s2.palette)) return null;
  const p = PALETTES[s2.palette];
  return p ? p.colors : null;
}

// The chosen font pairing (open-source or uploaded custom), or null.
export function fontChoice(s2: Step2): { heading: string; body: string } | null {
  const f = s2.font;
  if (!f || isDelegated(f)) return null;
  if (f.startsWith("custom:")) {
    const cf = (s2.custom_fonts ?? []).find((c) => "custom:" + c.id === f);
    return cf ? { heading: cf.family, body: cf.family } : null;
  }
  return FONT_PAIRS[f] ?? null;
}

function refineWords(r?: Step2["refine"]): string[] {
  if (!r) return [];
  const out: string[] = [];
  const axis = (v: number | undefined, lo: string, hi: string) => {
    if (v == null) return;
    if (v >= 66) out.push("distinctly " + hi);
    else if (v >= 55) out.push("leaning " + hi);
    else if (v <= 34) out.push("distinctly " + lo);
    else if (v <= 45) out.push("leaning " + lo);
  };
  axis(r.bold, "quiet/understated", "bold");
  axis(r.modern, "classic", "modern");
  axis(r.cool, "warm", "cool");
  return out;
}

// A human-readable summary of every Step 2 choice, for injection into prompts.
// Returns "" when the user made no Step 2 picks.
export function styleContext(brand: {
  style_id?: string | null;
  data?: unknown;
}): string {
  const s2 = getStep2(brand.data);
  const lines: string[] = [];
  // Decisions the client delegated. These are collected separately and stated
  // as an open brief at the end — an instruction to decide, not a constraint.
  const open: string[] = [];

  if (isDelegated(brand.style_id)) {
    open.push(
      "the visual direction — you are NOT limited to any preset style list; " +
        "define the direction the brand actually needs",
    );
  } else {
    const style = brand.style_id ? STYLE_NAMES[brand.style_id] || brand.style_id : "";
    if (style) lines.push(`Visual direction: ${style}.`);
  }

  const refine = refineWords(s2.refine);
  if (refine.length) lines.push(`Tuned to feel: ${refine.join(", ")}.`);

  if (s2.inspiration) {
    lines.push(`Draws inspiration from ${s2.inspiration}'s design language (adapt its spirit, do not copy it).`);
  }

  if (isDelegated(s2.palette)) {
    open.push(
      "the colour palette — derive real hex values from the research and the " +
        "brand idea; you are NOT limited to any preset palette",
    );
  } else {
    const basis = paletteBasis(s2);
    if (s2.palette && basis) {
      lines.push(`Preferred color palette "${s2.palette}": ${basis.join(", ")}.`);
    }
  }

  if (isDelegated(s2.font)) {
    open.push(
      "the typography — recommend a real pairing that suits the brand; you are " +
        "NOT limited to any preset pairing",
    );
  } else {
    const fonts = fontChoice(s2);
    if (fonts) {
      lines.push(`Chosen typography: ${fonts.heading} for headings, ${fonts.body} for body.`);
    }
  }

  if (open.length) {
    lines.push(
      "",
      `The client has delegated these decisions to the studio — make them ` +
        `deliberately, grounded in the brief and the research:`,
      ...open.map((o) => `- ${o}.`),
    );
  }

  // When a creative platform has been generated (Phase 0 of the logo studio),
  // every asset generator designs from the same strategy — this is what keeps
  // logo, palette, type, and guidelines expressing one idea.
  const platform = platformContext(brand.data);
  if (platform) lines.push("", platform);

  return lines.join("\n");
}
