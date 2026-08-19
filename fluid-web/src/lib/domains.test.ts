import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { checkDomainAvailability } from "./domains";

const originalFetch = global.fetch;
const originalToken = process.env.VERCEL_ACCESS_TOKEN;
const originalTeam = process.env.VERCEL_TEAM_ID;

describe("checkDomainAvailability", () => {
  beforeEach(() => {
    process.env.VERCEL_ACCESS_TOKEN = "test-token";
    delete process.env.VERCEL_TEAM_ID;
  });

  afterEach(() => {
    global.fetch = originalFetch;
    process.env.VERCEL_ACCESS_TOKEN = originalToken;
    process.env.VERCEL_TEAM_ID = originalTeam;
    vi.restoreAllMocks();
  });

  it("returns an empty array for no domains without calling fetch", async () => {
    const fetchMock = vi.fn();
    global.fetch = fetchMock as unknown as typeof fetch;
    await expect(checkDomainAvailability([])).resolves.toEqual([]);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("dedupes, trims, and lowercases domains before calling the API", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ results: [{ domain: "acme.com", available: true }] }),
    });
    global.fetch = fetchMock as unknown as typeof fetch;

    const result = await checkDomainAvailability([" Acme.com ", "acme.com", "ACME.COM"]);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("https://api.vercel.com/v1/registrar/domains/availability");
    expect(JSON.parse(init.body).domains).toEqual(["acme.com"]);
    expect(result).toEqual([{ domain: "acme.com", available: true }]);
  });

  it("marks a domain missing from the response as unknown (null), not unavailable", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ results: [] }),
    });
    global.fetch = fetchMock as unknown as typeof fetch;

    const result = await checkDomainAvailability(["missing.com"]);
    expect(result).toEqual([{ domain: "missing.com", available: null }]);
  });

  it("throws with the status and body when the API call fails", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
      text: async () => "internal error",
    });
    global.fetch = fetchMock as unknown as typeof fetch;

    await expect(checkDomainAvailability(["acme.com"])).rejects.toThrow(/500/);
  });

  it("throws when VERCEL_ACCESS_TOKEN is not configured", async () => {
    delete process.env.VERCEL_ACCESS_TOKEN;
    await expect(checkDomainAvailability(["acme.com"])).rejects.toThrow(
      "VERCEL_ACCESS_TOKEN is not configured.",
    );
  });

  it("includes the team id as a query param when configured", async () => {
    process.env.VERCEL_TEAM_ID = "team_123";
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ results: [] }),
    });
    global.fetch = fetchMock as unknown as typeof fetch;

    await checkDomainAvailability(["acme.com"]);
    const [url] = fetchMock.mock.calls[0];
    expect(url).toContain("teamId=team_123");
  });
});
