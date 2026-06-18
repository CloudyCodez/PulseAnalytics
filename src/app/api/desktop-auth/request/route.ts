import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { createDesktopAuthToken } from "@/lib/desktop-auth";

export const runtime = "nodejs";

const ACTIVE_PLANS = new Set(["trial", "starter", "growth", "agency", "scale"]);

function normalizeEmail(email: unknown) {
  return typeof email === "string" ? email.trim().toLowerCase() : "";
}

function genericResponse() {
  return NextResponse.json({
    ok: true,
    message: "If that email has an active Pulse account, a sign-in link has been sent.",
  });
}

export async function POST(req: NextRequest) {
  let body: { email?: string } = {};
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const email = normalizeEmail(body.email);
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: "Enter a valid email address." }, { status: 400 });
  }

  const supabase = createServiceClient();
  const { data: user } = await supabase
    .from("users")
    .select("clerk_user_id,email,plan,stripe_subscription_id")
    .eq("email", email)
    .maybeSingle();

  if (!user?.clerk_user_id || !ACTIVE_PLANS.has(user.plan)) {
    console.warn(`[desktop-auth] Rejected desktop sign-in request for ${email}`);
    return genericResponse();
  }

  const token = createDesktopAuthToken({
    email: user.email,
    clerkUserId: user.clerk_user_id,
    plan: user.plan,
    exp: Math.floor(Date.now() / 1000) + 15 * 60,
  });

  const authUrl = `pulse://auth?token=${encodeURIComponent(token)}`;

  try {
    await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: process.env.RESEND_FROM_EMAIL,
        to: email,
        subject: "Sign in to Pulse Desktop",
        html: `<!DOCTYPE html>
<html><body style="margin:0;padding:0;background:#080D1A;font-family:Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#080D1A;padding:40px 20px;">
    <tr><td align="center">
      <table width="100%" cellpadding="0" cellspacing="0" style="max-width:540px;">
        <tr><td style="background:#0E1627;border:1px solid rgba(0,212,170,0.15);border-radius:16px;padding:36px;">
          <h1 style="color:#F0F4FF;font-size:24px;margin:0 0 10px;">Open Pulse Desktop</h1>
          <p style="color:#8A9BC0;font-size:14px;line-height:1.6;margin:0 0 24px;">
            Click the button below on the computer where Pulse is installed. This verifies your account before setup begins.
          </p>
          <a href="${authUrl}" style="display:inline-block;background:#00D4AA;color:#080D1A;text-decoration:none;font-weight:700;padding:13px 24px;border-radius:10px;">
            Sign in to Pulse Desktop
          </a>
          <p style="color:#4A5568;font-size:12px;line-height:1.6;margin:24px 0 0;">
            This link expires in 15 minutes. If you did not request it, you can ignore this email.
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`,
      }),
    });
  } catch (err) {
    console.error("[desktop-auth] Could not send desktop sign-in email:", err);
    return NextResponse.json({ error: "Could not send sign-in email." }, { status: 500 });
  }

  console.log(`[desktop-auth] Sent desktop sign-in link to ${email}`);
  return genericResponse();
}
