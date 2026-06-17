"use client";

import { useState, useEffect } from "react";

// ─── Types ────────────────────────────────────────────────────────────────────
type Metric = { label: string; value: string; delta: string; up: boolean; sub?: string };
type Integration = { name: string; status: "connected" | "error" | "disconnected" };

// ─── Metric card ──────────────────────────────────────────────────────────────
function MetricCard({ label, value, delta, up, sub }: Metric) {
  return (
    <div style={{
      background: "#0d1526", border: "1px solid #1a2540",
      borderRadius: 14, padding: "22px 24px",
    }}>
      <div style={{ fontSize: 11, fontWeight: 600, color: "#4a5568", textTransform: "uppercase", letterSpacing: "0.6px", marginBottom: 10 }}>
        {label}
      </div>
      <div style={{ fontSize: 30, fontWeight: 700, color: "#fff", letterSpacing: "-1px", marginBottom: 6 }}>
        {value}
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
        <span style={{ fontSize: 12, fontWeight: 600, color: up ? "#4ade80" : "#f87171" }}>
          {delta}
        </span>
        <span style={{ fontSize: 12, color: "#334155" }}>vs last week</span>
      </div>
      {sub && <div style={{ fontSize: 11, color: "#334155", marginTop: 4 }}>{sub}</div>}
    </div>
  );
}

// ─── Status dot ───────────────────────────────────────────────────────────────
function StatusDot({ status }: { status: Integration["status"] }) {
  const colors = { connected: "#4ade80", error: "#f87171", disconnected: "#334155" };
  return (
    <span style={{
      width: 7, height: 7, borderRadius: "50%",
      background: colors[status], display: "inline-block", flexShrink: 0,
      boxShadow: status === "connected" ? `0 0 6px ${colors.connected}` : "none",
    }} />
  );
}

