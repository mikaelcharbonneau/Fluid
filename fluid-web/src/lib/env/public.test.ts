import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const ENV_KEYS = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  "SUPABASE_ANON_KEY",
  "NEXT_PUBLIC_SENTRY_DSN",
] as const;

const originalValues = Object.fromEntries(ENV_KEYS.map((k) => [k, process.env[k]]));

async function importFresh() {
  vi.resetModules();
  return import("./public");
}

describe("publicEnv", () => {
  beforeEach(() => {
    for (const key of ENV_KEYS) delete process.env[key];
  });

  afterEach(() => {
    for (const key of ENV_KEYS) {
      if (originalValues[key] === undefined) delete process.env[key];
      else process.env[key] = originalValues[key];
    }
  });

  it("falls back to the documented default Supabase URL/key when unset", async () => {
    const { publicEnv } = await importFresh();
    expect(publicEnv.SUPABASE_URL).toBe("https://jhxbylzfunojlfihlwhq.supabase.co");
    expect(publicEnv.SUPABASE_KEY).toBe("sb_publishable_il3ErgmDiE9YPg-3dWJDOQ_6tofR31q");
  });

  it("prefers the configured value over the fallback", async () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://custom-project.supabase.co";
    const { publicEnv } = await importFresh();
    expect(publicEnv.SUPABASE_URL).toBe("https://custom-project.supabase.co");
  });

  it("prefers PUBLISHABLE_KEY, then ANON_KEY, then the legacy unprefixed alias", async () => {
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "anon-key";
    process.env.SUPABASE_ANON_KEY = "legacy-key";
    const { publicEnv: withAnon } = await importFresh();
    expect(withAnon.SUPABASE_KEY).toBe("anon-key");

    delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    const { publicEnv: withLegacy } = await importFresh();
    expect(withLegacy.SUPABASE_KEY).toBe("legacy-key");
  });

  it("leaves SENTRY_DSN undefined (feature-gated, no default) rather than throwing", async () => {
    const { publicEnv } = await importFresh();
    expect(publicEnv.SENTRY_DSN).toBeUndefined();
  });
});
