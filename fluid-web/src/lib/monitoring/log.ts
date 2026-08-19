import * as Sentry from "@sentry/nextjs";
import { redactContext } from "./redact";

// The structured replacement for `console.error(...)` across the app.
// Always logs locally (so `next dev` / Vercel function logs stay useful),
// and additionally reports to Sentry when it's configured — callers don't
// need to know or care whether monitoring is set up.
//
//   reportError("Failed to cache generated logos", saveError, { brandId });
export function reportError(
  message: string,
  error?: unknown,
  context?: Record<string, unknown>,
): void {
  console.error(message, error ?? "", context ?? "");

  const safeContext = context ? redactContext(context) : undefined;
  const exception = error instanceof Error ? error : new Error(message, { cause: error });

  Sentry.captureException(exception, {
    extra: safeContext,
    tags: { reported_message: message },
  });
}

// For failures worth knowing about that aren't exceptions (e.g. a
// non-2xx from a third-party API that the caller already handled).
export function reportWarning(message: string, context?: Record<string, unknown>): void {
  console.warn(message, context ?? "");
  Sentry.captureMessage(message, { level: "warning", extra: context ? redactContext(context) : undefined });
}
