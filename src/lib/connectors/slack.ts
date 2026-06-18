import { createServiceClient } from "@/lib/supabase/server";
import { decrypt } from "@/lib/encryption";

export interface SlackAlert {
  channel?: string;
  message: string;
}

export async function sendSlackAlert(userId: string, alert: SlackAlert): Promise<boolean> {
  const supabase = createServiceClient();
  const { data: integration } = await supabase
    .from("integrations")
    .select("*")
    .eq("user_id", userId)
    .eq("provider", "slack")
    .eq("status", "active")
    .single();

  if (!integration) return false;

  const webhookUrl = decrypt(integration.access_token);

  const res = await fetch(webhookUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      text: alert.message,
      username: "Pulse Analytics",
      icon_emoji: ":chart_with_upwards_trend:",
    }),
  });

  return res.ok;
}

export async function fetchSlackData(userId: string): Promise<Record<string, number>> {
  const supabase = createServiceClient();
  const { data: integration } = await supabase
    .from("integrations")
    .select("*")
    .eq("user_id", userId)
    .eq("provider", "slack")
    .eq("status", "active")
    .single();

  if (!integration) return {};

  // Slack is outbound-only (alerts) — no metrics to pull
  return { slack_connected: 1 };
}

export async function verifySlackWebhook(
  webhookUrl: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const res = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        text: "✅ Pulse Analytics connected! You'll receive performance alerts and anomaly notifications here.",
        username: "Pulse Analytics",
        icon_emoji: ":chart_with_upwards_trend:",
      }),
    });
    if (!res.ok) return { success: false, error: "Webhook rejected the request" };
    return { success: true };
  } catch {
    return { success: false, error: "Could not reach the webhook URL" };
  }
}
