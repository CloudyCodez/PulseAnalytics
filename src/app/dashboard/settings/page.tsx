import { redirect } from "next/navigation";

// Everything that used to live here is now on /dashboard directly.
// Keep this route alive so old links don't 404.
export default function SettingsPage() {
  redirect("/dashboard");
}
