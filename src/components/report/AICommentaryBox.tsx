type Props = {
  commentary: string;
};

export function AICommentaryBox({ commentary }: Props) {
  return (
    <div
      style={{
        background: "rgba(0,229,204,0.04)",
        border: "1px solid rgba(0,229,204,0.15)",
        borderRadius: 10,
        padding: 16,
      }}
    >
      <div
        style={{
          fontSize: 11,
          fontWeight: 600,
          color: "var(--cyan)",
          textTransform: "uppercase" as const,
          letterSpacing: "0.5px",
          marginBottom: 8,
        }}
      >
        ✦ AI Analysis — What To Do Next
      </div>
      <p
        style={{
          fontSize: 13,
          color: "var(--muted)",
          lineHeight: 1.7,
          margin: 0,
        }}
      >
        {commentary}
      </p>
    </div>
  );
}
