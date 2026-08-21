// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const ENV_KEYS = [
  "SUPABASE_SERVICE_ROLE_KEY",
  "OPENAI_API_KEY",
  "RECRAFT_API_KEY",
  "STRIPE_SECRET_KEY",
  "STRIPE_WEBHOOK_SECRET",
  "STRIPE_PRICE_STARTER",
  "STRIPE_PRICE_PRO",
  "VERCEL_ACCESS_TOKEN",
  "VERCEL_TEAM_ID",
  "SENTRY_DSN",
] as const;

const originalValues = Object.fromEntries(ENV_KEYS.map((k) => [k, process.env[k]]));

async function importFresh() {
  vi.resetModules();
  return import("./server");
}

describe("serverEnv / capabilities", () => {
  beforeEach(() => {
    for (const key of ENV_KEYS) delete process.env[key];
  });

  afterEach(() => {
    for (const key of ENV_KEYS) {
      if (originalValues[key] === undefined) delete process.env[key];
      else process.env[key] = originalValues[key];
    }
  });

  it("every capability is false with nothing configured", async () => {
    const { capabilities } = await importFresh();
    expect(capabilities).toEqual({
      recraftVectorize: false,
      domainAvailability: false,
      billing: false,
      errorMonitoring: false,
    });
  });

  it("recraftVectorize turns on with just RECRAFT_API_KEY", async () => {
    process.env.RECRAFT_API_KEY = "recraft_abcdefghij";
    const { capabilities } = await importFresh();
    expect(capabilities.recraftVectorize).toBe(true);
  });

  it("billing requires all four Stripe vars, not just the secret key", async () => {
    process.env.STRIPE_SECRET_KEY = "sk_test_abcdefghij";
    const { capabilities: partial } = await importFresh();
    expect(partial.billing).toBe(false);

    process.env.STRIPE_WEBHOOK_SECRET = "whsec_abcdefghij";
    process.env.STRIPE_PRICE_STARTER = "price_starter";
    process.env.STRIPE_PRICE_PRO = "price_pro";
    const { capabilities: full } = await importFresh();
    expect(full.billing).toBe(true);
  });

  it("requireOpenAIApiKey throws a 'not configured' error naming the variable, never a value", async () => {
    const { requireOpenAIApiKey } = await importFresh();
    expect(() => requireOpenAIApiKey()).toThrow("OPENAI_API_KEY is not configured.");
  });

  it("requireOpenAIApiKey returns the key once configured", async () => {
    process.env.OPENAI_API_KEY = "sk-abcdefghijklmnopqrst";
    const { requireOpenAIApiKey } = await importFresh();
    expect(requireOpenAIApiKey()).toBe("sk-abcdefghijklmnopqrst");
  });

  it("throws EnvValidationError (not a generic error) for a malformed value, without leaking it", async () => {
    process.env.OPENAI_API_KEY = "definitely-not-an-openai-key-but-long-enough";
    await expect(importFresh()).rejects.toThrow(/OPENAI_API_KEY/);
    try {
      await importFresh();
      expect.unreachable();
    } catch (err) {
      expect((err as Error).message).not.toContain("definitely-not-an-openai-key-but-long-enough");
    }
  });
});
