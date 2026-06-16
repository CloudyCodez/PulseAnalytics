type Props = {
  label: string;
  value: string;
  refProp?: React.RefObject<HTMLDivElement>;
};

export function BarRow({ label, value, refProp }: Props) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 10,
        marginBottom: 8,
      }}
    >
      <div
        style={{
          fontSize: 12,
          color: "var(--muted)",
          width: 80,
          textAlign: "right" as const,
          flexShrink: 0,
        }}
      >
        {label}
      </div>
      <div
        style={{
          flex: 1,
          height: 6,
          background: "rgba(255,255,255,0.06)",
          borderRadius: 3,
          overflow: "hidden",
        }}
      >
        <div
          ref={refProp}
          style={{
            height: "100%",
            width: "0%",
            borderRadius: 3,
            background: "var(--cyan)",
            transition: "width 1s ease",
          }}
        />
      </div>
      <div
        style={{
          fontSize: 12,
          fontWeight: 600,
          color: "var(--white)",
          width: 44,
          flexShrink: 0,
        }}
      >
        {value}
      </div>
    </div>
  );
}
