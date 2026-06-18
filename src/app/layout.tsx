import type { Metadata } from "next";
import { ClerkProvider } from "@clerk/nextjs";
import { headers } from "next/headers";
import "./globals.css";

export const metadata: Metadata = {
  title: "Pulse — Automated Business Intelligence",
  description:
    "Connect your platforms once. Get AI-written performance reports every Monday. No dashboards. No manual work. Ever.",
  openGraph: {
    title: "Pulse — Automated Business Intelligence",
    description:
      "Connect your platforms once. Get AI-written performance reports every Monday.",
    type: "website",
  },
};

const MOCK_MODE = process.env.NEXT_PUBLIC_MOCK_MODE === "true";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const body = (
    <html lang="en" suppressHydrationWarning>
      <body className="bg-navy text-pulse-white font-body antialiased">
        {children}
      </body>
    </html>
  );

  // In mock mode, skip ClerkProvider entirely — it crashes without real keys
  if (MOCK_MODE) return body;

  // /app is the Electron-only dashboard (see src/app/app/layout.tsx — "use
  // client", zero Clerk usage anywhere in its tree) and middleware.ts never
  // calls auth().protect() for it; isElectronOnlyRoute's x-pulse-client
  // header check is the real access boundary, not Clerk. Wrapping /app in
  // ClerkProvider anyway forces Clerk's SSR auth resolution to run on every
  // render with no real Clerk session ever present in Electron's
  // BrowserWindow — that's what was hanging the standalone server and
  // causing Electron to retry the load in a tight loop (the "isPublicRoute"
  // fix in middleware.ts alone wasn't enough; it stops auth().protect()
  // from running, but ClerkProvider itself still mounts and still does its
  // SSR resolution regardless of that check).
  //
  // Electron sends x-pulse-client on every request, and middleware.ts blocks
  // any non-Electron request from reaching /app. Use the original request
  // header here so middleware does not need to rewrite request headers, which
  // can loop under Next's generated standalone server.
  const isElectron = headers().get("x-pulse-client") === "electron";
  if (isElectron) return body;

  return <ClerkProvider>{body}</ClerkProvider>;
}
