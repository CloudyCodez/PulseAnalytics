import { inngest } from "../client";
import { createServiceClient } from "@/lib/supabase/server";

export const anomalyDetect = inngest.createFunction(
  { id: "anomaly-detect", name: "Mid-week Anomaly Detection" },
  { cron: "0 14 * * 2,4" }, // Tuesdays and Thursdays at 2PM UTC
  async ({ step }) => {
    const supabase = createServiceClient();

    const { data: users } = await supabase
      .from("users")
      .select("*")
      .in("plan", ["growth", "scale"]); // Anomaly alerts = Growth+ only

    if (!users?.length) return { checked: 0, anomalies: 0 };

    let anomaliesFound = 0;

    for (const user of users) {
      await step.run(`check-anomalies-${user.id}`, async () => {
        // Get last two reports to compare
        const { data: reports } = await supabase
          .from("reports")
          .select("data_snapshot")
          .eq("user_id", user.id)
          .eq("status", "sent")
          .order("created_at", { ascending: false })
          .limit(2);

        if (!reports || reports.length < 2) return;

        const current = reports[0].data_snapshot as Record<string, number>;
        const previous = reports[1].data_snapshot as Record<string, number>;

        const thresholds: Record<string, number> = {
          roas: -0.25,
          revenue: -0.2,
          ad_spend: 0.3,
          cac: 0.4,
        };

        for (const [metric, threshold] of Object.entries(thresholds)) {
          if (!current[metric] || !previous[metric]) continue;
          const changePct = (current[metric] - previous[metric]) / previous[metric];
          const isAnomaly =
            threshold < 0 ? changePct < threshold : changePct > threshold;

          if (isAnomaly) {
            await supabase.from("anomalies").insert({
              user_id: user.id,
              metric,
              change_pct: changePct * 100,
              direction: changePct > 0 ? "up" : "down",
              message: `${metric.toUpperCase()} ${changePct > 0 ? "increased" : "dropped"} ${Math.abs(changePct * 100).toFixed(1)}% vs last week`,
            });
            anomaliesFound++;
          }
        }
      });
    }

    return { checked: users.length, anomalies: anomaliesFound };
  }
);
