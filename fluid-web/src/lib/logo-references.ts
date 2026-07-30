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
    { name: "Cursor", src: "/logo-refs/pictorial/cursor.svg" },
    { name: "Dropbox", src: "/logo-refs/pictorial/dropbox.svg" },
    { name: "Linktree", src: "/logo-refs/pictorial/linktree.svg" },
    { name: "Robinhood", src: "/logo-refs/pictorial/robinhood.svg" },
    { name: "Square", src: "/logo-refs/pictorial/square.svg" },
    { name: "Dribbble", src: "/logo-refs/pictorial/dribbble.svg" },
    { name: "Lumen", src: "/logo-refs/pictorial/lumen.svg" },
    { name: "Target", src: "/logo-refs/pictorial/target.svg" },
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
  mascot: [
    { name: "Android", src: "/logo-refs/mascot/android.svg" },
    { name: "Claude Code", src: "/logo-refs/mascot/claudecode.svg" },
    { name: "Deliveroo", src: "/logo-refs/mascot/deliveroo.svg" },
    { name: "DuckDuckGo", src: "/logo-refs/mascot/duckduckgo.svg" },
    { name: "Duolingo", src: "/logo-refs/mascot/duolingo.svg" },
    { name: "GIMP", src: "/logo-refs/mascot/gimp.svg" },
    { name: "GitHub", src: "/logo-refs/mascot/github.svg" },
    { name: "Google Jules", src: "/logo-refs/mascot/googlejules.svg" },
    { name: "Hootsuite", src: "/logo-refs/mascot/hootsuite.svg" },
    { name: "Linux", src: "/logo-refs/mascot/linux.svg" },
    { name: "Mailchimp", src: "/logo-refs/mascot/mailchimp.svg" },
    { name: "Ollama", src: "/logo-refs/mascot/ollama.svg" },
    { name: "Reddit", src: "/logo-refs/mascot/reddit.svg" },
    { name: "Tripadvisor", src: "/logo-refs/mascot/tripadvisor.svg" },
    { name: "Waze", src: "/logo-refs/mascot/waze.svg" },
  ],
  combination: [
    { name: "Architect", src: "/logo-refs/combination/architect.svg" },
    { name: "Atom", src: "/logo-refs/combination/atom.svg" },
    { name: "Atomico", src: "/logo-refs/combination/atomicojs.svg" },
    { name: "Booqable", src: "/logo-refs/combination/booqable.svg" },
    { name: "Code Climate", src: "/logo-refs/combination/codeclimate.svg" },
    { name: "CodeSandbox", src: "/logo-refs/combination/codesandbox.svg" },
    { name: "COMSOL", src: "/logo-refs/combination/comsol.svg" },
    { name: "Delta", src: "/logo-refs/combination/delta.svg" },
    { name: "Drip", src: "/logo-refs/combination/drip.svg" },
    { name: "Flattr", src: "/logo-refs/combination/flattr.svg" },
    { name: "Grok", src: "/logo-refs/combination/grok.svg" },
    { name: "Kafka", src: "/logo-refs/combination/kafka.svg" },
    { name: "Kirby", src: "/logo-refs/combination/kirby.svg" },
    { name: "Linear", src: "/logo-refs/combination/linear-2.svg" },
    { name: "Malt", src: "/logo-refs/combination/malt.svg" },
    { name: "Matter", src: "/logo-refs/combination/matter.svg" },
    { name: "Medium", src: "/logo-refs/combination/medium.svg" },
    { name: "Moonshot AI", src: "/logo-refs/combination/moonshot-ai.svg" },
    { name: "mParticle", src: "/logo-refs/combination/mparticle.svg" },
    { name: "Notion", src: "/logo-refs/combination/notion-2.svg" },
    { name: "Okta", src: "/logo-refs/combination/okta.svg" },
    { name: "Pinecone", src: "/logo-refs/combination/pinecone.svg" },
    { name: "PureScript", src: "/logo-refs/combination/purescript.svg" },
    { name: "Recoil", src: "/logo-refs/combination/recoil.svg" },
    { name: "Stately", src: "/logo-refs/combination/stately.svg" },
    { name: "Stencil", src: "/logo-refs/combination/stenciljs.svg" },
    { name: "Survicate", src: "/logo-refs/combination/survicate.svg" },
    { name: "Tapcart", src: "/logo-refs/combination/tapcart.svg" },
    { name: "Threads", src: "/logo-refs/combination/threads.svg" },
    { name: "Tidal", src: "/logo-refs/combination/tidal-2.svg" },
    { name: "Vercel", src: "/logo-refs/combination/vercel.svg" },
    { name: "Zebra Technologies", src: "/logo-refs/combination/zebratechnologies.svg" },
  ],
};

export function logoReferencesFor(id: string | null | undefined): LogoReference[] {
  return (id && LOGO_REFERENCES[id]) || [];
}
