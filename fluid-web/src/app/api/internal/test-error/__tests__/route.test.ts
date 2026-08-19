// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/monitoring/log", () => ({ reportError: vi.fn() }));

const originalVercelEnv = process.env.VERCEL_ENV;
const originalSecret = process.env.TEST_ERROR_SECRET;

function req(headers?: Record<string, string>) {
  return new Request("http://localhost/api/internal/test-error", { headers });
}

// serverEnv (src/lib/env/server.ts) parses process.env once at import time —
// correct for production code, but it means a test that changes
// TEST_ERROR_SECRET needs a fresh module instance to see it.
async function importFresh() {
  vi.resetModules();
  return import("../route");
}

describe("GET /api/internal/test-error", () => {
  beforeEach(() => {
    delete process.env.VERCEL_ENV;
    delete process.env.TEST_ERROR_SECRET;
  });

  afterEach(() => {
    process.env.VERCEL_ENV = originalVercelEnv;
    process.env.TEST_ERROR_SECRET = originalSecret;
  });

  it("returns 404 in production so this can never be triggered by a real user", async () => {
    process.env.VERCEL_ENV = "production";
    const { GET } = await importFresh();
    const res = await GET(req());
    expect(res.status).toBe(404);
  });

  it("throws a deliberate error outside production when no secret is configured", async () => {
    process.env.VERCEL_ENV = "preview";
    const { GET } = await importFresh();
    await expect(GET(req())).rejects.toThrow(/deliberate test error/i);
  });

  it("requires the shared secret when one is configured", async () => {
    process.env.VERCEL_ENV = "preview";
    process.env.TEST_ERROR_SECRET = "shh12345";
    const { GET } = await importFresh();
    const res = await GET(req());
    expect(res.status).toBe(401);
  });

  it("accepts the correct bearer secret", async () => {
    process.env.VERCEL_ENV = "preview";
    process.env.TEST_ERROR_SECRET = "shh12345";
    const { GET } = await importFresh();
    await expect(GET(req({ authorization: "Bearer shh12345" }))).rejects.toThrow(/deliberate test error/i);
  });
});
