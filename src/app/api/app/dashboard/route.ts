import { NextRequest, NextResponse } from "next/server";
import { fetchAllConnectorData } from "@/lib/connectors";
import { createServiceClient } from "@/lib/supabase/server";

// GET /api/app/dashboard
// Called by the Electron app's overview page to get live metric data.
// userId comes from the x-pulse-user-id header set by the client after
// reading it from config.json (set during setup wizard).
export async function GET(req: NextRequest) {
  const userId = req.headers.get("x-pulse-user-id");
  if (!userId) {
    return NextResponse.json({ error: "No user ID" }, { status: 400 });
  }

  const config = req.headers.get("x-pulse-config");
  let parsedConfig: Record<string, unknown> = {};
  try {
    if (config) parsedConfig = JSON.parse(decodeURIComponent(config));
  } catch {}

  const hubspotToken =
    (parsedConfig.hubspot as Record<string, string> | undefined)?.token ?? undefined;

  try {
    const [data, anomalies] = await Promise.all([
      fetchAllConnectorData(userId, hubspotToken),
      createServiceClient()
        .from("anomalies")
        .select("*")
        .eq("user_id", userId)
        .order("detected_at", { ascending: false })
        .limit(20)
        .then(r => r.data ?? []),
    ]);

    return NextResponse.json({ data, anomalies });
  } catch (err) {
    console.error("[dashboard] fetch error:", err);
    return NextResponse.json({ error: "Failed to fetch data" }, { status: 500 });
  }
}
