import { NextRequest, NextResponse } from "next/server";
import { stripe, PLANS, PlanKey } from "@/lib/stripe/client";

/**
 * POST /api/stripe/checkout
 * Body: { plan: "starter" | "growth" | "scale", email?: string }
 *
 * Creates a Stripe Checkout session and returns the URL.
 * The website pricing buttons POST here, then redirect to Stripe.
 * After payment, Stripe fires checkout.session.completed → our webhook
 * provisions the Clerk user + sends the welcome email.
 */
export async function POST(req: NextRequest) {
  let body: { plan?: string; email?: string } = {};
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const planKey = (body.plan ?? "starter") as PlanKey;
  const plan = PLANS[planKey];
  if (!plan) {
    return NextResponse.json({ error: "Invalid plan" }, { status: 400 });
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    payment_method_types: ["card"],

    // Pre-fill email if provided (e.g. from a landing page email capture)
    ...(body.email ? { customer_email: body.email } : {}),

    line_items: [
      {
        price: plan.priceId,
        quantity: 1,
      },
    ],

    subscription_data: {
      trial_period_days: 14,
      metadata: {
        plan: planKey,
      },
    },

    // Collect the customer's billing email so our webhook can provision them
    billing_address_collection: "auto",

    // After payment, redirect to a success page that tells them to check email
    success_url: `${appUrl}/welcome?session_id={CHECKOUT_SESSION_ID}&plan=${planKey}`,
    cancel_url: `${appUrl}/#pricing`,

    metadata: {
      plan: planKey,
    },
  });

  return NextResponse.json({ url: session.url });
}
