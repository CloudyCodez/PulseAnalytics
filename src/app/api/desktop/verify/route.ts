import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";

// ─── Desktop license verification ──────────────────────────────────────────
// Called from the Electron app's license.html screen before the setup wizard
// or main app window is allowed to open. No Clerk session exists at this
// point — the user has not signed in yet, they're just typing the email they
// purchased with. This route is intentionally public (see middleware.ts) and
// uses the service-role Supabase client to bypass RLS, the same pattern the
// Stripe webhook already uses for server-to-server lookups.
//
// Plans considered valid: trial | starter | growth | scale.
// "cancelled" (or any other value) is treated as not active.

export async function POST(req: NextRequest) {
  let email: string | undefined;

  try {
    const body = await req.json();
    email = typeof body?.email === "string" ? body.email.trim().toLowerCase() : undefined;
  } catch {
    return NextResponse.json({ valid: false, reason: "server_error" }, { status: 400 });
  }

  if (!email || !email.includes("@")) {
    return NextResponse.json({ valid: false, reason: "not_found" }, { status: 400 });
  }

  try {
    const supabase = createServiceClient();

    const { data: user, error } = await supabase
      .from("users")
      .select("email, plan, trial_ends_at, stripe_subscription_id")
      .eq("email", email)
      .maybeSingle();

    if (error) {
      console.error("[desktop/verify] Supabase error:", error.message);
      return NextResponse.json({ valid: false, reason: "server_error" }, { status: 500 });
    }

    if (!user) {
      return NextResponse.json({ valid: false, reason: "not_found" }, { status: 404 });
    }

    const INACTIVE_PLANS = new Set(["cancelled"]);
    const isTrialExpired =
      user.plan === "trial" &&
      user.trial_ends_at !== null &&
      new Date(user.trial_ends_at).getTime() < Date.now();

    if (INACTIVE_PLANS.has(user.plan) || isTrialExpired) {
      return NextResponse.json({ valid: false, reason: "not_active" }, { status: 403 });
    }

    return NextResponse.json({
      valid: true,
      email: user.email,
      plan: user.plan,
    });
  } catch (err) {
    console.error("[desktop/verify] Unexpected error:", err);
    return NextResponse.json({ valid: false, reason: "server_error" }, { status: 500 });
  }
}
