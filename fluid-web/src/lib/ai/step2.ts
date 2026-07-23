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

// The five hex values behind a chosen Step 2 palette, or null.
export function paletteBasis(s2: Step2): string[] | null {
  if (!s2.palette) return null;
  const p = PALETTES[s2.palette];
  return p ? p.colors : null;
}

// The chosen font pairing (open-source or uploaded custom), or null.
export function fontChoice(s2: Step2): { heading: string; body: string } | null {
  const f = s2.font;
  if (!f) return null;
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

  const style = brand.style_id ? STYLE_NAMES[brand.style_id] || brand.style_id : "";
  if (style) lines.push(`Visual direction: ${style}.`);

  const refine = refineWords(s2.refine);
  if (refine.length) lines.push(`Tuned to feel: ${refine.join(", ")}.`);

  if (s2.inspiration) {
    lines.push(`Draws inspiration from ${s2.inspiration}'s design language (adapt its spirit, do not copy it).`);
  }

  const basis = paletteBasis(s2);
  if (s2.palette && basis) {
    lines.push(`Preferred color palette "${s2.palette}": ${basis.join(", ")}.`);
  }

  const fonts = fontChoice(s2);
  if (fonts) {
    lines.push(`Chosen typography: ${fonts.heading} for headings, ${fonts.body} for body.`);
  }

  // When a creative platform has been generated (Phase 0 of the logo studio),
  // every asset generator designs from the same strategy — this is what keeps
  // logo, palette, type, and guidelines expressing one idea.
  const platform = platformContext(brand.data);
  if (platform) lines.push("", platform);

  return lines.join("\n");
}
