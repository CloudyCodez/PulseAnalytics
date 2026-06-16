import { inngest } from "../client";
import { createServiceClient } from "@/lib/supabase/server";
import { fetchAllConnectorData } from "@/lib/connectors";
import { generateCommentary } from "@/lib/ai/commentary";
import { sendReport } from "@/lib/email/sender";

export const weeklyReports = inngest.createFunction(
  { id: "weekly-reports", name: "Weekly Report Generation" },
  { cron: "0 8 * * 1" }, // Every Monday at 8AM UTC
  async ({ step }) => {
    const supabase = createServiceClient();

    // Get all active users
    const { data: users } = await supabase
      .from("users")
      .select("*")
      .in("plan", ["starter", "growth", "scale"]);

    if (!users?.length) return { generated: 0 };

    let generated = 0;

    for (const user of users) {
      await step.run(`generate-report-${user.id}`, async () => {
        try {
          // Fetch all connected platform data
          const data = await fetchAllConnectorData(user.id);

          // Generate AI commentary
          const commentary = await generateCommentary(data, user);

          // Render & send email
          await sendReport({ user, data, commentary });

          // Store report in DB
          const weekStart = new Date();
          weekStart.setDate(weekStart.getDate() - 7);

          await supabase.from("reports").insert({
            user_id: user.id,
            week_start: weekStart.toISOString().split("T")[0],
            week_end: new Date().toISOString().split("T")[0],
            status: "sent",
            data_snapshot: data,
            ai_commentary: commentary,
            sent_at: new Date().toISOString(),
          });

          generated++;
        } catch (err) {
          await supabase.from("reports").insert({
            user_id: user.id,
            week_start: new Date().toISOString().split("T")[0],
            week_end: new Date().toISOString().split("T")[0],
            status: "failed",
            error_message: String(err),
          });
        }
      });
    }

    return { generated };
  }
);
