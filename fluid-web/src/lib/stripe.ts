import Stripe from "stripe";

// Server-only Stripe config. All values come from env; never expose the secret
// key or webhook secret to the browser.
export const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY || "";
export const STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET || "";
export const STRIPE_PRICE_PRO = process.env.STRIPE_PRICE_PRO || "";

let cached: Stripe | null = null;

export function getStripe(): Stripe {
  if (!STRIPE_SECRET_KEY) {
    throw new Error("STRIPE_SECRET_KEY is not configured.");
  }
  if (!cached) cached = new Stripe(STRIPE_SECRET_KEY);
  return cached;
}

// A subscription counts as "pro" while Stripe reports it active or trialing.
export function planFromStatus(status: string | null | undefined): "free" | "pro" {
  return status === "active" || status === "trialing" ? "pro" : "free";
}
