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

import {
  getBalance,
  grantTokens,
  hasTokens,
  InsufficientTokensError,
  spendTokens,
  TokenRefundError,
  TOKEN_COST,
  withTokenReservation,
} from "./credits";

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

describe("withTokenReservation", () => {
  beforeEach(() => {
    rpcMock.mockReset();
  });

  it("reserves before work and does not run work when the balance is insufficient", async () => {
    rpcMock.mockResolvedValue({ data: null, error: null });
    const work = vi.fn();

    await expect(withTokenReservation("user-1", 3, work)).rejects.toBeInstanceOf(
      InsufficientTokensError,
    );
    expect(work).not.toHaveBeenCalled();
    expect(rpcMock).toHaveBeenCalledTimes(1);
    expect(rpcMock).toHaveBeenCalledWith("spend_tokens", { p_user: "user-1", p_amount: 3 });
  });

  it("keeps the reservation when work succeeds", async () => {
    rpcMock.mockResolvedValue({ data: 7, error: null });
    const work = vi.fn().mockResolvedValue("result");

    await expect(withTokenReservation("user-1", 3, work)).resolves.toBe("result");
    expect(work).toHaveBeenCalledOnce();
    expect(rpcMock).toHaveBeenCalledTimes(1);
  });

  it("refunds the reservation and rethrows the provider failure", async () => {
    rpcMock
      .mockResolvedValueOnce({ data: 7, error: null })
      .mockResolvedValueOnce({ data: 10, error: null });
    const failure = new Error("provider failed");

    await expect(
      withTokenReservation("user-1", 3, async () => {
        throw failure;
      }),
    ).rejects.toBe(failure);
    expect(rpcMock).toHaveBeenNthCalledWith(1, "spend_tokens", { p_user: "user-1", p_amount: 3 });
    expect(rpcMock).toHaveBeenNthCalledWith(2, "grant_tokens", { p_user: "user-1", p_amount: 3 });
  });

  it("surfaces a refund failure instead of pretending the charge was reversed", async () => {
    rpcMock
      .mockResolvedValueOnce({ data: 7, error: null })
      .mockResolvedValueOnce({ data: null, error: { message: "refund unavailable" } });

    await expect(
      withTokenReservation("user-1", 3, async () => {
        throw new Error("provider failed");
      }),
    ).rejects.toBeInstanceOf(TokenRefundError);
  });
});
