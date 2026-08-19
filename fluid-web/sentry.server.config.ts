// Loaded by src/instrumentation.ts's register() for the Node runtime.
// See https://docs.sentry.io/platforms/javascript/guides/nextjs/.
import * as Sentry from "@sentry/nextjs";
import { redactEvent } from "./src/lib/monitoring/redact";

const dsn = process.env.SENTRY_DSN;

if (dsn) {
  Sentry.init({
    dsn,
    environment: process.env.SENTRY_ENVIRONMENT ?? process.env.VERCEL_ENV ?? process.env.NODE_ENV,
    release: process.env.VERCEL_GIT_COMMIT_SHA,
    tracesSampleRate: process.env.VERCEL_ENV === "production" ? 0.1 : 1.0,
    // We attach our own redacted context deliberately; don't also let the
    // SDK attach raw IP/cookie/header PII by default.
    sendDefaultPii: false,
    beforeSend: (event) => redactEvent(event),
    beforeSendTransaction: (event) => redactEvent(event),
  });
}
