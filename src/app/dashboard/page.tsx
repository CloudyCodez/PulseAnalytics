import PulseAIPanel from "@/components/dashboard/PulseAIPanel";

export default function DashboardPage() {
  const firstName = "Connor";
  const metrics = [
    { label: "Total Ad Spend", value: "$12,480", delta: "+8%", desc: "Across all connected platforms" },
    { label: "Total Revenue", value: "$48,200", delta: "+14%", desc: "Tracked via integrations" },
    { label: "Blended ROAS", value: "3.86x", delta: "+0.4x", desc: "This week vs last week" },
    { label: "Reports Sent", value: "12", delta: null, desc: "This month" },
  ];

  return (
    <div style={{ padding: 40 }}>
      <div style={{ marginBottom: 8, padding: "6px 12px", background: "rgba(255,200,0,0.08)", border: "1px solid rgba(255,200,0,0.3)", borderRadius: 8, display: "inline-block" }}>
        <span style={{ fontSize: 12, color: "#F5A623", fontWeight: 600 }}>Mock Mode active — sample data only</span>
      </div>

      <div style={{ marginTop: 24, marginBottom: 40 }}>
        <h1 style={{ fontSize: 28, fontWeight: 700, marginBottom: 8, color: "#fff" }}>Good morning, {firstName}!</h1>
        <p style={{ fontSize: 15, color: "#64748b" }}>Here is what is happening across your connected platforms.</p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 16, marginBottom: 40 }}>
        {metrics.map(function(m) {
          return (
            <div key={m.label} style={{ background: "#0d1526", border: "1px solid #1e293b", borderRadius: 12, padding: 24 }}>
              <div style={{ fontSize: 11, fontWeight: 600, textTransform: "uppercase", color: "#64748b", marginBottom: 12 }}>{m.label}</div>
              <div style={{ fontSize: 32, fontWeight: 700, color: "#fff", marginBottom: 8 }}>{m.value}</div>
              {m.delta ? <div style={{ fontSize: 12, fontWeight: 600, color: "#00e5cc", marginBottom: 4 }}>{m.delta}</div> : null}
              <div style={{ fontSize: 12, color: "#64748b" }}>{m.desc}</div>
            </div>
          );
        })}
      </div>

      <div style={{ background: "#0d1526", border: "1px solid #1e293b", borderRadius: 12, padding: 24 }}>
        <div style={{ fontSize: 16, fontWeight: 600, color: "#fff", marginBottom: 24 }}>Recent Reports</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {["Acme Co - Week of Jun 9", "BlueSky Agency - Week of Jun 9", "TechFlow Inc - Week of Jun 2"].map(function(r) {
            return (
              <div key={r} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 16px", background: "#0a0f1e", border: "1px solid #1e293b", borderRadius: 8 }}>
                <span style={{ fontSize: 14, color: "#fff" }}>{r}</span>
                <span style={{ fontSize: 12, color: "#00e5cc" }}>Delivered</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Pulse AI — demo only */}
      <PulseAIPanel />
    </div>
  );
}
