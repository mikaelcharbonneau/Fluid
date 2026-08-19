// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/monitoring/log", () => ({ reportError: vi.fn() }));

import { GET } from "../route";

const originalVercelEnv = process.env.VERCEL_ENV;
const originalSecret = process.env.TEST_ERROR_SECRET;

function req(headers?: Record<string, string>) {
  return new Request("http://localhost/api/internal/test-error", { headers });
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
    const res = await GET(req());
    expect(res.status).toBe(404);
  });

  it("throws a deliberate error outside production when no secret is configured", async () => {
    process.env.VERCEL_ENV = "preview";
    await expect(GET(req())).rejects.toThrow(/deliberate test error/i);
  });

  it("requires the shared secret when one is configured", async () => {
    process.env.VERCEL_ENV = "preview";
    process.env.TEST_ERROR_SECRET = "shh";
    const res = await GET(req());
    expect(res.status).toBe(401);
  });

  it("accepts the correct bearer secret", async () => {
    process.env.VERCEL_ENV = "preview";
    process.env.TEST_ERROR_SECRET = "shh";
    await expect(GET(req({ authorization: "Bearer shh" }))).rejects.toThrow(/deliberate test error/i);
  });
});
