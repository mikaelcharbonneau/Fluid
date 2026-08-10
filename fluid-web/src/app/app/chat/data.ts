// The fixed option lists for the brand-kit form.
//
// Categories, visual modes, and layouts are read straight from
// `@/lib/brand-kit/types` — the same list the server's draft contracts are
// constrained to, so a drafted answer always matches a real chip. `AVOIDS`
// has no server-side counterpart (the `avoid` step is never AI-drafted), so
// it stays here.

export const AVOIDS = [
  "Gradients", "Mascots", "Neon", "Serif type", "Stock photography", "Rounded blobs", "Emoji",
  "Drop shadows", "Abstract swooshes", "Bright primary colors", "Hand lettering", "Clip art",
  "Corporate blue", "Skeuomorphism", "Glassmorphism", "Line icons only", "All-caps everywhere",
];
