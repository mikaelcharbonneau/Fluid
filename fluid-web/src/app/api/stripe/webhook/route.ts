import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { getStripe, STRIPE_WEBHOOK_SECRET, tierForPrice } from "@/lib/stripe";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

// POST /api/stripe/webhook — keep subscriptions in sync with Stripe and refill
// tokens each billing month. Signature-verified; writes with the service role.
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
  const priceOf = (sub: Stripe.Subscription) => sub.items.data[0]?.price?.id ?? null;

  // Update the subscription's tier / status / token allowance from Stripe.
  const syncFromSubscription = async (customerId: string, sub: Stripe.Subscription) => {
    const periodEnd = (sub as unknown as { current_period_end?: number }).current_period_end;
    const active = sub.status === "active" || sub.status === "trialing";
    const { tier, tokens } = active
      ? tierForPrice(priceOf(sub))
      : { tier: "free" as const, tokens: 0 };
    await admin
      .from("subscriptions")
      .update({
        stripe_subscription_id: sub.id,
        status: sub.status,
        tier,
        monthly_tokens: tokens,
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
      case "invoice.paid": {
        // Each billing cycle (including the first) refills the month's tokens.
        // Dedupe on the invoice id so webhook retries don't double-credit.
        const invoice = event.data.object as Stripe.Invoice;
        const customerId = typeof invoice.customer === "string" ? invoice.customer : invoice.customer?.id;
        // Subscription id location has shifted across Stripe API versions.
        const inv = invoice as unknown as {
          subscription?: string | { id?: string };
          parent?: { subscription_details?: { subscription?: string } };
        };
        const subId =
          typeof inv.subscription === "string" ? inv.subscription
          : inv.subscription?.id
          ?? inv.parent?.subscription_details?.subscription;

        if (customerId && subId && invoice.id) {
          const { data: row } = await admin
            .from("subscriptions")
            .select("last_invoice_id, user_id")
            .eq("stripe_customer_id", customerId)
            .maybeSingle();
          if (row && row.last_invoice_id !== invoice.id) {
            const sub = await stripe.subscriptions.retrieve(subId);
            const { tokens } = tierForPrice(priceOf(sub));
            await admin
              .from("subscriptions")
              .update({ last_invoice_id: invoice.id })
              .eq("stripe_customer_id", customerId);
            if (tokens > 0 && row.user_id) {
              await admin.rpc("grant_tokens", { p_user: row.user_id, p_amount: tokens });
            }
          }
        }
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
