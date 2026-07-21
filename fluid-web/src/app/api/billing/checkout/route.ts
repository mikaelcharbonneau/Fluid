import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getStripe, STRIPE_PRICE_PRO } from "@/lib/stripe";

export const runtime = "nodejs";

// POST /api/billing/checkout — start a Stripe Checkout for the Pro plan.
export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }
  if (!STRIPE_PRICE_PRO) {
    return NextResponse.json({ error: "Billing isn't set up yet." }, { status: 503 });
  }

  let stripe, admin;
  try {
    stripe = getStripe();
    admin = createAdminClient();
  } catch {
    return NextResponse.json({ error: "Billing isn't set up yet." }, { status: 503 });
  }

  // Find or create the Stripe customer, stored on the subscriptions row.
  const { data: sub } = await admin
    .from("subscriptions")
    .select("stripe_customer_id")
    .eq("user_id", user.id)
    .maybeSingle();

  let customerId = sub?.stripe_customer_id as string | undefined;
  if (!customerId) {
    const customer = await stripe.customers.create({
      email: user.email ?? undefined,
      metadata: { user_id: user.id },
    });
    customerId = customer.id;
    await admin
      .from("subscriptions")
      .upsert({ user_id: user.id, stripe_customer_id: customerId }, { onConflict: "user_id" });
  }

  const origin = new URL(request.url).origin;
  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    customer: customerId,
    line_items: [{ price: STRIPE_PRICE_PRO, quantity: 1 }],
    allow_promotion_codes: true,
    success_url: `${origin}/app?billing=success#account`,
    cancel_url: `${origin}/app#account`,
    subscription_data: { metadata: { user_id: user.id } },
  });

  return NextResponse.json({ url: session.url });
}
