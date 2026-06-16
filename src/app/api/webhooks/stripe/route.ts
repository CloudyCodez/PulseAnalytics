import { NextRequest, NextResponse } from "next/server";
import { stripe } from "@/lib/stripe/client";
import { createServiceClient } from "@/lib/supabase/server";
import Stripe from "stripe";
import { clerkClient } from "@clerk/nextjs/server";

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!;

function getPlanFromPriceId(priceId: string): string {
  const map: Record<string, string> = {
    [process.env.STRIPE_PRICE_STARTER!]: "starter",
    [process.env.STRIPE_PRICE_GROWTH!]:  "growth",
    [process.env.STRIPE_PRICE_AGENCY!]:  "agency",
  };
  return map[priceId] ?? "starter";
}

const PLAN_DISPLAY: Record<string, string> = {
  starter: "Starter",
  growth:  "Growth",
  agency:  "Agency",
};

async function provisionUser(
  email: string,
  plan: string,
  customerId: string,
  subscriptionId: string
) {
  const supabase = createServiceClient();

  // ── Check if user already exists ──────────────────────────────────────────
  const { data: existing } = await supabase
    .from("users")
    .select("clerk_user_id")
    .eq("email", email)
    .single();

  if (existing?.clerk_user_id) {
    // Already has an account — just update their plan
    await supabase
      .from("users")
      .update({
        plan,
        stripe_customer_id: customerId,
        stripe_subscription_id: subscriptionId,
        trial_ends_at: null,
      })
      .eq("email", email);
    console.log(`[Stripe] Updated existing user ${email} → ${plan}`);
    return;
  }

  // ── Create Clerk user ──────────────────────────────────────────────────────
  let clerkUser;
  try {
    clerkUser = await clerkClient.users.createUser({
      emailAddress: [email],
      skipPasswordRequirement: true,
      publicMetadata: { plan },
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes("already exists") || msg.includes("duplicate")) {
      const list = await clerkClient.users.getUserList({ emailAddress: [email] });
      clerkUser = list.data?.[0];
      if (!clerkUser) {
        console.error(`[Stripe] Could not find or create Clerk user for ${email}`);
        return;
      }
    } else {
      console.error(`[Stripe] Clerk user creation failed for ${email}:`, err);
      return;
    }
  }

  // ── Create a one-time sign-in token (magic link) ───────────────────────────
  const signInToken = await clerkClient.signInTokens.createSignInToken({
    userId: clerkUser.id,
    expiresInSeconds: 60 * 60 * 24 * 7, // 7 days
  });

  // ── Save to Supabase ───────────────────────────────────────────────────────
  await supabase.from("users").upsert(
    {
      clerk_user_id: clerkUser.id,
      email,
      plan,
      stripe_customer_id: customerId,
      stripe_subscription_id: subscriptionId,
      trial_ends_at: null,
      created_at: new Date().toISOString(),
    },
    { onConflict: "email" }
  );

  // ── Send welcome email via Resend ──────────────────────────────────────────
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://pulse.app";
  const accessUrl = `${appUrl}/sign-in?token=${signInToken.token}`;
  const planName = PLAN_DISPLAY[plan] ?? plan;

  await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: process.env.RESEND_FROM_EMAIL,
      to: email,
      subject: `Welcome to Pulse — your ${planName} account is ready`,
      html: `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#080D1A;font-family:'DM Sans',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#080D1A;padding:40px 20px;">
    <tr><td align="center">
      <table width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;">

        <!-- Logo -->
        <tr><td style="padding-bottom:32px;">
          <span style="font-size:22px;font-weight:700;color:#F0F4FF;letter-spacing:-0.03em;">
            Pulse <span style="color:#00D4AA;">Analytics</span>
          </span>
        </td></tr>

        <!-- Card -->
        <tr><td style="background:#0E1627;border:1px solid rgba(0,212,170,0.15);border-radius:16px;padding:40px;">

          <p style="font-size:28px;font-weight:700;color:#F0F4FF;margin:0 0 8px;letter-spacing:-0.02em;">
            You're in. 🎉
          </p>
          <p style="font-size:15px;color:#8A9BC0;margin:0 0 28px;line-height:1.6;">
            Your Pulse <strong style="color:#F0F4FF;">${planName}</strong> account is ready.
            Your 14-day free trial has started — no charge until it ends.
          </p>

          <!-- CTA button -->
          <table cellpadding="0" cellspacing="0" style="margin-bottom:28px;">
            <tr><td style="background:#00D4AA;border-radius:10px;">
              <a href="${accessUrl}"
                 style="display:inline-block;padding:14px 32px;font-size:15px;font-weight:700;
                        color:#080D1A;text-decoration:none;letter-spacing:-0.01em;">
                Access your Pulse dashboard →
              </a>
            </td></tr>
          </table>

          <!-- What's next -->
          <p style="font-size:13px;font-weight:600;color:#00D4AA;text-transform:uppercase;
                     letter-spacing:0.06em;margin:0 0 16px;">What happens next</p>

          <table cellpadding="0" cellspacing="0" width="100%">
            ${[
              ["1", "Click the button above", "Signs you in instantly — no password needed yet."],
              ["2", "Connect your platforms", "Link Google Ads, Meta, Shopify, GA4 in about 5 minutes."],
              ["3", "Get your first report", "Your first AI-written report arrives within 48 hours."],
            ].map(([n, title, desc]) => `
            <tr>
              <td width="36" valign="top" style="padding-bottom:16px;">
                <span style="display:inline-block;width:28px;height:28px;border-radius:50%;
                             background:rgba(0,212,170,0.12);border:1px solid rgba(0,212,170,0.25);
                             text-align:center;line-height:28px;font-size:12px;font-weight:700;
                             color:#00D4AA;">${n}</span>
              </td>
              <td style="padding-bottom:16px;padding-left:8px;">
                <div style="font-size:14px;font-weight:600;color:#F0F4FF;margin-bottom:2px;">${title}</div>
                <div style="font-size:13px;color:#8A9BC0;line-height:1.5;">${desc}</div>
              </td>
            </tr>`).join("")}
          </table>

          <hr style="border:none;border-top:1px solid rgba(0,212,170,0.1);margin:24px 0;">

          <p style="font-size:12px;color:#4A5568;line-height:1.6;margin:0;">
            This sign-in link expires in 7 days. After signing in you can set a permanent password
            from your account settings.<br><br>
            Questions? Reply to this email — we read every one.
          </p>

        </td></tr>

        <!-- Footer -->
        <tr><td style="padding-top:24px;text-align:center;">
          <p style="font-size:12px;color:#4A5568;margin:0;">
            © 2026 Pulse Analytics · You're receiving this because you signed up at pulse.app
          </p>
        </td></tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`,
    }),
  });

  console.log(`[Stripe] Provisioned ${email} on ${plan}, welcome email sent.`);
}

