import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";

// GET /api/reports
// Supports both Clerk-authenticated web requests and Electron desktop requests.
// Electron sends x-pulse-user-id header with the internal Supabase user ID.
export async function GET(req: NextRequest) {
  const supabase = createServiceClient();

  const { searchParams } = new URL(req.url);
  const limit  = parseInt(searchParams.get("limit")  ?? "20");
  const offset = parseInt(searchParams.get("offset") ?? "0");

  // Electron path — user ID passed directly via header
  const electronUserId = req.headers.get("x-pulse-user-id");
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
