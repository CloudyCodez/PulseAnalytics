import { NextRequest, NextResponse } from "next/server";
import { fetchAllConnectorData } from "@/lib/connectors";
import { createServiceClient } from "@/lib/supabase/server";

// GET /api/app/dashboard
// Called by the Electron app's overview page to get live metric data.
// userId comes from the x-pulse-user-id header set by the client after
// reading it from config.json (set during setup wizard).
//
// IMPORTANT: this route requires SUPABASE_SERVICE_ROLE_KEY, which is
// intentionally never shipped inside the local Electron build (see
// build-pulse.bat). When that key is absent — i.e. always, in the packaged
// app — this route proxies the request to the Vercel-hosted version of
// itself instead of running the Supabase/connector calls locally. This keeps
// the service-role key, OAuth tokens, and connector logic server-side only,
// while the local route signature stays identical so the frontend pages
// (overview, alerts) don't need to change at all.
const REMOTE_APP_URL = "https://pulseanalytics.space";

async function proxyToVercel(req: NextRequest): Promise<NextResponse> {
  const userId = req.headers.get("x-pulse-user-id") ?? "";
  const config = req.headers.get("x-pulse-config") ?? "";

  try {
    const res = await fetch(`${REMOTE_APP_URL}/api/app/dashboard`, {
      method: "GET",
      headers: {
        "x-pulse-user-id": userId,
        ...(config ? { "x-pulse-config": config } : {}),
      },
      // Desktop app proxying to its own cloud backend — not a browser request,
      // so no credentials/cookies are sent or needed here.
      cache: "no-store",
    });
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch (err) {
    console.error("[dashboard] proxy to Vercel failed:", err);
    return NextResponse.json({ error: "Could not reach Pulse servers — check your connection." }, { status: 503 });
  }
}

export async function GET(req: NextRequest) {
  const userId = req.headers.get("x-pulse-user-id");
  if (!userId) {
    return NextResponse.json({ error: "No user ID" }, { status: 400 });
  }

  // No service-role key locally (by design) — proxy to the hosted app, which
  // has it. This is always true in the packaged Electron build.
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return proxyToVercel(req);
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
