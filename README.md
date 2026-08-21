# Fluid

**From idea to identity — instantly.** Fluid is an AI brand agent: describe a
business in one sentence, and it drafts a full brand — name, logo, color
palette, typography, and written guidelines — in about 60 seconds. The
production experience is a conversational brand-kit flow: users can change an
earlier answer in place, regenerate a proposal, or override it by hand without
leaving the conversation.

## The production flow

The conversation moves through a brief, naming preferences, a proposed name,
category, audience, personality, visual mode, palette, exclusions, six logo
concepts, a tagline, board layout, and a final review. Most proposals are
drafted by AI and can be regenerated; the final review is the explicit action
that spends the full asset-generation allowance and renders the brand board.

The retired screen-based wizard and standalone logo studio are kept locally
under `fluid-web/archive/legacy-workflows/` for possible reuse. That directory
is ignored and is not deployed. The old UI URLs redirect to `/app/chat`; their
old generation API endpoints are no longer production routes. The recovery
tag is `archive/pre-conversational-brand-kit`.

Generation is metered by a token balance tied to a subscription plan
(Starter / Pro), billed via Stripe.

## Repo layout

```
fluid-web/   the actual Next.js application — see fluid-web/README.md
chats/       original design-handoff conversation transcript (historical)
project/     original HTML/CSS/JS design prototype this was built from (historical)
fluid-web/archive/  local-only retired workflow archive (ignored)
.github/     CI (lint, typecheck, build, and tests on every push/PR to main)
```

`chats/` and `project/` are the artifacts from the initial Claude Design →
Claude Code handoff that kicked off this project. They're kept for reference
but are no longer the source of truth — `fluid-web/` is the real,
production application.

## Stack

- **Next.js** (App Router) + React, TypeScript
- **Supabase** — auth and Postgres persistence (brands, subscriptions/tokens)
- **OpenAI API** — conversational text generation and GPT-Image brand assets
- **Stripe** — subscription billing and the token-refill webhook
- **Vercel** — hosting; every push gets a preview deployment, `main` deploys
  to production

## Working on this repo

The app lives entirely in [`fluid-web/`](fluid-web/README.md) — that's where
you'll find setup instructions, environment variables, the route map, and the
dev server.

Changes ship through PRs (see `.github/workflows/ci.yml` for what runs on
every push): open a branch, push, let Vercel build a preview, then merge to
`main` for production.
