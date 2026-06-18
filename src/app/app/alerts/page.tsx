"use client";

import { useState, useEffect } from "react";

type Anomaly = {
  id: string;
  metric: string;
  change_pct: number;
  direction: "up" | "down";
  message: string;
  detected_at: string;
  alerted: boolean;
};

type Thresholds = {
  roas_drop: number;
  spend_spike: number;
  revenue_drop: number;
  cac_rise: number;
};

const DEFAULT_THRESHOLDS: Thresholds = {
  roas_drop:    20,
  spend_spike:  30,
  revenue_drop: 25,
  cac_rise:     20,
};

export default function AlertsPage() {
  const [anomalies, setAnomalies] = useState<Anomaly[]>([]);
  const [loading, setLoading]     = useState(true);
  const [thresholds, setThresholds] = useState<Thresholds>(DEFAULT_THRESHOLDS);
  const [saved, setSaved]         = useState(false);
  const [userId, setUserId]       = useState<string | null>(null);

  const pulse = typeof window !== "undefined"
    ? (window as unknown as { pulse?: { getConfig: () => Promise<Record<string, unknown>>; saveConfig: (v: unknown) => Promise<unknown> } }).pulse
    : undefined;

  useEffect(() => {
    if (!pulse?.getConfig) { setLoading(false); return; }
    pulse.getConfig().then(async (cfg: Record<string, unknown>) => {
      const uid = (cfg as Record<string, string>).userId;
      setUserId(uid ?? null);

      // Load saved thresholds from config
      const saved = (cfg as Record<string, Thresholds>).alert_thresholds;
      if (saved) setThresholds({ ...DEFAULT_THRESHOLDS, ...saved });

      if (!uid) { setLoading(false); return; }

      // Load anomalies from Supabase via the dashboard endpoint
      try {
        const res = await fetch("/api/app/dashboard", {
          headers: { "x-pulse-user-id": uid },
        });
        const json = await res.json();
        setAnomalies(json.anomalies ?? []);
      } catch {
        // silently fail
      } finally {
        setLoading(false);
      }
    }).catch(() => setLoading(false));
  }, []);

  async function saveThresholds() {
    if (!pulse?.saveConfig) return;
    await pulse.saveConfig({ alert_thresholds: thresholds });
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  }

  function setField(key: keyof Thresholds, raw: string) {
    const v = parseFloat(raw.replace("%", ""));
    if (!isNaN(v)) setThresholds(t => ({ ...t, [key]: v }));
  }

  const inputStyle: React.CSSProperties = {
    width: "100%", background: "#080d1a",
    border: "1px solid #1a2540", borderRadius: 8,
    padding: "9px 12px", fontSize: 13, color: "#e2e8f0",
    outline: "none", fontFamily: "inherit",
  };

  const labelStyle: React.CSSProperties = {
    fontSize: 11, fontWeight: 600, color: "#4a5568",
    textTransform: "uppercase", letterSpacing: "0.5px",
    display: "block", marginBottom: 6,
  };

  return (
    <div style={{ padding: "40px 40px 80px", maxWidth: 900 }}>
      <div style={{ marginBottom: 36 }}>
        <h1 style={{ fontSize: 26, fontWeight: 700, color: "#fff", letterSpacing: "-0.5px", marginBottom: 6 }}>Alerts</h1>
        <p style={{ fontSize: 14, color: "#4a5568" }}>
          Pulse checks your data and fires alerts when a metric moves significantly.
        </p>
      </div>

      {/* Thresholds */}
      <div style={{ background: "#0d1526", border: "1px solid #1a2540", borderRadius: 14, padding: 24, marginBottom: 24 }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: "#00e5cc", textTransform: "uppercase", letterSpacing: "0.8px", marginBottom: 18 }}>
          Alert Thresholds
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, maxWidth: 560, marginBottom: 20 }}>
          {([
            { key: "roas_drop",    label: "ROAS drops more than" },
            { key: "spend_spike",  label: "Ad spend spikes more than" },
            { key: "revenue_drop", label: "Revenue drops more than" },
            { key: "cac_rise",     label: "CAC rises more than" },
          ] as { key: keyof Thresholds; label: string }[]).map(({ key, label }) => (
            <div key={key}>
              <label style={labelStyle}>{label}</label>
              <input
                style={inputStyle}
                value={`${thresholds[key]}%`}
                onChange={e => setField(key, e.target.value)}
                onFocus={e => e.target.select()}
              />
            </div>
          ))}
        </div>
        <button
          onClick={saveThresholds}
          style={{
            padding: "9px 20px", borderRadius: 8,
            background: saved ? "rgba(74,222,128,0.12)" : "#00e5cc",
            border: saved ? "1px solid rgba(74,222,128,0.3)" : "none",
            color: saved ? "#4ade80" : "#080d1a",
            fontSize: 13, fontWeight: 700, fontFamily: "inherit", cursor: "pointer",
            transition: "all 0.2s",
          }}
        >
          {saved ? "✓ Saved" : "Save thresholds"}
        </button>
      </div>

      {/* Alert feed */}
      <div style={{ background: "#0d1526", border: "1px solid #1a2540", borderRadius: 14, padding: 24 }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: "#00e5cc", textTransform: "uppercase", letterSpacing: "0.8px", marginBottom: 18 }}>
          Alert History
        </div>

        {loading ? (
          [1, 2, 3].map(i => (
            <div key={i} style={{
              height: 56, background: "#1a2540", borderRadius: 10, marginBottom: 10,
              opacity: 0.4, animation: "pulse-skeleton 1.5s ease-in-out infinite",
            }} />
          ))
        ) : anomalies.length === 0 ? (
          <div style={{
            padding: "40px 0", textAlign: "center",
            display: "flex", flexDirection: "column", alignItems: "center", gap: 10,
          }}>
            <div style={{ fontSize: 32 }}>🔔</div>
            <div style={{ fontSize: 14, fontWeight: 600, color: "#e2e8f0" }}>No alerts fired yet</div>
            <p style={{ fontSize: 13, color: "#4a5568", maxWidth: 360, lineHeight: 1.6 }}>
              Pulse checks your metrics automatically. When something crosses a threshold, it shows here and gets sent to your email and Slack (if connected).
            </p>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {anomalies.map(a => {
              const isUp = a.direction === "up";
              const color = isUp ? "#4ade80" : "#f87171";
              return (
                <div key={a.id} style={{
                  display: "flex", alignItems: "flex-start", gap: 14,
                  background: "#080d1a", border: `1px solid ${isUp ? "rgba(74,222,128,0.1)" : "rgba(248,113,113,0.1)"}`,
                  borderRadius: 10, padding: "14px 16px",
                }}>
                  <div style={{
                    width: 36, height: 36, borderRadius: 9, flexShrink: 0,
                    background: isUp ? "rgba(74,222,128,0.1)" : "rgba(248,113,113,0.1)",
                    border: `1px solid ${color}30`,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 16, color,
                  }}>
                    {isUp ? "↑" : "↓"}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: "#e2e8f0", marginBottom: 3 }}>
                      {a.message}
                    </div>
                    <div style={{ fontSize: 11, color: "#4a5568" }}>
                      {a.metric.replace(/_/g, " ")} ·{" "}
                      {new Date(a.detected_at).toLocaleDateString("en-US", {
                        month: "short", day: "numeric",
                        hour: "2-digit", minute: "2-digit",
                      })}
                    </div>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 4 }}>
                    <div style={{ fontSize: 15, fontWeight: 700, color }}>
                      {isUp ? "+" : ""}{a.change_pct?.toFixed(1)}%
                    </div>
                    {a.alerted && (
                      <span style={{
                        fontSize: 10, fontWeight: 700, color: "#4ade80",
                        background: "rgba(74,222,128,0.1)", padding: "2px 7px",
                        borderRadius: 100, border: "1px solid rgba(74,222,128,0.2)",
                      }}>
                        Notified
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <style>{`
        @keyframes pulse-skeleton {
          0%, 100% { opacity: 0.4; }
          50% { opacity: 0.8; }
        }
      `}</style>
    </div>
  );
}
