import { createServiceClient } from "@/lib/supabase/server";
import { decrypt } from "@/lib/encryption";

export async function fetchShopifyData(userId: string): Promise<Record<string, number>> {
  const supabase = createServiceClient();
  const { data: integration } = await supabase
    .from("integrations")
    .select("*")
    .eq("user_id", userId)
    .eq("provider", "shopify")
    .eq("status", "active")
    .single();

  if (!integration) return {};

  const accessToken = decrypt(integration.access_token);
  const storeUrl = integration.store_url;

  const endDate = new Date().toISOString();
  const startDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

  // Fetch orders
  const ordersUrl = `https://${storeUrl}/admin/api/2024-04/orders.json?created_at_min=${startDate}&created_at_max=${endDate}&status=any&limit=250`;
  const res = await fetch(ordersUrl, {
    headers: {
      "X-Shopify-Access-Token": accessToken,
      "Content-Type": "application/json",
    },
  });

  const { orders } = await res.json();
  if (!orders) return {};

  const totalRevenue = orders.reduce(
    (sum: number, o: { total_price: string }) => sum + parseFloat(o.total_price ?? "0"),
    0
  );
  const totalOrders = orders.length;
  const avgOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;

  // Count unique customers
  const uniqueCustomers = new Set(orders.map((o: { customer?: { id: number } }) => o.customer?.id)).size;

  return {
    shopify_revenue: totalRevenue,
    shopify_orders: totalOrders,
    shopify_aov: avgOrderValue,
    shopify_customers: uniqueCustomers,
  };
}
