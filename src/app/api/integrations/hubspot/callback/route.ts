import { NextRequest, NextResponse } from "next/server";
import { exchangeHubSpotCode } from "@/lib/connectors/hubspot";
import { createServiceClient } from "@/lib/supabase/server";
import { encrypt } from "@/lib/encryption";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const code         = searchParams.get("code");
  const userId       = searchParams.get("state");
  const codeVerifier = searchParams.get("code_verifier") ?? undefined;

  if (!code || !userId) {
    return new NextResponse(closePage(false, "Missing code or state"), {
      headers: { "Content-Type": "text/html" },
    });
  }

  try {
    const tokens  = await exchangeHubSpotCode(code, codeVerifier);
    const supabase = createServiceClient();

    const expiresAt = new Date(Date.now() + tokens.expires_in * 1000).toISOString();

    await supabase.from("integrations").upsert({
      user_id:          userId,
      provider:         "hubspot",
      status:           "active",
      access_token:     encrypt(tokens.access_token),
      refresh_token:    encrypt(tokens.refresh_token),
      token_expires_at: expiresAt,
      updated_at:       new Date().toISOString(),
    }, { onConflict: "user_id,provider" });

    return new NextResponse(closePage(true), { headers: { "Content-Type": "text/html" } });
  } catch (err) {
    console.error("[HubSpot callback]", err);
    return new NextResponse(closePage(false, "OAuth exchange failed"), {
      headers: { "Content-Type": "text/html" },
    });
  }
}

function closePage(success: boolean, error?: string) {
  const color = success ? "#00e5cc" : "#f87171";
  const icon  = success ? "✓" : "✗";
  const msg   = success
    ? "HubSpot connected. You can close this tab and return to Pulse."
    : `Connection failed${error ? `: ${error}` : ""}. Please try again.`;
  return `<!DOCTYPE html><html><head><meta charset="UTF-8"/><style>
    *{margin:0;padding:0;box-sizing:border-box}
    body{background:#0a0f1e;color:#fff;font-family:system-ui,sans-serif;display:flex;flex-direction:column;align-items:center;justify-content:center;height:100vh;gap:14px}
    .i{width:56px;height:56px;border-radius:50%;background:${color}20;border:2px solid ${color};display:flex;align-items:center;justify-content:center;font-size:24px;color:${color}}
    h1{font-size:18px;font-weight:700}p{font-size:13px;color:#64748b;text-align:center;max-width:320px}
  </style></head><body>
    <div class="i">${icon}</div><h1>Pulse</h1><p>${msg}</p>
    <script>setTimeout(()=>window.close(),2500)</script>
  </body></html>`;
}
