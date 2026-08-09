// The fixed option lists for the brand-kit form.
//
// Visual modes and layouts are the brandkit skill's own taxonomy and live
// next to the generator (`@/lib/brand-kit/types`), not here — importing them
// keeps the form and the generator from drifting apart.

export const CATEGORIES = [
  "SaaS / tools", "Consumer app", "D2C product", "Marketplace", "Studio / agency", "Fintech",
  "Health & wellness", "Food & drink", "Fashion", "Education", "Media & publishing", "Real estate",
  "Travel & hospitality", "B2B services", "Non-profit", "Hardware", "Gaming", "Beauty & personal care",
  "Something else",
];

export const AVOIDS = [
  "Gradients", "Mascots", "Neon", "Serif type", "Stock photography", "Rounded blobs", "Emoji",
  "Drop shadows", "Abstract swooshes", "Bright primary colors", "Hand lettering", "Clip art",
  "Corporate blue", "Skeuomorphism", "Glassmorphism", "Line icons only", "All-caps everywhere",
];
