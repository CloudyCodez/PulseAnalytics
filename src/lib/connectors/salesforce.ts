import { createServiceClient } from "@/lib/supabase/server";
import { decrypt } from "@/lib/encryption";

interface SalesforceTokenResponse {
  access_token: string;
  instance_url: string;
  refresh_token: string;
}

function getAuthUrl(userId: string): string {
  const clientId = process.env.SALESFORCE_CLIENT_ID!;
  const redirectUri = process.env.SALESFORCE_REDIRECT_URI!;
  const params = new URLSearchParams({
    response_type: "code",
    client_id: clientId,
    redirect_uri: redirectUri,
    state: userId,
    scope: "api refresh_token offline_access",
  });
  return `https://login.salesforce.com/services/oauth2/authorize?${params}`;
}

async function exchangeCode(code: string): Promise<SalesforceTokenResponse> {
  const res = await fetch("https://login.salesforce.com/services/oauth2/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      code,
      client_id: process.env.SALESFORCE_CLIENT_ID!,
      client_secret: process.env.SALESFORCE_CLIENT_SECRET!,
      redirect_uri: process.env.SALESFORCE_REDIRECT_URI!,
    }),
  });
  if (!res.ok) throw new Error(`Salesforce token exchange failed: ${res.status}`);
  return res.json();
}

async function refreshToken(encryptedRefreshToken: string, instanceUrl: string): Promise<string> {
  const res = await fetch(`${instanceUrl}/services/oauth2/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: decrypt(encryptedRefreshToken),
      client_id: process.env.SALESFORCE_CLIENT_ID!,
      client_secret: process.env.SALESFORCE_CLIENT_SECRET!,
    }),
  });
  if (!res.ok) throw new Error(`Salesforce token refresh failed: ${res.status}`);
  const data = await res.json();
  return data.access_token;
}

export async function fetchSalesforceData(userId: string): Promise<Record<string, number>> {
  const supabase = createServiceClient();
  const { data: integration } = await supabase
    .from("integrations")
    .select("*")
    .eq("user_id", userId)
    .eq("provider", "salesforce")
    .eq("status", "active")
    .single();

  if (!integration) return {};

  let accessToken: string;
  try {
    accessToken = await refreshToken(integration.refresh_token, integration.instance_url);
  } catch {
    return {};
  }

  const instanceUrl = integration.instance_url;
  const headers = {
    Authorization: `Bearer ${accessToken}`,
    "Content-Type": "application/json",
  };

  const endDate = new Date().toISOString();
  const startDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

  // Fetch closed-won opportunities this week
  const oppQuery = encodeURIComponent(
    `SELECT COUNT(Id) total, SUM(Amount) revenue FROM Opportunity WHERE StageName = 'Closed Won' AND CloseDate >= ${startDate.split("T")[0]} AND CloseDate <= ${endDate.split("T")[0]}`
  );
  const oppRes = await fetch(`${instanceUrl}/services/data/v59.0/query?q=${oppQuery}`, { headers });
  const oppData = await oppRes.json();
  const oppRecord = oppData.records?.[0] ?? {};

  // Fetch new leads this week
  const leadQuery = encodeURIComponent(
    `SELECT COUNT(Id) total FROM Lead WHERE CreatedDate >= ${startDate} AND CreatedDate <= ${endDate}`
  );
  const leadRes = await fetch(`${instanceUrl}/services/data/v59.0/query?q=${leadQuery}`, { headers });
  const leadData = await leadRes.json();

  // Fetch open pipeline
  const pipelineQuery = encodeURIComponent(
    `SELECT SUM(Amount) pipeline FROM Opportunity WHERE IsClosed = false AND Amount > 0`
  );
  const pipelineRes = await fetch(`${instanceUrl}/services/data/v59.0/query?q=${pipelineQuery}`, { headers });
  const pipelineData = await pipelineRes.json();

  // Fetch open tasks/activities this week
  const taskQuery = encodeURIComponent(
    `SELECT COUNT(Id) total FROM Task WHERE CreatedDate >= ${startDate} AND CreatedDate <= ${endDate} AND IsClosed = false`
  );
  const taskRes = await fetch(`${instanceUrl}/services/data/v59.0/query?q=${taskQuery}`, { headers });
  const taskData = await taskRes.json();

  return {
    sf_closed_won_count:  parseFloat(oppRecord.total ?? "0"),
    sf_closed_won_revenue: parseFloat(oppRecord.revenue ?? "0"),
    sf_new_leads:         parseFloat(leadData.records?.[0]?.total ?? "0"),
    sf_open_pipeline:     parseFloat(pipelineData.records?.[0]?.pipeline ?? "0"),
    sf_open_tasks:        parseFloat(taskData.records?.[0]?.total ?? "0"),
  };
}

export { getAuthUrl as getSalesforceAuthUrl, exchangeCode as exchangeSalesforceCode };
