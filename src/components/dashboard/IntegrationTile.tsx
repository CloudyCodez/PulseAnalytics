type Props = {
  id: string;
  name: string;
  icon: string;
  desc: string;
  status: "connected" | "disconnected" | "error" | "soon";
  onConnect?: () => void;
  connecting?: boolean;
};

export function IntegrationTile({
  name,
  icon,
  desc,
  status,
  onConnect,
  connecting,
}: Props) {
  const isAvailable = status !== "soon";

  return (
    <div
      style={{
        background: "var(--navy-2)",
        border: `1px solid ${status === "connected" ? "rgba(0,229,204,0.3)" : "var(--border)"}`,
        borderRadius: 12,
        padding: 20,
        display: "flex",
        alignItems: "center",
        gap: 16,
        opacity: !isAvailable ? 0.6 : 1,
        transition: "border-color .2s",
      }}
    >
      <div
        style={{
          width: 44,
          height: 44,
          borderRadius: 10,
          background: "var(--navy-3)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 22,
          flexShrink: 0,
        }}
      >
        {icon}
      </div>

      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            fontFamily: "'Space Grotesk', sans-serif",
            fontSize: 14,
            fontWeight: 600,
            color: "var(--white)",
            marginBottom: 3,
          }}
        >
          {name}
        </div>
        <div style={{ fontSize: 12, color: "var(--muted)" }}>{desc}</div>
      </div>

      <button
        onClick={isAvailable ? onConnect : undefined}
        disabled={!isAvailable || connecting || status === "connected"}
        style={{
          padding: "7px 14px",
          borderRadius: 7,
          fontSize: 13,
          fontWeight: 600,
          fontFamily: "'Space Grotesk', sans-serif",
          flexShrink: 0,
          cursor: isAvailable && status !== "connected" ? "pointer" : "default",
          transition: "opacity .2s",
          ...(status === "connected"
            ? {
                background: "rgba(74,222,128,0.1)",
                color: "#4ade80",
                border: "1px solid rgba(74,222,128,0.3)",
              }
            : isAvailable
            ? {
                background: "var(--cyan)",
                color: "var(--navy)",
                border: "none",
              }
            : {
                background: "var(--navy-3)",
                color: "var(--muted)",
                border: "1px solid var(--border)",
              }),
        }}
      >
        {status === "connected"
          ? "✓ Connected"
          : status === "error"
          ? "Reconnect"
          : connecting
          ? "Connecting…"
          : isAvailable
          ? "Connect"
          : "Soon"}
      </button>
    </div>
  );
}
