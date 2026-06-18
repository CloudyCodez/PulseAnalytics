// HubSpot connector — uses a Private App access token stored in Electron config.
// No OAuth exchange needed; the token is pasted directly by the user and
// verified once on connection, then stored in config.json on disk.

export async function fetchHubSpotData(token: string): Promise<Record<string, number>> {
  if (!token) return {};

  const headers = {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  };

  const now = Date.now();
  const weekAgo = now - 7 * 24 * 60 * 60 * 1000;

  try {
    // Fetch deals closed this week
    const dealsRes = await fetch(
      "https://api.hubapi.com/crm/v3/objects/deals/search",
      {
        method: "POST",
        headers,
        body: JSON.stringify({
          filterGroups: [{
            filters: [
              { propertyName: "closedate", operator: "GTE", value: String(weekAgo) },
              { propertyName: "dealstage", operator: "EQ", value: "closedwon" },
            ],
          }],
          properties: ["dealname", "amount", "closedate", "dealstage"],
          limit: 100,
        }),
      }
    );
    const dealsData = dealsRes.ok ? await dealsRes.json() : { results: [] };
    const deals = dealsData.results ?? [];
    const closedRevenue = deals.reduce(
      (sum: number, d: { properties: { amount?: string } }) =>
        sum + parseFloat(d.properties.amount ?? "0"),
      0
    );

    // Fetch new contacts this week
    const contactsRes = await fetch(
      "https://api.hubapi.com/crm/v3/objects/contacts/search",
      {
        method: "POST",
        headers,
        body: JSON.stringify({
          filterGroups: [{
            filters: [{ propertyName: "createdate", operator: "GTE", value: String(weekAgo) }],
          }],
          properties: ["createdate"],
          limit: 100,
        }),
      }
    );
    const contactsData = contactsRes.ok ? await contactsRes.json() : { total: 0 };

    // Fetch open pipeline
    const pipelineRes = await fetch(
      "https://api.hubapi.com/crm/v3/objects/deals/search",
      {
        method: "POST",
        headers,
        body: JSON.stringify({
          filterGroups: [{
            filters: [
              { propertyName: "dealstage", operator: "NEQ", value: "closedwon" },
              { propertyName: "dealstage", operator: "NEQ", value: "closedlost" },
            ],
          }],
          properties: ["amount", "dealstage"],
          limit: 200,
        }),
      }
    );
    const pipelineData = pipelineRes.ok ? await pipelineRes.json() : { results: [] };
    const openPipeline = (pipelineData.results ?? []).reduce(
      (sum: number, d: { properties: { amount?: string } }) =>
        sum + parseFloat(d.properties.amount ?? "0"),
      0
    );

    return {
      hs_closed_won_count:   deals.length,
      hs_closed_won_revenue: closedRevenue,
      hs_new_contacts:       contactsData.total ?? 0,
      hs_open_pipeline:      openPipeline,
    };
  } catch (err) {
    console.error("[HubSpot] fetchHubSpotData error:", err);
    return {};
  }
}
