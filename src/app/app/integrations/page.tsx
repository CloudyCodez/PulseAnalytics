"use client";

import { useState, useEffect } from "react";

type Integration = {
  key: string;
  name: string;
  description: string;
  icon: string;
  iconBg: string;
  iconColor: string;
  configType: "oauth" | "apikey" | "webhook" | "coming_soon";
  fields?: { id: string; label: string; placeholder: string; type?: string }[];
  helpUrl?: string;
  badge?: string;
  comingSoon?: boolean;
};

const INTEGRATIONS: Integration[] = [
  {
    key: "google",
    name: "Google Ads & GA4",
    description: "Pull campaign spend, ROAS, clicks, and GA4 sessions, users, and conversions into every report.",
    icon: "G",
    iconBg: "rgba(66,133,244,0.12)",
    iconColor: "#4285F4",
    configType: "oauth",
  },
  {
    key: "searchconsole",
    name: "Google Search Console",
    description: "Organic clicks, impressions, CTR, and average position. Automatically uses your Google connection — no extra login needed.",
    icon: "G",
    iconBg: "rgba(52,168,83,0.12)",
    iconColor: "#34A853",
    configType: "oauth",
    badge: "Organic",
  },
  {
    key: "meta",
    name: "Meta Ads",
    description: "Facebook & Instagram ad spend, ROAS, CPM, CTR, and creative performance breakdown.",
    icon: "f",
    iconBg: "rgba(24,119,242,0.12)",
    iconColor: "#4080ff",
    configType: "oauth",
  },
  {
    key: "tiktok",
    name: "TikTok Ads",
    description: "TikTok ad spend, impressions, clicks, conversions, CPM, CPC, and cost-per-acquisition across your campaigns.",
    icon: "T",
    iconBg: "rgba(254,44,85,0.12)",
    iconColor: "#FE2C55",
    configType: "oauth",
    badge: "Ads",
  },
  {
    key: "shopify",
    name: "Shopify",
    description: "Orders, revenue, AOV, refunds, top products, and customer acquisition data.",
    icon: "S",
    iconBg: "rgba(149,191,71,0.12)",
    iconColor: "#95BF47",
    configType: "apikey",
    fields: [
      { id: "shopify-store", label: "Store URL", placeholder: "yourstore.myshopify.com" },
      { id: "shopify-token", label: "Admin API Access Token", placeholder: "shpat_xxxxxxxxxxxx", type: "password" },
    ],
    helpUrl: "https://help.shopify.com/en/manual/apps/app-types/custom-apps",
  },
  {
    key: "klaviyo",
    name: "Klaviyo",
    description: "Email open rates, click rates, campaign revenue, flow performance, and list growth.",
    icon: "K",
    iconBg: "rgba(255,107,53,0.12)",
    iconColor: "#ff6b35",
    configType: "apikey",
    fields: [
      { id: "klaviyo-key", label: "Private API Key", placeholder: "pk_xxxxxxxxxxxx", type: "password" },
    ],
    helpUrl: "https://developers.klaviyo.com/en/docs/retrieve_api_credentials",
  },
  {
    key: "hubspot",
    name: "HubSpot CRM",
    description: "Closed-won deals, new contacts, open pipeline value, and CRM activity synced alongside your ad and revenue metrics.",
    icon: "Hs",
    iconBg: "rgba(255,122,0,0.12)",
    iconColor: "#FF7A00",
    configType: "apikey",
    badge: "CRM",
    fields: [
      { id: "hubspot-token", label: "Private App Access Token", placeholder: "pat-na1-xxxxxxxxxxxx", type: "password" },
    ],
    helpUrl: "https://developers.hubspot.com/docs/api/private-apps",
  },
  {
    key: "slack",
    name: "Slack",
    description: "Get performance alerts, anomaly notifications, and weekly report summaries posted directly to your Slack channel.",
    icon: "#",
    iconBg: "rgba(74,21,75,0.2)",
    iconColor: "#E01E5A",
    configType: "webhook",
    fields: [
      { id: "slack-webhook", label: "Incoming Webhook URL", placeholder: "https://hooks.slack.com/services/...", type: "password" },
    ],
    helpUrl: "https://api.slack.com/messaging/webhooks",
    badge: "Alerts",
  },
  {
    key: "salesforce",
    name: "Salesforce CRM",
    description: "Closed-won deals, new leads, open pipeline value, and activity data. Full Salesforce integration coming soon.",
    icon: "SF",
    iconBg: "rgba(0,161,224,0.08)",
    iconColor: "#00A1E0",
    configType: "coming_soon",
    badge: "Coming Soon",
    comingSoon: true,
  },
];

