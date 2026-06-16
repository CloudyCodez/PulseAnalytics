import { NextRequest, NextResponse } from "next/server";
import { Webhook } from "svix";
import { createServiceClient } from "@/lib/supabase/server";

type ClerkUserCreatedEvent = {
  type: "user.created" | "user.updated" | "user.deleted";
  data: {
    id: string;
    email_addresses: Array<{ email_address: string; id: string }>;
    primary_email_address_id: string;
    first_name: string | null;
    last_name: string | null;
    image_url: string | null;
  };
};

export async function POST(req: NextRequest) {
  const webhookSecret = process.env.CLERK_WEBHOOK_SECRET;
  if (!webhookSecret) {
    return NextResponse.json({ error: "Webhook secret not configured" }, { status: 500 });
  }

  const body = await req.text();
  const svixId = req.headers.get("svix-id");
  const svixTimestamp = req.headers.get("svix-timestamp");
  const svixSignature = req.headers.get("svix-signature");

  if (!svixId || !svixTimestamp || !svixSignature) {
    return NextResponse.json({ error: "Missing svix headers" }, { status: 400 });
  }

  let event: ClerkUserCreatedEvent;
  try {
    const wh = new Webhook(webhookSecret);
    event = wh.verify(body, {
      "svix-id": svixId,
      "svix-timestamp": svixTimestamp,
      "svix-signature": svixSignature,
    }) as ClerkUserCreatedEvent;
  } catch {
    return NextResponse.json({ error: "Invalid webhook signature" }, { status: 400 });
  }

  const supabase = createServiceClient();

  if (event.type === "user.created") {
    const { id, email_addresses, primary_email_address_id, first_name, last_name } = event.data;
    const primaryEmail = email_addresses.find(
      (e) => e.id === primary_email_address_id
    )?.email_address;

    await supabase.from("users").insert({
      clerk_user_id: id,
      email: primaryEmail ?? "",
      full_name: [first_name, last_name].filter(Boolean).join(" ") || null,
      plan: "trial",
      trial_ends_at: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
      created_at: new Date().toISOString(),
    });
  }

  if (event.type === "user.updated") {
    const { id, email_addresses, primary_email_address_id, first_name, last_name } = event.data;
    const primaryEmail = email_addresses.find(
      (e) => e.id === primary_email_address_id
    )?.email_address;

    await supabase
      .from("users")
      .update({
        email: primaryEmail ?? "",
        full_name: [first_name, last_name].filter(Boolean).join(" ") || null,
      })
      .eq("clerk_user_id", id);
  }

  if (event.type === "user.deleted") {
    await supabase
      .from("users")
      .update({ plan: "cancelled" })
      .eq("clerk_user_id", event.data.id);
  }

  return NextResponse.json({ received: true });
}
