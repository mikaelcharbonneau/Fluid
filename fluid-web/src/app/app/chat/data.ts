// The fixed option lists.
//
// These are the answers that come from a curated list rather than a model:
// there is no version of "what stage are you at" that benefits from being
// generated, and a fixed list is faster, free, and the same every time. The
// server knows these steps have no payload and sends none — see
// lib/brand-chat/step.ts.

export const PATHS = [
  { id: "new", name: "A new brand", note: "Nothing exists yet. Start from the idea." },
  { id: "audit", name: "Fix an existing one", note: "Diagnose first, then decide how far to go." },
  { id: "name-only", name: "Just a name", note: "Ten candidates with the reasoning behind each." },
  { id: "logo-only", name: "Just a logo", note: "Skip the strategy. Marks from a name and a direction." },
  { id: "voice-only", name: "Just the voice", note: "Tone, vocabulary and the rules for writing it." },
  { id: "guidelines-only", name: "Just the guidelines", note: "You have the parts. I’ll write the standards." },
  { id: "market", name: "Market an existing brand", note: "The identity is settled. Now go find people." },
];

export const CATEGORIES = [
  "SaaS / tools", "Consumer app", "D2C product", "Marketplace", "Studio / agency", "Fintech",
  "Health & wellness", "Food & drink", "Fashion", "Education", "Media & publishing", "Real estate",
  "Travel & hospitality", "B2B services", "Non-profit", "Hardware", "Gaming", "Beauty & personal care",
  "Something else",
];

export const STAGES = ["Pre-launch", "Early — first customers", "Growth", "Established"];

export const VALUES = [
  "Craft", "Honesty", "Restraint", "Speed", "Rigour", "Warmth", "Playfulness", "Independence",
  "Generosity", "Precision", "Sustainability", "Irreverence", "Curiosity", "Boldness", "Empathy",
  "Transparency", "Ambition", "Simplicity", "Loyalty", "Resilience",
];

export const GOALS = [
  "Get the first 1,000 users", "Raise a round", "Build category awareness",
  "Move upmarket", "Enter a new market", "Make revenue, quietly",
];

export const SLIDERS = [
  { id: "tone", left: "Playful", right: "Serious" },
  { id: "formality", left: "Casual", right: "Formal" },
  { id: "price", left: "Affordable", right: "Premium" },
  { id: "era", left: "Classic", right: "Innovative" },
  { id: "volume", left: "Muted", right: "Bold" },
] as const;

export const AVOIDS = [
  "Gradients", "Mascots", "Neon", "Serif type", "Stock photography", "Rounded blobs", "Emoji",
  "Drop shadows", "Abstract swooshes", "Bright primary colors", "Hand lettering", "Clip art",
  "Corporate blue", "Skeuomorphism", "Glassmorphism", "Line icons only", "All-caps everywhere",
];

// Matches Fluid's own mark taxonomy in lib/ai/design.ts. The choice changes
// what gets generated, not just how it is styled.
export const LOGO_TYPES = [
  { id: "wordmark", name: "Wordmark", note: "The full name, styled." },
  { id: "lettermark", name: "Lettermark", note: "Initials carry the mark." },
  { id: "combination", name: "Combination", note: "A symbol beside the name." },
  { id: "pictorial", name: "Pictorial", note: "A recognisable object, simplified." },
  { id: "abstract", name: "Abstract", note: "A geometric form, no literal meaning." },
  { id: "emblem", name: "Emblem", note: "Name and symbol locked in one badge." },
  { id: "mascot", name: "Mascot", note: "A character carries the brand." },
];

export const TIMINGS = ["In two weeks", "Next month", "This quarter", "No date yet"];

// ---- typographic lockups --------------------------------------------
//
// Six ways of setting the chosen name. These are deterministic CSS — real
// type, really set, but drawn here in the browser rather than generated. They
// are the lockup half of an identity; the drawn marks (pictorial, abstract,
// mascot) come from the image pipeline, which this screen does not call yet.
// Those types say so rather than showing a shape that was never designed.

