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
