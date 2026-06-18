import Stripe from "stripe";

let _stripe: Stripe | null = null;
export function getStripe(): Stripe {
  if (!_stripe) {
    _stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
      apiVersion: "2024-06-20",
      typescript: true,
    });
  }
  return _stripe;
}

// Keep named export for existing usages — lazily resolved on first call
export const stripe = new Proxy({} as Stripe, {
  get(_target, prop) {
    return (getStripe() as unknown as Record<string | symbol, unknown>)[prop];
  },
});

export const PLANS = {
  starter: {
    name: "Starter",
    price: 4900, // cents
    priceId: process.env.STRIPE_PRICE_STARTER!,
    clients: "Up to 5 clients",
  },
  growth: {
    name: "Growth",
    price: 9700,
    priceId: process.env.STRIPE_PRICE_GROWTH!,
    clients: "Up to 20 clients",
  },
  agency: {
    name: "Agency",
    price: 19700,
    priceId: process.env.STRIPE_PRICE_AGENCY!,
    clients: "Unlimited clients",
  },
} as const;

export type PlanKey = keyof typeof PLANS;
