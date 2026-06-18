import { google } from "googleapis";
import { createServiceClient } from "@/lib/supabase/server";
import { decrypt } from "@/lib/encryption";

// Reuses the Google OAuth tokens already stored from the Google/GA4 connection.
// No separate OAuth flow needed — Search Console is included in the Google scopes.
export async function fetchSearchConsoleData(userId: string): Promise<Record<string, number>> {
  const supabase = createServiceClient();

  // Reuse the ga4/google integration row — same tokens, same OAuth app
  const { data: integration } = await supabase
    .from("integrations")
    .select("*")
    .eq("user_id", userId)
    .eq("provider", "ga4")
    .eq("status", "active")
    .single();

  if (!integration) return {};

  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID!,
    process.env.GOOGLE_CLIENT_SECRET!,
    process.env.NEXT_PUBLIC_GOOGLE_REDIRECT_URI!
  );
  oauth2Client.setCredentials({
    access_token:  decrypt(integration.access_token),
    refresh_token: decrypt(integration.refresh_token),
  });

  const searchconsole = google.searchconsole({ version: "v1", auth: oauth2Client });

  const endDate   = new Date().toISOString().split("T")[0];
  const startDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];

  // Get the first verified site for this account
  let siteUrl: string;
  try {
    const sitesRes = await searchconsole.sites.list();
    const sites = sitesRes.data.siteEntry ?? [];
    const verified = sites.find(s => s.permissionLevel !== "siteUnverifiedUser");
    if (!verified?.siteUrl) return {};
    siteUrl = verified.siteUrl;
  } catch {
    return {};
  }

  try {
    const res = await searchconsole.searchanalytics.query({
      siteUrl,
      requestBody: {
        startDate,
        endDate,
        dimensions: [],
        rowLimit: 1,
      },
    });

    const row = res.data.rows?.[0];
    if (!row) return {};

    return {
      gsc_clicks:      row.clicks      ?? 0,
      gsc_impressions: row.impressions ?? 0,
      gsc_ctr:         (row.ctr        ?? 0) * 100, // as percentage
      gsc_position:    row.position    ?? 0,
    };
  } catch {
    return {};
  }
}
