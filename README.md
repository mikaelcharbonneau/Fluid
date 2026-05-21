# Fluid

AI-guided brand identity creation. Fluid walks users through a five-step wizard
that turns a few inputs about their business into a complete brand strategy —
positioning, audience insight, personality, naming, and visual direction —
generated with the OpenAI Agents SDK and saved to their account.

## Stack

- **Next.js 16** (App Router) + **React 19** + **TypeScript** (strict)
- **OpenAI Agents SDK** (`@openai/agents`) for strategy generation, with a
  deterministic demo fallback when no API key is set
- **NextAuth v4** (GitHub + Google OAuth, JWT sessions) for authentication
- **Prisma + PostgreSQL** (Neon / Vercel Postgres) for persistence
- **Upstash Redis** for per-user rate limiting on the cost-bearing endpoint
- **Sentry** for error tracking, **Vitest** for unit tests, **Playwright** for E2E
- **Zod** for input/output validation

## Architecture

```
Wizard UI (src/components/wizard) ──POST──▶ /api/brand-strategy
                                              │  auth check (getServerSession)
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

Routes are gated by `src/middleware.ts`; the brand endpoint and data-access
layer re-check ownership server-side, never trusting client-supplied IDs.

## Prerequisites

- Node `22` (see `.nvmrc`)
- A PostgreSQL database (Neon or Vercel Postgres recommended)
- GitHub and/or Google OAuth apps
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

| Variable                                      | Purpose                                                |
| --------------------------------------------- | ------------------------------------------------------ |
| `OPENAI_API_KEY`                              | Live strategy generation (demo fallback if unset)      |
| `DATABASE_URL` / `DIRECT_URL`                 | Pooled (runtime) and direct (migrations) Postgres URLs |
| `NEXTAUTH_URL` / `NEXTAUTH_SECRET`            | NextAuth config (`openssl rand -base64 32`)            |
| `GITHUB_ID/SECRET`, `GOOGLE_CLIENT_ID/SECRET` | OAuth providers                                        |
| `UPSTASH_REDIS_REST_URL/TOKEN`                | Per-user rate limiting                                 |
| `NEXT_PUBLIC_SENTRY_DSN`, `SENTRY_*`          | Error tracking + source map upload                     |

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

- **Unit** (`src/**/*.test.ts`): schema validation, the demo strategy shape, and
  brand data-access ownership. The OpenAI runner is never called in tests.
- **E2E** (`e2e/`): health check, sign-in page, the unauthenticated redirect, and
  rejection of unauthenticated calls to `/api/brand-strategy`. The authenticated
  happy path requires a test database and a test auth provider — see notes in
  `playwright.config.ts`.

## Deployment (Vercel)

1. Import the repo into Vercel.
2. Provision Postgres (Neon integration) and set **both** `DATABASE_URL` (pooled)
   and `DIRECT_URL` (direct) — migrations fail over a pooled connection.
3. Set all environment variables from `.env.example` in the Vercel project.
4. Create GitHub/Google OAuth apps with callback
   `https://<your-domain>/api/auth/callback/<provider>`.
5. Run `npm run db:deploy` against the production database (e.g. as a release
   step) to apply migrations.

`prisma generate` runs automatically on install via the `postinstall` script.
Security headers and (when configured) Sentry are wired through `next.config.ts`.
