import { NextRequest, NextResponse } from "next/server";
import { verifySlackWebhook } from "@/lib/connectors/slack";
import { createServiceClient } from "@/lib/supabase/server";
import { encrypt } from "@/lib/encryption";

export async function POST(req: NextRequest) {
  const { userId, webhookUrl } = await req.json();

  if (!userId || !webhookUrl) {
    return NextResponse.json({ error: "Missing userId or webhookUrl" }, { status: 400 });
  }

  // Verify the webhook actually works before saving
  const verification = await verifySlackWebhook(webhookUrl);
  if (!verification.success) {
    return NextResponse.json({ error: verification.error }, { status: 400 });
  }

  const supabase = createServiceClient();
  await supabase.from("integrations").upsert({
    user_id:      userId,
    provider:     "slack",
    status:       "active",
    access_token: encrypt(webhookUrl), // webhook URL stored encrypted
    updated_at:   new Date().toISOString(),
  }, { onConflict: "user_id,provider" });

  return NextResponse.json({ success: true });
}
