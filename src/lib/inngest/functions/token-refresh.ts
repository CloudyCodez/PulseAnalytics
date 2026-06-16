import { inngest } from "../client";
import { createServiceClient } from "@/lib/supabase/server";
import { refreshGoogleToken } from "@/lib/connectors/ga4";

export const tokenRefresh = inngest.createFunction(
  { id: "token-refresh", name: "Pre-expiry Token Refresh" },
  { cron: "0 6 * * 0" }, // Every Sunday at 6AM UTC (before Monday reports)
  async ({ step }) => {
    const supabase = createServiceClient();

    // Find tokens expiring within 48 hours
    const cutoff = new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString();
    const { data: integrations } = await supabase
      .from("integrations")
      .select("*")
      .lt("token_expires_at", cutoff)
      .eq("status", "active");

    if (!integrations?.length) return { refreshed: 0 };

    let refreshed = 0;

    for (const integration of integrations) {
      await step.run(`refresh-${integration.id}`, async () => {
        try {
          if (integration.provider === "ga4" || integration.provider === "google_ads") {
            const tokens = await refreshGoogleToken(integration.refresh_token);
            await supabase
              .from("integrations")
              .update({
                access_token: tokens.access_token,
                token_expires_at: new Date(Date.now() + tokens.expiry_date).toISOString(),
              })
              .eq("id", integration.id);
            refreshed++;
          }
        } catch {
          await supabase
            .from("integrations")
            .update({ status: "error" })
            .eq("id", integration.id);
        }
      });
    }

    return { refreshed };
  }
);
