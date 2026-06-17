"use client";

import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Suspense } from "react";

const planNames: Record<string, string> = {
  starter: "Starter",
  growth:  "Growth",
  agency:  "Agency",
};

function WelcomeContent() {
  const params = useSearchParams();
  const plan = params.get("plan") ?? "starter";
  const planName = planNames[plan] ?? "Starter";

  return (
    <div style={{
      minHeight: "100vh",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      background: "#0a0f1e",
      padding: "40px 24px",
    }}>
      <div style={{ maxWidth: 540, width: "100%", textAlign: "center" }}>

        {/* Logo */}
        <div style={{ marginBottom: 40 }}>
          <span style={{ fontSize: 24, fontWeight: 700, color: "#fff", letterSpacing: "-0.5px" }}>
            Pulse<span style={{ color: "#00e5cc" }}>.</span>
          </span>
        </div>

        {/* Success icon */}
        <div style={{
          width: 80, height: 80, borderRadius: "50%",
          background: "rgba(0,229,204,0.1)",
          border: "1px solid rgba(0,229,204,0.3)",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 36, margin: "0 auto 32px",
        }}>
          ✓
        </div>

        <h1 style={{ fontSize: 32, fontWeight: 700, letterSpacing: "-1px", color: "#fff", marginBottom: 16 }}>
          You&apos;re in.
        </h1>

        <p style={{ fontSize: 16, color: "#64748b", lineHeight: 1.7, marginBottom: 8 }}>
          Welcome to Pulse <strong style={{ color: "#fff" }}>{planName}</strong>.{" "}
          Your 14-day free trial has started.
        </p>

        <p style={{ fontSize: 15, color: "#64748b", lineHeight: 1.7, marginBottom: 40 }}>
          We&apos;ve sent a <strong style={{ color: "#00e5cc" }}>magic sign-in link</strong> to your email.
          Click it to access your account hub and download the Pulse desktop app.
        </p>

        {/* Steps */}
        <div style={{
          background: "#0d1526",
          border: "1px solid #1e293b",
          borderRadius: 16, padding: 28,
          marginBottom: 32, textAlign: "left",
        }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: "#00e5cc", textTransform: "uppercase", letterSpacing: "1px", marginBottom: 20 }}>
            What happens next
          </div>
          {[
            {
              n: "1",
              title: "Check your email",
              desc: "A sign-in link is on its way. Check your spam folder if you don't see it in 2 minutes.",
            },
            {
              n: "2",
              title: "Download Pulse",
              desc: "Sign in to your account hub and download the Pulse desktop app — one click, runs locally on your machine.",
            },
            {
              n: "3",
              title: "Run the setup wizard",
              desc: "Pulse guides you through connecting Google Ads, Meta, Shopify, and GA4. Skip anything and do it later.",
            },
            {
              n: "4",
              title: "Get your first AI report",
              desc: "Your first report is generated within 48 hours of connecting your first platform.",
            },
          ].map(({ n, title, desc }) => (
            <div key={n} style={{ display: "flex", gap: 16, marginBottom: 20 }}>
              <div style={{
                width: 32, height: 32, borderRadius: "50%",
                background: "rgba(0,229,204,0.1)",
                border: "1px solid rgba(0,229,204,0.2)",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 13, fontWeight: 700, color: "#00e5cc",
                flexShrink: 0,
              }}>{n}</div>
              <div>
                <div style={{ fontSize: 14, fontWeight: 600, color: "#fff", marginBottom: 4 }}>{title}</div>
                <div style={{ fontSize: 13, color: "#64748b", lineHeight: 1.6 }}>{desc}</div>
              </div>
            </div>
          ))}
        </div>

        <p style={{ fontSize: 14, color: "#64748b", marginBottom: 16 }}>
          Already have your link? Sign in directly:
        </p>
        <Link href="/sign-in" style={{
          display: "inline-block",
          background: "#00e5cc", color: "#0a0f1e",
          padding: "12px 28px", borderRadius: 10,
          fontSize: 14, fontWeight: 600, textDecoration: "none",
        }}>
          Go to sign in →
        </Link>

        <p style={{ fontSize: 12, color: "rgba(136,146,164,0.5)", marginTop: 32 }}>
          Questions? Email us at{" "}
          <a href="mailto:hello@pulseanalytics.space" style={{ color: "#00e5cc" }}>
            hello@pulseanalytics.space
          </a>
        </p>
      </div>
    </div>
  );
}

export default function WelcomePage() {
  return (
    <Suspense>
      <WelcomeContent />
    </Suspense>
  );
}
