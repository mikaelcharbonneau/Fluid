import { beforeEach, describe, expect, it, vi } from "vitest";

const { getUser, createBrandStrategy, createBrand, checkRateLimit } = vi.hoisted(() => ({
  getUser: vi.fn(),
  createBrandStrategy: vi.fn(),
  createBrand: vi.fn(),
  checkRateLimit: vi.fn(),
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(async () => ({ auth: { getUser } })),
}));

vi.mock("@/lib/agents/brand-workflow", async () => {
  const actual = await vi.importActual<typeof import("@/lib/agents/brand-workflow")>(
    "@/lib/agents/brand-workflow",
  );
  return { ...actual, createBrandStrategy };
});

vi.mock("@/lib/db/brands", () => ({ createBrand }));
vi.mock("@/lib/ratelimit", () => ({ checkRateLimit }));
vi.mock("@/lib/logger", () => ({ logger: { error: vi.fn(), info: vi.fn(), warn: vi.fn() } }));

import { POST } from "./route";

function postRequest(body: unknown, raw = false) {
  return new Request("http://localhost/api/brand-strategy", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: raw ? (body as string) : JSON.stringify(body),
  });
}

const validBody = { about: "A focused analytics tool", audience: "Operations teams" };

describe("POST /api/brand-strategy", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getUser.mockResolvedValue({ data: { user: { id: "user-1" } } });
    checkRateLimit.mockResolvedValue({ success: true, reset: 0 });
    createBrandStrategy.mockResolvedValue({ suggestedNames: ["Acme"] });
    createBrand.mockResolvedValue({ id: "brand-1" });
  });

  it("returns 401 when the request is unauthenticated", async () => {
    getUser.mockResolvedValue({ data: { user: null } });
    const response = await POST(postRequest(validBody));
    expect(response.status).toBe(401);
    expect(checkRateLimit).not.toHaveBeenCalled();
  });

  it("returns 429 with a Retry-After header when rate limited", async () => {
    checkRateLimit.mockResolvedValue({ success: false, reset: Date.now() + 30_000 });
    const response = await POST(postRequest(validBody));
    expect(response.status).toBe(429);
    expect(Number(response.headers.get("Retry-After"))).toBeGreaterThan(0);
    expect(createBrandStrategy).not.toHaveBeenCalled();
  });

  it("returns 400 on malformed JSON", async () => {
    const response = await POST(postRequest("{not json", true));
    expect(response.status).toBe(400);
  });

  it("returns 400 when input fails schema validation", async () => {
    const response = await POST(postRequest({ about: "", audience: "" }));
    expect(response.status).toBe(400);
    expect(createBrandStrategy).not.toHaveBeenCalled();
  });

  it("scopes brand creation to the authenticated user on success", async () => {
    const response = await POST(postRequest(validBody));
    expect(response.status).toBe(200);
    const payload = await response.json();
    expect(payload.brandId).toBe("brand-1");
    expect(createBrand).toHaveBeenCalledWith(
      expect.anything(),
      "user-1",
      expect.objectContaining({ name: "Acme" }),
    );
  });

  it("returns 500 without leaking internals when generation fails", async () => {
    createBrandStrategy.mockRejectedValue(new Error("upstream boom"));
    const response = await POST(postRequest(validBody));
    expect(response.status).toBe(500);
    const payload = await response.json();
    expect(JSON.stringify(payload)).not.toContain("upstream boom");
  });
});
