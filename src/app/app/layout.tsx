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

// ─── TTS helper ─────────────────────────────────────────────────────────────
function getBestVoice(): SpeechSynthesisVoice | null {
  const voices = window.speechSynthesis.getVoices();
  // Priority: neural/enhanced English voices that sound less robotic
  const preferred = [
    "Microsoft Aria", "Microsoft Jenny", "Microsoft Guy",
    "Google US English", "Samantha", "Karen", "Daniel",
    "Alex", "Zoe",
  ];
  for (const name of preferred) {
    const v = voices.find(v => v.name.includes(name) && v.lang.startsWith("en"));
    if (v) return v;
  }
  // Fall back to any English voice
  return voices.find(v => v.lang.startsWith("en-US")) ??
         voices.find(v => v.lang.startsWith("en")) ??
         voices[0] ?? null;
}

function speak(text: string, onEnd?: () => void): SpeechSynthesisUtterance {
  window.speechSynthesis.cancel();
  const utt = new SpeechSynthesisUtterance(text);
  utt.rate   = 1.05;  // slightly faster than default — feels more natural
  utt.pitch  = 0.95;  // slightly lower — more AI-assistant-like
  utt.volume = 1;
  const setVoice = () => {
    const v = getBestVoice();
    if (v) utt.voice = v;
    if (onEnd) utt.onend = onEnd;
    window.speechSynthesis.speak(utt);
  };
  // Voices may not be loaded yet on first call
  if (window.speechSynthesis.getVoices().length === 0) {
    window.speechSynthesis.addEventListener("voiceschanged", setVoice, { once: true });
  } else {
    setVoice();
  }
  return utt;
}

// ─── Speech recognition (voice input) ──────────────────────────────────────
// Web Speech API's SpeechRecognition isn't in TS's default lib types, so we
// declare just enough of the shape used here. Electron's Chromium supports
// this natively — no extra package, no Pulse backend involved.
interface SpeechRecognitionResultLike {
  isFinal: boolean;
  0: { transcript: string };
}
interface SpeechRecognitionEventLike extends Event {
  resultIndex: number;
  results: ArrayLike<SpeechRecognitionResultLike>;
}
interface SpeechRecognitionLike extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start(): void;
  stop(): void;
  abort(): void;
  onresult: ((e: SpeechRecognitionEventLike) => void) | null;
  onerror: ((e: any) => void) | null;
  onend: (() => void) | null;
}

