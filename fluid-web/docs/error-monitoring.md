# Error monitoring

Production and preview errors are reported to [Sentry](https://sentry.io) via
`@sentry/nextjs`. With no Sentry project configured, all of this is inert —
`reportError`/`reportWarning` still log locally, nothing is sent anywhere.

## Setup

1. Create a Sentry project (or reuse the org's existing one) for `fluid-web`.
2. Set these in Vercel, scoped to Preview and Production:
   - `SENTRY_DSN` (server + edge)
   - `NEXT_PUBLIC_SENTRY_DSN` (browser — same project's public DSN)
   - `SENTRY_ORG`, `SENTRY_PROJECT`, `SENTRY_AUTH_TOKEN` (source-map upload at
     build time — scope the token to source-map uploads only)
3. Optionally set `SENTRY_ENVIRONMENT` to override the environment name Sentry
   groups issues by (defaults to Vercel's `VERCEL_ENV`).

No code change is needed to turn monitoring on or off — it activates the
moment `SENTRY_DSN` / `NEXT_PUBLIC_SENTRY_DSN` exist.

## What's captured

- Unhandled browser exceptions and unhandled promise rejections (Sentry's
  default browser integrations, via `src/instrumentation-client.ts`).
- Server request errors that escape normal handling — Server Components,
  Route Handlers, Server Actions — via `onRequestError` in
  `src/instrumentation.ts`.
- Anything reported explicitly with `reportError()` / `reportWarning()` from
  `src/lib/monitoring/log.ts` — this is the replacement for `console.error`
  across API routes and the generation worker/pipeline.
- Navigation breadcrumbs (`onRouterTransitionStart` in
  `instrumentation-client.ts`) for reconstructing what the user did right
  before an error.

Each event carries the release (`VERCEL_GIT_COMMIT_SHA`), environment, route,
and whatever redacted `context` the caller passed to `reportError`.

## What's redacted

Every event passes through `src/lib/monitoring/redact.ts` before it leaves
the process:

- Request headers: `Authorization`, `Cookie`, `Set-Cookie`, and similar are
  dropped outright; everything else passes through.
- Request cookies are dropped entirely.
- Any object key matching secrets (`token`, `secret`, `password`, `api_key`,
  `service_role`, `signature`, …) has its value replaced with `[redacted]`,
  recursively.
- Any object key holding customer/generated content (`prompt`, `brief`,
  `generated*`, `guidelines`, `competitors`, `audience`) is likewise dropped
  — brand briefs and AI output never reach Sentry.
- Email addresses and signed-URL credential query params (`?token=`,
  `?signature=`, …) found inside string values are masked in place.

`src/lib/monitoring/redact.test.ts` covers all of the above; run it whenever
you add a new field to a `reportError` context to confirm the redaction
patterns still catch it, or extend the patterns if they don't.

User identity is attached as a one-way SHA-256 hash of the Supabase user id
(`src/lib/monitoring/user.ts`), never the email or raw id — enough to
correlate one user's error reports without being able to reverse it back to
who they are from the Sentry UI alone.

## Verifying it works (preview)

`GET /api/internal/test-error` throws a deliberate, clearly-labeled error.
It 404s in production. In preview:

```bash
curl https://<preview-url>/api/internal/test-error
# or, if TEST_ERROR_SECRET is set:
curl -H "Authorization: Bearer $TEST_ERROR_SECRET" https://<preview-url>/api/internal/test-error
```

Confirm in Sentry that the event shows up with a resolved (source-mapped)
stack trace pointing at `route.ts`, not a minified bundle.

## Alert severity and triage

| Severity | Trigger | Response |
| --- | --- | --- |
| **Page** | Production error rate spikes above baseline; a new (previously unseen) error type appears in production; Stripe webhook handler errors; a generation job is stuck/failed. | On-call investigates within the agreed threshold; roll back the triggering deploy if the spike lines up with a release. |
| **Notify (async)** | Preview-only errors; a known, already-triaged error recurring at normal volume; provider (OpenAI/Recraft) outage surfaced via elevated failure rate. | Reviewed same or next business day; file/attach to an existing tracking issue. |
| **Ignore / mute** | Expected, already-handled failures that still throw for control flow (e.g. `OutOfTimeError`) once they're confirmed to be the *expected* trigger path, not a symptom of a real regression. | Add a Sentry ignore rule with a comment explaining why it's expected — don't mute broadly by error message text alone. |

**Ownership:** the engineer who authored the change that shipped in the
release where an issue first appeared is the default owner until triaged
otherwise. Alerts should route to that shipping channel/rotation, not sit
unowned in the Sentry inbox.

Configuring the actual Sentry alert rules (issue-alert thresholds, the
Stripe-webhook-failure and stuck-job alerts, and the notification channel)
happens in the Sentry project settings once the project exists — that's a
one-time dashboard setup step for whoever provisions the Sentry project, not
something expressed in this repo.
