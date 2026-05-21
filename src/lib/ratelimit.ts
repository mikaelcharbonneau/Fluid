import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

let ratelimit: Ratelimit | null = null;

function getRatelimit(): Ratelimit | null {
  if (ratelimit) return ratelimit;

  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return null;

  ratelimit = new Ratelimit({
    redis: new Redis({ url, token }),
    limiter: Ratelimit.slidingWindow(10, "10 m"),
    prefix: "fluid:brand-strategy",
    analytics: true,
  });
  return ratelimit;
}

export interface RateLimitResult {
  success: boolean;
  reset: number;
}

// Per-user rate limit on the cost-bearing OpenAI endpoint.
// When Upstash is not configured (e.g. local dev) the limiter is skipped.
export async function checkRateLimit(identifier: string): Promise<RateLimitResult> {
  const rl = getRatelimit();
  if (!rl) {
    return { success: true, reset: 0 };
  }
  const { success, reset } = await rl.limit(identifier);
  return { success, reset };
}
