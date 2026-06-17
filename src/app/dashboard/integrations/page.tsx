"use client";

import { useState, useEffect, useCallback } from "react";
import { useUser } from "@clerk/nextjs";
import { useIsElectron } from "@/lib/electron";

// ─── Types ────────────────────────────────────────────────────────────────────

type IntegrationStatus = "connected" | "disconnected" | "error" | "connecting";

interface Integration {
  id: string;
  name: string;
  icon: string;
  desc: string;
  color: string;
  phase: 1 | 2 | 3;
}

const INTEGRATIONS: Integration[] = [
  { id: "google", name: "Google (Ads + GA4)", icon: "🎯", desc: "Search, Display, Performance Max & website analytics", color: "#4285F4", phase: 1 },
  { id: "meta", name: "Meta Ads", icon: "📘", desc: "Facebook & Instagram ad performance", color: "#1877F2", phase: 1 },
  { id: "shopify", name: "Shopify", icon: "🛍️", desc: "Orders, revenue, products, customers", color: "#95BF47", phase: 1 },
  { id: "klaviyo", name: "Klaviyo", icon: "📧", desc: "Email marketing performance & flows", color: "#FF7043", phase: 2 },
  { id: "tiktok", name: "TikTok for Business", icon: "🎵", desc: "TikTok Ads Manager campaigns", color: "#FF0050", phase: 2 },
  { id: "hubspot", name: "HubSpot", icon: "🔶", desc: "CRM deals, contacts, pipeline", color: "#FF7A59", phase: 2 },
  { id: "gohighlevel", name: "GoHighLevel", icon: "⚙️", desc: "Agency CRM & automation", color: "#00BFA5", phase: 2 },
  { id: "stripe", name: "Stripe", icon: "💳", desc: "Revenue, MRR, churn, subscriptions", color: "#6772E5", phase: 3 },
  { id: "youtube", name: "YouTube Studio", icon: "🎬", desc: "Views, watch time, revenue", color: "#FF0000", phase: 3 },
  { id: "linkedin", name: "LinkedIn Ads", icon: "🔵", desc: "B2B campaign performance", color: "#0A66C2", phase: 3 },
  { id: "pinterest", name: "Pinterest Ads", icon: "📌", desc: "Visual ad campaigns", color: "#E60023", phase: 3 },
];

const PHASE_LABELS: Record<number, string> = {
  1: "Available Now",
  2: "Coming Soon",
  3: "Roadmap",
};

// ─── Shopify manual-entry modal ───────────────────────────────────────────────

