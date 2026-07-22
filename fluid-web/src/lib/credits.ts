import { createAdminClient } from "@/lib/supabase/admin";

// Token costs per action.
export const TOKEN_COST = {
  small: 1, // inline "AI suggest" / "Let AI choose" helpers
  asset: 3, // a full asset generation (names, palette, type, logo, guidelines)
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