const DISPLAY = "Metropolis,Inter,sans-serif";
const MONO = "'JetBrains Mono',monospace";

export interface Lockup {
  kind: string;
  mode: "wordmark" | "combo" | "emblem" | "pending";
  text?: string;
  weight?: number;
  size?: number;
  tracking?: string;
  transform?: string;
  family?: string;
  bg: string;
  fg?: string;
  dot?: boolean;
  shape?: "circle" | "square" | "diamond";
  shapeColor?: string;
  ringShape?: "circle" | "square" | "diamond";
  ringWidth?: number;
  ring?: string;
  note?: string;
}

export function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  return parts.length > 1
    ? (parts[0][0] + parts[1][0]).toUpperCase()
    : parts[0].slice(0, 1).toUpperCase();
}

export function lockups(name: string, type: string): Lockup[] {
  if (type === "lettermark") {
    const i = initials(name);
    return [
      { kind: "Regular", mode: "wordmark", text: `${i}.`, weight: 800, size: 40, tracking: "-0.03em", transform: "none", family: DISPLAY, bg: "#FFFFFF", fg: "#000000" },
      { kind: "Heavy", mode: "wordmark", text: i, weight: 900, size: 44, tracking: "-0.05em", transform: "none", family: DISPLAY, bg: "#FFFFFF", fg: "#000000" },
      { kind: "Mono", mode: "wordmark", text: i.toLowerCase(), weight: 500, size: 32, tracking: "0.02em", transform: "lowercase", family: MONO, bg: "#F0F0F2", fg: "#000000" },
      { kind: "Reversed", mode: "wordmark", text: `${i}.`, weight: 800, size: 40, tracking: "-0.03em", transform: "none", family: DISPLAY, bg: "#101418", fg: "#FDBBC0" },
      { kind: "Condensed", mode: "wordmark", text: i, weight: 700, size: 36, tracking: "-0.01em", transform: "none", family: DISPLAY, bg: "#FFFFFF", fg: "#000000" },
      { kind: "Caps, spaced", mode: "wordmark", text: i, weight: 600, size: 26, tracking: "0.2em", transform: "uppercase", family: DISPLAY, bg: "#FFFFFF", fg: "#000000" },
    ];
  }

  if (type === "combination") {
    return [
      { kind: "Circle + wordmark", mode: "combo", shape: "circle", shapeColor: "#000000", text: name, weight: 700, size: 20, tracking: "-0.02em", transform: "none", family: DISPLAY, bg: "#FFFFFF", fg: "#000000" },
      { kind: "Square + wordmark", mode: "combo", shape: "square", shapeColor: "#FD7947", text: name, weight: 700, size: 20, tracking: "-0.02em", transform: "none", family: DISPLAY, bg: "#FFFFFF", fg: "#000000" },
      { kind: "Diamond + wordmark", mode: "combo", shape: "diamond", shapeColor: "#000000", text: name, weight: 700, size: 20, tracking: "-0.02em", transform: "none", family: DISPLAY, bg: "#FFFFFF", fg: "#000000" },
      { kind: "Circle + caps", mode: "combo", shape: "circle", shapeColor: "#000000", text: name, weight: 600, size: 14, tracking: "0.14em", transform: "uppercase", family: DISPLAY, bg: "#FFFFFF", fg: "#000000" },
      { kind: "Square, reversed", mode: "combo", shape: "square", shapeColor: "#FDBBC0", text: name, weight: 700, size: 19, tracking: "-0.02em", transform: "none", family: DISPLAY, bg: "#101418", fg: "#FFFFFF" },
      { kind: "Diamond, mono", mode: "combo", shape: "diamond", shapeColor: "#FD7947", text: name.toLowerCase(), weight: 500, size: 15, tracking: "0.01em", transform: "lowercase", family: MONO, bg: "#F0F0F2", fg: "#000000" },
    ];
  }

  if (type === "emblem") {
    const i = initials(name);
    return [
      { kind: "Thin ring", mode: "emblem", ringShape: "circle", ringWidth: 2, text: i, weight: 700, size: 22, tracking: "-0.01em", transform: "none", family: DISPLAY, bg: "#FFFFFF", fg: "#000000", ring: "#000000" },
      { kind: "Solid badge", mode: "emblem", ringShape: "circle", ringWidth: 0, text: i, weight: 700, size: 22, tracking: "-0.01em", transform: "none", family: DISPLAY, bg: "#000000", fg: "#FFFFFF", ring: "transparent" },
      { kind: "Double ring", mode: "emblem", ringShape: "circle", ringWidth: 5, text: i, weight: 700, size: 20, tracking: "-0.01em", transform: "none", family: DISPLAY, bg: "#FFFFFF", fg: "#000000", ring: "#FD7947" },
      { kind: "Square badge", mode: "emblem", ringShape: "square", ringWidth: 2, text: i, weight: 700, size: 22, tracking: "-0.01em", transform: "none", family: DISPLAY, bg: "#FFFFFF", fg: "#000000", ring: "#000000" },
      { kind: "Reversed ring", mode: "emblem", ringShape: "circle", ringWidth: 2, text: i, weight: 700, size: 22, tracking: "-0.01em", transform: "none", family: DISPLAY, bg: "#101418", fg: "#FDBBC0", ring: "#FDBBC0" },
      { kind: "Diamond badge", mode: "emblem", ringShape: "diamond", ringWidth: 2, text: i, weight: 700, size: 18, tracking: "-0.01em", transform: "none", family: DISPLAY, bg: "#FFFFFF", fg: "#000000", ring: "#000000" },
    ];
  }

  if (type === "pictorial" || type === "abstract" || type === "mascot") {
    // Honest rather than decorative: a drawn mark has to be drawn, and
    // filling these cards with CSS shapes would present something nobody
    // designed as a candidate the user could pick.
    const note =
      type === "mascot"
        ? "A mascot has to be drawn — the logo studio does that."
        : type === "pictorial"
          ? "A pictorial mark has to be drawn — the logo studio does that."
          : "An abstract mark has to be drawn — the logo studio does that.";
    return Array.from({ length: 6 }, (_, i) => ({
      kind: `Concept ${String.fromCharCode(65 + i)}`,
      mode: "pending" as const,
      bg: "#F0F0F2",
      note,
    }));
  }

  // wordmark — the default.
  return [
    { kind: "Wordmark", mode: "wordmark", text: name, weight: 800, size: 27, tracking: "-0.04em", transform: "none", family: DISPLAY, bg: "#FFFFFF", fg: "#000000", dot: false },
    { kind: "Wordmark + dot", mode: "wordmark", text: name, weight: 800, size: 27, tracking: "-0.04em", transform: "none", family: DISPLAY, bg: "#FFFFFF", fg: "#000000", dot: true },
    { kind: "Mono lock", mode: "wordmark", text: name.toLowerCase(), weight: 500, size: 19, tracking: "0.06em", transform: "lowercase", family: MONO, bg: "#F0F0F2", fg: "#000000", dot: false },
    { kind: "Caps", mode: "wordmark", text: name, weight: 700, size: 17, tracking: "0.28em", transform: "uppercase", family: DISPLAY, bg: "#FFFFFF", fg: "#000000", dot: false },
    { kind: "Reversed", mode: "wordmark", text: name, weight: 700, size: 24, tracking: "-0.03em", transform: "none", family: DISPLAY, bg: "#101418", fg: "#FDBBC0", dot: false },
    { kind: "Light", mode: "wordmark", text: name, weight: 500, size: 25, tracking: "-0.02em", transform: "none", family: DISPLAY, bg: "#FFFFFF", fg: "#000000", dot: false },
  ];
}