function ShopifyModal({
  onClose,
  onSave,
}: {
  onClose: () => void;
  onSave: (store: string, token: string) => void;
}) {
  const [store, setStore] = useState("");
  const [token, setToken] = useState("");

  const inputStyle: React.CSSProperties = {
    width: "100%", padding: "10px 12px", borderRadius: 8,
    background: "#0a0f1e", border: "1px solid #334155",
    color: "#fff", fontSize: 14, outline: "none",
    boxSizing: "border-box",
  };

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 200,
      background: "rgba(0,0,0,0.7)",
      display: "flex", alignItems: "center", justifyContent: "center",
    }}>
      <div style={{
        background: "#0d1526", border: "1px solid #1e293b",
        borderRadius: 16, padding: 32, width: 440, maxWidth: "90vw",
      }}>
        <div style={{ fontSize: 18, fontWeight: 700, color: "#fff", marginBottom: 6 }}>
          🛍️ Connect Shopify
        </div>
        <p style={{ fontSize: 13, color: "#64748b", marginBottom: 24, lineHeight: 1.6 }}>
          Create a Custom App in your Shopify Admin (Apps → Develop apps) with read access to orders, products, and customers, then paste the Admin API access token below.
        </p>
        <div style={{ marginBottom: 16 }}>
          <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#94a3b8", marginBottom: 6 }}>
            Store URL
          </label>
          <input
            style={inputStyle}
            placeholder="mystore.myshopify.com"
            value={store}
            onChange={(e) => setStore(e.target.value)}
          />
        </div>
        <div style={{ marginBottom: 28 }}>
          <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#94a3b8", marginBottom: 6 }}>
            Admin API Access Token
          </label>
          <input
            style={inputStyle}
            type="password"
            placeholder="shpat_…"
            value={token}
            onChange={(e) => setToken(e.target.value)}
          />
        </div>
        <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
          <button onClick={onClose} style={{
            padding: "9px 18px", borderRadius: 8,
            background: "transparent", border: "1px solid #334155",
            color: "#94a3b8", fontSize: 13, fontWeight: 600, cursor: "pointer",
          }}>
            Cancel
          </button>
          <button
            onClick={() => store && token && onSave(store.trim(), token.trim())}
            disabled={!store || !token}
            style={{
              padding: "9px 18px", borderRadius: 8,
              background: store && token ? "#00e5cc" : "#1e293b",
              border: "none", color: store && token ? "#0a0f1e" : "#64748b",
              fontSize: 13, fontWeight: 700, cursor: store && token ? "pointer" : "default",
            }}
          >
            Save & Connect
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function IntegrationsPage() {
  const { user, isLoaded } = useUser();
  const inElectron = useIsElectron();
  const [statuses, setStatuses] = useState<Record<string, IntegrationStatus>>({});
  const [showShopify, setShowShopify] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const clerkUserId = user?.id ?? null;

  // ── Load connection state from local config when in Electron ────────────────
  useEffect(() => {
    if (!inElectron || !window.pulse) return;

    (async () => {
      try {
        const cfg = await window.pulse!.getConfig();
        setStatuses({
          google: cfg?.google_connected ? "connected" : "disconnected",
          meta: cfg?.meta_connected ? "connected" : "disconnected",
          shopify: (cfg?.shopify?.store && cfg?.shopify?.token) ? "connected" : "disconnected",
        });
      } catch {
        // Config read failed — treat all as disconnected
      }
    })();
  }, [inElectron]);

  // ── OAuth result listener (for live updates while the OAuth window is open) ─
  useEffect(() => {
    if (!inElectron || !window.pulse) return;
    const cleanup = window.pulse.onOAuthResult((data) => {
      if (data.success) {
        setStatuses((prev) => ({ ...prev, [data.provider]: "connected" }));
        showToast(`${data.provider === "google" ? "Google" : "Meta"} connected!`);
      } else {
        setStatuses((prev) => ({ ...prev, [data.provider]: "disconnected" }));
        showToast(`${data.provider} connection failed — try again.`);
      }
    });
    return cleanup;
  }, [inElectron]);

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 3500);
  }

  // ── Connect handlers ─────────────────────────────────────────────────────────

  const handleConnectElectron = useCallback(async (id: string) => {
    if (!window.pulse || !clerkUserId) return;

    if (id === "shopify") {
      setShowShopify(true);
      return;
    }

    if (id === "google" || id === "meta") {
      setStatuses((prev) => ({ ...prev, [id]: "connecting" }));
      try {
        // Pass the Clerk userId so main.js can forward it as `state` and the
        // callback route can look up the right Supabase user record.
        const result = await window.pulse.startOAuth(id as "google" | "meta", clerkUserId);
        if (result.success) {
          setStatuses((prev) => ({ ...prev, [id]: "connected" }));
          showToast(`${id === "google" ? "Google" : "Meta"} connected!`);
        } else {
          setStatuses((prev) => ({ ...prev, [id]: "disconnected" }));
          showToast(result.error ?? "Connection failed.");
        }
      } catch {
        setStatuses((prev) => ({ ...prev, [id]: "disconnected" }));
        showToast("Something went wrong. Please try again.");
      }
    }
  }, [clerkUserId]);

  const handleConnectPortal = useCallback((id: string) => {
    if (id === "google") {
      window.location.href = `/api/integrations/google/auth`;
    } else if (id === "meta") {
      window.location.href = `/api/integrations/meta/connect`;
    } else if (id === "shopify") {
      const shop = prompt("Enter your Shopify store URL (e.g. mystore.myshopify.com):");
      if (shop) window.location.href = `/api/integrations/shopify/connect?shop=${shop}`;
    }
  }, []);

  const handleSaveShopify = useCallback(async (store: string, token: string) => {
    setShowShopify(false);
    if (!window.pulse) return;
    try {
      await window.pulse.saveConfig({ shopify: { store, token } });
      setStatuses((prev) => ({ ...prev, shopify: "connected" }));
      showToast("Shopify connected!");
    } catch {
      showToast("Could not save Shopify config.");
    }
  }, []);

  function handleConnect(id: string, phase: number) {
    if (phase !== 1) return;
    if (inElectron) {
      handleConnectElectron(id);
    } else {
      handleConnectPortal(id);
    }
  }

  const byPhase = [1, 2, 3].map((p) => ({
    phase: p,
    items: INTEGRATIONS.filter((i) => i.phase === p),
  }));

  return (
    <div style={{ padding: 40 }}>
      <div style={{ marginBottom: 40 }}>
        <h1 style={{
          fontSize: 28, fontWeight: 700, color: "#fff",
          letterSpacing: "-0.5px", marginBottom: 8,
        }}>
          Integrations
        </h1>
        <p style={{ color: "#64748b", fontSize: 15 }}>
          Connect your platforms. Pulse does the rest.
        </p>
      </div>

      {byPhase.map(({ phase, items }) => (
        <div key={phase} style={{ marginBottom: 48 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
            <div style={{
              fontSize: 13, fontWeight: 600,
              color: phase === 1 ? "#00e5cc" : "#64748b",
              textTransform: "uppercase", letterSpacing: "0.5px",
            }}>
              {PHASE_LABELS[phase]}
            </div>
            {phase === 1 && (
              <div style={{
                width: 6, height: 6, borderRadius: "50%",
                background: "#00e5cc",
                animation: "pulse-dot 2s infinite",
              }} />
            )}
          </div>

          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
            gap: 12,
          }}>
            {items.map(({ id, name, icon, desc, phase: p }) => {
              const status = statuses[id] ?? "disconnected";
              const isConnected = status === "connected";
              const isConnecting = status === "connecting";

              return (
                <div key={id} style={{
                  background: "#0d1526",
                  border: `1px solid ${isConnected ? "rgba(0,229,204,0.3)" : "#1e293b"}`,
                  borderRadius: 12, padding: 20,
                  display: "flex", alignItems: "center", gap: 16,
                  opacity: p > 1 ? 0.6 : 1,
                }}>
                  <div style={{
                    width: 44, height: 44, borderRadius: 10,
                    background: "#0a0f1e",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 22, flexShrink: 0,
                  }}>
                    {icon}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 14, fontWeight: 600, color: "#fff", marginBottom: 3 }}>{name}</div>
                    <div style={{ fontSize: 12, color: "#64748b" }}>{desc}</div>
                  </div>
                  <button
                    onClick={() => handleConnect(id, p)}
                    disabled={p > 1 || isConnecting}
                    style={{
                      padding: "7px 14px", borderRadius: 7,
                      fontSize: 13, fontWeight: 600, flexShrink: 0,
                      cursor: p === 1 && !isConnecting ? "pointer" : "default",
                      transition: "opacity 0.2s",
                      ...(isConnected
                        ? { background: "rgba(74,222,128,0.1)", color: "#4ade80", border: "1px solid rgba(74,222,128,0.3)" }
                        : p === 1 && !isConnecting
                        ? { background: "#00e5cc", color: "#0a0f1e", border: "none" }
                        : { background: "#1e293b", color: "#64748b", border: "1px solid #334155" }),
                    }}
                  >
                    {isConnected
                      ? "✓ Connected"
                      : isConnecting
                      ? "Connecting…"
                      : p === 1
                      ? "Connect"
                      : "Soon"}
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      ))}

      {showShopify && (
        <ShopifyModal
          onClose={() => setShowShopify(false)}
          onSave={handleSaveShopify}
        />
      )}

      {toast && (
        <div style={{
          position: "fixed", bottom: 28, right: 28, zIndex: 300,
          background: "#0d1526", border: "1px solid rgba(0,229,204,0.3)",
          borderRadius: 10, padding: "12px 18px",
          fontSize: 13, fontWeight: 500, color: "#fff",
          boxShadow: "0 4px 24px rgba(0,0,0,0.4)",
        }}>
          {toast}
        </div>
      )}

      <style>{`
        @keyframes pulse-dot {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.3; }
        }
      `}</style>
    </div>
  );
}
