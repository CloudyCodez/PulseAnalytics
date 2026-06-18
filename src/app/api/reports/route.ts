import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";

// GET /api/reports
// Supports both Clerk-authenticated web requests and Electron desktop requests.
// Electron sends x-pulse-user-id header with the internal Supabase user ID.
//
// Like /api/app/dashboard, this proxies to pulseanalytics.space when running
// without SUPABASE_SERVICE_ROLE_KEY (always true in the packaged Electron
// build, by design — see build-pulse.bat). The web path below only runs when
// the service-role key IS present, i.e. when this code is actually executing
// on Vercel.
const REMOTE_APP_URL = "https://pulseanalytics.space";

async function proxyToVercel(req: NextRequest): Promise<NextResponse> {
  const userId = req.headers.get("x-pulse-user-id") ?? "";
  const { search } = new URL(req.url);

  try {
    const res = await fetch(`${REMOTE_APP_URL}/api/reports${search}`, {
      method: "GET",
      headers: { "x-pulse-user-id": userId },
      cache: "no-store",
    });
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch (err) {
    console.error("[reports] proxy to Vercel failed:", err);
    return NextResponse.json({ error: "Could not reach Pulse servers — check your connection." }, { status: 503 });
  }
}

export async function GET(req: NextRequest) {
  const electronUserId = req.headers.get("x-pulse-user-id");

  // No service-role key locally (by design) — proxy to the hosted app.
  if (electronUserId && !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return proxyToVercel(req);
  }

  const supabase = createServiceClient();

  const { searchParams } = new URL(req.url);
  const limit  = parseInt(searchParams.get("limit")  ?? "20");
  const offset = parseInt(searchParams.get("offset") ?? "0");

  // Electron path — user ID passed directly via header
  if (electronUserId) {
    const { data: reports, error } = await supabase
      .from("reports")
      .select("id, week_start, week_end, status, ai_commentary, data_snapshot, sent_at, created_at")
      .eq("user_id", electronUserId)
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ reports: reports ?? [] });
  }

  // Web path — no Clerk in Electron so only run this on web
  try {
    const { auth } = await import("@clerk/nextjs/server");
    const { userId: clerkUserId } = auth();
    if (!clerkUserId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { data: user } = await supabase
      .from("users")
      .select("id")
      .eq("clerk_user_id", clerkUserId)
      .single();

    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

    const { data: reports, error } = await supabase
      .from("reports")
      .select("id, week_start, week_end, status, ai_commentary, data_snapshot, sent_at, created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ reports: reports ?? [] });
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}
