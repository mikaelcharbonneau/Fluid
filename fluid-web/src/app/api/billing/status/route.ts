import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// GET /api/billing/status — the signed-in user's token balance and tier.
export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

  const { data } = await supabase
    .from("subscriptions")
    .select("tier, status, token_balance, monthly_tokens, current_period_end")
    .eq("user_id", user.id)
    .maybeSingle();

  return NextResponse.json({
    tier: (data && data.tier) || "free",
    status: (data && data.status) || "inactive",
    balance: (data && data.token_balance) || 0,
    monthlyTokens: (data && data.monthly_tokens) || 0,
    current_period_end: (data && data.current_period_end) || null,
  });
}
