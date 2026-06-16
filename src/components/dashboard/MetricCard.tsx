import React from "react";

type Props = {
  label: string;
  value: string;
  delta?: string | null;
  deltaUp?: boolean;
  sub?: string;
  empty?: boolean;
};

export function MetricCard({ label, value, delta, deltaUp, sub, empty }: Props) {
  return (
    <div
      style={{
        background: "var(--navy-2)",
        border: "1px solid var(--border)",
        borderRadius: 12,
        padding: 24,
      }}
    >
      <div
        style={{
          fontSize: 11,
          fontWeight: 600,
          color: "var(--muted)",
          textTransform: "uppercase" as const,
          letterSpacing: "0.5px",
          marginBottom: 12,
        }}
      >
        {label}
      </div>
      <div
        style={{
          fontFamily: "'Space Grotesk', sans-serif",
          fontSize: 32,
          fontWeight: 700,
          letterSpacing: "-1px",
          marginBottom: 8,
          color: empty ? "var(--muted)" : "var(--white)",
        }}
      >
        {value}
      </div>
      {delta && (
        <div
          style={{
            fontSize: 13,
            fontWeight: 600,
            color: deltaUp ? "#4ade80" : "#f87171",
            marginBottom: sub ? 4 : 0,
          }}
        >
          {delta} vs last week
        </div>
      )}
      {sub && (
        <div style={{ fontSize: 12, color: "var(--muted)" }}>{sub}</div>
      )}
    </div>
  );
}
