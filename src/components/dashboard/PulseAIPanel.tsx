"use client";
import { useState, useRef, useEffect, useCallback } from "react";

interface Message {
  role: "user" | "assistant";
  content: string;
}

const SYSTEM_PROMPT = `You are Pulse AI, an expert marketing analytics assistant built into the Pulse platform. You help agency owners and marketing managers interpret campaign data, spot trends, identify issues, and write clear client-facing commentary.

You have access to context about mock client data: total ad spend of $12,480, total revenue of $48,200, blended ROAS of 3.86x, and 12 reports sent this month across clients including Acme Co, BlueSky Agency, and TechFlow Inc.

Be concise, direct, and sharp. Use plain language. When relevant, give specific actionable recommendations. You run locally on the user's machine via Ollama — all data stays private.`;

const DEMO_SEED: Message[] = [
  {
    role: "user",
    content: "Give me a quick summary of this week's performance",
  },
  {
    role: "assistant",
    content: `Here's your week at a glance:

**Blended ROAS is strong at 3.86x** — up 0.4x week-over-week. Your $12,480 in ad spend returned $48,200 in tracked revenue across platforms.

A few things worth noting:

• **Acme Co** is your top performer. ROAS is holding above 4x — don't touch the targeting, it's working.

• **BlueSky Agency** — spend is up but revenue hasn't followed proportionally. Worth pulling their Meta breakdown before Monday's report to check for creative fatigue.

• **TechFlow Inc** — flat week, nothing alarming. Jun 2 report already delivered.

Overall: solid week. The 14% revenue lift is real. Want me to draft client commentary for any of these three?`,
  },
];

