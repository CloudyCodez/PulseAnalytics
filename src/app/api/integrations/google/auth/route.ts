import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { getAuthUrl } from "@/lib/connectors/ga4";

export async function GET() {
  const { userId } = auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const url = getAuthUrl(userId);
  return NextResponse.redirect(url);
}
