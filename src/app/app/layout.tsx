"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect, useRef, useCallback } from "react";

// ─── Nav items ────────────────────────────────────────────────────────────────
const NAV = [
  {
    href: "/app",
    label: "Overview",
    icon: (
      <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
        <rect x="1" y="1" width="5.5" height="5.5" rx="1" stroke="currentColor" strokeWidth="1.4"/>
        <rect x="8.5" y="1" width="5.5" height="5.5" rx="1" stroke="currentColor" strokeWidth="1.4"/>
        <rect x="1" y="8.5" width="5.5" height="5.5" rx="1" stroke="currentColor" strokeWidth="1.4"/>
        <rect x="8.5" y="8.5" width="5.5" height="5.5" rx="1" stroke="currentColor" strokeWidth="1.4"/>
      </svg>
    ),
  },
  {
    href: "/app/integrations",
    label: "Integrations",
    icon: (
      <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
        <circle cx="3" cy="7.5" r="2" stroke="currentColor" strokeWidth="1.4"/>
        <circle cx="12" cy="3" r="2" stroke="currentColor" strokeWidth="1.4"/>
        <circle cx="12" cy="12" r="2" stroke="currentColor" strokeWidth="1.4"/>
        <path d="M5 7.5h3M8 7.5L10.5 3.8M8 7.5L10.5 11.2" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
      </svg>
    ),
  },
  {
    href: "/app/reports",
    label: "Reports",
    icon: (
      <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
        <rect x="2" y="1" width="11" height="13" rx="1.5" stroke="currentColor" strokeWidth="1.4"/>
        <path d="M4.5 5h6M4.5 7.5h6M4.5 10h4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
      </svg>
    ),
  },
  {
    href: "/app/alerts",
    label: "Alerts",
    icon: (
      <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
        <path d="M7.5 1.5a5 5 0 015 5v2.5l1 2H1.5l1-2V6.5a5 5 0 015-5z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round"/>
        <path d="M6 11.5a1.5 1.5 0 003 0" stroke="currentColor" strokeWidth="1.4"/>
      </svg>
    ),
  },
  {
    href: "/app/settings",
    label: "Settings",
    icon: (
      <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
        <circle cx="7.5" cy="7.5" r="2" stroke="currentColor" strokeWidth="1.4"/>
        <path d="M7.5 1v1.5M7.5 12.5V14M1 7.5h1.5M12.5 7.5H14M2.6 2.6l1.1 1.1M11.3 11.3l1.1 1.1M2.6 12.4l1.1-1.1M11.3 3.7l1.1-1.1" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
      </svg>
    ),
  },
];

// ─── Pulse AI Chat drawer ─────────────────────────────────────────────────────
type Message = { role: "user" | "assistant"; content: string };

