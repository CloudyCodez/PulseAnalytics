import { NextRequest, NextResponse } from "next/server";
import { exchangeCode } from "@/lib/connectors/ga4";
import { createServiceClient } from "@/lib/supabase/server";
import { encrypt } from "@/lib/encryption";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const code = searchParams.get("code");
  const userId = searchParams.get("state"); // clerk userId passed as state

  if (!code || !userId) {
    return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL}/dashboard/integrations?error=oauth_failed`);
  }

  try {
    const tokens = await exchangeCode(code);
    const supabase = createServiceClient();

    // Get the internal user ID from clerk_user_id
    const { data: user } = await supabase
      .from("users")
      .select("id")
      .eq("clerk_user_id", userId)
      .single();

    if (!user) throw new Error("User not found");

    // Upsert GA4 integration
    await supabase.from("integrations").upsert(
      {
        user_id: user.id,
        provider: "ga4",
        access_token: encrypt(tokens.access_token ?? ""),
        refresh_token: encrypt(tokens.refresh_token ?? ""),
        token_expires_at: tokens.expiry_date
          ? new Date(tokens.expiry_date).toISOString()
          : null,
        status: "active",
        connected_at: new Date().toISOString(),
      },
      { onConflict: "user_id,provider" }
    );

    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/integrations?connected=google`
    );
  } catch (err) {
    console.error("Google OAuth callback error:", err);
    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/integrations?error=oauth_failed`
    );
  }
}
