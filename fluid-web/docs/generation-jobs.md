# Durable generation jobs

## Decision

Fluid uses Postgres as the durable queue and Vercel Cron as the worker trigger.
The API writes a job and returns `202` immediately; `GET /api/generate/jobs/:id`
is the reconnect/resume contract. The worker claims one job using a database
lease, so a killed invocation is released to a later cron tick without relying
on a client connection.

Vercel Workflow was not selected for this first production implementation: it
would add a Vercel-specific execution dependency while the application already
uses Supabase for its authoritative brand and credit data. Vercel Cron plus the
leased Postgres queue keeps recovery, audit data, and vendor concurrency in the
same transaction boundary. If queue latency becomes material, the fallback is a
managed queue that invokes the existing worker endpoint; the job schema and
claim/complete API stay unchanged.

## Operations

- Set `CRON_SECRET` in Vercel. Vercel Cron calls
  `/api/internal/generation-jobs/run` every minute with this bearer token.
- One `running` job is allowed per `(account, vendor)`. Jobs expose phase,
  progress, attempt count, error, timestamps, and terminal result in
  `generation_jobs` for dashboards and alerts.
- A worker lease lasts 295 seconds. An expired lease is requeued until the
  three-attempt limit only before non-idempotent provider work starts. After a
  provider-start checkpoint, an interrupted run is retained as the dead-letter
  record and refunded rather than replayed automatically, preventing duplicate
  vendor work when the provider may have completed after a disconnect.
- A queued job can be cancelled immediately. A running job records the request
  and settles as cancelled at its next persistence boundary.
- To replay a failed job, an operator calls
  `POST /api/internal/generation-jobs/:id/replay` with the cron bearer token.
  The original failed job remains immutable for audit; the new job reserves a
  fresh credit only after the prior reservation was refunded.

## Provider policy

The job runner owns retries at the work-item level. Provider call deadlines,
retry classification, circuit breaking, and content validation remain the
shared-client work tracked in #80; the durable queue deliberately does not add
SDK-level retries that could exceed that caller budget.
