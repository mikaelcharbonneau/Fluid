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
  lettermark: [
    { name: "Anthropic", src: "/logo-refs/lettermark/anthropic.svg" },
    { name: "Figma", src: "/logo-refs/lettermark/figma.svg" },
    { name: "Framer", src: "/logo-refs/lettermark/framer.svg" },
    { name: "Kick", src: "/logo-refs/lettermark/kick.svg" },
    { name: "Klarna", src: "/logo-refs/lettermark/klarna.svg" },
    { name: "Kotlin", src: "/logo-refs/lettermark/kotlin.svg" },
    { name: "Lucid", src: "/logo-refs/lettermark/lucid.svg" },
    { name: "Marriott", src: "/logo-refs/lettermark/marriott.svg" },
    { name: "Mistral AI", src: "/logo-refs/lettermark/mistralai.svg" },
    { name: "Netflix", src: "/logo-refs/lettermark/netflix.svg" },
    { name: "Meta", src: "/logo-refs/lettermark/meta.svg" },
    { name: "Notion", src: "/logo-refs/lettermark/notion.svg" },
    { name: "Peloton", src: "/logo-refs/lettermark/peloton.svg" },
    { name: "Pinterest", src: "/logo-refs/lettermark/pinterest.svg" },
    { name: "Resend", src: "/logo-refs/lettermark/resend.svg" },
    { name: "Revolut", src: "/logo-refs/lettermark/revolut.svg" },
    { name: "Rolls-Royce", src: "/logo-refs/lettermark/rollsroyce.svg" },
    { name: "Tesla", src: "/logo-refs/lettermark/tesla.svg" },
    { name: "Tidal", src: "/logo-refs/lettermark/tidal.svg" },
    { name: "Volkswagen", src: "/logo-refs/lettermark/volkswagen.svg" },
    { name: "Webflow", src: "/logo-refs/lettermark/webflow.svg" },
    { name: "Wikipedia", src: "/logo-refs/lettermark/wikipedia.svg" },
    { name: "Windsurf", src: "/logo-refs/lettermark/windsurf.svg" },
    { name: "X", src: "/logo-refs/lettermark/x.svg" },
    { name: "Z.ai", src: "/logo-refs/lettermark/zdotai.svg" },
    { name: "Zendesk", src: "/logo-refs/lettermark/zendesk.svg" },
    { name: "Arc", src: "/logo-refs/lettermark/arc.svg" },
    { name: "Airbnb", src: "/logo-refs/lettermark/airbnb-2.svg" },
    { name: "Coda", src: "/logo-refs/lettermark/coda.svg" },
    { name: "XRP", src: "/logo-refs/lettermark/xrp.svg" },
  ],
  pictorial: [
    { name: "Apple", src: "/logo-refs/pictorial/apple.svg" },
    { name: "Bombardier", src: "/logo-refs/pictorial/bombardier.svg" },
    { name: "Brex", src: "/logo-refs/pictorial/brex.svg" },
    { name: "Claude", src: "/logo-refs/pictorial/claude.svg" },
    { name: "ClickUp", src: "/logo-refs/pictorial/clickup.svg" },
    { name: "Cursor", src: "/logo-refs/pictorial/cursor.svg" },
    { name: "Dolby", src: "/logo-refs/pictorial/dolby.svg" },
    { name: "Dovetail", src: "/logo-refs/pictorial/dovetail.svg" },
    { name: "Dropbox", src: "/logo-refs/pictorial/dropbox.svg" },
    { name: "Ethereum", src: "/logo-refs/pictorial/ethereum.svg" },
    { name: "Frontify", src: "/logo-refs/pictorial/frontify.svg" },
    { name: "GrapheneOS", src: "/logo-refs/pictorial/grapheneos.svg" },
    { name: "Hashnode", src: "/logo-refs/pictorial/hashnode.svg" },
    { name: "Linear", src: "/logo-refs/pictorial/linear.svg" },
    { name: "Linktree", src: "/logo-refs/pictorial/linktree.svg" },
    { name: "Loom", src: "/logo-refs/pictorial/loom.svg" },
    { name: "Mastercard", src: "/logo-refs/pictorial/mastercard.svg" },
    { name: "Meta AI", src: "/logo-refs/pictorial/metaai.svg" },
    { name: "Nike", src: "/logo-refs/pictorial/nike.svg" },
    { name: "Palantir", src: "/logo-refs/pictorial/palantir.svg" },
    { name: "Perplexity", src: "/logo-refs/pictorial/perplexity.svg" },
    { name: "Polestar", src: "/logo-refs/pictorial/polestar.svg" },
    { name: "Qwen", src: "/logo-refs/pictorial/qwen.svg" },
    { name: "Razer", src: "/logo-refs/pictorial/razer.svg" },
    { name: "Replit", src: "/logo-refs/pictorial/replit.svg" },
    { name: "Robinhood", src: "/logo-refs/pictorial/robinhood.svg" },
    { name: "Snapchat", src: "/logo-refs/pictorial/snapchat.svg" },
    { name: "Spaceship", src: "/logo-refs/pictorial/spaceship.svg" },
    { name: "Spotify", src: "/logo-refs/pictorial/spotify.svg" },
    { name: "Square", src: "/logo-refs/pictorial/square.svg" },
    { name: "Stellar", src: "/logo-refs/pictorial/stellar.svg" },
    { name: "Talos", src: "/logo-refs/pictorial/talos.svg" },
    { name: "Treyarch", src: "/logo-refs/pictorial/treyarch.svg" },
    { name: "Unsplash", src: "/logo-refs/pictorial/unsplash.svg" },
  ],
  abstract: [
    { name: "Bombardier", src: "/logo-refs/abstract/bombardier.svg" },
    { name: "Brex", src: "/logo-refs/abstract/brex.svg" },
    { name: "Claude", src: "/logo-refs/abstract/claude.svg" },
    { name: "ClickUp", src: "/logo-refs/abstract/clickup.svg" },
    { name: "Dolby", src: "/logo-refs/abstract/dolby.svg" },
    { name: "Dovetail", src: "/logo-refs/abstract/dovetail.svg" },
    { name: "Ethereum", src: "/logo-refs/abstract/ethereum.svg" },
    { name: "Frontify", src: "/logo-refs/abstract/frontify.svg" },
    { name: "GrapheneOS", src: "/logo-refs/abstract/grapheneos.svg" },
    { name: "Hashnode", src: "/logo-refs/abstract/hashnode.svg" },
    { name: "Linear", src: "/logo-refs/abstract/linear.svg" },
    { name: "Loom", src: "/logo-refs/abstract/loom.svg" },
    { name: "Mastercard", src: "/logo-refs/abstract/mastercard.svg" },
    { name: "Maserati", src: "/logo-refs/abstract/maserati.svg" },
    { name: "Meta AI", src: "/logo-refs/abstract/metaai.svg" },
    { name: "Nike", src: "/logo-refs/abstract/nike.svg" },
    { name: "Palantir", src: "/logo-refs/abstract/palantir.svg" },
    { name: "Perplexity", src: "/logo-refs/abstract/perplexity.svg" },
    { name: "Polestar", src: "/logo-refs/abstract/polestar.svg" },
    { name: "Qwen", src: "/logo-refs/abstract/qwen.svg" },
    { name: "Razer", src: "/logo-refs/abstract/razer.svg" },
    { name: "Replit", src: "/logo-refs/abstract/replit.svg" },
    { name: "Spaceship", src: "/logo-refs/abstract/spaceship.svg" },
    { name: "Spotify", src: "/logo-refs/abstract/spotify.svg" },
    { name: "Stellar", src: "/logo-refs/abstract/stellar.svg" },
    { name: "Talos", src: "/logo-refs/abstract/talos.svg" },
    { name: "Treyarch", src: "/logo-refs/abstract/treyarch.svg" },
    { name: "Unsplash", src: "/logo-refs/abstract/unsplash.svg" },
  ],
};

export function logoReferencesFor(id: string | null | undefined): LogoReference[] {
  return (id && LOGO_REFERENCES[id]) || [];
}
