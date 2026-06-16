import type { Metadata } from "next";
import { ClerkProvider } from "@clerk/nextjs";
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

  return <ClerkProvider>{body}</ClerkProvider>;
}
