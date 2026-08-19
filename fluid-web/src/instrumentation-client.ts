// Runs after the HTML document loads but before React hydrates. Sets up
// browser error monitoring — unhandled exceptions and unhandled promise
// rejections are captured by the SDK's default integrations once
// initialized, no extra wiring needed.
import * as Sentry from "@sentry/nextjs";
import { redactEvent } from "@/lib/monitoring/redact";
import { publicEnv } from "@/lib/env/public";

if (publicEnv.SENTRY_DSN) {
  Sentry.init({
    dsn: publicEnv.SENTRY_DSN,
    environment: publicEnv.SENTRY_ENVIRONMENT ?? process.env.NODE_ENV,
    release: publicEnv.VERCEL_GIT_COMMIT_SHA,
    tracesSampleRate: publicEnv.SENTRY_ENVIRONMENT === "production" ? 0.1 : 1.0,
    sendDefaultPii: false,
    beforeSend: (event) => redactEvent(event),
    beforeSendTransaction: (event) => redactEvent(event),
  });
}

export function onRouterTransitionStart(url: string, navigationType: string) {
  Sentry.addBreadcrumb({
    category: "navigation",
    message: `${navigationType} to ${url}`,
    level: "info",
  });
}
