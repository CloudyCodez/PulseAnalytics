import { NextRequest, NextResponse } from "next/server";
import { exchangeSalesforceCode } from "@/lib/connectors/salesforce";
import { createServiceClient } from "@/lib/supabase/server";
import { encrypt } from "@/lib/encryption";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const code    = searchParams.get("code");
  const userId  = searchParams.get("state");

  if (!code || !userId) {
    return NextResponse.json({ error: "Missing code or state" }, { status: 400 });
  }

  try {
    const tokens = await exchangeSalesforceCode(code);
    const supabase = createServiceClient();

    await supabase.from("integrations").upsert({
      user_id:       userId,
      provider:      "salesforce",
      status:        "active",
      access_token:  encrypt(tokens.access_token),
      refresh_token: encrypt(tokens.refresh_token),
      instance_url:  tokens.instance_url,
      updated_at:    new Date().toISOString(),
    }, { onConflict: "user_id,provider" });

    return new NextResponse(
      `<html><body style="font-family:sans-serif;background:#080d1a;color:#fff;display:flex;align-items:center;justify-content:center;height:100vh;margin:0">
        <div style="text-align:center">
          <div style="font-size:48px;margin-bottom:16px">✅</div>
          <h2 style="margin:0 0 8px">Salesforce Connected</h2>
          <p style="color:#4a5568;margin:0">You can close this tab and return to Pulse.</p>
        </div>
      </body></html>`,
      { headers: { "Content-Type": "text/html" } }
    );
  } catch (err) {
    console.error("[Salesforce callback]", err);
    return NextResponse.json({ error: "OAuth exchange failed" }, { status: 500 });
  }
}
