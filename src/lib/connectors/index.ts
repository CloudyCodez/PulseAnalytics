import { fetchGA4Data } from "./ga4";
import { fetchMetaData } from "./meta";
import { fetchShopifyData } from "./shopify";

export type ConnectorData = Record<string, number>;

/**
 * Runs all connected integrations for a user in parallel and merges the results.
 */
export async function fetchAllConnectorData(userId: string): Promise<ConnectorData> {
  const [ga4, meta, shopify] = await Promise.allSettled([
    fetchGA4Data(userId),
    fetchMetaData(userId),
    fetchShopifyData(userId),
  ]);

  const result: ConnectorData = {};

  for (const settled of [ga4, meta, shopify]) {
    if (settled.status === "fulfilled") {
      Object.assign(result, settled.value);
    }
  }

  // Derived metrics
  const totalSpend = (result.meta_spend ?? 0);
  const totalRevenue = (result.shopify_revenue ?? 0) || (result.ga4_revenue ?? 0);

  if (totalSpend > 0) {
    result.blended_roas = totalRevenue / totalSpend;
    result.ad_spend = totalSpend;
    result.revenue = totalRevenue;
    result.cac = totalSpend / ((result.shopify_orders ?? 0) || 1);
  }

  return result;
}
