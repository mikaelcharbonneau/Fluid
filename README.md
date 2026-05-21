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
- **Supabase client** (`@supabase/supabase-js`) for the application data layer,
  with Row Level Security enforcing per-user ownership in the database
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
                              persist via Supabase client (src/lib/db/brands.ts)
                                              │
Saved brands (/brands, /brands/[id]) ◀────────┘  ownership enforced per query
```

Auth is handled by Supabase via `@supabase/ssr`: `src/middleware.ts` refreshes
the session and redirects unauthenticated users away from protected routes, and
every API route / server page re-checks `supabase.auth.getUser()`. The
data-access layer (`src/lib/db/brands.ts`) runs through the request-scoped
Supabase client and scopes every query to the user's id, never trusting
client-supplied IDs; Row Level Security policies on `Brand` enforce the same
ownership rule in the database as defense in depth. `Brand.userId` stores the
Supabase `auth.users` UUID.

Required environment variables are validated at the point of use via
`requireEnv` (`src/lib/env.ts`), so a missing Supabase URL/key fails with a
clear message instead of a cryptic library error. Health is exposed as two
probes: `/api/health` (liveness — dependency-free, always `200` when the server
can respond) and `/api/health/ready` (readiness — runs a lightweight read
through the Supabase API and returns `503` when the database is unreachable, so
orchestrators can route traffic away from an instance that is up but not ready).

## Prerequisites

- Node `22` (see `.nvmrc`)
- A **Supabase** project (provides Postgres + Auth)
- GitHub and/or Google OAuth apps, registered under Supabase
  **Authentication > Providers**
- (Optional) Upstash Redis, OpenAI API key, Sentry project

## Local setup

```bash
nvm use
npm install
cp .env.example .env        # then fill in the values
npm run dev                 # http://localhost:3000
```

The `Brand` table and its RLS policies are already applied to the provisioned
Supabase project (see [Provisioned backend](#provisioned-backend)). To stand up
a fresh database instead, apply the SQL in `supabase/migrations/` (e.g. via the
Supabase CLI: `supabase db push`).

Without an `OPENAI_API_KEY` the strategy generator returns a deterministic demo
result, so you can develop the full flow without incurring API cost. Without
`UPSTASH_*` set, rate limiting is skipped locally.

### Environment variables

See `.env.example` for the full list. Key groups:

| Variable                                                     | Purpose                                                |
| ------------------------------------------------------------ | ------------------------------------------------------ |
| `OPENAI_API_KEY`                                             | Live strategy generation (demo fallback if unset)      |
| `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase project URL + anon key (auth + data layer)    |
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

A ready-to-use GitHub Actions pipeline lives at `docs/ci-workflow.yml`. It has
two jobs: `verify` (typecheck, lint, unit tests, build) and `e2e` (Playwright),
both running against placeholder Supabase credentials, so no secrets are
required. Move it to `.github/workflows/ci.yml` and commit it with a token/app
that has the `workflows` permission to enable it — it is parked under `docs/`
because the automation that maintains this branch cannot write under
`.github/workflows/`.

## Provisioned backend

A Supabase project has been provisioned for this app and the schema applied:

- **Project:** `fluid-backend` (org `mikaelcharbonneau's Org`), region `us-east-1`,
  ref `uvztmqsjxthfabbsykik`, project URL `https://uvztmqsjxthfabbsykik.supabase.co`.
- **Schema:** the `Brand` table (see `supabase/migrations/`) is applied.
- **Row Level Security:** enabled on `Brand` with per-user owner policies for
  select/insert/delete (`auth.uid() = "userId"`). The app accesses the table
  through the Supabase client using the signed-in user's session, so these
  policies enforce ownership at the database level.

To point an environment at this project, set these (the anon key is public and
safe to expose to the browser):

```bash
NEXT_PUBLIC_SUPABASE_URL="https://uvztmqsjxthfabbsykik.supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="<anon key from Project Settings > API>"
```

Auth still needs manual configuration in the Supabase dashboard (these are not
exposed via the management API):

1. **Authentication > URL Configuration:** set the Site URL and add the redirect
   URLs `http://localhost:3000/auth/callback` and
   `https://<your-domain>/auth/callback`.
2. **Authentication > Providers:** enable GitHub and Google, pasting the client
   IDs/secrets from OAuth apps registered on GitHub and Google (their provider
   callback URL is `https://uvztmqsjxthfabbsykik.supabase.co/auth/callback`).

## Deployment (Vercel)

1. Create a Supabase project; from **Project Settings > API** copy the project
   URL + anon key. Apply the schema by running the SQL in `supabase/migrations/`
   (e.g. with the Supabase CLI: `supabase db push`).
2. In Supabase **Authentication > Providers**, enable GitHub/Google with their
   client IDs/secrets, and add the site URL + redirect URL
   `https://<your-domain>/auth/callback` to the allowed redirect list.
3. Import the repo into Vercel and set all environment variables from
   `.env.example` in the project.

Security headers and (when configured) Sentry are wired through `next.config.ts`.
