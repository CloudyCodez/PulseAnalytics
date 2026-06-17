"use client";

export default function AlertsPage() {
  return (
    <div style={{ padding: "40px 40px 80px", maxWidth: 900 }}>
      <div style={{ marginBottom: 36 }}>
        <h1 style={{ fontSize: 26, fontWeight: 700, color: "#fff", letterSpacing: "-0.5px", marginBottom: 6 }}>
          Alerts
        </h1>
        <p style={{ fontSize: 14, color: "#4a5568" }}>
          Pulse monitors your data daily and fires alerts when something significant moves.
        </p>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 16, marginBottom: 32 }}>
        {/* Alert thresholds config */}
        <div style={{ background: "#0d1526", border: "1px solid #1a2540", borderRadius: 14, padding: 24 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: "#00e5cc", textTransform: "uppercase", letterSpacing: "0.8px", marginBottom: 16 }}>
            Alert Thresholds
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, maxWidth: 560 }}>
            {[
              { label: "ROAS drops more than", default: "20%" },
              { label: "Spend spikes more than", default: "30%" },
              { label: "Revenue drops more than", default: "25%" },
              { label: "CAC rises more than", default: "20%" },
            ].map(({ label, default: def }) => (
              <div key={label}>
                <label style={{ fontSize: 11, fontWeight: 600, color: "#4a5568", textTransform: "uppercase", letterSpacing: "0.5px", display: "block", marginBottom: 6 }}>
                  {label}
                </label>
                <input
                  defaultValue={def}
                  style={{
                    width: "100%", background: "#080d1a",
                    border: "1px solid #1a2540", borderRadius: 8,
                    padding: "9px 12px", fontSize: 13, color: "#e2e8f0",
                    outline: "none", fontFamily: "inherit",
                  }}
                />
              </div>
            ))}
          </div>
          <button style={{
            marginTop: 20,
            padding: "9px 20px", borderRadius: 8,
            background: "#00e5cc", color: "#080d1a",
            fontSize: 13, fontWeight: 700, border: "none",
            cursor: "pointer", fontFamily: "inherit",
          }}>
            Save thresholds
          </button>
        </div>
      </div>

      {/* No alerts yet */}
      <div style={{
        background: "#0d1526", border: "1px solid #1a2540",
        borderRadius: 14, padding: "48px 32px",
        display: "flex", flexDirection: "column", alignItems: "center",
        textAlign: "center", gap: 10,
      }}>
        <div style={{ fontSize: 32 }}>🔔</div>
        <div style={{ fontSize: 15, fontWeight: 600, color: "#e2e8f0" }}>No alerts fired yet</div>
        <p style={{ fontSize: 13, color: "#4a5568", maxWidth: 360, lineHeight: 1.6 }}>
          Pulse checks your data every 24 hours. When a metric crosses a threshold, you'll see it here and receive an email.
        </p>
      </div>
    </div>
  );
}
