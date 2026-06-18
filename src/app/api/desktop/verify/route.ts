import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";

export async function POST(req: Request) {
  try {
    const { email } = await req.json();

    if (!email || typeof email !== "string" || !email.includes("@")) {
      return NextResponse.json({ valid: false, reason: "invalid_email" }, { status: 400 });
    }

    const supabase = createServiceClient();

    const { data: user, error } = await supabase
      .from("users")
      .select("id, clerk_user_id, email, plan")
      .eq("email", email.toLowerCase().trim())
      .single();

    if (error || !user) {
      return NextResponse.json({ valid: false, reason: "not_found" });
    }

    // "cancelled" means lapsed subscription — everything else is valid
    if (!user.plan || user.plan === "cancelled") {
      return NextResponse.json({ valid: false, reason: "not_active" });
    }

    return NextResponse.json({
      valid:   true,
      email:   user.email,
      plan:    user.plan,
      userId:  user.id,            // Supabase internal UUID — saved to config.json
      clerkId: user.clerk_user_id,
    });

  } catch (err) {
    console.error("[desktop/verify]", err);
    return NextResponse.json({ valid: false, reason: "server_error" }, { status: 500 });
  }
}
