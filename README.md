# Fluid

**From idea to identity — instantly.** Fluid is an AI brand agent: describe a
business in one sentence, and it drafts a full brand — name, logo, color
palette, typography, and written guidelines — in about 60 seconds. Each step
can be refined, regenerated, or overridden by hand.

The product is a five-step wizard:

1. **Brief** — describe the brand, audience, and competitors (with inline AI
   assist for each field).
2. **Style** — pick a visual direction from AI-suggested options.
3. **Name** — Fluid drafts ~50 candidate names; like, pick, or type your own.
4. **Logo** — Fluid generates SVG logo marks live from the brief, chosen name,
   and style.
5. **Brand kit** — the assembled result: logo, color palette, type pairing,
   and a written brand guidelines document, all AI-generated and individually
   regenerable.

Generation is metered by a token balance tied to a subscription plan
(Starter / Pro), billed via Stripe.

## Repo layout

```
fluid-web/   the actual Next.js application — see fluid-web/README.md
chats/       original design-handoff conversation transcript (historical)
project/     original HTML/CSS/JS design prototype this was built from (historical)
.github/     CI (lint + typecheck + build on every push/PR to main)
```

`chats/` and `project/` are the artifacts from the initial Claude Design →
Claude Code handoff that kicked off this project. They're kept for reference
but are no longer the source of truth — `fluid-web/` is the real,
production application.

## Stack

- **Next.js** (App Router) + React, TypeScript
- **Supabase** — auth and Postgres persistence (brands, subscriptions/tokens)
- **Anthropic API** — all AI generation (names, logo SVGs, palette,
  typography, guidelines, inline assists)
- **Stripe** — subscription billing and the token-refill webhook
- **Vercel** — hosting; every push gets a preview deployment, `main` deploys
  to production

## Working on this repo

The app lives entirely in [`fluid-web/`](fluid-web/README.md) — that's where
you'll find setup instructions, environment variables, and the dev server.

Changes ship through PRs (see `.github/workflows/ci.yml` for what runs on
every push): open a branch, push, let Vercel build a preview, then merge to
`main` for production.
