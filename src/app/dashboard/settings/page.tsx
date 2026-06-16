export default function SettingsPage() {
  const mockUser = {
    name: "Connor",
    email: "connor@pulseanalytics.app",
  };

  return (
    <div style={{ padding: 40, maxWidth: 720 }}>
      <div style={{ marginBottom: 40 }}>
        <h1 style={{ fontSize: 28, fontWeight: 700, color: "#fff", letterSpacing: "-0.5px", marginBottom: 8 }}>
          Settings
        </h1>
        <p style={{ color: "#64748b", fontSize: 15 }}>
          Manage your account, billing, and report preferences.
        </p>
      </div>

      {/* Profile */}
      <div style={{ background: "#0d1526", border: "1px solid #1e293b", borderRadius: 12, padding: 24, marginBottom: 20 }}>
        <div style={{ fontSize: 15, fontWeight: 600, color: "#fff", marginBottom: 20 }}>Profile</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
          {[
            { label: "Full name", value: mockUser.name },
            { label: "Email", value: mockUser.email },
            { label: "Company", value: "Demo Agency" },
            { label: "Plan", value: "Demo mode" },
          ].map(({ label, value }) => (
            <div key={label}>
              <div style={{ fontSize: 11, fontWeight: 600, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 6 }}>
                {label}
              </div>
              <div style={{ fontSize: 14, color: "#fff" }}>{value}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Report settings */}
      <div style={{ background: "#0d1526", border: "1px solid #1e293b", borderRadius: 12, padding: 24, marginBottom: 20 }}>
        <div style={{ fontSize: 15, fontWeight: 600, color: "#fff", marginBottom: 20 }}>Report Delivery</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {[
            { label: "Delivery day", value: "Monday" },
            { label: "Delivery time", value: "7:00 AM (your timezone)" },
            { label: "Report email", value: mockUser.email },
            { label: "Frequency", value: "Weekly" },
          ].map(({ label, value }) => (
            <div key={label} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 16px", background: "#0a0f1e", borderRadius: 8, border: "1px solid #1e293b" }}>
              <span style={{ fontSize: 14, color: "#64748b" }}>{label}</span>
              <span style={{ fontSize: 14, color: "#fff", fontWeight: 500 }}>{value}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Billing */}
      <div style={{ background: "#0d1526", border: "1px solid #1e293b", borderRadius: 12, padding: 24 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
          <div style={{ fontSize: 15, fontWeight: 600, color: "#fff" }}>Billing</div>
          <div style={{ background: "rgba(0,229,204,0.1)", border: "1px solid rgba(0,229,204,0.2)", color: "#00e5cc", fontSize: 11, fontWeight: 600, padding: "4px 10px", borderRadius: 100 }}>
            Demo Mode
          </div>
        </div>
        <p style={{ fontSize: 14, color: "#64748b", marginBottom: 20 }}>
          You are running Pulse in demo mode. All data is sample data — no real clients are connected.
        </p>
        <div style={{ display: "inline-block", background: "linear-gradient(135deg, #00e5cc, #0099ff)", color: "#0a0f1e", padding: "10px 20px", borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: "pointer" }}>
          Upgrade to Full Access →
        </div>
      </div>
    </div>
  );
}