// ─── Main ────────────────────────────────────────────────────────────────────
export default function AppOverviewPage() {
  const [config, setConfig] = useState<Record<string, unknown>>({});
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    // Read on-disk config to know which integrations are connected
    if (typeof window !== "undefined" && (window as unknown as { pulse?: { getConfig: () => Promise<Record<string, unknown>> } }).pulse?.getConfig) {
      const w = window as unknown as { pulse: { getConfig: () => Promise<Record<string, unknown>> } };
      w.pulse.getConfig().then((cfg: Record<string, unknown>) => {
        setConfig(cfg ?? {});
        setLoaded(true);
      }).catch(() => setLoaded(true));
    } else {
      setLoaded(true);
    }
  }, []);

  const bizName = (config as Record<string, Record<string, string>>).business?.name ?? "Your Business";

  const integrations: Integration[] = [
    { name: "Google Ads & GA4", status: (config as Record<string, boolean>).google_connected ? "connected" : "disconnected" },
    { name: "Meta Ads",         status: (config as Record<string, boolean>).meta_connected    ? "connected" : "disconnected" },
    { name: "Shopify",          status: (config as Record<string, Record<string, string>>).shopify?.store  ? "connected" : "disconnected" },
    { name: "Klaviyo",          status: (config as Record<string, Record<string, string>>).klaviyo?.apiKey ? "connected" : "disconnected" },
  ];

  const connected = integrations.filter(i => i.status === "connected").length;

  // Placeholder metrics — real ones pulled from API once integrations are live
  const metrics: Metric[] = [
    { label: "Total Ad Spend",  value: connected ? "$0"    : "—", delta: connected ? "+0%"  : "No data yet", up: true  },
    { label: "Revenue",         value: connected ? "$0"    : "—", delta: connected ? "+0%"  : "No data yet", up: true  },
    { label: "Blended ROAS",    value: connected ? "0.0×"  : "—", delta: connected ? "+0%"  : "No data yet", up: true  },
    { label: "Blended CAC",     value: connected ? "$0"    : "—", delta: connected ? "+0%"  : "No data yet", up: false },
  ];

  const now     = new Date();
  const dayName = now.toLocaleDateString("en-US", { weekday: "long" });
  const dateStr = now.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });

  return (
    <div style={{ padding: "40px 40px 80px", maxWidth: 1100 }}>

      {/* ── Header ──────────────────────────────────────────────────── */}
      <div style={{ marginBottom: 36 }}>
        <div style={{ fontSize: 12, color: "#334155", marginBottom: 6 }}>
          {dayName}, {dateStr}
        </div>
        <h1 style={{ fontSize: 26, fontWeight: 700, color: "#fff", letterSpacing: "-0.5px", marginBottom: 6 }}>
          {loaded ? bizName : "Loading…"}
        </h1>
        <p style={{ fontSize: 14, color: "#4a5568" }}>
          {connected === 0
            ? "No integrations connected yet — head to Integrations to get started."
            : `${connected} of ${integrations.length} integrations connected · Data updates every 24 hours`}
        </p>
      </div>

      {/* ── Metrics grid ─────────────────────────────────────────────── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16, marginBottom: 32 }}>
        {metrics.map(m => <MetricCard key={m.label} {...m} />)}
      </div>

      {/* ── Main 2-col layout ─────────────────────────────────────────── */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 320px", gap: 20 }}>

        {/* Last report preview */}
        <div style={{ background: "#0d1526", border: "1px solid #1a2540", borderRadius: 14, padding: 28 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: "#00e5cc", textTransform: "uppercase", letterSpacing: "0.8px" }}>
              Latest Report
            </div>
            <a href="/app/reports" style={{ fontSize: 12, color: "#4a5568", textDecoration: "none" }}>
              View all →
            </a>
          </div>

          {connected === 0 ? (
            <div style={{
              display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
              minHeight: 180, gap: 12, textAlign: "center",
            }}>
              <div style={{ fontSize: 32 }}>📊</div>
              <div style={{ fontSize: 14, fontWeight: 600, color: "#e2e8f0" }}>No report yet</div>
              <div style={{ fontSize: 13, color: "#4a5568", maxWidth: 320, lineHeight: 1.6 }}>
                Connect at least one integration — your first AI report generates within 48 hours.
              </div>
              <a href="/app/integrations" style={{
                marginTop: 8,
                background: "#00e5cc", color: "#080d1a",
                padding: "9px 20px", borderRadius: 8,
                fontSize: 13, fontWeight: 700, textDecoration: "none",
              }}>
                Connect integrations →
              </a>
            </div>
          ) : (
            <div>
              <div style={{ fontSize: 13, color: "#4a5568", marginBottom: 16 }}>
                Your first report will appear here within 48 hours of connecting a platform.
              </div>
              {/* Skeleton preview */}
              {["90%", "75%", "60%", "45%"].map((w, i) => (
                <div key={i} style={{
                  height: 12, width: w, background: "#1a2540",
                  borderRadius: 6, marginBottom: 10, opacity: 0.5,
                }} />
              ))}
            </div>
          )}
        </div>

        {/* Right column */}
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

          {/* Integrations status */}
          <div style={{ background: "#0d1526", border: "1px solid #1a2540", borderRadius: 14, padding: 22 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: "#00e5cc", textTransform: "uppercase", letterSpacing: "0.8px" }}>
                Integrations
              </div>
              <a href="/app/integrations" style={{ fontSize: 12, color: "#4a5568", textDecoration: "none" }}>Manage →</a>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {integrations.map(({ name, status }) => (
                <div key={name} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <StatusDot status={status} />
                  <span style={{ fontSize: 13, color: status === "connected" ? "#e2e8f0" : "#334155", flex: 1 }}>{name}</span>
                  <span style={{ fontSize: 11, color: status === "connected" ? "#4ade80" : "#334155", fontWeight: 600 }}>
                    {status === "connected" ? "Live" : "—"}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Pulse AI card — quick entry point */}
          <div style={{
            background: "linear-gradient(135deg, rgba(0,229,204,0.07), rgba(0,153,255,0.04))",
            border: "1px solid rgba(0,229,204,0.15)",
            borderRadius: 14, padding: 22,
          }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: "#00e5cc", textTransform: "uppercase", letterSpacing: "0.8px", marginBottom: 10 }}>
              Pulse AI
            </div>
            <p style={{ fontSize: 13, color: "#4a5568", lineHeight: 1.6, marginBottom: 14 }}>
              Ask questions about your data, get campaign recommendations, or request a performance summary — all on-device.
            </p>
            <div style={{ fontSize: 11, color: "#334155", display: "flex", flexDirection: "column", gap: 5 }}>
              {[
                "Why did my ROAS drop last week?",
                "Where should I increase budget?",
                "What's my best-performing ad?",
              ].map(q => (
                <div key={q} style={{ color: "#4a5568", fontStyle: "italic" }}>"{q}"</div>
              ))}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
