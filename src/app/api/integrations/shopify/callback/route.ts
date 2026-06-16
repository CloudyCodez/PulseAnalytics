import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { encrypt } from "@/lib/encryption";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const code = searchParams.get("code");
  const shop = searchParams.get("shop");
  const state = searchParams.get("state"); // "clerkUserId:nonce"

  if (!code || !shop || !state) {
    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/integrations?error=oauth_failed`
    );
  }

  const userId = state.split(":")[0];

  try {
    // Exchange code for permanent access token
    const tokenRes = await fetch(`https://${shop}/admin/oauth/access_token`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        client_id: process.env.SHOPIFY_API_KEY!,
        client_secret: process.env.SHOPIFY_API_SECRET!,
        code,
      }),
    });
    const tokenData = await tokenRes.json();
    if (!tokenData.access_token) throw new Error("No access token returned");

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
        provider: "shopify",
        access_token: encrypt(tokenData.access_token),
        store_url: shop,
        status: "active",
        connected_at: new Date().toISOString(),
      },
      { onConflict: "user_id,provider" }
    );

    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/integrations?connected=shopify`
    );
  } catch (err) {
    console.error("Shopify OAuth callback error:", err);
    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/integrations?error=oauth_failed`
    );
  }
}
