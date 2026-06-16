import React from "react";

type BadgeVariant = "cyan" | "green" | "red" | "muted";

type Props = {
  children: React.ReactNode;
  variant?: BadgeVariant;
};

const variantStyles: Record<BadgeVariant, React.CSSProperties> = {
  cyan: {
    background: "rgba(0,229,204,0.1)",
    border: "1px solid rgba(0,229,204,0.25)",
    color: "var(--cyan)",
  },
  green: {
    background: "rgba(74,222,128,0.1)",
    border: "1px solid rgba(74,222,128,0.3)",
    color: "#4ade80",
  },
  red: {
    background: "rgba(248,113,113,0.1)",
    border: "1px solid rgba(248,113,113,0.3)",
    color: "#f87171",
  },
  muted: {
    background: "var(--navy-3)",
    border: "1px solid var(--border)",
    color: "var(--muted)",
  },
};

export function Badge({ children, variant = "cyan" }: Props) {
  return (
    <span
      style={{
        ...variantStyles[variant],
        fontSize: 11,
        fontWeight: 600,
        padding: "4px 10px",
        borderRadius: 100,
        display: "inline-flex",
        alignItems: "center",
        fontFamily: "'Space Grotesk', sans-serif",
        letterSpacing: "0.3px",
      }}
    >
      {children}
    </span>
  );
}
