import { NextRequest, NextResponse } from "next/server";
import { verifyDesktopAuthToken } from "@/lib/desktop-auth";
import { createServiceClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

const ACTIVE_PLANS = new Set(["trial", "starter", "growth", "agency", "scale"]);

export async function POST(req: NextRequest) {
  let body: { token?: string } = {};
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (!body.token) {
    return NextResponse.json({ error: "Missing token." }, { status: 400 });
  }

  let payload;
  try {
    payload = verifyDesktopAuthToken(body.token);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Invalid sign-in link." },
      { status: 401 }
    );
  }

  const supabase = createServiceClient();
  const { data: user } = await supabase
    .from("users")
    .select("clerk_user_id,email,plan")
    .eq("clerk_user_id", payload.clerkUserId)
    .eq("email", payload.email)
    .maybeSingle();

  if (!user || !ACTIVE_PLANS.has(user.plan)) {
    return NextResponse.json({ error: "No active Pulse account found." }, { status: 403 });
  }

  return NextResponse.json({
    ok: true,
    account: {
      email: user.email,
      clerkUserId: user.clerk_user_id,
      plan: user.plan,
    },
  });
}
