export default function ReportsPage() {
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
          Reports
        </h1>
        <p style={{ color: "var(--muted)", fontSize: 15 }}>
          Every weekly report, archived and searchable.
        </p>
      </div>

      {/* Empty state */}
      <div
        style={{
          background: "var(--navy-2)",
          border: "1px solid var(--border)",
          borderRadius: 16,
          padding: "80px 40px",
          textAlign: "center",
        }}
      >
        <div style={{ fontSize: 48, marginBottom: 20 }}>📬</div>
        <div
          style={{
            fontFamily: "'Space Grotesk',sans-serif",
            fontSize: 20,
            fontWeight: 700,
            color: "var(--white)",
            marginBottom: 12,
          }}
        >
          Your first report is on its way
        </div>
        <p
          style={{
            fontSize: 15,
            color: "var(--muted)",
            maxWidth: 400,
            margin: "0 auto 32px",
            lineHeight: 1.7,
          }}
        >
          Once you connect at least one integration, Pulse will generate and
          deliver your first AI-written report within 48 hours. It will appear
          here and land in your inbox.
        </p>
        <a
          href="/dashboard/integrations"
          style={{
            display: "inline-block",
            background: "var(--cyan)",
            color: "var(--navy)",
            padding: "12px 24px",
            borderRadius: 8,
            fontSize: 14,
            fontWeight: 600,
            fontFamily: "'Space Grotesk',sans-serif",
          }}
        >
          Connect your first platform →
        </a>
      </div>
    </div>
  );
}
