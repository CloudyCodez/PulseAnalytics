"use client";

import { useState } from "react";

type Integration = {
  id: string;
  name: string;
  icon: string;
  desc: string;
  status: "connected" | "disconnected" | "error";
  color: string;
  phase: 1 | 2 | 3;
};

const integrations: Integration[] = [
  { id: "ga4", name: "Google Analytics 4", icon: "📊", desc: "Website traffic, sessions, conversions", status: "disconnected", color: "#4285F4", phase: 1 },
  { id: "google_ads", name: "Google Ads", icon: "🎯", desc: "Search, Display, Performance Max campaigns", status: "disconnected", color: "#4285F4", phase: 1 },
  { id: "meta", name: "Meta Ads", icon: "📘", desc: "Facebook & Instagram ad performance", status: "disconnected", color: "#1877F2", phase: 1 },
  { id: "shopify", name: "Shopify", icon: "🛍️", desc: "Orders, revenue, products, customers", status: "disconnected", color: "#95BF47", phase: 1 },
  { id: "klaviyo", name: "Klaviyo", icon: "📧", desc: "Email marketing performance & flows", status: "disconnected", color: "#FF7043", phase: 2 },
  { id: "tiktok", name: "TikTok for Business", icon: "🎵", desc: "TikTok Ads Manager campaigns", status: "disconnected", color: "#FF0050", phase: 2 },
  { id: "hubspot", name: "HubSpot", icon: "🔶", desc: "CRM deals, contacts, pipeline", status: "disconnected", color: "#FF7A59", phase: 2 },
  { id: "gohighlevel", name: "GoHighLevel", icon: "⚙️", desc: "Agency CRM & automation", status: "disconnected", color: "#00BFA5", phase: 2 },
  { id: "stripe", name: "Stripe", icon: "💳", desc: "Revenue, MRR, churn, subscriptions", status: "disconnected", color: "#6772E5", phase: 3 },
  { id: "youtube", name: "YouTube Studio", icon: "🎬", desc: "Views, watch time, revenue", status: "disconnected", color: "#FF0000", phase: 3 },
  { id: "linkedin", name: "LinkedIn Ads", icon: "🔵", desc: "B2B campaign performance", status: "disconnected", color: "#0A66C2", phase: 3 },
  { id: "pinterest", name: "Pinterest Ads", icon: "📌", desc: "Visual ad campaigns", status: "disconnected", color: "#E60023", phase: 3 },
];

const phaseLabels: Record<number, string> = {
  1: "Available Now",
  2: "Coming Soon",
  3: "Roadmap",
};

export default function IntegrationsPage() {
  const [connecting, setConnecting] = useState<string | null>(null);

  async function handleConnect(id: string) {
    setConnecting(id);
    if (id === "ga4" || id === "google_ads") {
      window.location.href = `/api/integrations/google/auth`;
    } else if (id === "meta") {
      window.location.href = `/api/integrations/meta/connect`;
    } else if (id === "shopify") {
      const shop = prompt("Enter your Shopify store URL (e.g. mystore.myshopify.com):");
      if (shop) window.location.href = `/api/integrations/shopify/connect?shop=${shop}`;
      else setConnecting(null);
    } else {
      setTimeout(() => setConnecting(null), 1500);
    }
  }

  const byPhase = [1, 2, 3].map((p) => ({
    phase: p,
    items: integrations.filter((i) => i.phase === p),
  }));

  return (
    <div style={{ padding: 40 }}>
      <div style={{ marginBottom: 40 }}>
        <h1
          style={{
            fontFamily: "'Space Grotesk',sans-serif",
            fontSize: 28,
            fontWeight: 700,
            color: "var(--white)",
            letterSpacing: "-0.5px",
            marginBottom: 8,
          }}
        >
          Integrations
        </h1>
        <p style={{ color: "var(--muted)", fontSize: 15 }}>
          Connect your platforms. Pulse does the rest.
        </p>
      </div>

      {byPhase.map(({ phase, items }) => (
        <div key={phase} style={{ marginBottom: 48 }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              marginBottom: 20,
            }}
          >
            <div
              style={{
                fontFamily: "'Space Grotesk',sans-serif",
                fontSize: 13,
                fontWeight: 600,
                color: phase === 1 ? "var(--cyan)" : "var(--muted)",
                textTransform: "uppercase",
                letterSpacing: "0.5px",
              }}
            >
              {phaseLabels[phase]}
            </div>
            {phase === 1 && (
              <div
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: "50%",
                  background: "var(--cyan)",
                  animation: "pulse-dot 2s infinite",
                }}
              />
            )}
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill,minmax(280px,1fr))",
              gap: 12,
            }}
          >
            {items.map(({ id, name, icon, desc, status }) => (
              <div
                key={id}
                style={{
                  background: "var(--navy-2)",
                  border: `1px solid ${status === "connected" ? "rgba(0,229,204,0.3)" : "var(--border)"}`,
                  borderRadius: 12,
                  padding: 20,
                  display: "flex",
                  alignItems: "center",
                  gap: 16,
                  opacity: phase > 1 ? 0.6 : 1,
                }}
              >
                <div
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: 10,
                    background: "var(--navy-3)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 22,
                    flexShrink: 0,
                  }}
                >
                  {icon}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      fontFamily: "'Space Grotesk',sans-serif",
                      fontSize: 14,
                      fontWeight: 600,
                      color: "var(--white)",
                      marginBottom: 3,
                    }}
                  >
                    {name}
                  </div>
                  <div style={{ fontSize: 12, color: "var(--muted)" }}>{desc}</div>
                </div>
                <button
                  onClick={() => phase === 1 && handleConnect(id)}
                  disabled={phase > 1 || connecting === id}
                  style={{
                    padding: "7px 14px",
                    borderRadius: 7,
                    fontSize: 13,
                    fontWeight: 600,
                    fontFamily: "'Space Grotesk',sans-serif",
                    flexShrink: 0,
                    cursor: phase === 1 ? "pointer" : "default",
                    transition: "opacity .2s",
                    ...(status === "connected"
                      ? {
                          background: "rgba(74,222,128,0.1)",
                          color: "#4ade80",
                          border: "1px solid rgba(74,222,128,0.3)",
                        }
                      : phase === 1
                      ? {
                          background: "var(--cyan)",
                          color: "var(--navy)",
                          border: "none",
                        }
                      : {
                          background: "var(--navy-3)",
                          color: "var(--muted)",
                          border: "1px solid var(--border)",
                        }),
                  }}
                >
                  {status === "connected"
                    ? "✓ Connected"
                    : connecting === id
                    ? "Connecting…"
                    : phase === 1
                    ? "Connect"
                    : "Soon"}
                </button>
              </div>
            ))}
          </div>
        </div>
      ))}

      <style>{`
        @keyframes pulse-dot {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.3; }
        }
      `}</style>
    </div>
  );
}
