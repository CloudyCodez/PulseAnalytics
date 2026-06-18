import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const { token } = await req.json();
  if (!token) return NextResponse.json({ success: false, error: "No token provided" }, { status: 400 });

  const res = await fetch("https://api.hubapi.com/account-info/v3/details", {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (res.status === 401 || res.status === 403) {
    return NextResponse.json(
      { success: false, error: "Invalid token — make sure it has CRM read scopes." },
      { status: 401 }
    );
  }
  if (!res.ok) {
    return NextResponse.json({ success: false, error: `HubSpot returned ${res.status}` }, { status: 502 });
  }

  const data = await res.json();
  return NextResponse.json({
    success: true,
    portalName: data.companyName ?? String(data.portalId ?? ""),
  });
}
