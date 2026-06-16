import { NextRequest, NextResponse } from "next/server";
import { auth, currentUser } from "@clerk/nextjs/server";
import { stripe, PLANS, PlanKey } from "@/lib/stripe/client";
import { createServiceClient } from "@/lib/supabase/server";

export async function POST(req: NextRequest) {
  const { userId } = auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const plan = body.plan as PlanKey;

  if (!PLANS[plan]) {
    return NextResponse.json({ error: "Invalid plan" }, { status: 400 });
  }

  const user = await currentUser();
  const email = user?.emailAddresses?.[0]?.emailAddress;

  const supabase = createServiceClient();

  // Check if user already has a Stripe customer ID
  const { data: dbUser } = await supabase
    .from("users")
    .select("stripe_customer_id")
    .eq("clerk_user_id", userId)
    .single();

  let customerId = dbUser?.stripe_customer_id;

  // Create Stripe customer if needed
  if (!customerId) {
    const customer = await stripe.customers.create({
      email: email ?? undefined,
      metadata: { clerk_user_id: userId },
    });
    customerId = customer.id;
    await supabase
      .from("users")
      .update({ stripe_customer_id: customerId })
      .eq("clerk_user_id", userId);
  }

  const session = await stripe.checkout.sessions.create({
    customer: customerId,
    mode: "subscription",
    payment_method_types: ["card"],
    line_items: [
      {
        price: PLANS[plan].priceId,
        quantity: 1,
      },
    ],
    subscription_data: {
      trial_period_days: 14,
      metadata: { clerk_user_id: userId, plan },
    },
    metadata: { clerk_user_id: userId, plan },
    success_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard?upgraded=true`,
    cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/settings`,
  });

  return NextResponse.json({ url: session.url });
}
