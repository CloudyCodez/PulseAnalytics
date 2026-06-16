import { createServiceClient } from "@/lib/supabase/server";
import { decrypt } from "@/lib/encryption";

export async function fetchMetaData(userId: string): Promise<Record<string, number>> {
  const supabase = createServiceClient();
  const { data: integration } = await supabase
    .from("integrations")
    .select("*")
    .eq("user_id", userId)
    .eq("provider", "meta")
    .eq("status", "active")
    .single();

  if (!integration) return {};

  const accessToken = decrypt(integration.access_token);
  const adAccountId = integration.account_id;

  const endDate = new Date().toISOString().split("T")[0];
  const startDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
    .toISOString()
    .split("T")[0];

  const url = `https://graph.facebook.com/v20.0/${adAccountId}/insights?fields=spend,revenue,impressions,clicks,actions,action_values,cpc,cpm,roas&time_range={"since":"${startDate}","until":"${endDate}"}&access_token=${accessToken}`;

  const res = await fetch(url);
  const json = await res.json();

  if (!json.data?.[0]) return {};

  const d = json.data[0];
  const purchaseValue =
    d.action_values?.find((a: { action_type: string }) => a.action_type === "purchase")?.value ?? 0;
  const purchases =
    d.actions?.find((a: { action_type: string }) => a.action_type === "purchase")?.value ?? 0;

  return {
    meta_spend: parseFloat(d.spend ?? "0"),
    meta_impressions: parseFloat(d.impressions ?? "0"),
    meta_clicks: parseFloat(d.clicks ?? "0"),
    meta_purchase_value: parseFloat(purchaseValue),
    meta_purchases: parseFloat(purchases),
    meta_roas:
      parseFloat(d.spend) > 0 ? parseFloat(purchaseValue) / parseFloat(d.spend) : 0,
    meta_cpc: parseFloat(d.cpc ?? "0"),
    meta_cpm: parseFloat(d.cpm ?? "0"),
  };
}
