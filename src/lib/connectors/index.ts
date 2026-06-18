import { fetchGA4Data } from "./ga4";
import { fetchMetaData } from "./meta";
import { fetchShopifyData } from "./shopify";
import { fetchSlackData } from "./slack";
import { fetchSalesforceData } from "./salesforce";

export type ConnectorData = Record<string, number>;

/**
 * Runs all connected integrations for a user in parallel and merges the results.
 */
export async function fetchAllConnectorData(userId: string): Promise<ConnectorData> {
  const [ga4, meta, shopify, slack, salesforce] = await Promise.allSettled([
    fetchGA4Data(userId),
    fetchMetaData(userId),
    fetchShopifyData(userId),
    fetchSlackData(userId),
    fetchSalesforceData(userId),
  ]);

  const result: ConnectorData = {};

  for (const settled of [ga4, meta, shopify, slack, salesforce]) {
    if (settled.status === "fulfilled") {
      Object.assign(result, settled.value);
    }
  }

  // Derived blended metrics
  const totalSpend   = result.meta_spend ?? 0;
  const totalRevenue = (result.shopify_revenue ?? 0) || (result.ga4_revenue ?? 0);

  if (totalSpend > 0) {
    result.blended_roas = totalRevenue / totalSpend;
    result.ad_spend     = totalSpend;
    result.revenue      = totalRevenue;
    result.cac          = totalSpend / ((result.shopify_orders ?? 0) || 1);
  }

  // Salesforce pipeline summary for Pulse AI context
  if (result.sf_open_pipeline > 0) {
    result.crm_pipeline = result.sf_open_pipeline;
    result.crm_new_leads = result.sf_new_leads ?? 0;
  }

  return result;
}
