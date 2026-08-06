// What the logo is for, and which files that implies.
//
// A straight lookup, deliberately. Which format suits a favicon is not a
// judgement call that needs a model — it is knowledge, and knowledge belongs in
// a table where it can be read, argued with, and corrected. The table only
// pre-selects: whatever it suggests, the client can tick and untick freely.

export type FormatId = "svg" | "png" | "ico" | "pdf" | "mono" | "reversed";

export interface ExportFormat {
  id: FormatId;
  label: string;
  hint: string;
}

export const EXPORT_FORMATS: ExportFormat[] = [
  {
    id: "svg",
    label: "SVG",
    hint: "Vector. Scales to any size without loss — the master file.",
  },
  {
    id: "png",
    label: "PNG set",
    hint: "Raster at 16 to 1024px, transparent background.",
  },
  {
    id: "ico",
    label: "Favicon (.ico)",
    hint: "Multi-resolution icon file, what a browser tab actually wants.",
  },
  {
    id: "pdf",
    label: "PDF",
    hint: "Vector PDF. What print shops and sign makers ask for.",
  },
  {
    id: "mono",
    label: "Single colour",
    hint: "One-colour version on transparency, for stamps, etching and embroidery.",
  },
  {
    id: "reversed",
    label: "Reversed",
    hint: "Light mark on a dark ground, for dark interfaces and photography.",
  },
];

export interface UseCase {
  id: string;
  label: string;
  blurb: string;
  formats: FormatId[];
}

/**
 * The uses, and what each one needs.
 *
 * Each list is what that use genuinely requires, not everything that might
 * conceivably help — a client who ticks one box should get a short, defensible
 * set of files rather than the whole catalogue. Ticking several unions them.
 */
export const USE_CASES: UseCase[] = [
  {
    id: "website",
    label: "Website",
    blurb: "Header, footer, anywhere it appears on your own site.",
    formats: ["svg", "png"],
  },
  {
    id: "favicon",
    label: "Browser tab",
    blurb: "The little icon in the tab and in bookmarks.",
    formats: ["ico", "png"],
  },
  {
    id: "app_icon",
    label: "App icon",
    blurb: "A launcher icon on a phone or desktop.",
    formats: ["png", "svg"],
  },
  {
    id: "social",
    label: "Social profile",
    blurb: "Profile pictures and avatars, which get cropped to a circle.",
    formats: ["png"],
  },
  {
    id: "print",
    label: "Print & stationery",
    blurb: "Business cards, letterheads, anything going to a printer.",
    formats: ["pdf", "svg"],
  },
  {
    id: "signage",
    label: "Signage & large format",
    blurb: "Shopfronts, banners, vehicle livery — big, and often one colour.",
    formats: ["pdf", "svg", "mono"],
  },
  {
    id: "merch",
    label: "Merchandise",
    blurb: "Embroidery, screen printing, engraving — processes with few inks.",
    formats: ["mono", "pdf", "svg"],
  },
  {
    id: "dark_ui",
    label: "Dark backgrounds",
    blurb: "Dark mode, video, or laid over photography.",
    formats: ["reversed", "svg", "png"],
  },
];

/** The union of what every selected use needs, in catalogue order. */
export function recommendedFormats(useIds: string[]): FormatId[] {
  const wanted = new Set<FormatId>();
  for (const id of useIds) {
    const use = USE_CASES.find((u) => u.id === id);
    if (use) use.formats.forEach((f) => wanted.add(f));
  }
  return EXPORT_FORMATS.filter((f) => wanted.has(f.id)).map((f) => f.id);
}

/** Which selected uses asked for a given format — shown as the reason for it. */
export function reasonsFor(format: FormatId, useIds: string[]): string[] {
  return USE_CASES.filter((u) => useIds.includes(u.id) && u.formats.includes(format)).map(
    (u) => u.label,
  );
}

/** The PNG sizes a full set contains. 16 for tabs, 1024 for app stores. */
export const PNG_SIZES = [16, 32, 64, 128, 256, 512, 1024];

/** The sizes packed into an .ico. Anything past 256 is not addressable there. */
export const ICO_SIZES = [16, 32, 48, 64, 128, 256];