export default function PulseAIPanel() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>(DEMO_SEED);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [ollamaStatus, setOllamaStatus] = useState<"checking" | "online" | "offline">("checking");
  const [model, setModel] = useState<string>("");
  const [retryCount, setRetryCount] = useState(0);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Poll Ollama status — keeps retrying every 5s until online
  const checkOllama = useCallback(async () => {
    try {
      const r = await fetch("/api/pulse-ai", { cache: "no-store" });
      const data = await r.json();
      if (data.online && data.models?.length > 0) {
        setOllamaStatus("online");
        setModel(data.models[0]);
        // Stop polling once online
        if (pollRef.current) {
          clearInterval(pollRef.current);
          pollRef.current = null;
        }
      } else {
        setOllamaStatus("offline");
        setRetryCount((c) => c + 1);
      }
    } catch {
      setOllamaStatus("offline");
      setRetryCount((c) => c + 1);
    }
  }, []);

  useEffect(() => {
    checkOllama();
    // Poll every 5s until online
    pollRef.current = setInterval(checkOllama, 5000);
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [checkOllama]);

  useEffect(() => {
    if (open) messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading, open]);

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 150);
  }, [open]);

  async function sendMessage() {
    const text = input.trim();
    if (!text || loading) return;

    const userMessages: Message[] = [...messages, { role: "user", content: text }];
    setMessages(userMessages);
    setInput("");
    setLoading(true);

    // If still offline, show a helpful message but don't block — try anyway
    if (ollamaStatus !== "online" || !model) {
      // Try a fresh status check first
      try {
        const r = await fetch("/api/pulse-ai", { cache: "no-store" });
        const data = await r.json();
        if (!data.online || !data.models?.length) {
          setMessages((prev) => [
            ...prev,
            {
              role: "assistant",
              content:
                "⚠️ Pulse AI is still starting up — Ollama isn't responding yet.\n\nTry again in a few seconds. If this persists, open a terminal and run:\n```\nollama serve\n```",
            },
          ]);
          setLoading(false);
          return;
        }
        // It came online — update state and continue
        setOllamaStatus("online");
        setModel(data.models[0]);
      } catch {
        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            content: "⚠️ Can't reach Pulse AI. Make sure Ollama is installed and running.",
          },
        ]);
        setLoading(false);
        return;
      }
    }

    const activeModel = model;

    try {
      const res = await fetch("/api/pulse-ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: activeModel,
          messages: [
            { role: "system", content: SYSTEM_PROMPT },
            ...userMessages,
          ],
        }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));
        throw new Error(errData.error || `HTTP ${res.status}`);
      }

      if (!res.body) throw new Error("No response body");

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let assistantText = "";

      // Add empty assistant bubble to stream into
      setMessages((prev) => [...prev, { role: "assistant", content: "" }]);

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split("\n").filter((l) => l.trim());
        for (const line of lines) {
          try {
            const json = JSON.parse(line);
            const delta = json.message?.content || "";
            if (delta) {
              assistantText += delta;
              setMessages((prev) => {
                const updated = [...prev];
                updated[updated.length - 1] = {
                  role: "assistant",
                  content: assistantText,
                };
                return updated;
              });
            }
          } catch {
            // Skip malformed JSON lines (keep streaming)
          }
        }
      }

      // If we got nothing back, show an error
      if (!assistantText.trim()) {
        setMessages((prev) => {
          const updated = [...prev];
          updated[updated.length - 1] = {
            role: "assistant",
            content: "⚠️ Pulse AI returned an empty response. The model may still be loading — try again.",
          };
          return updated;
        });
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Unknown error";
      setMessages((prev) => {
        // Replace empty bubble or append
        const last = prev[prev.length - 1];
        const updated = [...prev];
        if (last?.role === "assistant" && !last.content) {
          updated[updated.length - 1] = {
            role: "assistant",
            content: `⚠️ Error: ${msg}`,
          };
        } else {
          updated.push({ role: "assistant", content: `⚠️ Error: ${msg}` });
        }
        return updated;
      });
    } finally {
      setLoading(false);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  }

  function renderContent(text: string) {
    const lines = text.split("\n");
    return lines.map((line, li) => {
      const parts = line.split(/(\*\*[^*]+\*\*)/g).map((part, i) =>
        part.startsWith("**") && part.endsWith("**") ? (
          <strong key={i} style={{ color: "#e2e8f0", fontWeight: 600 }}>
            {part.slice(2, -2)}
          </strong>
        ) : (
          <span key={i}>{part}</span>
        )
      );
      return (
        <span key={li}>
          {parts}
          {li < lines.length - 1 && <br />}
        </span>
      );
    });
  }

  const statusColor =
    ollamaStatus === "online"
      ? "#00e5cc"
      : ollamaStatus === "offline"
      ? "#f59e0b"
      : "#64748b";

  const statusLabel =
    ollamaStatus === "online"
      ? `Online · ${model}`
      : ollamaStatus === "offline"
      ? `Starting up… (${retryCount})`
      : "Checking…";

  return (
    <>
      {/* Trigger button */}
      <button
        onClick={() => setOpen(true)}
        style={{
          position: "fixed",
          bottom: 28,
          right: 28,
          zIndex: 200,
          display: "flex",
          alignItems: "center",
          gap: 8,
          padding: "11px 20px",
          background: "linear-gradient(135deg, #00e5cc 0%, #0099ff 100%)",
          border: "none",
          borderRadius: 50,
          color: "#0a0f1e",
          fontWeight: 700,
          fontSize: 13,
          cursor: "pointer",
          boxShadow:
            "0 0 24px rgba(0,229,204,0.35), 0 4px 16px rgba(0,0,0,0.4)",
        }}
      >
        <span style={{ fontSize: 15 }}>✦</span>
        Test Pulse AI
      </button>

      {/* Backdrop */}
      {open && (
        <div
          onClick={() => setOpen(false)}
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 300,
            background: "rgba(0,0,0,0.45)",
            backdropFilter: "blur(2px)",
          }}
        />
      )}

      {/* Panel */}
      <div
        style={{
          position: "fixed",
          top: 0,
          right: 0,
          bottom: 0,
          zIndex: 400,
          width: 440,
          background: "#0d1526",
          borderLeft: "1px solid #1e293b",
          display: "flex",
          flexDirection: "column",
          transform: open ? "translateX(0)" : "translateX(100%)",
          transition: "transform 0.28s cubic-bezier(0.4,0,0.2,1)",
          boxShadow: open ? "-8px 0 48px rgba(0,0,0,0.6)" : "none",
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: "18px 20px 14px",
            borderBottom: "1px solid #1e293b",
            flexShrink: 0,
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div
                style={{
                  width: 34,
                  height: 34,
                  borderRadius: 9,
                  background: "linear-gradient(135deg, #00e5cc, #0099ff)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 16,
                  color: "#0a0f1e",
                  fontWeight: 800,
                }}
              >
                ✦
              </div>
              <div>
                <div style={{ fontSize: 15, fontWeight: 700, color: "#fff" }}>
                  Pulse AI
                </div>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 5,
                    marginTop: 2,
                  }}
                >
                  <div
                    style={{
                      width: 6,
                      height: 6,
                      borderRadius: "50%",
                      background: statusColor,
                      ...(ollamaStatus === "offline" && {
                        animation: "pulse-dot 1.5s ease-in-out infinite",
                      }),
                    }}
                  />
                  <span style={{ fontSize: 11, color: statusColor }}>
                    {statusLabel}
                  </span>
                </div>
              </div>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <button
                onClick={checkOllama}
                title="Retry connection"
                style={{
                  background: "none",
                  border: "1px solid #1e293b",
                  color: "#64748b",
                  fontSize: 11,
                  cursor: "pointer",
                  padding: "4px 8px",
                  borderRadius: 6,
                }}
              >
                ↺ Retry
              </button>
              <button
                onClick={() => setMessages(DEMO_SEED)}
                style={{
                  background: "none",
                  border: "1px solid #1e293b",
                  color: "#64748b",
                  fontSize: 11,
                  cursor: "pointer",
                  padding: "4px 8px",
                  borderRadius: 6,
                }}
              >
                Reset
              </button>
              <button
                onClick={() => setOpen(false)}
                style={{
                  background: "none",
                  border: "none",
                  color: "#64748b",
                  fontSize: 22,
                  cursor: "pointer",
                  padding: 4,
                  lineHeight: 1,
                }}
              >
                ×
              </button>
            </div>
          </div>
          <p
            style={{
              margin: "10px 0 0",
              fontSize: 12,
              color: "#475569",
              lineHeight: 1.5,
            }}
          >
            Runs locally on your machine — your data never leaves this device.
          </p>
        </div>

        {/* Messages */}
        <div
          style={{
            flex: 1,
            overflowY: "auto",
            padding: "16px 18px",
            display: "flex",
            flexDirection: "column",
            gap: 14,
          }}
        >
          {messages.map((msg, i) => (
            <div
              key={i}
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems:
                  msg.role === "user" ? "flex-end" : "flex-start",
              }}
            >
              {msg.role === "assistant" && (
                <div
                  style={{
                    fontSize: 10,
                    color: "#334155",
                    marginBottom: 4,
                    fontWeight: 600,
                    letterSpacing: "0.05em",
                  }}
                >
                  PULSE AI
                </div>
              )}
              <div
                style={{
                  maxWidth: "90%",
                  padding: "10px 14px",
                  borderRadius:
                    msg.role === "user"
                      ? "12px 12px 2px 12px"
                      : "2px 12px 12px 12px",
                  background:
                    msg.role === "user"
                      ? "rgba(0,229,204,0.1)"
                      : "#0a0f1e",
                  border:
                    msg.role === "user"
                      ? "1px solid rgba(0,229,204,0.2)"
                      : "1px solid #1e293b",
                  color: "#cbd5e1",
                  fontSize: 13,
                  lineHeight: 1.65,
                  whiteSpace: "pre-wrap",
                  wordBreak: "break-word",
                }}
              >
                {renderContent(msg.content)}
                {loading &&
                  i === messages.length - 1 &&
                  msg.role === "assistant" && (
                    <span style={{ color: "#00e5cc" }}>▋</span>
                  )}
              </div>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>

        {/* Quick prompts */}
        <div
          style={{
            padding: "8px 18px 0",
            display: "flex",
            gap: 6,
            flexWrap: "wrap",
            flexShrink: 0,
          }}
        >
          {[
            "Draft Acme Co report",
            "Why is ROAS up?",
            "Flag any risks",
          ].map((p) => (
            <button
              key={p}
              onClick={() => {
                setInput(p);
                setTimeout(() => inputRef.current?.focus(), 50);
              }}
              style={{
                background: "rgba(0,229,204,0.05)",
                border: "1px solid rgba(0,229,204,0.15)",
                borderRadius: 20,
                padding: "4px 10px",
                color: "#64748b",
                fontSize: 11,
                cursor: "pointer",
              }}
            >
              {p}
            </button>
          ))}
        </div>

        {/* Input */}
        <div style={{ padding: "10px 16px 16px", flexShrink: 0 }}>
          <div style={{ display: "flex", gap: 8, alignItems: "flex-end" }}>
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={
                ollamaStatus === "online"
                  ? "Ask Pulse AI anything..."
                  : "Ollama starting up — ask anyway and it'll retry..."
              }
              disabled={loading}
              rows={1}
              style={{
                flex: 1,
                background: "#0a0f1e",
                border: "1px solid #1e293b",
                borderRadius: 10,
                padding: "10px 14px",
                color: "#fff",
                fontSize: 13,
                resize: "none",
                outline: "none",
                fontFamily: "inherit",
                lineHeight: 1.5,
                maxHeight: 120,
                overflowY: "auto",
              }}
              onInput={(e) => {
                const t = e.currentTarget;
                t.style.height = "auto";
                t.style.height =
                  Math.min(t.scrollHeight, 120) + "px";
              }}
              onFocus={(e) => {
                e.currentTarget.style.borderColor =
                  "rgba(0,229,204,0.4)";
              }}
              onBlur={(e) => {
                e.currentTarget.style.borderColor = "#1e293b";
              }}
            />
            <button
              onClick={sendMessage}
              disabled={loading || !input.trim()}
              style={{
                width: 38,
                height: 38,
                flexShrink: 0,
                background:
                  loading || !input.trim()
                    ? "rgba(0,229,204,0.08)"
                    : "linear-gradient(135deg, #00e5cc, #0099ff)",
                border: "none",
                borderRadius: 10,
                color:
                  loading || !input.trim() ? "#334155" : "#0a0f1e",
                fontSize: 17,
                cursor:
                  loading || !input.trim() ? "not-allowed" : "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              {loading ? "·" : "↑"}
            </button>
          </div>
          <div
            style={{
              marginTop: 7,
              fontSize: 11,
              color: "#1e293b",
              textAlign: "center",
            }}
          >
            Enter to send · Shift+Enter for newline · Powered by Ollama
          </div>
        </div>
      </div>

      <style>{`
        @keyframes pulse-dot {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.3; }
        }
      `}</style>
    </>
  );
}
