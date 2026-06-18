"use client";

import { useState, useEffect } from "react";

type Report = {
  id: string;
  week_start: string;
  week_end: string;
  status: "sent" | "failed" | "pending" | "generating";
  ai_commentary: string | null;
  data_snapshot: Record<string, number> | null;
  sent_at: string | null;
  created_at: string;
};

function fmt(n: number, type: "currency" | "number" | "multiplier"): string {
  if (!n && n !== 0) return "—";
  if (type === "currency") return n >= 1000 ? `$${(n / 1000).toFixed(1)}k` : `$${n.toFixed(0)}`;
  if (type === "multiplier") return `${n.toFixed(2)}×`;
  return n.toLocaleString();
}

function StatusBadge({ status }: { status: Report["status"] }) {
  const map: Record<string, { label: string; color: string; bg: string }> = {
    sent:       { label: "Delivered", color: "#4ade80", bg: "rgba(74,222,128,0.1)" },
    failed:     { label: "Failed",    color: "#f87171", bg: "rgba(248,113,113,0.1)" },
    pending:    { label: "Pending",   color: "#94a3b8", bg: "rgba(148,163,184,0.1)" },
    generating: { label: "Generating", color: "#f59e0b", bg: "rgba(245,158,11,0.1)" },
  };
  const s = map[status] ?? map.pending;
  return (
    <span style={{
      fontSize: 11, fontWeight: 700, padding: "3px 9px", borderRadius: 100,
      color: s.color, background: s.bg, border: `1px solid ${s.color}30`,
    }}>
      {s.label}
    </span>
  );
}

