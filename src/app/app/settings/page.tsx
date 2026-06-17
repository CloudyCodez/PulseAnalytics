"use client";

import { useState, useEffect } from "react";

type Config = Record<string, unknown>;

export default function AppSettingsPage() {
  const [config, setConfig] = useState<Config>({});
  const [saved, setSaved]   = useState(false);
  const [bizName, setBizName]     = useState("");
  const [bizIndustry, setBizIndustry] = useState("");
  const [bizWebsite, setBizWebsite]   = useState("");
  const [reportEmail, setReportEmail] = useState("");
  const [reportFreq, setReportFreq]   = useState("weekly");

  const pulse = typeof window !== "undefined"
    ? (window as unknown as { pulse?: { getConfig: () => Promise<Config>; saveConfig: (v: unknown) => Promise<unknown> } }).pulse
    : undefined;

  useEffect(() => {
    if (pulse?.getConfig) {
      pulse.getConfig().then((cfg: Config) => {
        setConfig(cfg ?? {});
        const biz = (cfg as Record<string, Record<string, string>>).business ?? {};
        const rep = (cfg as Record<string, Record<string, string>>).reporting ?? {};
        setBizName(biz.name ?? "");
        setBizIndustry(biz.industry ?? "");
        setBizWebsite(biz.website ?? "");
        setReportEmail(rep.email ?? "");
        setReportFreq(rep.frequency ?? "weekly");
      }).catch(() => {});
    }
  }, []);

  async function save() {
    if (!pulse?.saveConfig) return;
    await pulse.saveConfig({
      business:  { name: bizName, industry: bizIndustry, website: bizWebsite },
      reporting: { email: reportEmail, frequency: reportFreq },
    });
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
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
    <div style={{ padding: "40px 40px 80px", maxWidth: 640 }}>
      <div style={{ marginBottom: 36 }}>
        <h1 style={{ fontSize: 26, fontWeight: 700, color: "#fff", letterSpacing: "-0.5px", marginBottom: 6 }}>
          Settings
        </h1>
        <p style={{ fontSize: 14, color: "#4a5568" }}>
          Business profile, report delivery, and integrations.
        </p>
      </div>

      {/* Business info */}
      <div style={{ background: "#0d1526", border: "1px solid #1a2540", borderRadius: 14, padding: 24, marginBottom: 16 }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: "#00e5cc", textTransform: "uppercase", letterSpacing: "0.8px", marginBottom: 18 }}>
          Business Info
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 14 }}>
          <div>
            <label style={labelStyle}>Business Name</label>
            <input style={inputStyle} value={bizName} onChange={e => setBizName(e.target.value)} placeholder="Acme Co." />
          </div>
          <div>
            <label style={labelStyle}>Industry</label>
            <input style={inputStyle} value={bizIndustry} onChange={e => setBizIndustry(e.target.value)} placeholder="eCommerce, SaaS…" />
          </div>
        </div>
        <div>
          <label style={labelStyle}>Website</label>
          <input style={inputStyle} value={bizWebsite} onChange={e => setBizWebsite(e.target.value)} placeholder="https://yoursite.com" />
        </div>
      </div>

      {/* Report delivery */}
      <div style={{ background: "#0d1526", border: "1px solid #1a2540", borderRadius: 14, padding: 24, marginBottom: 24 }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: "#00e5cc", textTransform: "uppercase", letterSpacing: "0.8px", marginBottom: 18 }}>
          Report Delivery
        </div>
        <div style={{ marginBottom: 14 }}>
          <label style={labelStyle}>Report Email</label>
          <input style={inputStyle} type="email" value={reportEmail} onChange={e => setReportEmail(e.target.value)} placeholder="you@company.com" />
        </div>
        <div>
          <label style={labelStyle}>Frequency</label>
          <select style={{ ...inputStyle, cursor: "pointer" }} value={reportFreq} onChange={e => setReportFreq(e.target.value)}>
            <option value="weekly">Weekly (every Monday)</option>
            <option value="biweekly">Bi-weekly (every other Monday)</option>
            <option value="monthly">Monthly (1st of the month)</option>
          </select>
        </div>
      </div>

      {/* Integrations shortcut */}
      <div style={{ background: "#0d1526", border: "1px solid #1a2540", borderRadius: 14, padding: 20, marginBottom: 24 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <div style={{ fontSize: 13, fontWeight: 600, color: "#e2e8f0", marginBottom: 3 }}>Integrations</div>
            <div style={{ fontSize: 12, color: "#4a5568" }}>Add or manage your connected platforms</div>
          </div>
          <a href="/app/integrations" style={{
            padding: "8px 16px", borderRadius: 8,
            background: "transparent", border: "1px solid #1a2540",
            color: "#94a3b8", fontSize: 12, fontWeight: 600, textDecoration: "none",
          }}>
            Manage →
          </a>
        </div>
      </div>

      {/* Save */}
      <button
        onClick={save}
        style={{
          padding: "11px 28px", borderRadius: 9,
          background: saved ? "rgba(74,222,128,0.15)" : "#00e5cc",
          border: saved ? "1px solid rgba(74,222,128,0.3)" : "none",
          color: saved ? "#4ade80" : "#080d1a",
          fontSize: 14, fontWeight: 700, fontFamily: "inherit",
          cursor: "pointer", transition: "all 0.2s",
        }}
      >
        {saved ? "✓ Saved" : "Save changes"}
      </button>
    </div>
  );
}
