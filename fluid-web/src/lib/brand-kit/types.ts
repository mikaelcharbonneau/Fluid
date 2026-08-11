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
  | "minimal"
  | "playful"
  | "organic"
  | "luxury"
  | "retro"
  | "futuristic"
  | "editorial"
  | "corporate"
  | "craft"
  | "edgy";

// Style archetypes, not industries — any category can pick any mode. See
// skills/brandkit/SKILL.md's "VISUAL MODES" section for the full cues each
// one expands to.
export const VISUAL_MODES: Array<{ id: VisualMode; name: string; note: string }> = [
  { id: "minimal", name: "Minimal", note: "Quiet negative space, one accent color, precise and confident." },
  { id: "playful", name: "Playful", note: "Saturated color, chunky shapes, energetic and fun." },
  { id: "organic", name: "Organic", note: "Earthy palette, organic linework, grounded and approachable." },
  { id: "luxury", name: "Luxury", note: "Serif wordmark, fine linework, tasteful and expensive." },
  { id: "retro", name: "Retro", note: "Vintage palette, halftone grain, nostalgic and characterful." },
  { id: "futuristic", name: "Futuristic", note: "Near-black base, electric accent, sharp and advanced." },
  { id: "editorial", name: "Editorial", note: "Warm paper, classic serif, magazine-style and considered." },
  { id: "corporate", name: "Corporate", note: "Navy/charcoal, clean sans-serif, trustworthy and understated." },
  { id: "craft", name: "Craft", note: "Kraft paper, hand-lettering, authentic and small-batch." },
  { id: "edgy", name: "Edgy", note: "Raw high-contrast texture, distressed type, rebellious and unpolished." },
];

export type NameStyle =
  | "all"
  | "brandable"
  | "evocative"
  | "short-phrase"
  | "compound"
  | "alternate-spelling"
  | "non-english"
  | "real-words";

export const NAME_STYLES: Array<{ id: NameStyle; name: string; example: string }> = [
  { id: "all", name: "All styles", example: "No preference" },
  { id: "brandable", name: "Brandable", example: "e.g. Google, Rolex" },
  { id: "evocative", name: "Evocative", example: "e.g. Red Bull, Forever 21" },
  { id: "short-phrase", name: "Short phrase", example: "e.g. Dollar Shave Club" },
  { id: "compound", name: "Compound words", example: "e.g. FedEx, Microsoft" },
  { id: "alternate-spelling", name: "Alternate spelling", example: "e.g. Lyft, Fiverr" },
  { id: "non-english", name: "Non-English words", example: "e.g. Toyota, Audi" },
  { id: "real-words", name: "Real words", example: "e.g. Apple, Amazon" },
];

/** The user's naming constraints, collected right before names are drafted. */
export interface NamePreferences {
  /** Defaults to `["all"]` — no style preference. */
  styles: NameStyle[];
  maxSyllables?: number;
  maxCharacters?: number;
  maxWords?: number;
  blacklist: string[];
  mustInclude: string[];
}

/** One AI-suggested brand-name candidate. */
export interface NameCandidate {
  name: string;
  /** One sentence of strategic reasoning — why it fits, or a weakness worth knowing. */
  why: string;
  /** A domain worth checking. Availability is never claimed — the model can't check a registry. */
  domain: string;
}

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

/** One rendered logo option from the logoConcepts step. */
export interface LogoConcept {
  id: string;
  /** The construction method used (e.g. "Monogram + Meaning"). */
  label: string;
  /** One-sentence rationale for the construction. */
  idea: string;
  imageUrl: string;
  /**
   * Which "Ask again" round this came from (0 = the first draw). Explicit
   * rather than inferred from array position, because a batch can have
   * fewer than 6 entries when a render fails — grouping by fixed chunks of
   * 6 would misalign every batch after the first partial one.
   */
  batch: number;
}

/** The model's strategy read, before any image gets drawn. */
export interface BrandKitStrategy {
  category: string;
  audience: string;
  personality: string;
  emotionalPromise: string;
  culturalPosition: string;
  trustLevel: string;
  /** The picked logo concept's own rationale — not separately collected. */
  logoIdea: string;
  /** The picked logo concept's render — used as a reference image for the final board. */
  logoImageUrl: string;
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
