// Real-world reference logos shown on the Step 4 mark-type cards, so the
// choice is illustrated by marks people already know rather than by an
// abstract diagram alone.
//
// These are third-party trademarks, used here only to illustrate what a
// category of mark looks like. Nothing about them implies any affiliation
// with, or endorsement by, their owners.
//
// The files in public/logo-refs/ have been normalised for display: each
// viewBox is cropped tight to its own artwork with a uniform 1.5% margin, and
// fixed width/height attributes are stripped so CSS drives the box. That
// normalisation matters — several of the source files were square canvases
// with the wordmark as a thin band, wasting up to 74% of their height as
// padding, which would have rendered them at a fraction of the optical size
// of the others in the same row.

export interface LogoReference {
  name: string;
  src: string;
}

// Keyed by MarkTypeOption.id. A type with no entry falls back to its drawn
// preview illustration, so this can be filled in one mark type at a time.
export const LOGO_REFERENCES: Record<string, LogoReference[]> = {
  // Zara leads the reel by product direction; the remaining marks alternate
  // colour and width so successive frames read as visibly different examples.
  wordmark: [
    { name: "Zara", src: "/logo-refs/wordmark/zara.svg" },
    { name: "Coca-Cola", src: "/logo-refs/wordmark/coca-cola.svg" },
    { name: "Visa", src: "/logo-refs/wordmark/visa.svg" },
    { name: "Uber", src: "/logo-refs/wordmark/uber.svg" },
    { name: "Amazon", src: "/logo-refs/wordmark/amazon.svg" },
    { name: "Stripe", src: "/logo-refs/wordmark/stripe.svg" },
    { name: "Disney", src: "/logo-refs/wordmark/disney.svg" },
    { name: "Oracle", src: "/logo-refs/wordmark/oracle.svg" },
    { name: "Virgin", src: "/logo-refs/wordmark/virgin.svg" },
    { name: "Activision", src: "/logo-refs/wordmark/activision.svg" },
  ],
};

export function logoReferencesFor(id: string | null | undefined): LogoReference[] {
  return (id && LOGO_REFERENCES[id]) || [];
}
