import Stripe from "stripe";

// Server-only Stripe config. All values come from env; never expose the secret
// key or webhook secret to the browser.
export const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY || "";
export const STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET || "";

// Subscription tiers. Each maps a Stripe recurring price (set via env) to the
// number of tokens it grants each billing month. Prices are created in Stripe.
export type Tier = "free" | "starter" | "pro";

export const TIERS: Record<Exclude<Tier, "free">, { price: string; tokens: number; label: string }> = {
  starter: { price: process.env.STRIPE_PRICE_STARTER || "", tokens: 150, label: "Starter" },
  pro: { price: process.env.STRIPE_PRICE_PRO || "", tokens: 500, label: "Pro" },
};

export const FREE_TOKENS = 20;

// The tier + monthly token grant for a given Stripe price id.
export function tierForPrice(priceId: string | null | undefined): { tier: Tier; tokens: number } {
  if (priceId && priceId === TIERS.starter.price) return { tier: "starter", tokens: TIERS.starter.tokens };
  if (priceId && priceId === TIERS.pro.price) return { tier: "pro", tokens: TIERS.pro.tokens };
  return { tier: "free", tokens: 0 };
}

let cached: Stripe | null = null;

export function getStripe(): Stripe {
  if (!STRIPE_SECRET_KEY) {
    throw new Error("STRIPE_SECRET_KEY is not configured.");
  }
  if (!cached) cached = new Stripe(STRIPE_SECRET_KEY);
  return cached;
}
