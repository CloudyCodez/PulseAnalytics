export default function AlertsPage() {
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
          Alerts
        </h1>
        <p style={{ color: "var(--muted)", fontSize: 15 }}>
          Anomaly detection — know when something changes before your next report.
        </p>
      </div>

      {/* Alert config card */}
      <div
        style={{
          background: "var(--navy-2)",
          border: "1px solid var(--border)",
          borderRadius: 12,
          padding: 24,
          marginBottom: 24,
        }}
      >
        <div
          style={{
            fontFamily: "'Space Grotesk',sans-serif",
            fontSize: 15,
            fontWeight: 600,
            color: "var(--white)",
            marginBottom: 20,
          }}
        >
          Alert Preferences
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {[
            { label: "ROAS drops more than 25%", enabled: true },
            { label: "Ad spend increases more than 30% unexpectedly", enabled: true },
            { label: "Revenue falls more than 20% week-over-week", enabled: true },
            { label: "Shopify conversion rate drops below 1%", enabled: false },
          ].map(({ label, enabled }) => (
            <div
              key={label}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "12px 16px",
                background: "var(--navy-3)",
                borderRadius: 8,
                border: "1px solid var(--border)",
              }}
            >
              <span style={{ fontSize: 14, color: "var(--white)" }}>{label}</span>
              <div
                style={{
                  width: 40,
                  height: 22,
                  borderRadius: 100,
                  background: enabled ? "var(--cyan)" : "var(--navy)",
                  border: enabled ? "none" : "1px solid var(--border)",
                  position: "relative",
                  cursor: "pointer",
                  flexShrink: 0,
                }}
              >
                <div
                  style={{
                    position: "absolute",
                    top: 3,
                    left: enabled ? 21 : 3,
                    width: 16,
                    height: 16,
                    borderRadius: "50%",
                    background: enabled ? "var(--navy)" : "var(--muted)",
                    transition: "left .2s",
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Empty alert feed */}
      <div
        style={{
          background: "var(--navy-2)",
          border: "1px solid var(--border)",
          borderRadius: 12,
          padding: "60px 40px",
          textAlign: "center",
        }}
      >
        <div style={{ fontSize: 40, marginBottom: 16 }}>🟢</div>
        <div
          style={{
            fontFamily: "'Space Grotesk',sans-serif",
            fontSize: 16,
            fontWeight: 600,
            color: "var(--white)",
            marginBottom: 8,
          }}
        >
          No anomalies detected
        </div>
        <p style={{ fontSize: 14, color: "var(--muted)" }}>
          Pulse monitors your metrics every Tuesday and Thursday. Alerts will appear here when something unusual is detected.
        </p>
      </div>
    </div>
  );
}
