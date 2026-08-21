import { createAdminClient } from "@/lib/supabase/admin";

export const NO_TOKENS_MESSAGE = "You're out of tokens. Top up in Settings → Billing.";

export class InsufficientTokensError extends Error {
  readonly code = "no_tokens";
  readonly status = 402;

  constructor() {
    super(NO_TOKENS_MESSAGE);
    this.name = "InsufficientTokensError";
  }
}

export class TokenRefundError extends Error {
  readonly code = "billing_refund_failed";
  readonly status = 500;
  readonly originalError: unknown;
  readonly refundError: unknown;

  constructor(originalError: unknown, refundError: unknown) {
    super("Generation failed and your tokens could not be refunded. Please contact support.", {
      cause: originalError,
    });
    this.name = "TokenRefundError";
    this.originalError = originalError;
    this.refundError = refundError;
  }
}

export type TokenErrorDetails = {
  message: string;
  code: string;
  status: number;
};

export function tokenErrorDetails(error: unknown): TokenErrorDetails | null {
  if (error instanceof InsufficientTokensError || error instanceof TokenRefundError) {
    return {
      message: error.message,
      code: error.code,
      status: error.status,
    };
  }
  return null;
}

// Token costs per action.
export const TOKEN_COST = {
  small: 1, // inline "AI suggest" / "Let AI choose" helpers
  asset: 3, // a full asset generation (names, palette, type, logo, guidelines)
  logoConcepts: 6, // one planning call + 6 concurrent medium-quality logo renders
} as const;

// Does the user have at least `cost` tokens?
export async function hasTokens(userId: string, cost: number): Promise<boolean> {
  return (await getBalance(userId)) >= cost;
}

// Current balance for a user (0 if there's no row yet).
export async function getBalance(userId: string): Promise<number> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("subscriptions")
    .select("token_balance")
    .eq("user_id", userId)
    .maybeSingle();
  return (data?.token_balance as number) ?? 0;
}

// Atomically spend tokens. Returns the remaining balance, or null if the user
// didn't have enough (nothing is deducted in that case).
export async function spendTokens(userId: string, amount: number): Promise<number | null> {
  const admin = createAdminClient();
  const { data, error } = await admin.rpc("spend_tokens", {
    p_user: userId,
    p_amount: amount,
  });
  if (error) throw new Error(error.message);
  return typeof data === "number" ? data : null;
}

// Add tokens to a user's balance (monthly refill). Returns the new balance.
export async function grantTokens(userId: string, amount: number): Promise<number | null> {
  const admin = createAdminClient();
  const { data, error } = await admin.rpc("grant_tokens", {
    p_user: userId,
    p_amount: amount,
  });
  if (error) throw new Error(error.message);
  return typeof data === "number" ? data : null;
}

/**
 * Reserve credits before provider work and refund them if that work fails.
 *
 * `spend_tokens` is the authority here: the balance read above is only an
 * optional fast-fail check for callers. Concurrent requests can both pass a
 * balance read, but only one can reserve the final credits atomically.
 */
export async function withTokenReservation<T>(
  userId: string,
  amount: number,
  work: () => Promise<T>,
): Promise<T> {
  const remaining = await spendTokens(userId, amount);
  if (remaining === null) throw new InsufficientTokensError();

  try {
    return await work();
  } catch (error) {
    try {
      const refunded = await grantTokens(userId, amount);
      if (refunded === null) {
        throw new Error("The token balance row was not found.");
      }
    } catch (refundError) {
      throw new TokenRefundError(error, refundError);
    }
    throw error;
  }
}
