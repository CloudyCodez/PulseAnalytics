import { createServiceClient } from "@/lib/supabase/server";
import { decrypt } from "@/lib/encryption";

export function getTikTokAuthUrl(userId: string): string {
  const params = new URLSearchParams({
    app_id: process.env.TIKTOK_APP_ID!,
    redirect_uri: process.env.TIKTOK_REDIRECT_URI!,
    state: userId,
    scope: "ad_account:readonly",
    response_type: "code",
  });
  return `https://business-api.tiktok.com/portal/auth?${params}`;
}

export async function exchangeTikTokCode(code: string): Promise<{
  access_token: string;
  advertiser_ids: string[];
}> {
  const res = await fetch("https://business-api.tiktok.com/open_api/v1.3/oauth2/access_token/", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      app_id: process.env.TIKTOK_APP_ID!,
      secret: process.env.TIKTOK_APP_SECRET!,
      auth_code: code,
      grant_type: "authorization_code",
    }),
  });
  if (!res.ok) throw new Error(`TikTok token exchange failed: ${res.status}`);
  const data = await res.json();
  if (data.code !== 0) throw new Error(`TikTok error: ${data.message}`);
  return {
    access_token: data.data.access_token,
    advertiser_ids: data.data.advertiser_ids ?? [],
  };
}

export async function fetchTikTokData(userId: string): Promise<Record<string, number>> {
  const supabase = createServiceClient();
  const { data: integration } = await supabase
    .from("integrations")
    .select("*")
    .eq("user_id", userId)
    .eq("provider", "tiktok")
    .eq("status", "active")
    .single();

  if (!integration) return {};

  const accessToken  = decrypt(integration.access_token);
  const advertiserId = integration.account_id;
  if (!advertiserId) return {};

  const endDate   = new Date().toISOString().split("T")[0];
  const startDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];

  const res = await fetch(
    "https://business-api.tiktok.com/open_api/v1.3/report/integrated/get/",
    {
      method: "POST",
      headers: {
        "Access-Token": accessToken,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        advertiser_id: advertiserId,
        report_type: "BASIC",
        dimensions: ["stat_time_day"],
        metrics: ["spend", "impressions", "clicks", "conversion", "real_time_conversion_rate",
                  "cost_per_conversion", "cpm", "cpc", "video_play_actions"],
        start_date: startDate,
        end_date: endDate,
        page_size: 7,
      }),
    }
  );

  const json = await res.json();
  if (json.code !== 0 || !json.data?.list?.length) return {};

  // Aggregate across days
  const totals = json.data.list.reduce(
    (acc: Record<string, number>, row: { metrics: Record<string, string> }) => {
      acc.spend       = (acc.spend       ?? 0) + parseFloat(row.metrics.spend        ?? "0");
      acc.impressions = (acc.impressions ?? 0) + parseFloat(row.metrics.impressions   ?? "0");
      acc.clicks      = (acc.clicks      ?? 0) + parseFloat(row.metrics.clicks        ?? "0");
      acc.conversions = (acc.conversions ?? 0) + parseFloat(row.metrics.conversion    ?? "0");
      return acc;
    },
    {} as Record<string, number>
  );

  return {
    tiktok_spend:       totals.spend       ?? 0,
    tiktok_impressions: totals.impressions ?? 0,
    tiktok_clicks:      totals.clicks      ?? 0,
    tiktok_conversions: totals.conversions ?? 0,
    tiktok_cpm:         totals.spend > 0 ? (totals.spend / totals.impressions) * 1000 : 0,
    tiktok_cpc:         totals.clicks > 0 ? totals.spend / totals.clicks : 0,
    tiktok_cpa:         totals.conversions > 0 ? totals.spend / totals.conversions : 0,
  };
}