// ── Main webhook handler ───────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  const body = await req.text();
  const sig  = req.headers.get("stripe-signature")!;

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, sig, webhookSecret);
  } catch (err) {
    console.error("[Stripe] Webhook signature error:", err);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  const supabase = createServiceClient();

  switch (event.type) {

    // ── Someone paid (via Payment Link or Checkout Session) ─────────────────
    case "checkout.session.completed": {
      const session = event.data.object as Stripe.Checkout.Session;

      // Email comes from customer_details (Payment Link) or metadata (API checkout)
      const email =
        session.customer_details?.email ??
        session.customer_email ??
        session.metadata?.email;

      const customerId    = session.customer as string;
      const subscriptionId = session.subscription as string;

      // Resolve plan — check metadata first, then look up subscription price
      let plan = session.metadata?.plan;
      if (!plan && subscriptionId) {
        try {
          const sub = await stripe.subscriptions.retrieve(subscriptionId, {
            expand: ["items.data.price"],
          });
          plan = getPlanFromPriceId(sub.items.data[0]?.price?.id ?? "");
        } catch {
          plan = "starter";
        }
      }
      plan = plan ?? "starter";

      if (email) {
        await provisionUser(email, plan, customerId, subscriptionId);
      } else {
        console.error("[Stripe] checkout.session.completed — no email found, cannot provision");
      }
      break;
    }

    // ── Plan upgrade / downgrade ─────────────────────────────────────────────
    case "customer.subscription.updated": {
      const sub = event.data.object as Stripe.Subscription;
      const plan = getPlanFromPriceId(sub.items.data[0]?.price?.id ?? "");
      await supabase
        .from("users")
        .update({
          plan: sub.status === "active" ? plan : "trial",
          stripe_subscription_id: sub.id,
        })
        .eq("stripe_customer_id", sub.customer as string);
      break;
    }

    // ── Cancellation ─────────────────────────────────────────────────────────
    case "customer.subscription.deleted": {
      const sub = event.data.object as Stripe.Subscription;
      await supabase
        .from("users")
        .update({ plan: "cancelled", stripe_subscription_id: null })
        .eq("stripe_customer_id", sub.customer as string);
      break;
    }

    // ── Failed payment ───────────────────────────────────────────────────────
    case "invoice.payment_failed": {
      const invoice = event.data.object as Stripe.Invoice;
      console.warn(`[Stripe] Payment failed — customer: ${invoice.customer}`);
      // TODO: send payment failure email, optionally downgrade after grace period
      break;
    }

    default:
      break;
  }

  return NextResponse.json({ received: true });
}
