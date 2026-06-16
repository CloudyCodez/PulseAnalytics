import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

export async function GET() {
  const { userId } = auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const params = new URLSearchParams({
    client_id: process.env.META_APP_ID!,
    redirect_uri: `${process.env.NEXT_PUBLIC_APP_URL}/api/integrations/meta/callback`,
    scope: "ads_read,ads_management,business_management",
    state: userId,
    response_type: "code",
  });

  return NextResponse.redirect(
    `https://www.facebook.com/v20.0/dialog/oauth?${params.toString()}`
  );
}
