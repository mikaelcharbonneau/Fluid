// Loaded by src/instrumentation.ts's register() for the Edge runtime
// (proxy.ts / edge route handlers).
import * as Sentry from "@sentry/nextjs";
import { redactEvent } from "./src/lib/monitoring/redact";
import { serverEnv } from "./src/lib/env/server";

if (serverEnv.SENTRY_DSN) {
  Sentry.init({
    dsn: serverEnv.SENTRY_DSN,
    environment: serverEnv.SENTRY_ENVIRONMENT ?? process.env.VERCEL_ENV ?? process.env.NODE_ENV,
    release: serverEnv.VERCEL_GIT_COMMIT_SHA,
    tracesSampleRate: process.env.VERCEL_ENV === "production" ? 0.1 : 1.0,
    sendDefaultPii: false,
    beforeSend: (event) => redactEvent(event),
    beforeSendTransaction: (event) => redactEvent(event),
  });
}
