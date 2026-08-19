import { describe, expect, it } from "vitest";
import { ALL_ENV_VARS, PublicEnvSchema, ServerEnvSchema } from "./schema";

describe("ALL_ENV_VARS manifest", () => {
  it("has no duplicate names", () => {
    const names = ALL_ENV_VARS.map((v) => v.name);
    expect(new Set(names).size).toBe(names.length);
  });

  it("every var has a non-empty description", () => {
    for (const v of ALL_ENV_VARS) {
      expect(v.description.length).toBeGreaterThan(0);
    }
  });
});

describe("ServerEnvSchema", () => {
  it("accepts a fully empty environment (everything is optional)", () => {
    expect(ServerEnvSchema.safeParse({}).success).toBe(true);
  });

  it("treats an empty string the same as unset", () => {
    const result = ServerEnvSchema.safeParse({ OPENAI_API_KEY: "" });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.OPENAI_API_KEY).toBeUndefined();
  });

  it("trims whitespace (guards against a trailing newline pasted into a dashboard)", () => {
    const result = ServerEnvSchema.safeParse({ OPENAI_API_KEY: "sk-abcdefghijklmnopqrst\n" });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.OPENAI_API_KEY).toBe("sk-abcdefghijklmnopqrst");
  });

  it.each([
    ["OPENAI_API_KEY", "not-an-openai-key-but-long-enough", false],
    ["OPENAI_API_KEY", "sk-abcdefghijklmnopqrst", true],
    ["STRIPE_SECRET_KEY", "not_a_stripe_key", false],
    ["STRIPE_SECRET_KEY", "sk_test_abcdefghij", true],
    ["STRIPE_WEBHOOK_SECRET", "not_a_webhook_secret", false],
    ["STRIPE_WEBHOOK_SECRET", "whsec_abcdefghij", true],
    ["STRIPE_PRICE_STARTER", "starter", false],
    ["STRIPE_PRICE_STARTER", "price_abc123", true],
  ] as const)("validates the %s prefix (%s → valid: %s)", (field, value, expectValid) => {
    const result = ServerEnvSchema.safeParse({ [field]: value });
    expect(result.success).toBe(expectValid);
  });

  it("rejects a CRON_SECRET below the minimum-entropy length", () => {
    expect(ServerEnvSchema.safeParse({ CRON_SECRET: "short" }).success).toBe(false);
    expect(ServerEnvSchema.safeParse({ CRON_SECRET: "a".repeat(16) }).success).toBe(true);
  });

  it("validates SENTRY_DSN as a URL", () => {
    expect(ServerEnvSchema.safeParse({ SENTRY_DSN: "not-a-url" }).success).toBe(false);
    expect(ServerEnvSchema.safeParse({ SENTRY_DSN: "https://key@sentry.io/1" }).success).toBe(true);
  });
});

describe("PublicEnvSchema", () => {
  it("accepts a fully empty environment", () => {
    expect(PublicEnvSchema.safeParse({}).success).toBe(true);
  });

  it("validates NEXT_PUBLIC_SUPABASE_URL as a URL when present", () => {
    expect(PublicEnvSchema.safeParse({ NEXT_PUBLIC_SUPABASE_URL: "not-a-url" }).success).toBe(false);
    expect(
      PublicEnvSchema.safeParse({ NEXT_PUBLIC_SUPABASE_URL: "https://project.supabase.co" }).success,
    ).toBe(true);
  });
});
