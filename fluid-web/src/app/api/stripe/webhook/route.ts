import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { getStripe, STRIPE_WEBHOOK_SECRET, planFromStatus } from "@/lib/stripe";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

// POST /api/stripe/webhook — keep the subscriptions table in sync with Stripe.
// Signature-verified; writes with the service-role client (no user session).
export async function POST(request: Request) {
  const sig = request.headers.get("stripe-signature");
  const body = await request.text();
  if (!sig || !STRIPE_WEBHOOK_SECRET) {
    return NextResponse.json({ error: "Not configured." }, { status: 400 });
  }

  let event: Stripe.Event;
  let stripe: Stripe;
  try {
    stripe = getStripe();
    event = stripe.webhooks.constructEvent(body, sig, STRIPE_WEBHOOK_SECRET);
  } catch {
    return NextResponse.json({ error: "Invalid signature." }, { status: 400 });
  }

  const admin = createAdminClient();
  const syncFromSubscription = async (customerId: string, sub: Stripe.Subscription) => {
    const periodEnd = (sub as unknown as { current_period_end?: number }).current_period_end;
    await admin
      .from("subscriptions")
      .update({
        stripe_subscription_id: sub.id,
        status: sub.status,
        plan: planFromStatus(sub.status),
        current_period_end: periodEnd ? new Date(periodEnd * 1000).toISOString() : null,
      })
      .eq("stripe_customer_id", customerId);
  };

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const customerId = typeof session.customer === "string" ? session.customer : session.customer?.id;
        const subId = typeof session.subscription === "string" ? session.subscription : session.subscription?.id;
        if (customerId && subId) {
          const sub = await stripe.subscriptions.retrieve(subId);
          await syncFromSubscription(customerId, sub);
        }
        break;
      }
      case "customer.subscription.created":
      case "customer.subscription.updated":
      case "customer.subscription.deleted": {
        const sub = event.data.object as Stripe.Subscription;
        const customerId = typeof sub.customer === "string" ? sub.customer : sub.customer?.id;
        if (customerId) await syncFromSubscription(customerId, sub);
        break;
      }
      default:
        break;
    }
  } catch {
    return NextResponse.json({ error: "Handler error." }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
