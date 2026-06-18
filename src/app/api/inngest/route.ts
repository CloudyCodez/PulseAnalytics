import { serve } from "inngest/next";
import { inngest } from "@/lib/inngest/client";
import { weeklyReports } from "@/lib/inngest/functions/weekly-reports";
import { anomalyDetect } from "@/lib/inngest/functions/anomaly-detect";
import { tokenRefresh } from "@/lib/inngest/functions/token-refresh";

export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [weeklyReports, anomalyDetect, tokenRefresh],
});
