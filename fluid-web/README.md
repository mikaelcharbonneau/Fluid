# Fluid — web app

Next.js application for Fluid, an AI brand agent that takes a one-sentence
brief and drafts a full brand identity: name, logo, color palette,
typography, and written guidelines. See the [repo root README](../README.md)
for the product overview.

> **Note for coding agents:** read [`AGENTS.md`](AGENTS.md) before making
> changes — this project runs a Next.js version with breaking changes from
> what's in most models' training data.

## Stack

- Next.js (App Router), React, TypeScript
- Supabase — auth + Postgres (brands, subscriptions/token balance)
- Anthropic API (`@anthropic-ai/sdk`) — all AI generation
- Stripe — billing and token refills

## Getting started

Install dependencies:

```bash
npm install
```

Pull environment variables from Vercel (this project's Supabase, Anthropic,
and Stripe secrets already live there):

```bash
npx vercel link
npx vercel env pull .env.local
```

Alternatively, copy `.env.example` to `.env.local` and fill in each value by
hand — see that file for where each key comes from (Supabase dashboard,
Anthropic console, Stripe dashboard).

Run the dev server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Project structure

```
src/app/
  page.tsx              marketing site (HTML fragment injected from _fragments/)
  login/ signup/ ...     auth pages
  app/Prototype.jsx      the wizard + dashboard UI — single-file, all screens
                          in one module scope (ported from the original
                          Claude Design export; see AGENTS.md)
  api/
    generate/            one route per AI generation: names, logo, palette,
                          typography, guidelines, inline assist
    brands/               CRUD for brand drafts (autosaved as the wizard is filled in)
    billing/ stripe/       Stripe checkout, portal, and webhook
    auth/                 Supabase auth endpoints

src/lib/
  ai/                    one module per generation type — prompt + Claude
                          call + response parsing for each (logo.ts, names.ts,
                          palette.ts, typography.ts, guidelines.ts, assist.ts)
  supabase/              server / admin Supabase clients
  credits.ts             token balance: cost table, spend/grant/check
  stripe.ts              Stripe client + plan config
```

Each `api/generate/*` route follows the same shape: load the brand record,
check token balance, call the matching `lib/ai/*` generator with whatever
prior-step context it needs (brief, chosen name, style, palette), spend
tokens on success, cache the result on the brand's `data` column, return it.
The wizard auto-triggers generation when a step is opened with no cached
result yet, and every generated asset is regenerable on demand.

## Scripts

```bash
npm run dev      # start the dev server
npm run build    # production build (also runs the TypeScript check)
npm run lint     # eslint
```

## Deployment

Hosted on Vercel. Every push gets a preview deployment; merging to `main`
deploys to production. CI (`.github/workflows/ci.yml`) runs lint and build on
every push and PR.