function ReportCard({ report, onExpand, expanded }: { report: Report; onExpand: () => void; expanded: boolean }) {
  const weekStart = new Date(report.week_start).toLocaleDateString("en-US", { month: "short", day: "numeric" });
  const weekEnd   = new Date(report.week_end).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  const snap = report.data_snapshot ?? {};

  return (
    <div style={{
      background: "#0d1526",
      border: `1px solid ${expanded ? "rgba(0,229,204,0.2)" : "#1a2540"}`,
      borderRadius: 14, overflow: "hidden",
      transition: "border-color 0.15s",
    }}>
      {/* Header row */}
      <div
        onClick={onExpand}
        style={{
          padding: "20px 24px", cursor: "pointer",
          display: "flex", alignItems: "center", gap: 16,
        }}
      >
        {/* Week icon */}
        <div style={{
          width: 40, height: 40, borderRadius: 10, flexShrink: 0,
          background: "rgba(0,229,204,0.08)", border: "1px solid rgba(0,229,204,0.15)",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 18,
        }}>
          📊
        </div>

        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 15, fontWeight: 700, color: "#fff", marginBottom: 3 }}>
            Week of {weekStart} — {weekEnd}
          </div>
          <div style={{ fontSize: 12, color: "#4a5568" }}>
            {report.sent_at
              ? `Delivered ${new Date(report.sent_at).toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}`
              : `Created ${new Date(report.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}`}
          </div>
        </div>

        {/* Snapshot metrics */}
        {snap.shopify_revenue != null && (
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: 11, color: "#4a5568", marginBottom: 2 }}>Revenue</div>
            <div style={{ fontSize: 15, fontWeight: 700, color: "#00e5cc" }}>{fmt(snap.shopify_revenue ?? snap.ga4_revenue ?? 0, "currency")}</div>
          </div>
        )}
        {snap.blended_roas != null && (
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: 11, color: "#4a5568", marginBottom: 2 }}>ROAS</div>
            <div style={{ fontSize: 15, fontWeight: 700, color: "#e2e8f0" }}>{fmt(snap.blended_roas, "multiplier")}</div>
          </div>
        )}
        {snap.ad_spend != null && (
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: 11, color: "#4a5568", marginBottom: 2 }}>Ad Spend</div>
            <div style={{ fontSize: 15, fontWeight: 700, color: "#e2e8f0" }}>{fmt(snap.ad_spend, "currency")}</div>
          </div>
        )}

        <StatusBadge status={report.status} />
        <span style={{ color: "#334155", fontSize: 14, transform: expanded ? "rotate(180deg)" : "none", transition: "transform 0.2s" }}>▾</span>
      </div>

      {/* Expanded: AI commentary + full data snapshot */}
      {expanded && (
        <div style={{ padding: "0 24px 24px", borderTop: "1px solid #1a2540" }}>

          {/* AI Commentary */}
          {report.ai_commentary && (
            <div style={{ marginTop: 20, marginBottom: 20 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: "#00e5cc", textTransform: "uppercase", letterSpacing: "0.8px", marginBottom: 12 }}>
                ⚡ Pulse AI Commentary
              </div>
              <div style={{
                fontSize: 13, color: "#cbd5e1", lineHeight: 1.75,
                background: "rgba(0,229,204,0.03)", border: "1px solid rgba(0,229,204,0.08)",
                borderRadius: 10, padding: "16px 18px",
                whiteSpace: "pre-wrap",
              }}>
                {report.ai_commentary}
              </div>
            </div>
          )}

          {/* Data snapshot grid */}
          {Object.keys(snap).length > 0 && (
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, color: "#4a5568", textTransform: "uppercase", letterSpacing: "0.8px", marginBottom: 12 }}>
                Data Snapshot
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10 }}>
                {Object.entries(snap)
                  .filter(([, v]) => typeof v === "number" && v > 0)
                  .slice(0, 12)
                  .map(([key, value]) => (
                    <div key={key} style={{
                      background: "#080d1a", border: "1px solid #1a2540",
                      borderRadius: 8, padding: "10px 12px",
                    }}>
                      <div style={{ fontSize: 10, color: "#4a5568", textTransform: "uppercase", letterSpacing: "0.4px", marginBottom: 4 }}>
                        {key.replace(/_/g, " ")}
                      </div>
                      <div style={{ fontSize: 14, fontWeight: 700, color: "#e2e8f0" }}>
                        {key.includes("revenue") || key.includes("spend") || key.includes("value") || key.includes("cac") || key.includes("aov") || key.includes("cpc") || key.includes("cpm")
                          ? fmt(value as number, "currency")
                          : key.includes("roas")
                          ? fmt(value as number, "multiplier")
                          : fmt(value as number, "number")}
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          )}

          {report.status === "failed" && (
            <div style={{ marginTop: 16, fontSize: 13, color: "#f87171" }}>
              ⚠ This report failed to generate. Pulse will retry on the next cycle.
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function ReportsPage() {
  const [reports, setReports]   = useState<Report[]>([]);
  const [loading, setLoading]   = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [userId, setUserId]     = useState<string | null>(null);

  const pulse = typeof window !== "undefined"
    ? (window as unknown as { pulse?: { getConfig: () => Promise<Record<string, unknown>> } }).pulse
    : undefined;

  useEffect(() => {
    if (!pulse?.getConfig) { setLoading(false); return; }
    pulse.getConfig().then(async (cfg: Record<string, unknown>) => {
      const uid = (cfg as Record<string, string>).userId;
      setUserId(uid ?? null);
      if (!uid) { setLoading(false); return; }

      try {
        const res = await fetch("/api/reports", {
          headers: { "x-pulse-user-id": uid },
        });
        const json = await res.json();
        setReports(json.reports ?? []);
      } catch {
        // silently fail — empty state shows
      } finally {
        setLoading(false);
      }
    }).catch(() => setLoading(false));
  }, []);

  return (
    <div style={{ padding: "40px 40px 80px", maxWidth: 960 }}>
      <div style={{ marginBottom: 36, display: "flex", alignItems: "flex-end", justifyContent: "space-between" }}>
        <div>
          <h1 style={{ fontSize: 26, fontWeight: 700, color: "#fff", letterSpacing: "-0.5px", marginBottom: 6 }}>
            Reports
          </h1>
          <p style={{ fontSize: 14, color: "#4a5568" }}>
            AI-written weekly reports — delivered to your inbox and stored here permanently.
          </p>
        </div>
        {reports.length > 0 && (
          <div style={{ fontSize: 12, color: "#334155" }}>{reports.length} report{reports.length !== 1 ? "s" : ""}</div>
        )}
      </div>

      {loading ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {[1, 2, 3].map(i => (
            <div key={i} style={{
              height: 80, background: "#0d1526", border: "1px solid #1a2540",
              borderRadius: 14, opacity: 0.5,
              animation: "pulse-skeleton 1.5s ease-in-out infinite",
            }} />
          ))}
        </div>
      ) : reports.length === 0 ? (
        <div style={{
          background: "#0d1526", border: "1px solid #1a2540",
          borderRadius: 16, padding: "64px 40px",
          display: "flex", flexDirection: "column", alignItems: "center",
          textAlign: "center", gap: 12,
        }}>
          <div style={{ fontSize: 40 }}>📋</div>
          <div style={{ fontSize: 16, fontWeight: 700, color: "#e2e8f0" }}>No reports yet</div>
          <p style={{ fontSize: 14, color: "#4a5568", maxWidth: 420, lineHeight: 1.7 }}>
            Your first report generates automatically on Monday morning. Connect at least one integration to get started — reports include AI-written analysis and are delivered to your email.
          </p>
          <a href="/app/integrations" style={{
            marginTop: 8, background: "#00e5cc", color: "#080d1a",
            padding: "10px 22px", borderRadius: 8,
            fontSize: 13, fontWeight: 700, textDecoration: "none",
          }}>
            Connect integrations →
          </a>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {reports.map(r => (
            <ReportCard
              key={r.id}
              report={r}
              expanded={expanded === r.id}
              onExpand={() => setExpanded(expanded === r.id ? null : r.id)}
            />
          ))}
        </div>
      )}

      <style>{`
        @keyframes pulse-skeleton {
          0%, 100% { opacity: 0.4; }
          50% { opacity: 0.8; }
        }
      `}</style>
    </div>
  );
}
