// Shared shapes for the one-shot brand-kit generator.
//
// This replaces the old brand-chat's 20-field BrandContext with something
// much smaller: a brief in, one strategy read, one composite board image
// out. See skills/brandkit/SKILL.md for what the strategy fields feed.

// The fixed category vocabulary — both the UI chips and the category-step
// draft contract read this same list, so a drafted answer is guaranteed to
// match a real chip instead of drifting to the skill's own illustrative
// category table (e.g. "Drone / robotics"), which isn't this app's list.
export const CATEGORIES = [
  "SaaS / tools", "Consumer app", "D2C product", "Marketplace", "Studio / agency", "Fintech",
  "Health & wellness", "Food & drink", "Fashion", "Education", "Media & publishing", "Real estate",
  "Travel & hospitality", "B2B services", "Non-profit", "Hardware", "Gaming", "Beauty & personal care",
  "Something else",
];

export type BrandKitLayout = "3x3" | "2x3" | "2x2" | "1x3" | "4x2";

export const LAYOUTS: Array<{ id: BrandKitLayout; name: string; note: string }> = [
  { id: "3x3", name: "3 × 3", note: "Full identity system — the default." },
  { id: "2x3", name: "2 × 3", note: "Cinematic brand deck overview." },
  { id: "2x2", name: "2 × 2", note: "Compact concept board." },
  { id: "1x3", name: "1 × 3", note: "Horizontal brand strip." },
  { id: "4x2", name: "4 × 2", note: "Wide contact-sheet layout." },
];

export type VisualMode =
  | "dark-developer"
  | "dark-product"
  | "dark-nature"
  | "dark-security"
  | "light-editorial"
  | "luxury"
  | "voice"
  | "cultural";

export const VISUAL_MODES: Array<{ id: VisualMode; name: string; note: string }> = [
  { id: "dark-developer", name: "Dark developer / builder", note: "Terminal windows, prompt bars, cyan/coral accents." },
  { id: "dark-product", name: "Dark product / operator", note: "Black/amber, glowing UI chips, tactical." },
  { id: "dark-nature", name: "Dark nature / calm system", note: "Deep green, misty landscapes, quiet trust." },
  { id: "dark-security", name: "Dark security / threat intel", note: "Navy, shield forms, radar lines, vigilant." },
  { id: "light-editorial", name: "Light editorial / compliance", note: "Warm ivory, paper texture, institutional." },
  { id: "luxury", name: "Luxury / beauty / fashion", note: "Ivory/espresso, serif wordmark, embossing." },
  { id: "voice", name: "Voice / communication", note: "Dark indigo, lilac glow, waveform, intimate." },
  { id: "cultural", name: "Cultural / experimental", note: "Halftone, CRT texture, bold, punchy." },
];

/** What the user actually gives us. */
export interface BrandKitBrief {
  name: string;
  brief: string;
  category?: string;
  audience?: string;
  visualMode?: VisualMode;
  layout?: BrandKitLayout;
  avoid?: string[];
}

/** One palette swatch, matching what Prototype.jsx's card visual expects: {hex, role}. */
export interface PaletteSwatch {
  hex: string;
  role: string;
}

/** The model's strategy read, before any image gets drawn. */
export interface BrandKitStrategy {
  category: string;
  audience: string;
  personality: string;
  emotionalPromise: string;
  culturalPosition: string;
  trustLevel: string;
  coreMetaphor: string;
  logoIdea: string;
  visualMode: VisualMode;
  palette: PaletteSwatch[];
  tagline: string;
}

/** What a finished run hands back to the API route and the client. */
export interface BrandKitResult {
  imageUrl: string;
  imagePrompt: string;
  imageModel: string;
  layout: BrandKitLayout;
  strategy: BrandKitStrategy;
  generatedAt: string;
}