function getSpeechRecognition(): SpeechRecognitionLike | null {
  if (typeof window === "undefined") return null;
  const Ctor =
    (window as any).SpeechRecognition ||
    (window as any).webkitSpeechRecognition;
  if (!Ctor) return null;
  const rec: SpeechRecognitionLike = new Ctor();
  rec.continuous = false;
  rec.interimResults = true;
  rec.lang = "en-US";
  return rec;
}

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
  const [speakingIdx, setSpeakingIdx] = useState<number | null>(null);
  const [listening, setListening] = useState(false);
  const [vocalMode, setVocalMode] = useState(false);
  const [interim, setInterim] = useState("");
  const [voiceSupported] = useState(() => !!getSpeechRecognition());
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef  = useRef<HTMLTextAreaElement>(null);
  const recRef = useRef<SpeechRecognitionLike | null>(null);
  const vocalModeRef = useRef(false);
  vocalModeRef.current = vocalMode;

  // Speak helper that also tracks which message index is speaking
  const speakMessage = useCallback((text: string, idx: number, onDone?: () => void) => {
    setSpeakingIdx(idx);
    speak(text, () => {
      setSpeakingIdx(curr => (curr === idx ? null : curr));
      onDone?.();
    });
  }, []);

  const stopListening = useCallback(() => {
    try { recRef.current?.stop(); } catch {}
    setListening(false);
    setInterim("");
  }, []);

  const startListening = useCallback((onFinal: (text: string) => void) => {
    const rec = getSpeechRecognition();
    if (!rec) return;
    recRef.current = rec;
    setInterim("");
    rec.onresult = (e) => {
      let finalText = "";
      let interimText = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const r = e.results[i];
        if (r.isFinal) finalText += r[0].transcript;
        else interimText += r[0].transcript;
      }
      if (interimText) setInterim(interimText);
      if (finalText.trim()) {
        setInterim("");
        onFinal(finalText.trim());
      }
    };
    rec.onerror = () => {
      setListening(false);
      setInterim("");
    };
    rec.onend = () => {
      setListening(false);
    };
    setListening(true);
    try { rec.start(); } catch {}
  }, []);

  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 300);
    } else {
      // Stop any speech/listening when drawer closes
      window.speechSynthesis?.cancel();
      setSpeakingIdx(null);
      stopListening();
      setVocalMode(false);
    }
  }, [open, stopListening]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const send = useCallback(async (overrideText?: string) => {
    const text = (overrideText ?? input).trim();
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
      const replyText: string = data.reply ?? "Sorry, I couldn't get a response. Try again.";
      const finalMessages = [...next, { role: "assistant" as const, content: replyText }];
      setMessages(finalMessages);
      const replyIdx = finalMessages.length - 1;

      // In Vocal Mode, speak the reply aloud, then automatically start
      // listening again for the next thing the user says — a hands-free loop.
      if (vocalModeRef.current) {
        speakMessage(replyText, replyIdx, () => {
          if (vocalModeRef.current) {
            startListening((heard) => send(heard));
          }
        });
      }
    } catch {
      const finalMessages = [...next, { role: "assistant" as const, content: "Something went wrong. Check your connection and try again." }];
      setMessages(finalMessages);
      if (vocalModeRef.current) {
        speakMessage(finalMessages[finalMessages.length - 1].content, finalMessages.length - 1, () => {
          if (vocalModeRef.current) startListening((heard) => send(heard));
        });
      }
    } finally {
      setLoading(false);
    }
  }, [input, loading, messages, speakMessage, startListening]);

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  }

  // One-shot mic dictation: fills the input box, doesn't auto-send
  const onMicClick = useCallback(() => {
    if (listening) {
      stopListening();
      return;
    }
    startListening((heard) => {
      setInput(prev => (prev ? prev + " " + heard : heard));
      inputRef.current?.focus();
    });
  }, [listening, startListening, stopListening]);

  // Vocal Mode toggle: starts/stops the hands-free conversational loop
  const toggleVocalMode = useCallback(() => {
    if (vocalMode) {
      setVocalMode(false);
      window.speechSynthesis?.cancel();
      setSpeakingIdx(null);
      stopListening();
    } else {
      setVocalMode(true);
      if (!loading && speakingIdx === null) {
        startListening((heard) => send(heard));
      }
    }
  }, [vocalMode, loading, speakingIdx, startListening, stopListening, send]);

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
              <span style={{
                width: 6, height: 6, borderRadius: "50%",
                background: vocalMode ? "#00e5cc" : "#4ade80",
                boxShadow: vocalMode ? "0 0 6px #00e5cc" : "none",
                display: "block",
                animation: (listening || speakingIdx !== null) ? "pulse-dot 1s ease-in-out infinite" : "none",
              }} />
              <span style={{ fontSize: 11, color: "#64748b" }}>
                {vocalMode
                  ? (listening ? "Listening…" : speakingIdx !== null ? "Speaking…" : "Vocal Mode · On-device")
                  : "On-device · Private"}
              </span>
            </div>
          </div>
          {voiceSupported && (
            <button
              onClick={toggleVocalMode}
              title={vocalMode ? "Turn off Vocal Mode" : "Turn on Vocal Mode — talk hands-free"}
              style={{
                width: 32, height: 32, borderRadius: 8, flexShrink: 0,
                background: vocalMode ? "#00e5cc" : "rgba(255,255,255,0.04)",
                border: `1px solid ${vocalMode ? "#00e5cc" : "#1e293b"}`,
                cursor: "pointer",
                display: "flex", alignItems: "center", justifyContent: "center",
                transition: "all 0.15s",
                color: vocalMode ? "#0a0f1e" : "#64748b",
              }}
            >
              <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
                <rect x="5.5" y="1" width="4" height="7.5" rx="2" stroke="currentColor" strokeWidth="1.3"/>
                <path d="M3 7.5a4.5 4.5 0 009 0" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
                <path d="M7.5 12v2" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
              </svg>
            </button>
          )}
          <button
            onClick={onClose}
            style={{
              background: "transparent", border: "none",
              color: "#475569", cursor: "pointer",
              fontSize: 20, lineHeight: 1, padding: 4,
              marginLeft: 2,
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
                display: "flex",
                flexDirection: "column",
                alignItems: m.role === "user" ? "flex-end" : "flex-start",
                gap: 4,
              }}>
                <div style={{
                  background: m.role === "user"
                    ? "rgba(0,229,204,0.1)"
                    : "#111827",
                  border: m.role === "user"
                    ? "1px solid rgba(0,229,204,0.2)"
                    : speakingIdx === i ? "1px solid rgba(0,229,204,0.5)" : "1px solid #1e293b",
                  borderRadius: m.role === "user" ? "12px 12px 4px 12px" : "12px 12px 12px 4px",
                  padding: "10px 14px",
                  fontSize: 13,
                  color: "#e2e8f0",
                  lineHeight: 1.65,
                  whiteSpace: "pre-wrap",
                  transition: "border-color 0.2s",
                }}>
                  {m.content}
                </div>
                {m.role === "assistant" && (
                  <button
                    onClick={() => {
                      if (speakingIdx === i) {
                        window.speechSynthesis?.cancel();
                        setSpeakingIdx(null);
                      } else {
                        speakMessage(m.content, i);
                      }
                    }}
                    title={speakingIdx === i ? "Stop" : "Read aloud"}
                    style={{
                      background: "transparent", border: "none", cursor: "pointer",
                      color: speakingIdx === i ? "#00e5cc" : "#475569",
                      fontSize: 10, fontWeight: 600,
                      display: "flex", alignItems: "center", gap: 4,
                      padding: "2px 4px",
                    }}
                  >
                    {speakingIdx === i ? (
                      <>
                        <svg width="10" height="10" viewBox="0 0 10 10" fill="currentColor"><rect width="10" height="10" rx="1.5"/></svg>
                        Stop
                      </>
                    ) : (
                      <>
                        <svg width="11" height="11" viewBox="0 0 15 15" fill="none">
                          <path d="M2 5.5h2.3L7.5 2.5v10L4.3 9.5H2v-4z" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round"/>
                          <path d="M10.2 5.3a3 3 0 010 4.4" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
                        </svg>
                        Listen
                      </>
                    )}
                  </button>
                )}
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
          {vocalMode && (interim || listening) && (
            <div style={{
              fontSize: 11.5, color: "#00e5cc", marginBottom: 8,
              padding: "6px 10px", borderRadius: 8,
              background: "rgba(0,229,204,0.06)", border: "1px solid rgba(0,229,204,0.15)",
              fontStyle: interim ? "normal" : "italic",
            }}>
              {interim || "Listening…"}
            </div>
          )}
          <div style={{
            display: "flex", gap: 8, alignItems: "flex-end",
            background: "#0a0f1e",
            border: `1px solid ${listening ? "rgba(0,229,204,0.4)" : "#1e293b"}`,
            borderRadius: 12, padding: "8px 8px 8px 14px",
            transition: "border-color 0.2s",
          }}>
            <textarea
              ref={inputRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={onKeyDown}
              placeholder={vocalMode ? "Vocal Mode is on — just talk, or type here…" : "Ask anything about your data…"}
              rows={1}
              style={{
                flex: 1, background: "transparent", border: "none",
                outline: "none", color: "#e2e8f0", fontSize: 13,
                resize: "none", fontFamily: "inherit", lineHeight: 1.5,
                maxHeight: 120, overflowY: "auto",
              }}
            />
            {voiceSupported && !vocalMode && (
              <button
                onClick={onMicClick}
                title={listening ? "Stop listening" : "Dictate a message"}
                style={{
                  width: 32, height: 32, borderRadius: 8, flexShrink: 0,
                  background: listening ? "#f87171" : "#1e293b",
                  border: "none", cursor: "pointer",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  transition: "background 0.15s",
                  color: listening ? "#fff" : "#94a3b8",
                }}
              >
                <svg width="13" height="13" viewBox="0 0 15 15" fill="none">
                  <rect x="5.5" y="1" width="4" height="7.5" rx="2" stroke="currentColor" strokeWidth="1.3"/>
                  <path d="M3 7.5a4.5 4.5 0 009 0" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
                  <path d="M7.5 12v2" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
                </svg>
              </button>
            )}
            <button
              onClick={() => send()}
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
            {vocalMode
              ? "Vocal Mode · tap the speaker icon above to turn it off"
              : voiceSupported
                ? "Enter to send · Shift+Enter for new line · mic to dictate"
                : "Enter to send · Shift+Enter for new line"}
          </div>
        </div>
      </div>

      <style>{`
        @keyframes bounce-dot {
          0%, 80%, 100% { transform: scale(0.7); opacity: 0.4; }
          40% { transform: scale(1); opacity: 1; }
        }
        @keyframes pulse-dot {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.5; transform: scale(1.3); }
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
