import { beforeEach, describe, expect, it, vi } from "vitest";

const { rpcMock, maybeSingleMock, adminMock } = vi.hoisted(() => {
  const rpcMock = vi.fn();
  const maybeSingleMock = vi.fn();
  const adminMock = {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({ maybeSingle: maybeSingleMock })),
      })),
    })),
    rpc: rpcMock,
  };
  return { rpcMock, maybeSingleMock, adminMock };
});

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => adminMock,
}));

import { getBalance, grantTokens, hasTokens, spendTokens, TOKEN_COST } from "./credits";

describe("TOKEN_COST", () => {
  it("has the expected fixed costs", () => {
    expect(TOKEN_COST).toEqual({ small: 1, asset: 3, logoConcepts: 6 });
  });
});

describe("getBalance", () => {
  beforeEach(() => {
    maybeSingleMock.mockReset();
    rpcMock.mockReset();
  });

  it("returns the stored balance", async () => {
    maybeSingleMock.mockResolvedValue({ data: { token_balance: 42 } });
    await expect(getBalance("user-1")).resolves.toBe(42);
  });

  it("returns 0 when there is no subscription row yet", async () => {
    maybeSingleMock.mockResolvedValue({ data: null });
    await expect(getBalance("user-1")).resolves.toBe(0);
  });
});

describe("hasTokens", () => {
  beforeEach(() => {
    maybeSingleMock.mockReset();
  });

  it("is true when the balance covers the cost", async () => {
    maybeSingleMock.mockResolvedValue({ data: { token_balance: 5 } });
    await expect(hasTokens("user-1", 5)).resolves.toBe(true);
  });

  it("is false when the balance is short", async () => {
    maybeSingleMock.mockResolvedValue({ data: { token_balance: 2 } });
    await expect(hasTokens("user-1", 3)).resolves.toBe(false);
  });
});

describe("spendTokens", () => {
  beforeEach(() => {
    rpcMock.mockReset();
  });

  it("returns the remaining balance on success", async () => {
    rpcMock.mockResolvedValue({ data: 7, error: null });
    await expect(spendTokens("user-1", 3)).resolves.toBe(7);
    expect(rpcMock).toHaveBeenCalledWith("spend_tokens", { p_user: "user-1", p_amount: 3 });
  });

  it("returns null when the RPC reports insufficient funds (non-numeric data)", async () => {
    rpcMock.mockResolvedValue({ data: null, error: null });
    await expect(spendTokens("user-1", 999)).resolves.toBeNull();
  });

  it("throws when the RPC errors", async () => {
    rpcMock.mockResolvedValue({ data: null, error: { message: "boom" } });
    await expect(spendTokens("user-1", 1)).rejects.toThrow("boom");
  });
});

describe("grantTokens", () => {
  beforeEach(() => {
    rpcMock.mockReset();
  });

  it("returns the new balance on success", async () => {
    rpcMock.mockResolvedValue({ data: 20, error: null });
    await expect(grantTokens("user-1", 20)).resolves.toBe(20);
    expect(rpcMock).toHaveBeenCalledWith("grant_tokens", { p_user: "user-1", p_amount: 20 });
  });

  it("throws when the RPC errors", async () => {
    rpcMock.mockResolvedValue({ data: null, error: { message: "grant failed" } });
    await expect(grantTokens("user-1", 20)).rejects.toThrow("grant failed");
  });
});
