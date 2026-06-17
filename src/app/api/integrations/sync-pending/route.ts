/**
 * POST /api/integrations/sync-pending
 *
 * Called by the Electron desktop dashboard after the user signs in with Clerk,
 * when `window.pulse.getConfig()` reveals a `{provider}_pending_code` that was
 * captured during first-run setup (before the Clerk session existed).
 *
 * This route re-exchanges the stored authorization code and persists the tokens
 * to Supabase under the now-known Clerk user id, then signals Electron to clear
 * the pending flag from the local config via `window.pulse.redeemPendingOAuth`.
 *
 * Body: { provider: "google" | "meta", code: string, userId: string }
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { exchangeCode as exchangeGoogleCode } from "@/lib/connectors/ga4";
import { createServiceClient } from "@/lib/supabase/server";
import { encrypt } from "@/lib/encryption";

// ─── Meta token exchange (inline — no dedicated connector file yet) ────────────

async function exchangeMetaCode(code: string) {
  const appId = process.env.META_APP_ID!;
  const appSecret = process.env.META_APP_SECRET!;
  const redirectUri = `http://localhost:9988/callback`; // matches main.js OAUTH_REDIRECT_URI

  const params = new URLSearchParams({
    client_id: appId,
    client_secret: appSecret,
    redirect_uri: redirectUri,
    code,
  });

  const res = await fetch(
    `https://graph.facebook.com/v20.0/oauth/access_token?${params}`,
    { method: "GET" }
  );

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Meta token exchange failed: ${body}`);
  }

  const data = await res.json();
  // data.access_token is a short-lived user token by default
  // Exchange for a long-lived token (60-day)
  const llParams = new URLSearchParams({
    grant_type: "fb_exchange_token",
    client_id: appId,
    client_secret: appSecret,
    fb_exchange_token: data.access_token,
  });

  const llRes = await fetch(
    `https://graph.facebook.com/v20.0/oauth/access_token?${llParams}`,
    { method: "GET" }
  );

  if (!llRes.ok) {
    // Fall back to the short-lived token rather than failing entirely
    return { access_token: data.access_token, expires_in: data.expires_in };
  }

  const llData = await llRes.json();
  return { access_token: llData.access_token, expires_in: llData.expires_in };
}

// ─── Route handler ────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  // Verify the caller is authenticated via Clerk
  const { userId: clerkUserId } = await auth();
  if (!clerkUserId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { provider: string; code: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { provider, code } = body;

  if (!provider || !code) {
    return NextResponse.json(
      { error: "Missing provider or code" },
      { status: 400 }
    );
  }

  if (provider !== "google" && provider !== "meta") {
    return NextResponse.json(
      { error: `Unsupported provider: ${provider}` },
      { status: 400 }
    );
  }

  try {
    const supabase = createServiceClient();

    // Look up the internal Supabase user row (created when the client paid / magic-linked)
    const { data: user, error: userErr } = await supabase
      .from("users")
      .select("id")
      .eq("clerk_user_id", clerkUserId)
      .single();

    if (userErr || !user) {
      console.error("[sync-pending] User not found for Clerk id:", clerkUserId);
      return NextResponse.json({ error: "User record not found" }, { status: 404 });
    }

    if (provider === "google") {
      const tokens = await exchangeGoogleCode(code);

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

      // Also upsert google_ads row (same token set covers both GA4 + Ads scopes)
      await supabase.from("integrations").upsert(
        {
          user_id: user.id,
          provider: "google_ads",
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
    } else {
      // Meta
      const tokens = await exchangeMetaCode(code);
      const expiresAt = tokens.expires_in
        ? new Date(Date.now() + tokens.expires_in * 1000).toISOString()
        : null;

      await supabase.from("integrations").upsert(
        {
          user_id: user.id,
          provider: "meta",
          access_token: encrypt(tokens.access_token),
          refresh_token: null, // Meta long-lived tokens don't use a refresh token
          token_expires_at: expiresAt,
          status: "active",
          connected_at: new Date().toISOString(),
        },
        { onConflict: "user_id,provider" }
      );
    }

    return NextResponse.json({ success: true, provider });
  } catch (err: any) {
    console.error(`[sync-pending] Error redeeming ${provider} pending code:`, err);
    return NextResponse.json(
      { error: err.message || "Token exchange failed" },
      { status: 500 }
    );
  }
}
