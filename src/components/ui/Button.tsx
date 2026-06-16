import React from "react";

type Variant = "primary" | "ghost" | "danger";
type Size = "sm" | "md" | "lg";

type Props = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  children: React.ReactNode;
};

const variantStyles: Record<Variant, React.CSSProperties> = {
  primary: {
    background: "var(--cyan)",
    color: "var(--navy)",
    border: "none",
  },
  ghost: {
    background: "transparent",
    color: "var(--white)",
    border: "1px solid var(--border)",
  },
  danger: {
    background: "rgba(248,113,113,0.1)",
    color: "#f87171",
    border: "1px solid rgba(248,113,113,0.3)",
  },
};

const sizeStyles: Record<Size, React.CSSProperties> = {
  sm: { padding: "7px 14px", fontSize: 13 },
  md: { padding: "10px 20px", fontSize: 14 },
  lg: { padding: "14px 28px", fontSize: 15 },
};

export function Button({
  variant = "primary",
  size = "md",
  loading = false,
  children,
  disabled,
  style,
  ...rest
}: Props) {
  return (
    <button
      disabled={disabled || loading}
      style={{
        ...variantStyles[variant],
        ...sizeStyles[size],
        borderRadius: 8,
        fontWeight: 600,
        fontFamily: "'Space Grotesk', sans-serif",
        cursor: disabled || loading ? "not-allowed" : "pointer",
        opacity: disabled || loading ? 0.6 : 1,
        transition: "opacity .2s",
        display: "inline-flex",
        alignItems: "center",
        gap: 8,
        ...style,
      }}
      {...rest}
    >
      {loading ? "Loading…" : children}
    </button>
  );
}
