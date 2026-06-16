import { google } from "googleapis";
import { createServiceClient } from "@/lib/supabase/server";
import { decrypt } from "@/lib/encryption";

function getOAuthClient() {
  return new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID!,
    process.env.GOOGLE_CLIENT_SECRET!,
    process.env.NEXT_PUBLIC_GOOGLE_REDIRECT_URI!
  );
}

export function getAuthUrl(userId: string) {
  const oauth2Client = getOAuthClient();
  return oauth2Client.generateAuthUrl({
    access_type: "offline",
    prompt: "consent",
    scope: [
      "https://www.googleapis.com/auth/analytics.readonly",
      "https://www.googleapis.com/auth/adwords",
    ],
    state: userId,
  });
}

export async function exchangeCode(code: string) {
  const oauth2Client = getOAuthClient();
  const { tokens } = await oauth2Client.getToken(code);
  return tokens;
}

export async function refreshGoogleToken(encryptedRefreshToken: string) {
  const oauth2Client = getOAuthClient();
  oauth2Client.setCredentials({
    refresh_token: decrypt(encryptedRefreshToken),
  });
  const { credentials } = await oauth2Client.refreshAccessToken();
  return credentials;
}

export async function fetchGA4Data(userId: string): Promise<Record<string, number>> {
  const supabase = createServiceClient();
  const { data: integration } = await supabase
    .from("integrations")
    .select("*")
    .eq("user_id", userId)
    .eq("provider", "ga4")
    .eq("status", "active")
    .single();

  if (!integration) return {};

  const oauth2Client = getOAuthClient();
  oauth2Client.setCredentials({
    access_token: decrypt(integration.access_token),
    refresh_token: decrypt(integration.refresh_token),
  });

  const analyticsData = google.analyticsdata({ version: "v1beta", auth: oauth2Client });

  const endDate = new Date();
  const startDate = new Date(endDate.getTime() - 7 * 24 * 60 * 60 * 1000);

  const response = await analyticsData.properties.runReport({
    property: `properties/${integration.property_id}`,
    requestBody: {
      dateRanges: [
        {
          startDate: startDate.toISOString().split("T")[0],
          endDate: endDate.toISOString().split("T")[0],
        },
      ],
      metrics: [
        { name: "sessions" },
        { name: "activeUsers" },
        { name: "screenPageViews" },
        { name: "conversions" },
        { name: "totalRevenue" },
      ],
    },
  });

  const row = response.data.rows?.[0]?.metricValues ?? [];
  return {
    ga4_sessions: parseFloat(row[0]?.value ?? "0"),
    ga4_users: parseFloat(row[1]?.value ?? "0"),
    ga4_pageviews: parseFloat(row[2]?.value ?? "0"),
    ga4_conversions: parseFloat(row[3]?.value ?? "0"),
    ga4_revenue: parseFloat(row[4]?.value ?? "0"),
  };
}
