// Strips secrets and customer content from anything we hand to the error
// monitor. Applied to every event (exceptions, breadcrumbs, extra context)
// before it leaves the process — nothing here should ever depend on the
// caller remembering to redact first.

// Key names whose *value* is always dropped, regardless of type.
const SENSITIVE_KEY_PATTERN =
  /(authorization|cookie|secret|password|api[-_]?key|service[-_]?role|signature|dsn|set-cookie|access[-_]?token|refresh[-_]?token|client[-_]?secret)/i;

// Key names that hold customer/generated content rather than secrets, but
// are still not safe to send to a third party (the issue explicitly calls
// out prompts and generated creative).
const CUSTOMER_CONTENT_KEY_PATTERN =
  /(prompt|brief|generated|creative|guidelines|competitors|audience)/i;

const EMAIL_PATTERN = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;

// Query-string / URL credential params: ?signature=..., ?token=..., ?sig=...
const SIGNED_URL_PARAM_PATTERN = /([?&](?:signature|token|sig|x-amz-signature|x-amz-credential)=)[^&\s]+/gi;

const REDACTED = "[redacted]";
const REDACTED_EMAIL = "[redacted-email]";
const REDACTED_URL_PARAM = "$1[redacted]";
const MAX_DEPTH = 6;

function redactString(value: string): string {
  return value.replace(EMAIL_PATTERN, REDACTED_EMAIL).replace(SIGNED_URL_PARAM_PATTERN, REDACTED_URL_PARAM);
}

// Deep-redacts an arbitrary value: sensitive/customer-content keys are
// dropped entirely, string values elsewhere are scanned for emails and
// signed-URL params.
export function redactValue(value: unknown, depth = 0): unknown {
  if (depth > MAX_DEPTH) return "[redacted-depth-limit]";
  if (typeof value === "string") return redactString(value);
  if (Array.isArray(value)) return value.map((v) => redactValue(v, depth + 1));
  if (value instanceof Error) {
    return { name: value.name, message: redactString(value.message) };
  }
  if (value && typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [key, v] of Object.entries(value as Record<string, unknown>)) {
      if (SENSITIVE_KEY_PATTERN.test(key) || CUSTOMER_CONTENT_KEY_PATTERN.test(key)) {
        out[key] = REDACTED;
      } else {
        out[key] = redactValue(v, depth + 1);
      }
    }
    return out;
  }
  return value;
}

export function redactContext<T extends Record<string, unknown>>(context: T): Record<string, unknown> {
  return redactValue(context) as Record<string, unknown>;
}

const HEADER_DENYLIST = new Set([
  "authorization",
  "cookie",
  "set-cookie",
  "x-supabase-auth",
  "x-api-key",
]);

// Sentry gives request headers as a plain string-keyed record.
export function redactHeaders(
  headers: Record<string, string> | undefined,
): Record<string, string> | undefined {
  if (!headers) return headers;
  const out: Record<string, string> = {};
  for (const [key, value] of Object.entries(headers)) {
    out[key] = HEADER_DENYLIST.has(key.toLowerCase()) ? REDACTED : redactString(value);
  }
  return out;
}

// Sentry's ErrorEvent shape (subset) — kept structural rather than importing
// @sentry/nextjs's types here so this module has no SDK dependency and stays
// trivially unit-testable.
export interface RedactableEvent {
  request?: {
    headers?: Record<string, string>;
    cookies?: Record<string, string>;
    data?: unknown;
    query_string?: unknown;
  };
  extra?: Record<string, unknown>;
  contexts?: Record<string, unknown>;
  breadcrumbs?: Array<{ message?: string; data?: Record<string, unknown> }>;
}

// The shared `beforeSend` / `beforeBreadcrumb` body, usable from the client,
// server, and edge Sentry configs alike.
export function redactEvent<T extends RedactableEvent>(event: T): T {
  if (event.request) {
    event.request.headers = redactHeaders(event.request.headers);
    delete event.request.cookies;
    if (event.request.data !== undefined) event.request.data = redactValue(event.request.data);
    if (event.request.query_string !== undefined) event.request.query_string = REDACTED;
  }
  if (event.extra) event.extra = redactValue(event.extra) as Record<string, unknown>;
  if (event.contexts) event.contexts = redactValue(event.contexts) as Record<string, unknown>;
  if (event.breadcrumbs) {
    event.breadcrumbs = event.breadcrumbs.map((b) => ({
      ...b,
      message: b.message ? redactString(b.message) : b.message,
      data: b.data ? (redactValue(b.data) as Record<string, unknown>) : b.data,
    }));
  }
  return event;
}
