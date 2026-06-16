import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { encrypt } from "@/lib/encryption";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const code = searchParams.get("code");
  const userId = searchParams.get("state");

  if (!code || !userId) {
    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/integrations?error=oauth_failed`
    );
  }

  try {
    // Exchange code for token
    const tokenRes = await fetch(
      `https://graph.facebook.com/v20.0/oauth/access_token?` +
        new URLSearchParams({
          client_id: process.env.META_APP_ID!,
          client_secret: process.env.META_APP_SECRET!,
          redirect_uri: `${process.env.NEXT_PUBLIC_APP_URL}/api/integrations/meta/callback`,
          code,
        })
    );
    const tokenData = await tokenRes.json();
    if (!tokenData.access_token) throw new Error("No access token returned");

    // Get ad accounts
    const accountsRes = await fetch(
      `https://graph.facebook.com/v20.0/me/adaccounts?fields=id,name&access_token=${tokenData.access_token}`
    );
    const accountsData = await accountsRes.json();
    const primaryAccount = accountsData.data?.[0];

    const supabase = createServiceClient();
    const { data: user } = await supabase
      .from("users")
      .select("id")
      .eq("clerk_user_id", userId)
      .single();

    if (!user) throw new Error("User not found");

    await supabase.from("integrations").upsert(
      {
        user_id: user.id,
        provider: "meta",
        access_token: encrypt(tokenData.access_token),
        account_id: primaryAccount?.id ?? null,
        status: "active",
        connected_at: new Date().toISOString(),
      },
      { onConflict: "user_id,provider" }
    );

    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/integrations?connected=meta`
    );
  } catch (err) {
    console.error("Meta OAuth callback error:", err);
    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/integrations?error=oauth_failed`
    );
  }
}
