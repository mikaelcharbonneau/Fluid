# Fluid

AI-guided brand identity creation. Fluid walks users through a five-step wizard
that turns a few inputs about their business into a complete brand strategy —
positioning, audience insight, personality, naming, and visual direction —
generated with the OpenAI Agents SDK and saved to their account.

## Stack

- **Next.js 16** (App Router) + **React 19** + **TypeScript** (strict)
- **OpenAI Agents SDK** (`@openai/agents`) for strategy generation, with a
  deterministic demo fallback when no API key is set
- **Supabase** for **Postgres + Auth** (GitHub/Google OAuth via `@supabase/ssr`)
- **Prisma** for the application data layer and migrations (against Supabase Postgres)
- **Upstash Redis** for per-user rate limiting on the cost-bearing endpoint
- **Sentry** for error tracking, **Vitest** for unit tests, **Playwright** for E2E
- **Zod** for input/output validation

## Architecture

```
Wizard UI (src/components/wizard) ──POST──▶ /api/brand-strategy
                                              │  auth check (Supabase getUser)
                                              │  per-user rate limit (Upstash)
                                              │  validate input (Zod)
                                              ▼
                                   createBrandStrategy (OpenAI agent / demo)
                                              │
                                              ▼
                                   persist via Prisma (src/lib/db/brands.ts)
                                              │
Saved brands (/brands, /brands/[id]) ◀────────┘  ownership enforced per query
```

Auth is handled by Supabase via `@supabase/ssr`: `src/middleware.ts` refreshes
the session and redirects unauthenticated users away from protected routes, and
every API route / server page re-checks `supabase.auth.getUser()`. The
data-access layer (`src/lib/db/brands.ts`) scopes every query to the user's id,
never trusting client-supplied IDs. `Brand.userId` stores the Supabase
`auth.users` UUID.

Required environment variables are validated at the point of use via
`requireEnv` (`src/lib/env.ts`), so a missing Supabase URL/key fails with a
clear message instead of a cryptic library error. The `/api/health` endpoint is
a readiness probe: it runs a lightweight `SELECT 1` and returns `503` when the
database is unreachable, so orchestrators can route traffic away from an
unhealthy instance.

## Prerequisites

- Node `22` (see `.nvmrc`)
- A **Supabase** project (provides Postgres + Auth)
- GitHub and/or Google OAuth apps, registered under Supabase
  **Authentication > Providers**
- (Optional) Upstash Redis, OpenAI API key, Sentry project

## Local setup

```bash
nvm use
npm install                 # runs prisma generate via postinstall
cp .env.example .env        # then fill in the values
npm run db:migrate          # create the schema
npm run dev                 # http://localhost:3000
```

Without an `OPENAI_API_KEY` the strategy generator returns a deterministic demo
result, so you can develop the full flow without incurring API cost. Without
`UPSTASH_*` set, rate limiting is skipped locally.

### Environment variables

See `.env.example` for the full list. Key groups:

| Variable                                                     | Purpose                                                |
| ------------------------------------------------------------ | ------------------------------------------------------ |
| `OPENAI_API_KEY`                                             | Live strategy generation (demo fallback if unset)      |
| `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase project URL + anon key (auth)                 |
| `DATABASE_URL` / `DIRECT_URL`                                | Pooled (runtime) and direct (migrations) Postgres URLs |
| `UPSTASH_REDIS_REST_URL/TOKEN`                               | Per-user rate limiting                                 |
| `NEXT_PUBLIC_SENTRY_DSN`, `SENTRY_*`                         | Error tracking + source map upload                     |

OAuth client IDs/secrets live in the Supabase dashboard, not in `.env`.

## Scripts

| Command                       | Description                   |
| ----------------------------- | ----------------------------- |
| `npm run dev`                 | Start the dev server          |
| `npm run build` / `npm start` | Production build / serve      |
| `npm run typecheck`           | `tsc --noEmit`                |
| `npm run lint`                | ESLint (Next flat config)     |
| `npm run format`              | Prettier write                |
| `npm run test`                | Vitest unit tests             |
| `npm run test:e2e`            | Playwright E2E tests          |
| `npm run db:migrate`          | Prisma dev migration          |
| `npm run db:deploy`           | Apply migrations (production) |

## Testing

- **Unit** (`src/**/*.test.ts`): schema validation, the demo strategy shape,
  brand data-access ownership, and the `/api/brand-strategy` route handler (auth
  gating, rate limiting, input validation, and error handling). The OpenAI
  runner is never called in tests.
- **E2E** (`e2e/`): health check, sign-in page, the unauthenticated redirect, and
  rejection of unauthenticated calls to `/api/brand-strategy`. The authenticated
  happy path requires a Supabase test project (and a seeded session) — see notes
  in `playwright.config.ts`.

## Continuous integration

A ready-to-use GitHub Actions pipeline (typecheck, lint, unit tests, build, and
Playwright E2E) lives at `docs/ci-workflow.yml`. Move it to
`.github/workflows/ci.yml` to enable it — it is parked under `docs/` only
because the automation that created this branch lacked `workflows` write
permission.

## Deployment (Vercel)

1. Create a Supabase project; from **Project Settings**: copy the API URL + anon
   key, and the database connection strings (pooled `DATABASE_URL` on port 6543,
   direct `DIRECT_URL` on port 5432 — migrations fail over the pooled connection).
2. In Supabase **Authentication > Providers**, enable GitHub/Google with their
   client IDs/secrets, and add the site URL + redirect URL
   `https://<your-domain>/auth/callback` to the allowed redirect list.
3. Import the repo into Vercel and set all environment variables from
   `.env.example` in the project.
4. Run `npm run db:deploy` against the production database (e.g. as a release
   step) to apply migrations.

`prisma generate` runs automatically on install via the `postinstall` script.
Security headers and (when configured) Sentry are wired through `next.config.ts`.
