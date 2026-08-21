# Fluid — web app

Next.js application for Fluid, an AI brand agent that turns a one-sentence
brief into a full brand identity: name, logo, color palette, typography, and
written guidelines. The active creation experience is a conversational
brand-kit thread at `/app/chat`, backed by `POST /api/brand-kit/turn`. See the
[repo root README](../README.md) for the product overview.

> **Note for coding agents:** read [`AGENTS.md`](AGENTS.md) before making
> changes — this project runs a Next.js version with breaking changes from
> what's in most models' training data.

## Stack

- Next.js (App Router), React, TypeScript
- Supabase — auth + Postgres (brands, subscriptions/token balance)
- OpenAI API (Responses API and GPT-Image) — all AI generation
- Stripe — billing and token refills

## Getting started

Install dependencies:

```bash
npm install
```

Pull environment variables from Vercel (this project's Supabase, OpenAI,
and Stripe secrets already live there):

```bash
npx vercel link
npx vercel env pull .env.local
```

Alternatively, copy `.env.example` to `.env.local` and fill in each value by
hand — see that file for where each key comes from (Supabase dashboard,
OpenAI platform, Stripe dashboard). Every variable is validated at import time
by `src/lib/env/` (schema, allowed prefixes, minimum secret length); a
variable required in production that's still missing fails server startup
rather than the first request that happens to need it — see
`src/lib/env/schema.ts` for the full classification and
`src/lib/env/startup.ts` for the startup check.

Run the dev server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Project structure

```
src/app/
  page.tsx              marketing site
  login/ signup/ ...     auth and account pages
  app/chat/              conversational brand-kit UI and widgets
  app/_screens/          shared dashboard surfaces (home, brands, assets, etc.)
  app/_state/            route, account, billing, and shared app state
  app/*/page.tsx         real authenticated App Router segments
  api/brand-kit/turn/     the conversational turn endpoint
  api/brands/             brand record CRUD and resume support
  api/billing/ stripe/    Stripe checkout, portal, status, and webhook
  api/auth/               Supabase auth endpoints

src/lib/
  brand-kit/              step script, draft context, generators, and types
  ai/                     shared activity, image, OpenAI, and vendor helpers
  supabase/               server and admin Supabase clients
  credits.ts              atomic token reservation, refund, and balance logic
  env/                    validated environment schema and startup checks
  stripe.ts               Stripe client and plan configuration
```

`POST /api/brand-kit/turn` accepts a brand id, an optional step/value pair, or
an explicit regenerate/review action. It resumes the first unanswered step,
applies an answer and drafts what comes next, or renders the final board after
review. AI work reserves tokens atomically before provider calls and refunds
the reservation when the provider fails. The client keeps the conversation
addressable by `?brand=<id>` so reloads and resumes do not depend on in-memory
conversation state.

The old step-wizard and standalone logo implementations are archived locally
under `archive/legacy-workflows/` and excluded from lint, TypeScript, and
production deployment. Their UI paths remain as thin redirects to `/app/chat`
for bookmark compatibility; the old API paths are retired.

## Scripts

```bash
npm run dev             # start the dev server
npm run build           # production build (also runs the TypeScript check)
npm run lint             # eslint
npm test                 # unit tests (src/lib) — Vitest
npm run test:integration # API route tests (src/app) — Vitest, external services mocked
npm run test:e2e          # browser tests — Playwright, runs a production build
npm run test:e2e:hydration # hydration-warning check — Playwright, runs against `next dev`
npm run skills:check      # verify vendored brand skills match generated TypeScript
npm run measure:js        # enforce initial JavaScript budgets for active routes
```

## Testing

- **Unit tests** (`src/lib/**/*.test.ts`) cover pure logic — brand-input
  sanitization, token accounting, domain-availability parsing — with no
  network or database access.
- **Integration tests** (`src/app/api/**/__tests__/*.test.ts`) exercise route
  handlers with Supabase, Stripe, and other external services mocked, so
  they run in CI without contacting a live paid vendor and without a
  database.
- **Browser tests** (`e2e/*.spec.ts`) drive a real production build with
  Playwright to check the customer-facing journeys (home page, login,
  signup, password reset).
- **Hydration check** (`e2e/hydration.spec.ts`, run via
  `playwright.hydration.config.ts`) loads the marketing/auth routes against
  `next dev` and fails if the browser console logs a React hydration
  warning. This runs against dev, not the production build: React's
  production bundle skips the full attribute-diffing pass for performance
  and silently accepts a mismatch instead of warning, so this is the only
  build that can actually catch a regression here.

Run everything locally the same way CI does:

```bash
npm test && npm run test:integration
npx playwright install --with-deps chromium   # first run only
npm run test:e2e
npm run test:e2e:hydration
```

All three suites are required checks in CI (`.github/workflows/ci.yml`); a
pull request cannot merge while any of them fail. If you see a flaky
Playwright test, re-run with `npx playwright test --trace on` locally and
check the uploaded `playwright-report` artifact from the failing CI run
before assuming it's environmental — file an issue with the trace either way
so flakes get tracked rather than silently re-run away.

## Deployment

Hosted on Vercel. Every push gets a preview deployment; merging to `main`
deploys to production. CI (`.github/workflows/ci.yml`) runs lint, build,
tests, and browser tests on every push and PR. The ignored local archive is
never included in the production repository or deployment.
