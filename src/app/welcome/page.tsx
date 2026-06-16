"use client";

import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Suspense } from "react";

const planNames: Record<string, string> = {
  starter: "Starter",
  growth: "Growth",
  scale: "Scale",
};

function WelcomeContent() {
  const params = useSearchParams();
  const plan = params.get("plan") ?? "starter";
  const planName = planNames[plan] ?? "Starter";

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "var(--navy)",
        padding: "40px 24px",
      }}
    >
      <div style={{ maxWidth: 540, width: "100%", textAlign: "center" }}>
        {/* Logo */}
        <div style={{ marginBottom: 40 }}>
          <span
            style={{
              fontFamily: "'Space Grotesk', sans-serif",
              fontSize: 24,
              fontWeight: 700,
              color: "var(--white)",
            }}
          >
            Pulse<span style={{ color: "var(--cyan)" }}>.</span>
          </span>
        </div>

        {/* Success icon */}
        <div
          style={{
            width: 80,
            height: 80,
            borderRadius: "50%",
            background: "rgba(0,229,204,0.1)",
            border: "1px solid rgba(0,229,204,0.3)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 36,
            margin: "0 auto 32px",
          }}
        >
          ✓
        </div>

        <h1
          style={{
            fontFamily: "'Space Grotesk', sans-serif",
            fontSize: 32,
            fontWeight: 700,
            letterSpacing: "-1px",
            color: "var(--white)",
            marginBottom: 16,
          }}
        >
          You&apos;re in.
        </h1>

        <p style={{ fontSize: 17, color: "var(--muted)", lineHeight: 1.7, marginBottom: 8 }}>
          Welcome to Pulse <strong style={{ color: "var(--white)" }}>{planName}</strong>.
          Your 14-day free trial has started.
        </p>

        <p style={{ fontSize: 16, color: "var(--muted)", lineHeight: 1.7, marginBottom: 40 }}>
          We&apos;ve sent a{" "}
          <strong style={{ color: "var(--cyan)" }}>magic sign-in link</strong>{" "}
          to your email. Click it to access your dashboard and connect your first
          integration — the whole setup takes about 5 minutes.
        </p>

        {/* Steps */}
        <div
          style={{
            background: "var(--navy-2)",
            border: "1px solid var(--border)",
            borderRadius: 16,
            padding: 28,
            marginBottom: 32,
            textAlign: "left",
          }}
        >
          <div
            style={{
              fontSize: 12,
              fontWeight: 600,
              color: "var(--cyan)",
              textTransform: "uppercase",
              letterSpacing: "1px",
              marginBottom: 20,
            }}
          >
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
              title: "Connect your platforms",
              desc: "Link Google Ads, Meta, Shopify, and GA4 in your dashboard. Takes about 5 minutes.",
            },
            {
              n: "3",
              title: "Receive your first report",
              desc: "Your first AI-written report will be ready within 48 hours of connecting.",
            },
          ].map(({ n, title, desc }) => (
            <div
              key={n}
              style={{
                display: "flex",
                gap: 16,
                marginBottom: 20,
              }}
            >
              <div
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: "50%",
                  background: "rgba(0,229,204,0.1)",
                  border: "1px solid rgba(0,229,204,0.2)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontFamily: "'Space Grotesk', sans-serif",
                  fontSize: 13,
                  fontWeight: 700,
                  color: "var(--cyan)",
                  flexShrink: 0,
                }}
              >
                {n}
              </div>
              <div>
                <div
                  style={{
                    fontFamily: "'Space Grotesk', sans-serif",
                    fontSize: 14,
                    fontWeight: 600,
                    color: "var(--white)",
                    marginBottom: 4,
                  }}
                >
                  {title}
                </div>
                <div style={{ fontSize: 13, color: "var(--muted)", lineHeight: 1.6 }}>
                  {desc}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Fallback CTA */}
        <p style={{ fontSize: 14, color: "var(--muted)", marginBottom: 16 }}>
          Already have your link? Sign in directly:
        </p>
        <Link
          href="/sign-in"
          style={{
            display: "inline-block",
            background: "var(--cyan)",
            color: "var(--navy)",
            padding: "12px 28px",
            borderRadius: 10,
            fontFamily: "'Space Grotesk', sans-serif",
            fontSize: 14,
            fontWeight: 600,
            textDecoration: "none",
          }}
        >
          Go to sign in →
        </Link>

        <p style={{ fontSize: 12, color: "rgba(136,146,164,0.6)", marginTop: 32 }}>
          Questions? Email us at{" "}
          <a href="mailto:hello@pulse.app" style={{ color: "var(--cyan)" }}>
            hello@pulse.app
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
