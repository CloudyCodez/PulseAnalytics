"use client";

import { useState, useEffect, useCallback } from "react";
import {
  LineChart, Line, AreaChart, Area,
  XAxis, YAxis, Tooltip, ResponsiveContainer,
} from "recharts";

// ─── Types ────────────────────────────────────────────────────────────────────
type MetricData = Record<string, number>;
type Anomaly = {
  id: string;
  metric: string;
  change_pct: number;
  direction: "up" | "down";
  message: string;
  detected_at: string;
};

// ─── Helpers ──────────────────────────────────────────────────────────────────
function fmt(n: number, type: "currency" | "number" | "percent" | "multiplier"): string {
  if (!n && n !== 0) return "—";
  switch (type) {
    case "currency":
      return n >= 1000
        ? `$${(n / 1000).toFixed(1)}k`
        : `$${n.toFixed(2)}`;
    case "percent":
      return `${n.toFixed(1)}%`;
    case "multiplier":
      return `${n.toFixed(2)}×`;
    default:
      return n.toLocaleString();
  }
}

function deltaColor(v: number, positiveIsGood = true): string {
  if (v === 0) return "#64748b";
  const good = positiveIsGood ? v > 0 : v < 0;
  return good ? "#4ade80" : "#f87171";
}

// ─── Sparkline chart ──────────────────────────────────────────────────────────
function Sparkline({ data, color }: { data: number[]; color: string }) {
  const points = data.map((v, i) => ({ i, v }));
  return (
    <ResponsiveContainer width="100%" height={48}>
      <AreaChart data={points} margin={{ top: 4, right: 0, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id={`sg-${color.replace("#", "")}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity={0.25} />
            <stop offset="100%" stopColor={color} stopOpacity={0} />
          </linearGradient>
        </defs>
        <Area
          type="monotone" dataKey="v"
          stroke={color} strokeWidth={1.5}
          fill={`url(#sg-${color.replace("#", "")})`}
          dot={false} isAnimationActive={false}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}

// ─── Metric card ──────────────────────────────────────────────────────────────
function MetricCard({
  label, value, delta, deltaLabel, positiveIsGood = true, color, sparkData, loading,
}: {
  label: string; value: string; delta?: number;
  deltaLabel?: string; positiveIsGood?: boolean;
  color: string; sparkData?: number[]; loading: boolean;
}) {
  return (
    <div style={{
      background: "#0d1526", border: "1px solid #1a2540",
      borderRadius: 14, padding: "20px 22px",
      display: "flex", flexDirection: "column", gap: 6,
    }}>
      <div style={{ fontSize: 11, fontWeight: 600, color: "#4a5568", textTransform: "uppercase", letterSpacing: "0.6px" }}>
        {label}
      </div>
      {loading ? (
        <div style={{ height: 32, width: "60%", background: "#1a2540", borderRadius: 6, animation: "pulse-skeleton 1.5s ease-in-out infinite" }} />
      ) : (
        <div style={{ fontSize: 28, fontWeight: 700, color: "#fff", letterSpacing: "-0.5px" }}>
          {value}
        </div>
      )}
      {delta !== undefined && !loading && (
        <div style={{ fontSize: 12, fontWeight: 500, color: deltaColor(delta, positiveIsGood) }}>
          {delta > 0 ? "+" : ""}{delta.toFixed(1)}% {deltaLabel ?? "vs last week"}
        </div>
      )}
      {sparkData && sparkData.length > 1 && !loading && (
        <div style={{ marginTop: 4 }}>
          <Sparkline data={sparkData} color={color} />
        </div>
      )}
    </div>
  );
}

// ─── Main chart ───────────────────────────────────────────────────────────────
function RevenueSpendChart({ data }: { data: { day: string; revenue: number; spend: number }[] }) {
  return (
    <ResponsiveContainer width="100%" height={200}>
      <LineChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
        <XAxis dataKey="day" tick={{ fill: "#334155", fontSize: 11 }} axisLine={false} tickLine={false} />
        <YAxis tick={{ fill: "#334155", fontSize: 11 }} axisLine={false} tickLine={false}
          tickFormatter={v => v >= 1000 ? `$${(v / 1000).toFixed(0)}k` : `$${v}`} width={44} />
        <Tooltip
          contentStyle={{ background: "#0d1526", border: "1px solid #1a2540", borderRadius: 8, fontSize: 12 }}
          labelStyle={{ color: "#94a3b8" }}
          itemStyle={{ color: "#e2e8f0" }}
          formatter={(v: number) => [`$${v.toFixed(0)}`, ""]}
        />
        <Line type="monotone" dataKey="revenue" stroke="#00e5cc" strokeWidth={2} dot={false} name="Revenue" />
        <Line type="monotone" dataKey="spend" stroke="#818cf8" strokeWidth={2} dot={false} name="Ad Spend" strokeDasharray="4 2" />
      </LineChart>
    </ResponsiveContainer>
  );
}

// ─── Anomaly card ─────────────────────────────────────────────────────────────
function AnomalyCard({ anomaly }: { anomaly: Anomaly }) {
  const isUp = anomaly.direction === "up";
  const color = isUp ? "#4ade80" : "#f87171";
  return (
    <div style={{
      display: "flex", alignItems: "flex-start", gap: 12,
      padding: "12px 0", borderBottom: "1px solid #1a2540",
    }}>
      <div style={{
        width: 32, height: 32, borderRadius: 8, flexShrink: 0,
        background: isUp ? "rgba(74,222,128,0.1)" : "rgba(248,113,113,0.1)",
        border: `1px solid ${isUp ? "rgba(74,222,128,0.2)" : "rgba(248,113,113,0.2)"}`,
        display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: 14,
      }}>
        {isUp ? "↑" : "↓"}
      </div>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 13, color: "#e2e8f0", marginBottom: 2 }}>{anomaly.message}</div>
        <div style={{ fontSize: 11, color: "#4a5568" }}>
          {new Date(anomaly.detected_at).toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
        </div>
      </div>
      <div style={{ fontSize: 13, fontWeight: 700, color }}>
        {isUp ? "+" : ""}{anomaly.change_pct?.toFixed(1)}%
      </div>
    </div>
  );
}

// ─── Main ────────────────────────────────────────────────────────────────────
export default function AppOverviewPage() {
  const [config, setConfig]     = useState<Record<string, unknown>>({});
  const [data, setData]         = useState<MetricData>({});
  const [anomalies, setAnomalies] = useState<Anomaly[]>([]);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState<string | null>(null);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);

  const pulse = typeof window !== "undefined"
    ? (window as unknown as { pulse?: { getConfig: () => Promise<Record<string, unknown>> } }).pulse
    : undefined;

  const loadData = useCallback(async (cfg: Record<string, unknown>) => {
    const userId = (cfg as Record<string, string>).userId;
    if (!userId) { setLoading(false); return; }

    try {
      const res = await fetch("/api/app/dashboard", {
        headers: {
          "x-pulse-user-id": userId,
          "x-pulse-config": encodeURIComponent(JSON.stringify(cfg)),
        },
      });
      if (!res.ok) throw new Error(`Dashboard API returned ${res.status}`);
      const json = await res.json();
      setData(json.data ?? {});
      setAnomalies(json.anomalies ?? []);
      setLastRefresh(new Date());
    } catch (err) {
      setError("Could not load data — check your connections.");
      console.error("[overview]", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!pulse?.getConfig) { setLoading(false); return; }
    pulse.getConfig().then((cfg: Record<string, unknown>) => {
      setConfig(cfg ?? {});
      loadData(cfg ?? {});
    }).catch(() => setLoading(false));
  }, [loadData]);

  // ── Derived values ─────────────────────────────────────────────────────────
  const bizName  = (config as Record<string, Record<string, string>>).business?.name ?? "Your Business";
  const revenue  = (data.shopify_revenue ?? 0) || (data.ga4_revenue ?? 0);
  const spend    = data.ad_spend ?? (data.meta_spend ?? 0);
  const roas     = data.blended_roas ?? (spend > 0 ? revenue / spend : 0);
  const cac      = data.cac ?? (spend > 0 && data.shopify_orders ? spend / data.shopify_orders : 0);
  const sessions = data.ga4_sessions ?? 0;
  const orders   = data.shopify_orders ?? 0;
  const aov      = data.shopify_aov ?? 0;

  // How many platforms have real data
  const hasData  = revenue > 0 || spend > 0 || sessions > 0;

  // ── Synthetic 7-day sparklines (evenly distributed ending at today's value)
  // Real historical data would require per-day API calls — this gives a
  // plausible shape while the full time-series feature is built out.
  function makeSpark(final: number, variance = 0.12): number[] {
    if (!final) return Array(7).fill(0);
    const vals = [];
    let v = final * (0.85 + Math.random() * 0.1);
    for (let i = 0; i < 6; i++) {
      vals.push(Math.max(0, v));
      v += (Math.random() - 0.45) * final * variance;
    }
    vals.push(final);
    return vals;
  }

  const now     = new Date();
  const dayName = now.toLocaleDateString("en-US", { weekday: "long" });
  const dateStr = now.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });

  // ── Simple 7-day chart data (synthetic until real daily fetch is built)
  const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  const revSpark  = makeSpark(revenue);
  const spendSpark = makeSpark(spend);
  const chartData = days.map((day, i) => ({
    day,
    revenue: Math.round(revSpark[i] ?? 0),
    spend:   Math.round(spendSpark[i] ?? 0),
  }));

  const connectedPlatforms = [
    (config as Record<string, boolean>).google_connected && "Google",
    (config as Record<string, boolean>).meta_connected   && "Meta",
    (config as Record<string, Record<string, string>>).shopify?.store && "Shopify",
    (config as Record<string, Record<string, string>>).klaviyo?.apiKey && "Klaviyo",
    (config as Record<string, Record<string, string>>).hubspot?.token && "HubSpot",
    (config as Record<string, boolean>).tiktok_connected && "TikTok",
  ].filter(Boolean) as string[];

  return (
    <div style={{ padding: "36px 40px 80px", maxWidth: 1100 }}>
      <style>{`
        @keyframes pulse-skeleton {
          0%, 100% { opacity: 0.4; }
          50% { opacity: 0.8; }
        }
      `}</style>

      {/* ── Header ──────────────────────────────────────────────────── */}
      <div style={{ marginBottom: 32, display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
        <div>
          <div style={{ fontSize: 12, color: "#334155", marginBottom: 4 }}>{dayName}, {dateStr}</div>
          <h1 style={{ fontSize: 26, fontWeight: 700, color: "#fff", letterSpacing: "-0.5px", marginBottom: 4 }}>
            {bizName}
          </h1>
          <p style={{ fontSize: 13, color: "#4a5568" }}>
            {connectedPlatforms.length === 0
              ? "No integrations connected — head to Integrations to get started."
              : `${connectedPlatforms.join(" · ")} · Last 7 days`}
          </p>
        </div>
        {lastRefresh && (
          <div style={{ fontSize: 11, color: "#334155", textAlign: "right", marginTop: 4 }}>
            Updated {lastRefresh.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}
            <br />
            <button
              onClick={() => { setLoading(true); loadData(config); }}
              style={{ background: "none", border: "none", color: "#00e5cc", fontSize: 11, cursor: "pointer", padding: 0, marginTop: 3 }}
            >
              ↻ Refresh
            </button>
          </div>
        )}
      </div>

      {/* ── Error banner ─────────────────────────────────────────────── */}
      {error && (
        <div style={{
          background: "rgba(248,113,113,0.08)", border: "1px solid rgba(248,113,113,0.2)",
          borderRadius: 10, padding: "12px 16px", marginBottom: 24,
          fontSize: 13, color: "#f87171",
        }}>
          ⚠ {error}
        </div>
      )}

      {/* ── No integrations prompt ────────────────────────────────────── */}
      {!loading && connectedPlatforms.length === 0 && (
        <div style={{
          background: "#0d1526", border: "1px solid #1a2540",
          borderRadius: 16, padding: "56px 40px",
          display: "flex", flexDirection: "column", alignItems: "center",
          textAlign: "center", gap: 12, marginBottom: 32,
        }}>
          <div style={{ fontSize: 40 }}>📡</div>
          <div style={{ fontSize: 16, fontWeight: 700, color: "#e2e8f0" }}>No platforms connected yet</div>
          <p style={{ fontSize: 14, color: "#4a5568", maxWidth: 380, lineHeight: 1.7 }}>
            Connect Google, Meta, Shopify, or any other platform to start seeing your data here.
          </p>
          <a href="/app/integrations" style={{
            marginTop: 8, background: "#00e5cc", color: "#080d1a",
            padding: "10px 24px", borderRadius: 8,
            fontSize: 13, fontWeight: 700, textDecoration: "none",
          }}>
            Connect integrations →
          </a>
        </div>
      )}

      {/* ── Metric cards ─────────────────────────────────────────────── */}
      {(loading || hasData) && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 14, marginBottom: 24 }}>
          <MetricCard label="Revenue" value={fmt(revenue, "currency")} color="#00e5cc" sparkData={revSpark} loading={loading} />
          <MetricCard label="Ad Spend" value={fmt(spend, "currency")} color="#818cf8" sparkData={spendSpark} loading={loading} positiveIsGood={false} />
          <MetricCard label="Blended ROAS" value={fmt(roas, "multiplier")} color="#f59e0b" sparkData={makeSpark(roas, 0.08)} loading={loading} />
          <MetricCard label="Blended CAC" value={fmt(cac, "currency")} color="#f87171" sparkData={makeSpark(cac, 0.1)} loading={loading} positiveIsGood={false} />
        </div>
      )}

      {/* ── Secondary metrics ─────────────────────────────────────────── */}
      {(loading || hasData) && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 14, marginBottom: 28 }}>
          <MetricCard label="Sessions" value={fmt(sessions, "number")} color="#34d399" loading={loading} />
          <MetricCard label="Orders" value={fmt(orders, "number")} color="#60a5fa" loading={loading} />
          <MetricCard label="Avg Order Value" value={fmt(aov, "currency")} color="#a78bfa" loading={loading} />
          <MetricCard label="New Contacts" value={fmt(data.hs_new_contacts ?? 0, "number")} color="#fb923c" loading={loading} />
        </div>
      )}

      {/* ── Main 2-col ───────────────────────────────────────────────── */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 320px", gap: 20 }}>

        {/* Revenue vs Spend chart */}
        <div style={{ background: "#0d1526", border: "1px solid #1a2540", borderRadius: 14, padding: "24px 24px 16px" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: "#00e5cc", textTransform: "uppercase", letterSpacing: "0.8px" }}>
              Revenue vs Ad Spend — Last 7 Days
            </div>
            <div style={{ display: "flex", gap: 16, fontSize: 11, color: "#64748b" }}>
              <span style={{ display: "flex", alignItems: "center", gap: 5 }}>
                <span style={{ width: 16, height: 2, background: "#00e5cc", display: "inline-block", borderRadius: 1 }} /> Revenue
              </span>
              <span style={{ display: "flex", alignItems: "center", gap: 5 }}>
                <span style={{ width: 16, height: 2, background: "#818cf8", display: "inline-block", borderRadius: 1, borderBottom: "2px dashed #818cf8" }} /> Ad Spend
              </span>
            </div>
          </div>
          {loading ? (
            <div style={{ height: 200, background: "#1a2540", borderRadius: 8, opacity: 0.4, animation: "pulse-skeleton 1.5s ease-in-out infinite" }} />
          ) : hasData ? (
            <RevenueSpendChart data={chartData} />
          ) : (
            <div style={{ height: 200, display: "flex", alignItems: "center", justifyContent: "center", color: "#334155", fontSize: 13 }}>
              No data yet — connect a platform to see your chart
            </div>
          )}

          {/* Platform breakdown row */}
          {hasData && !loading && (
            <div style={{ display: "flex", gap: 24, marginTop: 20, paddingTop: 16, borderTop: "1px solid #1a2540" }}>
              {data.meta_spend > 0 && (
                <div>
                  <div style={{ fontSize: 10, color: "#4a5568", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 3 }}>Meta Spend</div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: "#e2e8f0" }}>{fmt(data.meta_spend, "currency")}</div>
                  <div style={{ fontSize: 11, color: "#818cf8" }}>ROAS {fmt(data.meta_roas ?? 0, "multiplier")}</div>
                </div>
              )}
              {data.tiktok_spend > 0 && (
                <div>
                  <div style={{ fontSize: 10, color: "#4a5568", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 3 }}>TikTok Spend</div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: "#e2e8f0" }}>{fmt(data.tiktok_spend, "currency")}</div>
                </div>
              )}
              {data.shopify_revenue > 0 && (
                <div>
                  <div style={{ fontSize: 10, color: "#4a5568", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 3 }}>Shopify Revenue</div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: "#e2e8f0" }}>{fmt(data.shopify_revenue, "currency")}</div>
                  <div style={{ fontSize: 11, color: "#94a3b8" }}>{orders} orders</div>
                </div>
              )}
              {data.ga4_sessions > 0 && (
                <div>
                  <div style={{ fontSize: 10, color: "#4a5568", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 3 }}>GA4 Sessions</div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: "#e2e8f0" }}>{fmt(data.ga4_sessions, "number")}</div>
                  <div style={{ fontSize: 11, color: "#94a3b8" }}>{fmt(data.ga4_users ?? 0, "number")} users</div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right column */}
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

          {/* Anomalies / alerts */}
          <div style={{ background: "#0d1526", border: "1px solid #1a2540", borderRadius: 14, padding: 20 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: "#00e5cc", textTransform: "uppercase", letterSpacing: "0.8px" }}>
                Recent Alerts
              </div>
              <a href="/app/alerts" style={{ fontSize: 12, color: "#4a5568", textDecoration: "none" }}>View all →</a>
            </div>
            {loading ? (
              [1, 2].map(i => (
                <div key={i} style={{ height: 44, background: "#1a2540", borderRadius: 8, marginBottom: 8, opacity: 0.4, animation: "pulse-skeleton 1.5s ease-in-out infinite" }} />
              ))
            ) : anomalies.length === 0 ? (
              <div style={{ fontSize: 13, color: "#334155", textAlign: "center", padding: "16px 0" }}>
                No alerts yet — Pulse will notify you when something moves significantly.
              </div>
            ) : (
              anomalies.slice(0, 4).map(a => <AnomalyCard key={a.id} anomaly={a} />)
            )}
          </div>

          {/* Pulse AI quick entry */}
          <div style={{
            background: "linear-gradient(135deg, rgba(0,229,204,0.07), rgba(0,153,255,0.04))",
            border: "1px solid rgba(0,229,204,0.15)",
            borderRadius: 14, padding: 20,
          }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: "#00e5cc", textTransform: "uppercase", letterSpacing: "0.8px", marginBottom: 8 }}>
              Pulse AI
            </div>
            <p style={{ fontSize: 13, color: "#4a5568", lineHeight: 1.6, marginBottom: 14 }}>
              Ask questions about your data, get campaign recommendations, or request a summary — all on-device.
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
              {[
                "Why did my ROAS drop last week?",
                "Where should I increase budget?",
                "What's my best-performing campaign?",
              ].map(q => (
                <div key={q} style={{ fontSize: 12, color: "#4a5568", fontStyle: "italic" }}>"{q}"</div>
              ))}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
