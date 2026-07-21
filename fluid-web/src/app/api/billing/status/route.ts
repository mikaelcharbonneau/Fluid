import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// GET /api/billing/status — the signed-in user's plan, for the app UI.
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
    .select("plan, status, current_period_end")
    .eq("user_id", user.id)
    .maybeSingle();

  return NextResponse.json({
    plan: (data && data.plan) || "free",
    status: (data && data.status) || "inactive",
    current_period_end: (data && data.current_period_end) || null,
  });
}
