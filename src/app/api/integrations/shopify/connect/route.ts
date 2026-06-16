import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { createServiceClient } from "@/lib/supabase/server";
import { encrypt } from "@/lib/encryption";

export async function GET(req: NextRequest) {
  const { userId } = auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const shop = searchParams.get("shop");

  if (!shop) {
    return NextResponse.json({ error: "Missing shop parameter" }, { status: 400 });
  }

  // Normalize shop URL
  const shopDomain = shop.replace(/https?:\/\//, "").replace(/\/$/, "");

  const scopes = "read_orders,read_products,read_customers,read_analytics";
  const redirectUri = `${process.env.NEXT_PUBLIC_APP_URL}/api/integrations/shopify/callback`;
  const nonce = Math.random().toString(36).substring(2);

  const installUrl =
    `https://${shopDomain}/admin/oauth/authorize?` +
    new URLSearchParams({
      client_id: process.env.SHOPIFY_API_KEY!,
      scope: scopes,
      redirect_uri: redirectUri,
      state: `${userId}:${nonce}`,
    }).toString();

  return NextResponse.redirect(installUrl);
}