function PulseAIDrawer({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      content: "Hey! I'm Pulse AI. Ask me anything about your data — campaign performance, ROAS trends, revenue anomalies, what to do next. I have full context of your connected platforms.",
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef  = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 300);
    }
  }, [open]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const send = useCallback(async () => {
    const text = input.trim();
    if (!text || loading) return;
    setInput("");
    const next: Message[] = [...messages, { role: "user", content: text }];
    setMessages(next);
    setLoading(true);

    try {
      const res = await fetch("/api/pulse-ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: next }),
      });
      const data = await res.json();
      setMessages([...next, { role: "assistant", content: data.reply ?? "Sorry, I couldn't get a response. Try again." }]);
    } catch {
      setMessages([...next, { role: "assistant", content: "Something went wrong. Check your connection and try again." }]);
    } finally {
      setLoading(false);
    }
  }, [input, loading, messages]);

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  }

  return (
    <>
      {/* Backdrop */}
      {open && (
        <div
          onClick={onClose}
          style={{
            position: "fixed", inset: 0,
            background: "rgba(0,0,0,0.35)",
            zIndex: 200,
            backdropFilter: "blur(2px)",
          }}
        />
      )}

      {/* Drawer */}
      <div style={{
        position: "fixed",
        bottom: 0, right: 0,
        width: 400,
        height: "calc(100vh - 0px)",
        background: "#0d1526",
        borderLeft: "1px solid #1e293b",
        zIndex: 201,
        display: "flex",
        flexDirection: "column",
        transform: open ? "translateX(0)" : "translateX(100%)",
        transition: "transform 0.28s cubic-bezier(0.4,0,0.2,1)",
        boxShadow: open ? "-20px 0 60px rgba(0,0,0,0.5)" : "none",
      }}>

        {/* Header */}
        <div style={{
          padding: "18px 20px",
          borderBottom: "1px solid #1e293b",
          display: "flex", alignItems: "center", gap: 12,
          flexShrink: 0,
        }}>
          <div style={{
            width: 36, height: 36, borderRadius: 10, flexShrink: 0,
            background: "linear-gradient(135deg, rgba(0,229,204,0.2), rgba(0,153,255,0.15))",
            border: "1px solid rgba(0,229,204,0.25)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 18,
          }}>⚡</div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: "#fff" }}>Pulse AI</div>
            <div style={{ display: "flex", alignItems: "center", gap: 5, marginTop: 2 }}>
              <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#4ade80", display: "block" }} />
              <span style={{ fontSize: 11, color: "#64748b" }}>On-device · Private</span>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: "transparent", border: "none",
              color: "#475569", cursor: "pointer",
              fontSize: 20, lineHeight: 1, padding: 4,
            }}
          >×</button>
        </div>

        {/* Messages */}
        <div style={{
          flex: 1, overflowY: "auto",
          padding: "20px 20px 12px",
          display: "flex", flexDirection: "column", gap: 16,
        }}>
          {messages.map((m, i) => (
            <div key={i} style={{
              display: "flex",
              justifyContent: m.role === "user" ? "flex-end" : "flex-start",
            }}>
              {m.role === "assistant" && (
                <div style={{
                  width: 26, height: 26, borderRadius: 7, flexShrink: 0,
                  background: "rgba(0,229,204,0.12)",
                  border: "1px solid rgba(0,229,204,0.2)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 13, marginRight: 8, marginTop: 2,
                }}>⚡</div>
              )}
              <div style={{
                maxWidth: "80%",
                background: m.role === "user"
                  ? "rgba(0,229,204,0.1)"
                  : "#111827",
                border: m.role === "user"
                  ? "1px solid rgba(0,229,204,0.2)"
                  : "1px solid #1e293b",
                borderRadius: m.role === "user" ? "12px 12px 4px 12px" : "12px 12px 12px 4px",
                padding: "10px 14px",
                fontSize: 13,
                color: "#e2e8f0",
                lineHeight: 1.65,
                whiteSpace: "pre-wrap",
              }}>
                {m.content}
              </div>
            </div>
          ))}

          {/* Thinking indicator */}
          {loading && (
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <div style={{
                width: 26, height: 26, borderRadius: 7, flexShrink: 0,
                background: "rgba(0,229,204,0.12)",
                border: "1px solid rgba(0,229,204,0.2)",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 13,
              }}>⚡</div>
              <div style={{
                background: "#111827", border: "1px solid #1e293b",
                borderRadius: "12px 12px 12px 4px",
                padding: "10px 16px",
                display: "flex", gap: 4, alignItems: "center",
              }}>
                {[0, 1, 2].map(i => (
                  <span key={i} style={{
                    width: 5, height: 5, borderRadius: "50%",
                    background: "#00e5cc", opacity: 0.6,
                    animation: `bounce-dot 1.2s ease-in-out ${i * 0.2}s infinite`,
                    display: "block",
                  }} />
                ))}
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        {/* Suggested prompts — only show on first message */}
        {messages.length === 1 && (
          <div style={{ padding: "0 20px 12px", display: "flex", gap: 6, flexWrap: "wrap" }}>
            {[
              "What's my best-performing campaign?",
              "Why did ROAS drop this week?",
              "Where should I increase budget?",
              "Summarise last week's performance",
            ].map(p => (
              <button
                key={p}
                onClick={() => { setInput(p); inputRef.current?.focus(); }}
                style={{
                  background: "rgba(0,229,204,0.06)",
                  border: "1px solid rgba(0,229,204,0.15)",
                  borderRadius: 100,
                  color: "#94a3b8", fontSize: 11, fontWeight: 500,
                  padding: "5px 11px", cursor: "pointer",
                  whiteSpace: "nowrap",
                }}
              >
                {p}
              </button>
            ))}
          </div>
        )}

        {/* Input */}
        <div style={{
          padding: "12px 16px 16px",
          borderTop: "1px solid #1e293b",
          flexShrink: 0,
        }}>
          <div style={{
            display: "flex", gap: 8, alignItems: "flex-end",
            background: "#0a0f1e",
            border: "1px solid #1e293b",
            borderRadius: 12, padding: "8px 8px 8px 14px",
          }}>
            <textarea
              ref={inputRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={onKeyDown}
              placeholder="Ask anything about your data…"
              rows={1}
              style={{
                flex: 1, background: "transparent", border: "none",
                outline: "none", color: "#e2e8f0", fontSize: 13,
                resize: "none", fontFamily: "inherit", lineHeight: 1.5,
                maxHeight: 120, overflowY: "auto",
              }}
            />
            <button
              onClick={send}
              disabled={!input.trim() || loading}
              style={{
                width: 32, height: 32, borderRadius: 8, flexShrink: 0,
                background: input.trim() && !loading ? "#00e5cc" : "#1e293b",
                border: "none", cursor: input.trim() && !loading ? "pointer" : "not-allowed",
                display: "flex", alignItems: "center", justifyContent: "center",
                transition: "background 0.15s",
                color: input.trim() && !loading ? "#0a0f1e" : "#475569",
                fontSize: 16,
              }}
            >
              ↑
            </button>
          </div>
          <div style={{ fontSize: 10, color: "#334155", marginTop: 6, textAlign: "center" }}>
            Enter to send · Shift+Enter for new line
          </div>
        </div>
      </div>

      <style>{`
        @keyframes bounce-dot {
          0%, 80%, 100% { transform: scale(0.7); opacity: 0.4; }
          40% { transform: scale(1); opacity: 1; }
        }
      `}</style>
    </>
  );
}

// ─── Layout ───────────────────────────────────────────────────────────────────
export default function AppLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [aiOpen, setAiOpen] = useState(false);

  return (
    <div style={{ display: "flex", minHeight: "100vh", background: "#080d1a" }}>

      {/* ── Sidebar ──────────────────────────────────────────────────── */}
      <aside style={{
        width: 212, flexShrink: 0,
        background: "#0a0f1e",
        borderRight: "1px solid #1a2540",
        display: "flex", flexDirection: "column",
        position: "fixed", top: 0, left: 0, bottom: 0, zIndex: 50,
      }}>
        {/* Logo */}
        <div style={{
          padding: "22px 20px 18px",
          borderBottom: "1px solid #1a2540",
        }}>
          <div style={{
            fontSize: 20, fontWeight: 700, letterSpacing: "-0.5px",
            color: "#fff", marginBottom: 2,
          }}>
            Pulse<span style={{ color: "#00e5cc" }}>.</span>
          </div>
          <div style={{ fontSize: 11, color: "#334155", fontWeight: 500 }}>
            Analytics Dashboard
          </div>
        </div>

        {/* Nav */}
        <nav style={{ flex: 1, padding: "12px 10px", overflowY: "auto" }}>
          {NAV.map(({ href, label, icon }) => {
            const exact  = href === "/app";
            const active = exact ? pathname === "/app" : pathname.startsWith(href);
            return (
              <Link key={href} href={href} style={{
                display: "flex", alignItems: "center", gap: 10,
                padding: "9px 12px", borderRadius: 8, marginBottom: 2,
                fontSize: 13, fontWeight: 500, textDecoration: "none",
                color: active ? "#00e5cc" : "#4a5568",
                background: active ? "rgba(0,229,204,0.07)" : "transparent",
                border: `1px solid ${active ? "rgba(0,229,204,0.12)" : "transparent"}`,
                transition: "all 0.12s",
              }}>
                {icon}
                {label}
              </Link>
            );
          })}
        </nav>

        {/* Pulse AI launch button — in sidebar footer */}
        <div style={{ padding: "12px 10px", borderTop: "1px solid #1a2540" }}>
          <button
            onClick={() => setAiOpen(true)}
            style={{
              width: "100%",
              display: "flex", alignItems: "center", gap: 10,
              padding: "10px 12px", borderRadius: 10,
              background: "linear-gradient(135deg, rgba(0,229,204,0.1), rgba(0,153,255,0.07))",
              border: "1px solid rgba(0,229,204,0.2)",
              cursor: "pointer", color: "#00e5cc",
              fontSize: 13, fontWeight: 600, fontFamily: "inherit",
              transition: "opacity 0.15s",
            }}
            onMouseEnter={e => (e.currentTarget.style.opacity = "0.85")}
            onMouseLeave={e => (e.currentTarget.style.opacity = "1")}
          >
            <span style={{ fontSize: 16 }}>⚡</span>
            Pulse AI
            <span style={{
              marginLeft: "auto",
              width: 6, height: 6, borderRadius: "50%",
              background: "#4ade80",
              boxShadow: "0 0 6px #4ade80",
              display: "block",
            }} />
          </button>
        </div>
      </aside>

      {/* ── Main content ─────────────────────────────────────────────── */}
      <main style={{
        flex: 1, marginLeft: 212,
        minHeight: "100vh", color: "#fff",
        // Shrink content area when AI drawer is open
        transition: "margin-right 0.28s cubic-bezier(0.4,0,0.2,1)",
        marginRight: aiOpen ? 400 : 0,
      }}>
        {children}
      </main>

      {/* ── Pulse AI drawer ───────────────────────────────────────────── */}
      <PulseAIDrawer open={aiOpen} onClose={() => setAiOpen(false)} />
    </div>
  );
}
