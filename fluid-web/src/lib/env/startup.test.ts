// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const ENV_KEYS = [
  "VERCEL_ENV",
  "SUPABASE_SERVICE_ROLE_KEY",
  "OPENAI_API_KEY",
  "STRIPE_SECRET_KEY",
  "STRIPE_WEBHOOK_SECRET",
  "STRIPE_PRICE_STARTER",
  "STRIPE_PRICE_PRO",
  "CRON_SECRET",
  "GENERATION_JOBS_CRON_SECRET",
  "VERCEL_ACCESS_TOKEN",
  "VERCEL_TEAM_ID",
] as const;

const originalValues = Object.fromEntries(ENV_KEYS.map((k) => [k, process.env[k]]));

// All required-in-production vars, valid and present — the "fully configured
// production" baseline each test mutates from.
const FULLY_CONFIGURED = {
  SUPABASE_SERVICE_ROLE_KEY: "a".repeat(24),
  OPENAI_API_KEY: "sk-abcdefghijklmnopqrst",
  STRIPE_SECRET_KEY: "sk_test_abcdefghij",
  STRIPE_WEBHOOK_SECRET: "whsec_abcdefghij",
  STRIPE_PRICE_STARTER: "price_starter",
  STRIPE_PRICE_PRO: "price_pro",
  CRON_SECRET: "a".repeat(20),
};

async function importFresh() {
  vi.resetModules();
  return import("./startup");
}

describe("assertRequiredEnv", () => {
  beforeEach(() => {
    for (const key of ENV_KEYS) delete process.env[key];
  });

  afterEach(() => {
    for (const key of ENV_KEYS) {
      if (originalValues[key] === undefined) delete process.env[key];
      else process.env[key] = originalValues[key];
    }
    vi.restoreAllMocks();
  });

  it("does nothing outside VERCEL_ENV=production, even with nothing configured", async () => {
    delete process.env.VERCEL_ENV;
    const { assertRequiredEnv } = await importFresh();
    expect(() => assertRequiredEnv()).not.toThrow();
  });

  it("does nothing in preview, even with nothing configured", async () => {
    process.env.VERCEL_ENV = "preview";
    const { assertRequiredEnv } = await importFresh();
    expect(() => assertRequiredEnv()).not.toThrow();
  });

  it("throws in production when required vars are missing, naming them", async () => {
    process.env.VERCEL_ENV = "production";
    const { assertRequiredEnv } = await importFresh();
    expect(() => assertRequiredEnv()).toThrow(/OPENAI_API_KEY/);
  });

  it("does not throw in production once everything required is configured", async () => {
    process.env.VERCEL_ENV = "production";
    Object.assign(process.env, FULLY_CONFIGURED);
    const { assertRequiredEnv } = await importFresh();
    expect(() => assertRequiredEnv()).not.toThrow();
  });

  it("checkRequiredEnv lists every missing production var, not just the first", async () => {
    process.env.VERCEL_ENV = "production";
    const { checkRequiredEnv } = await importFresh();
    const { missing } = checkRequiredEnv();
    expect(missing).toEqual(
      expect.arrayContaining([
        "SUPABASE_SERVICE_ROLE_KEY",
        "OPENAI_API_KEY",
        "STRIPE_SECRET_KEY",
        "STRIPE_WEBHOOK_SECRET",
        "STRIPE_PRICE_STARTER",
        "STRIPE_PRICE_PRO",
        "CRON_SECRET",
      ]),
    );
  });

  it("warns (without throwing) when VERCEL_TEAM_ID is set without VERCEL_ACCESS_TOKEN", async () => {
    process.env.VERCEL_ENV = "production";
    Object.assign(process.env, FULLY_CONFIGURED);
    process.env.VERCEL_TEAM_ID = "team_123";
    const { checkRequiredEnv } = await importFresh();
    const { missing, warnings } = checkRequiredEnv();
    expect(missing).toEqual([]);
    expect(warnings.some((w) => w.includes("VERCEL_TEAM_ID"))).toBe(true);
  });
});
