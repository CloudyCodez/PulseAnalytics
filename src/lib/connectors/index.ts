import { fetchGA4Data } from "./ga4";
import { fetchMetaData } from "./meta";
import { fetchShopifyData } from "./shopify";
import { fetchSlackData } from "./slack";
import { fetchHubSpotData } from "./hubspot";
import { fetchTikTokData } from "./tiktok";
import { fetchSearchConsoleData } from "./searchconsole";

export type ConnectorData = Record<string, number>;

/**
 * Runs all connected integrations for a user in parallel and merges the results.
 * hubspotToken — private app token from Electron config.json (optional; skipped if absent)
 */
export async function fetchAllConnectorData(userId: string, hubspotToken?: string): Promise<ConnectorData> {
  const [ga4, meta, shopify, slack, hubspot, tiktok, gsc] = await Promise.allSettled([
    fetchGA4Data(userId),
    fetchMetaData(userId),
    fetchShopifyData(userId),
    fetchSlackData(userId),
    hubspotToken ? fetchHubSpotData(hubspotToken) : Promise.resolve({}),
    fetchTikTokData(userId),
    fetchSearchConsoleData(userId),
  ]);

  const result: ConnectorData = {};

  for (const settled of [ga4, meta, shopify, slack, hubspot, tiktok, gsc]) {
    if (settled.status === "fulfilled") {
      Object.assign(result, settled.value);
    }
  }

  // ── Derived blended metrics ──────────────────────────────────────────────
  const totalAdSpend  = (result.meta_spend ?? 0) + (result.tiktok_spend ?? 0);
  const totalRevenue  = (result.shopify_revenue ?? 0) || (result.ga4_revenue ?? 0);

  if (totalAdSpend > 0) {
    result.blended_roas = totalRevenue / totalAdSpend;
    result.ad_spend     = totalAdSpend;
    result.revenue      = totalRevenue;
    result.cac          = totalAdSpend / ((result.shopify_orders ?? 0) || 1);
  }

  // ── CRM summary (HubSpot) for Pulse AI context ──────────────────────────
  if ((result.hs_open_pipeline ?? 0) > 0) {
    result.crm_pipeline   = result.hs_open_pipeline;
    result.crm_new_leads  = result.hs_new_contacts ?? 0;
    result.crm_closed_won = result.hs_closed_won_revenue ?? 0;
  }

  // ── Organic search summary ───────────────────────────────────────────────
  if ((result.gsc_clicks ?? 0) > 0) {
    result.organic_clicks      = result.gsc_clicks;
    result.organic_impressions = result.gsc_impressions;
    result.organic_ctr         = result.gsc_ctr;
  }

  return result;
}
