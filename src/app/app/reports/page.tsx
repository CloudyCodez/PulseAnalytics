"use client";

export default function ReportsPage() {
  return (
    <div style={{ padding: "40px 40px 80px", maxWidth: 900 }}>
      <div style={{ marginBottom: 36 }}>
        <h1 style={{ fontSize: 26, fontWeight: 700, color: "#fff", letterSpacing: "-0.5px", marginBottom: 6 }}>
          Reports
        </h1>
        <p style={{ fontSize: 14, color: "#4a5568" }}>
          AI-written weekly reports delivered to your inbox and stored here.
        </p>
      </div>

      {/* Empty state */}
      <div style={{
        background: "#0d1526", border: "1px solid #1a2540",
        borderRadius: 16, padding: "64px 40px",
        display: "flex", flexDirection: "column", alignItems: "center",
        textAlign: "center", gap: 12,
      }}>
        <div style={{ fontSize: 40 }}>📋</div>
        <div style={{ fontSize: 16, fontWeight: 700, color: "#e2e8f0" }}>No reports yet</div>
        <p style={{ fontSize: 14, color: "#4a5568", maxWidth: 400, lineHeight: 1.7 }}>
          Your first report generates within 48 hours of connecting a platform. Reports are written by Pulse AI and delivered to your inbox every Monday.
        </p>
        <a href="/app/integrations" style={{
          marginTop: 8,
          background: "#00e5cc", color: "#080d1a",
          padding: "10px 22px", borderRadius: 8,
          fontSize: 13, fontWeight: 700, textDecoration: "none",
        }}>
          Connect integrations →
        </a>
      </div>
    </div>
  );
}
