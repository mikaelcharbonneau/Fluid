// Runs after the HTML document loads but before React hydrates. Sets up
// browser error monitoring — unhandled exceptions and unhandled promise
// rejections are captured by the SDK's default integrations once
// initialized, no extra wiring needed.
import * as Sentry from "@sentry/nextjs";
import { redactEvent } from "@/lib/monitoring/redact";

const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;

if (dsn) {
  Sentry.init({
    dsn,
    environment: process.env.NEXT_PUBLIC_SENTRY_ENVIRONMENT ?? process.env.NODE_ENV,
    release: process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA,
    tracesSampleRate: process.env.NEXT_PUBLIC_SENTRY_ENVIRONMENT === "production" ? 0.1 : 1.0,
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
