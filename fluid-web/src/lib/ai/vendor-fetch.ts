// Shared bounding for direct outbound calls to external vendor APIs.
//
// Several vendor calls in this directory used to have no deadline and no
// retry at all — a hung upstream request would hang the whole route until
// Vercel's maxDuration killed it, taking down everything else the route was
// doing along with it (see images.ts's RENDER_TIMEOUT_MS comment for the
// concrete failure mode this caused for OpenAI renders). This module gives
// every such call the same conservative shape: a deadline that always fires,
// and a small retry budget only when the caller declares the operation safe
// to retry.
//
// The retry set and backoff shape are deliberately unambitious — matched to
// what images.ts's requestPng/generatePng already does for OpenAI, not an
// attempt to invent a smarter policy. When in doubt here, conservative and
// boring beats clever: a slow board with fewer holes in it beats a route that
// spins forever hoping upstream recovers.

// Only statuses where a blind retry cannot make things worse: rate limiting
// and upstream unavailability. Nothing in the 4xx client-error range besides
// 429 — a 400/401/404/etc. will not succeed on retry, it will just cost extra
// wall-clock the caller's own deadline can't get back.
const RETRY_STATUSES = new Set([429, 502, 503, 504]);

const DEFAULT_MAX_RETRIES = 2;
const DEFAULT_BASE_DELAY_MS = 500;
// Never wait longer than this for a single backoff step, however deep the
// exponent goes — a run of 429s should not turn a bounded call into an
// unbounded one via the backoff alone.
const MAX_DELAY_MS = 8_000;

export interface VendorFetchOptions {
  /**
   * Deadline for a single attempt, in ms. Applied fresh on every attempt via
   * `AbortSignal.timeout`, but never allowed to outlive `totalTimeoutMs`.
   */
  timeoutMs: number;
  /** Absolute budget for all attempts and backoff. Defaults to timeoutMs. */
  totalTimeoutMs?: number;
  /** Retries after the first attempt. Default 2 when the total budget allows. */
  maxRetries?: number;
  /**
   * Explicitly enables retries for a request that is known to be idempotent.
   * GET and HEAD default to true; every other method defaults to false.
   */
  retryable?: boolean;
  /** Base backoff before the first retry, in ms; doubles per subsequent
   * retry and is capped at MAX_DELAY_MS, with +-50% jitter. */
  baseDelayMs?: number;
  /** Label used only in the final thrown error, e.g. "Recraft vectorize". */
  label?: string;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Half-jitter: uniformly random within [exp/2, exp], capped. Avoids both the
// thundering-herd of fixed delays and the small chance of a near-zero wait
// that plain full-jitter can produce.
function backoffDelay(attempt: number, baseMs: number): number {
  const exp = Math.min(baseMs * 2 ** attempt, MAX_DELAY_MS);
  return Math.floor(exp / 2 + Math.random() * (exp / 2));
}

// Retry-After is in seconds, or (less commonly) an HTTP date. Respect it when
// present on 429/503 rather than guessing at a backoff the server already
// told us — but never trust it past a sane ceiling, so a misconfigured or
// hostile upstream can't park us for an hour.
const MAX_RETRY_AFTER_MS = 30_000;

function retryAfterMs(res: Response): number | null {
  const header = res.headers.get("retry-after");
  if (!header) return null;
  const seconds = Number(header);
  if (Number.isFinite(seconds)) {
    return Math.min(Math.max(0, seconds * 1000), MAX_RETRY_AFTER_MS);
  }
  const asDate = Date.parse(header);
  if (!Number.isNaN(asDate)) {
    return Math.min(Math.max(0, asDate - Date.now()), MAX_RETRY_AFTER_MS);
  }
  return null;
}

function combineSignals(a?: AbortSignal | null, b?: AbortSignal): AbortSignal {
  if (!a) return b as AbortSignal;
  if (!b) return a;
  // AbortSignal.any is available in the Node/TS target this project builds
  // for; fall back to manual wiring only if it's ever missing at runtime.
  if (typeof AbortSignal.any === "function") return AbortSignal.any([a, b]);
  const controller = new AbortController();
  const abort = (signal: AbortSignal) => controller.abort(signal.reason);
  if (a.aborted) abort(a);
  else a.addEventListener("abort", () => abort(a), { once: true });
  if (b.aborted) abort(b);
  else b.addEventListener("abort", () => abort(b), { once: true });
  return controller.signal;
}

// fetch() with a per-attempt deadline and a bounded retry budget for
// transient, safe-to-retry failures. Returns whatever the last attempt
// returned — including a non-ok Response — so callers keep making their own
// decision (and writing their own error message) about what an unretried
// non-ok status means, exactly as they did before this existed.
//
// Only network-level failures (the fetch call itself throwing — DNS,
// connection reset, or our own deadline firing) are turned into a thrown
// error here, and only once retries are exhausted, because there is no
// Response for the caller to inspect in that case.
export async function vendorFetch(
  url: string,
  init: RequestInit = {},
  opts: VendorFetchOptions,
): Promise<Response> {
  const maxRetries = opts.maxRetries ?? DEFAULT_MAX_RETRIES;
  const baseDelayMs = opts.baseDelayMs ?? DEFAULT_BASE_DELAY_MS;
  const label = opts.label ?? url;
  const method = (init.method ?? "GET").toUpperCase();
  const retryable = opts.retryable ?? (method === "GET" || method === "HEAD");
  const deadlineAt = Date.now() + Math.max(1, opts.totalTimeoutMs ?? opts.timeoutMs);

  let lastError: unknown;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    const remainingMs = deadlineAt - Date.now();
    if (remainingMs <= 0) {
      throw new Error(`${label} exceeded its ${opts.totalTimeoutMs ?? opts.timeoutMs}ms retry budget.`);
    }
    const deadline = AbortSignal.timeout(Math.min(opts.timeoutMs, remainingMs));
    const signal = combineSignals(init.signal, deadline);

    let res: Response;
    try {
      res = await fetch(url, { ...init, signal });
    } catch (err) {
      lastError = err;
      // A caller-owned abort means the enclosing request/job ended. Retrying
      // would detach this request from that lifecycle and exceed its budget.
      if (init.signal?.aborted) throw err;
      const delay = backoffDelay(attempt, baseDelayMs);
      if (retryable && attempt < maxRetries && delay < deadlineAt - Date.now()) {
        await sleep(delay);
        continue;
      }
      const reason = err instanceof Error ? err.message : String(err);
      throw new Error(
        `${label} timed out or was unreachable after ${attempt + 1} attempt(s): ${reason}`,
      );
    }

    if (res.ok || !retryable || !RETRY_STATUSES.has(res.status) || attempt === maxRetries) {
      return res;
    }

    const delay = retryAfterMs(res) ?? backoffDelay(attempt, baseDelayMs);
    if (delay >= deadlineAt - Date.now()) return res;
    await sleep(delay);
  }

  // Unreachable — the loop above always returns or throws — but keeps the
  // function's return type honest without a non-null assertion.
  throw lastError instanceof Error
    ? lastError
    : new Error(`${label} failed for an unknown reason.`);
}
