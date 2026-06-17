"use client";

import { useUser, useClerk } from "@clerk/nextjs";
import { useState } from "react";
import Link from "next/link";

const DOWNLOAD_URL =
  "https://github.com/CloudyCodez/PulseAnalytics/releases/download/v1.0.0/Pulse.Setup.0.1.0.exe";

const PLAN_META: Record<string, { label: string; color: string; clients: string; price: string }> = {
  starter: { label: "Starter", color: "#00e5cc", clients: "1 client workspace",    price: "$49/mo" },
  growth:  { label: "Growth",  color: "#6366f1", clients: "5 client workspaces",   price: "$97/mo" },
  agency:  { label: "Agency",  color: "#f59e0b", clients: "Unlimited workspaces",  price: "$197/mo" },
};

export default function DashboardPage() {
  const { user, isLoaded } = useUser();
  const { openUserProfile } = useClerk();
  const [portalLoading, setPortalLoading] = useState(false);
  const [portalError, setPortalError]   = useState("");

  if (!isLoaded) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh" }}>
        <div style={{ color: "#64748b", fontSize: 14 }}>Loading…</div>
      </div>
    );
  }

  const plan     = (user?.publicMetadata?.plan as string) ?? "starter";
  const planMeta = PLAN_META[plan] ?? PLAN_META.starter;
  const email    = user?.emailAddresses?.[0]?.emailAddress ?? "—";
  const name     = user?.fullName ?? user?.firstName ?? "—";
  const since    = user?.createdAt
    ? new Date(user.createdAt).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })
    : "—";

  async function openBilling() {
    setPortalLoading(true);
    setPortalError("");
    try {
      const res  = await fetch("/api/billing/portal", { method: "POST" });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        setPortalError(data.error ?? "Could not open billing portal.");
      }
    } catch {
      setPortalError("Something went wrong. Try again.");
    } finally {
      setPortalLoading(false);
    }
  }

  return (
    <div style={{ padding: "48px 40px", maxWidth: 760 }}>

      {/* ── Header ───────────────────────────────────────────────── */}
      <div style={{ marginBottom: 44 }}>
        <h1 style={{ fontSize: 28, fontWeight: 700, color: "#fff", letterSpacing: "-0.5px", marginBottom: 6 }}>
          Your Account
        </h1>
        <p style={{ fontSize: 14, color: "#64748b" }}>
          Manage your profile, change your password, and download Pulse.
        </p>
      </div>

      {/* ── Profile card ─────────────────────────────────────────── */}
      <div style={{ background: "#0d1526", border: "1px solid #1e293b", borderRadius: 16, padding: 28, marginBottom: 20 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: "#00e5cc", textTransform: "uppercase", letterSpacing: "0.8px" }}>
            Profile
          </div>
          <button
            onClick={() => openUserProfile()}
            style={{
              padding: "7px 14px", borderRadius: 7,
              background: "transparent", border: "1px solid #1e293b",
              color: "#94a3b8", fontSize: 12, fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Edit profile & password →
          </button>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
          {[
            { label: "Full name",    value: name  },
            { label: "Email",        value: email },
            { label: "Member since", value: since },
            { label: "Plan",         value: planMeta.label },
          ].map(({ label, value }) => (
            <div key={label}>
              <div style={{ fontSize: 11, fontWeight: 600, color: "#475569", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 5 }}>
                {label}
              </div>
              <div style={{ fontSize: 14, color: "#e2e8f0" }}>{value}</div>
            </div>
          ))}
        </div>

        {/* Password row */}
        <div style={{ marginTop: 24, paddingTop: 20, borderTop: "1px solid #1e293b", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <div style={{ fontSize: 11, fontWeight: 600, color: "#475569", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 4 }}>
              Password
            </div>
            <div style={{ fontSize: 14, color: "#e2e8f0" }}>••••••••</div>
          </div>
          <button
            onClick={() => openUserProfile()}
            style={{
              padding: "7px 14px", borderRadius: 7,
              background: "rgba(0,229,204,0.08)",
              border: "1px solid rgba(0,229,204,0.2)",
              color: "#00e5cc", fontSize: 12, fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Change password
          </button>
        </div>
      </div>

      {/* ── Plan & billing card ───────────────────────────────────── */}
      <div style={{ background: "#0d1526", border: "1px solid #1e293b", borderRadius: 16, padding: 28, marginBottom: 20 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: "#00e5cc", textTransform: "uppercase", letterSpacing: "0.8px" }}>
            Plan & Billing
          </div>
          <div style={{
            background: `${planMeta.color}18`,
            border: `1px solid ${planMeta.color}40`,
            color: planMeta.color,
            fontSize: 11, fontWeight: 700,
            padding: "4px 12px", borderRadius: 100,
          }}>
            {planMeta.label} · 14-day trial
          </div>
        </div>

        <div style={{ display: "flex", gap: 32, marginBottom: 24 }}>
          <div>
            <div style={{ fontSize: 11, fontWeight: 600, color: "#475569", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 5 }}>Price</div>
            <div style={{ fontSize: 14, color: "#e2e8f0" }}>{planMeta.price}</div>
          </div>
          <div>
            <div style={{ fontSize: 11, fontWeight: 600, color: "#475569", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 5 }}>Capacity</div>
            <div style={{ fontSize: 14, color: "#e2e8f0" }}>{planMeta.clients}</div>
          </div>
        </div>

        <button
          onClick={openBilling}
          disabled={portalLoading}
          style={{
            padding: "10px 20px", borderRadius: 8,
            background: "#00e5cc", color: "#0a0f1e",
            fontSize: 13, fontWeight: 700,
            border: "none", cursor: portalLoading ? "not-allowed" : "pointer",
            opacity: portalLoading ? 0.7 : 1,
          }}
        >
          {portalLoading ? "Opening…" : "Manage billing & invoices →"}
        </button>
        {portalError && (
          <div style={{ marginTop: 10, fontSize: 13, color: "#f87171" }}>{portalError}</div>
        )}
      </div>

      {/* ── Download card ─────────────────────────────────────────── */}
      <div style={{
        background: "linear-gradient(135deg, rgba(0,229,204,0.07) 0%, rgba(0,153,255,0.04) 100%)",
        border: "1px solid rgba(0,229,204,0.2)",
        borderRadius: 16, padding: 28,
      }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: "#00e5cc", textTransform: "uppercase", letterSpacing: "0.8px", marginBottom: 20 }}>
          Download Pulse
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 20, marginBottom: 24 }}>
          <div style={{
            width: 56, height: 56, borderRadius: 14, flexShrink: 0,
            background: "rgba(0,229,204,0.1)", border: "1px solid rgba(0,229,204,0.2)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 28,
          }}>
            ⚡
          </div>
          <div>
            <div style={{ fontSize: 16, fontWeight: 700, color: "#fff", marginBottom: 3 }}>Pulse Desktop App</div>
            <div style={{ fontSize: 13, color: "#64748b" }}>Windows · Includes AI & setup wizard · ~250MB</div>
          </div>
        </div>

        {/* Steps */}
        <div style={{ display: "flex", flexDirection: "column", gap: 14, marginBottom: 24 }}>
          {[
            { n: "1", t: "Download & run the installer",  d: "Double-click Pulse-Setup.exe. Install takes under a minute." },
            { n: "2", t: "Complete the setup wizard",      d: "Connect GA4, Shopify, and more via OAuth or API key. Skip anything — you can add it later." },
            { n: "3", t: "Get your first AI report",       d: "Within 48 hours of connecting your first platform, Pulse generates your report." },
          ].map(({ n, t, d }) => (
            <div key={n} style={{ display: "flex", gap: 14 }}>
              <div style={{
                width: 28, height: 28, borderRadius: "50%", flexShrink: 0,
                background: "rgba(0,229,204,0.1)", border: "1px solid rgba(0,229,204,0.2)",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 12, fontWeight: 700, color: "#00e5cc",
              }}>{n}</div>
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, color: "#fff", marginBottom: 2 }}>{t}</div>
                <div style={{ fontSize: 12, color: "#64748b", lineHeight: 1.6 }}>{d}</div>
              </div>
            </div>
          ))}
        </div>

        <a
          href={DOWNLOAD_URL}
          style={{
            display: "inline-flex", alignItems: "center", gap: 8,
            background: "#00e5cc", color: "#0a0f1e",
            padding: "13px 28px", borderRadius: 10,
            fontSize: 14, fontWeight: 700, textDecoration: "none",
          }}
        >
          ↓ Download Pulse-Setup.exe
        </a>
      </div>

    </div>
  );
}