type Config = Record<string, unknown>;

export default function IntegrationsPage() {
  const [config, setConfig]       = useState<Config>({});
  const [statuses, setStatuses]   = useState<Record<string, string>>({});
  const [loading, setLoading]     = useState<Record<string, boolean>>({});
  const [fieldVals, setFieldVals] = useState<Record<string, string>>({});

  const pulse = typeof window !== "undefined"
    ? (window as unknown as { pulse?: unknown }).pulse as {
        getConfig: () => Promise<Config>;
        saveConfig: (v: unknown) => Promise<unknown>;
        startOAuth: (p: string) => Promise<{ success: boolean; error?: string }>;
        verifyShopify: (s: string, t: string) => Promise<{ success: boolean; shopName?: string; error?: string }>;
        verifyKlaviyo: (k: string) => Promise<{ success: boolean; orgName?: string; error?: string }>;
        openExternal: (u: string) => void;
      } | undefined
    : undefined;

  useEffect(() => {
    if (pulse?.getConfig) {
      pulse.getConfig().then((cfg: Config) => setConfig(cfg ?? {})).catch(() => {});
    }
  }, []);

  function isConnected(key: string): boolean {
    const cfg = config as Record<string, unknown>;
    if (key === "google")        return !!(cfg.google_connected);
    if (key === "searchconsole") return !!(cfg.google_connected); // piggybacks Google
    if (key === "meta")          return !!(cfg.meta_connected);
    if (key === "tiktok")        return !!(cfg.tiktok_connected);
    if (key === "shopify")       return !!((cfg.shopify as Record<string, string>)?.store);
    if (key === "klaviyo")       return !!((cfg.klaviyo as Record<string, string>)?.apiKey);
    if (key === "hubspot")       return !!((cfg.hubspot as Record<string, string>)?.token);
    if (key === "slack")         return !!(cfg.slack_connected);
    return false;
  }

  function setStatus(key: string, msg: string) {
    setStatuses(s => ({ ...s, [key]: msg }));
  }
  function setLoad(key: string, v: boolean) {
    setLoading(l => ({ ...l, [key]: v }));
  }

  async function connectOAuth(key: string) {
    if (!pulse?.startOAuth) return;
    // Search Console piggybacks Google — connect Google instead
    const provider = key === "searchconsole" ? "google" : key;
    setLoad(key, true);
    setStatus(key, "Opening browser…");
    const result = await pulse.startOAuth(provider);
    if (result.success) {
      setStatus(key, "✓ Connected");
      const updated = await pulse.getConfig();
      setConfig(updated ?? {});
    } else {
      setStatus(key, "❌ " + (result.error ?? "Connection failed"));
    }
    setLoad(key, false);
  }

  async function connectShopify() {
    const store = (fieldVals["shopify-store"] ?? "").trim().replace(/^https?:\/\//, "").replace(/\/$/, "");
    const token = (fieldVals["shopify-token"] ?? "").trim();
    if (!store || !token) { setStatus("shopify", "❌ Enter both store URL and token"); return; }
    setLoad("shopify", true);
    setStatus("shopify", "Verifying…");
    const v = pulse?.verifyShopify
      ? await pulse.verifyShopify(store, token)
      : { success: true };
    if (!v.success) {
      setStatus("shopify", "❌ " + ((v as { error?: string }).error ?? "Invalid credentials"));
      setLoad("shopify", false);
      return;
    }
    await pulse?.saveConfig({ shopify: { store, token } });
    const updated = await pulse?.getConfig();
    setConfig(updated ?? {});
    setStatus("shopify", "✓ Connected" + ((v as { shopName?: string }).shopName ? " — " + (v as { shopName: string }).shopName : ""));
    setLoad("shopify", false);
  }

  async function connectHubSpot() {
    const token = (fieldVals["hubspot-token"] ?? "").trim();
    if (!token) { setStatus("hubspot", "❌ Enter your Private App token"); return; }
    setLoad("hubspot", true);
    setStatus("hubspot", "Verifying…");
    // Quick sanity check against HubSpot's account info endpoint
    try {
      const res = await fetch("/api/integrations/hubspot/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setStatus("hubspot", "❌ " + (data.error ?? "Invalid token"));
        setLoad("hubspot", false);
        return;
      }
      await pulse?.saveConfig({ hubspot: { token }, hubspot_connected: true });
      const updated = await pulse?.getConfig();
      setConfig(updated ?? {});
      setStatus("hubspot", "✓ Connected" + (data.portalName ? " — " + data.portalName : ""));
    } catch {
      setStatus("hubspot", "❌ Connection failed");
    }
    setLoad("hubspot", false);
  }

  async function connectKlaviyo() {
    const key = (fieldVals["klaviyo-key"] ?? "").trim();
    if (!key) { setStatus("klaviyo", "❌ Enter your API key"); return; }
    setLoad("klaviyo", true);
    setStatus("klaviyo", "Verifying…");
    const v = pulse?.verifyKlaviyo
      ? await pulse.verifyKlaviyo(key)
      : { success: true };
    if (!v.success) {
      setStatus("klaviyo", "❌ " + ((v as { error?: string }).error ?? "Invalid key"));
      setLoad("klaviyo", false);
      return;
    }
    await pulse?.saveConfig({ klaviyo: { apiKey: key } });
    const updated = await pulse?.getConfig();
    setConfig(updated ?? {});
    setStatus("klaviyo", "✓ Connected" + ((v as { orgName?: string }).orgName ? " — " + (v as { orgName: string }).orgName : ""));
    setLoad("klaviyo", false);
  }

  async function connectSlack() {
    const webhookUrl = (fieldVals["slack-webhook"] ?? "").trim();
    if (!webhookUrl || !webhookUrl.startsWith("https://hooks.slack.com/")) {
      setStatus("slack", "❌ Enter a valid Slack webhook URL");
      return;
    }
    setLoad("slack", true);
    setStatus("slack", "Verifying webhook…");

    const cfg    = config as Record<string, string>;
    const userId = cfg.userId;
    const res = await fetch("/api/integrations/slack", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, webhookUrl }),
    });

    if (!res.ok) {
      const err = await res.json();
      setStatus("slack", "❌ " + (err.error ?? "Verification failed"));
      setLoad("slack", false);
      return;
    }

    await pulse?.saveConfig({ slack_connected: true, slack_webhook: webhookUrl });
    const updated = await pulse?.getConfig();
    setConfig(updated ?? {});
    setStatus("slack", "✓ Connected — check Slack for a test message");
    setLoad("slack", false);
  }

  function handleConnect(integ: Integration) {
    if (integ.comingSoon)              return;
    if (integ.configType === "oauth")  connectOAuth(integ.key);
    else if (integ.key === "shopify")  connectShopify();
    else if (integ.key === "hubspot")  connectHubSpot();
    else if (integ.key === "klaviyo")  connectKlaviyo();
    else if (integ.key === "slack")    connectSlack();
  }

  return (
    <div style={{ padding: "40px 40px 80px", maxWidth: 860 }}>
      <div style={{ marginBottom: 36 }}>
        <h1 style={{ fontSize: 26, fontWeight: 700, color: "#fff", letterSpacing: "-0.5px", marginBottom: 6 }}>
          Integrations
        </h1>
        <p style={{ fontSize: 14, color: "#4a5568" }}>
          Connect your platforms. Pulse reads data automatically after each connection.
        </p>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        {INTEGRATIONS.map(integ => {
          const connected = isConnected(integ.key);
          const busy      = loading[integ.key];
          const status    = statuses[integ.key];
          const soon      = integ.comingSoon;

          return (
            <div key={integ.key} style={{
              background: "#0d1526",
              border: `1px solid ${connected ? "rgba(0,229,204,0.2)" : soon ? "rgba(255,255,255,0.05)" : "#1a2540"}`,
              borderRadius: 14, padding: "22px 24px",
              opacity: soon ? 0.6 : 1,
            }}>
              <div style={{ display: "flex", alignItems: "flex-start", gap: 16 }}>
                {/* Icon */}
                <div style={{
                  width: 44, height: 44, borderRadius: 11, flexShrink: 0,
                  background: integ.iconBg,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: integ.icon.length > 1 ? 12 : 18, fontWeight: 700, color: integ.iconColor,
                }}>
                  {integ.icon}
                </div>

                {/* Info */}
                <div style={{ flex: 1 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
                    <span style={{ fontSize: 15, fontWeight: 700, color: soon ? "#64748b" : "#fff" }}>{integ.name}</span>
                    {connected && (
                      <span style={{
                        fontSize: 10, fontWeight: 700, color: "#4ade80",
                        background: "rgba(74,222,128,0.1)", border: "1px solid rgba(74,222,128,0.2)",
                        padding: "2px 8px", borderRadius: 100,
                      }}>LIVE</span>
                    )}
                    {integ.badge && !connected && (
                      <span style={{
                        fontSize: 10, fontWeight: 700,
                        color: soon ? "#475569" : "#94a3b8",
                        background: soon ? "rgba(71,85,105,0.1)" : "rgba(148,163,184,0.1)",
                        border: `1px solid ${soon ? "rgba(71,85,105,0.2)" : "rgba(148,163,184,0.15)"}`,
                        padding: "2px 8px", borderRadius: 100,
                      }}>{integ.badge}</span>
                    )}
                  </div>
                  <p style={{ fontSize: 13, color: "#4a5568", lineHeight: 1.6, marginBottom: integ.fields && !connected ? 16 : 0 }}>
                    {integ.description}
                  </p>

                  {/* Fields */}
                  {integ.fields && !connected && !soon && (
                    <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 14, maxWidth: 460 }}>
                      {integ.fields.map(f => (
                        <div key={f.id}>
                          <label style={{ fontSize: 11, fontWeight: 600, color: "#4a5568", textTransform: "uppercase", letterSpacing: "0.5px", display: "block", marginBottom: 5 }}>
                            {f.label}
                          </label>
                          <input
                            type={f.type ?? "text"}
                            placeholder={f.placeholder}
                            value={fieldVals[f.id] ?? ""}
                            onChange={e => setFieldVals(v => ({ ...v, [f.id]: e.target.value }))}
                            style={{
                              width: "100%", background: "#080d1a",
                              border: "1px solid #1a2540", borderRadius: 8,
                              padding: "9px 12px", fontSize: 13, color: "#e2e8f0",
                              outline: "none", fontFamily: "inherit",
                            }}
                          />
                        </div>
                      ))}
                      {integ.helpUrl && (
                        <button
                          onClick={() => pulse?.openExternal(integ.helpUrl!)}
                          style={{ background: "none", border: "none", color: "#00e5cc", fontSize: 12, cursor: "pointer", textAlign: "left", padding: 0 }}
                        >
                          How to get your {integ.key === "slack" ? "webhook URL" : "token"} →
                        </button>
                      )}
                    </div>
                  )}

                  {/* Status */}
                  {status && (
                    <div style={{
                      fontSize: 12, fontWeight: 500, marginBottom: 10,
                      color: status.startsWith("✓") ? "#4ade80" : status.startsWith("❌") ? "#f87171" : "#94a3b8",
                    }}>
                      {status}
                    </div>
                  )}

                  {/* Button */}
                  {!soon && (
                    <button
                      onClick={() => handleConnect(integ)}
                      disabled={busy || connected}
                      style={{
                        padding: "9px 18px", borderRadius: 8,
                        background: connected ? "rgba(74,222,128,0.08)" : "#00e5cc",
                        border: connected ? "1px solid rgba(74,222,128,0.2)" : "none",
                        color: connected ? "#4ade80" : "#080d1a",
                        fontSize: 13, fontWeight: 700, fontFamily: "inherit",
                        cursor: busy || connected ? "default" : "pointer",
                        opacity: busy ? 0.7 : 1,
                        marginTop: 4,
                      }}
                    >
                      {busy ? "Connecting…" : connected
                        ? "✓ Connected"
                        : integ.key === "searchconsole"
                          ? (isConnected("google") ? "✓ Active via Google" : "Connect Google First")
                          : integ.configType === "oauth"
                            ? `Connect ${integ.name.split(" ")[0]}`
                            : "Save & Verify"}
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
