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
  { role: "user", content: "Give me a quick summary of this week's performance" },
  {
    role: "assistant",
    content: `Here's your week at a glance:\n\n**Blended ROAS is strong at 3.86x** — up 0.4x week-over-week. Your $12,480 in ad spend returned $48,200 in tracked revenue across platforms.\n\nA few things worth noting:\n\n• **Acme Co** is your top performer. ROAS is holding above 4x — don't touch the targeting, it's working.\n\n• **BlueSky Agency** — spend is up but revenue hasn't followed proportionally. Worth pulling their Meta breakdown before Monday's report to check for creative fatigue.\n\n• **TechFlow Inc** — flat week, nothing alarming. Jun 2 report already delivered.\n\nOverall: solid week. The 14% revenue lift is real. Want me to draft client commentary for any of these three?`,
  },
];

// ── TTS helper ──────────────────────────────────────────────────────────────
function speak(text: string, outputDeviceId?: string, onEnd?: () => void): SpeechSynthesisUtterance | null {
  if (typeof window === "undefined" || !window.speechSynthesis) return null;
  window.speechSynthesis.cancel();
  const clean = text.replace(/\*\*([^*]+)\*\*/g, "$1").replace(/[\*\_#`]/g, "");
  const utt = new SpeechSynthesisUtterance(clean);
  utt.rate = 1.05;
  utt.pitch = 1.0;
  // Note: Web SpeechSynthesis doesn't expose output device selection via
  // the standard API — it always uses the system default output. The device
  // picker we add is for the mic (input) side only; TTS output follows
  // whatever the OS default audio output device is.
  if (onEnd) utt.onend = onEnd;
  window.speechSynthesis.speak(utt);
  return utt;
}

// ── WAV encoder ─────────────────────────────────────────────────────────────
// whisper-cli expects 16kHz mono 16-bit PCM WAV. We capture from the mic at
// any sample rate the hardware offers, then downsample to 16kHz in JS before
// writing the WAV header. This is the only part that makes local whisper
// work in Electron — no Google key needed, no network, completely offline.
function encodeWav(audioBuffer: AudioBuffer): Uint8Array {
  const TARGET_RATE = 16000;
  const numChannels = 1; // always mono for whisper
  const inputRate = audioBuffer.sampleRate;
  const inputData = audioBuffer.getChannelData(0); // take left channel

  // Simple linear interpolation downsample
  const ratio = inputRate / TARGET_RATE;
  const outputLength = Math.floor(inputData.length / ratio);
  const pcm = new Int16Array(outputLength);
  for (let i = 0; i < outputLength; i++) {
    const srcIdx = i * ratio;
    const lo = Math.floor(srcIdx);
    const hi = Math.min(lo + 1, inputData.length - 1);
    const frac = srcIdx - lo;
    const sample = inputData[lo] * (1 - frac) + inputData[hi] * frac;
    pcm[i] = Math.max(-32768, Math.min(32767, Math.round(sample * 32767)));
  }

  const dataSize = pcm.length * 2;
  const buffer = new ArrayBuffer(44 + dataSize);
  const view = new DataView(buffer);
  const write = (offset: number, val: string) => {
    for (let i = 0; i < val.length; i++) view.setUint8(offset + i, val.charCodeAt(i));
  };
  write(0, "RIFF");
  view.setUint32(4, 36 + dataSize, true);
  write(8, "WAVE");
  write(12, "fmt ");
  view.setUint32(16, 16, true);          // chunk size
  view.setUint16(20, 1, true);           // PCM
  view.setUint16(22, numChannels, true);
  view.setUint32(24, TARGET_RATE, true);
  view.setUint32(28, TARGET_RATE * numChannels * 2, true); // byte rate
  view.setUint16(32, numChannels * 2, true);               // block align
  view.setUint16(34, 16, true);          // bits per sample
  write(36, "data");
  view.setUint32(40, dataSize, true);
  const dest = new Int16Array(buffer, 44);
  dest.set(pcm);
  return new Uint8Array(buffer);
}

interface AudioDevice {
  deviceId: string;
  kind: string;
  label: string;
}

export default function PulseAIPanel() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>(DEMO_SEED);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [ollamaStatus, setOllamaStatus] = useState<"checking" | "online" | "offline">("checking");
  const [model, setModel] = useState<string>("");
  const [retryCount, setRetryCount] = useState(0);

  // ── Voice state ──────────────────────────────────────────────────────────
  const [vocalMode, setVocalMode] = useState(false);
  const [listening, setListening] = useState(false);
  const [speakingIdx, setSpeakingIdx] = useState<number | null>(null);
  const [whisperReady, setWhisperReady] = useState<boolean | null>(null); // null = checking
  const [whisperInstalling, setWhisperInstalling] = useState(false);
  const [whisperProgress, setWhisperProgress] = useState<{ pct: number; label: string } | null>(null);
  const [showDeviceSettings, setShowDeviceSettings] = useState(false);
  const [audioDevices, setAudioDevices] = useState<AudioDevice[]>([]);
  const [selectedInputDevice, setSelectedInputDevice] = useState<string>(""); // deviceId or "" = default
  const [selectedOutputDevice, setSelectedOutputDevice] = useState<string>(""); // reserved for future

  const vocalModeRef = useRef(false);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const isElectron = typeof window !== "undefined" && !!(window as any).pulse;

  // ── Ollama status poll ──────────────────────────────────────────────────
  const checkOllama = useCallback(async () => {
    try {
      const r = await fetch("/api/pulse-ai", { cache: "no-store" });
      const data = await r.json();
      if (data.online && data.models?.length > 0) {
        setOllamaStatus("online");
        setModel(data.models[0]);
        if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
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
    pollRef.current = setInterval(checkOllama, 5000);
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [checkOllama]);

  // ── Whisper status check on mount ────────────────────────────────────────
  useEffect(() => {
    if (!isElectron) { setWhisperReady(false); return; }
    (window as any).pulse.whisperStatus().then((res: { ready: boolean }) => {
      setWhisperReady(res.ready);
    }).catch(() => setWhisperReady(false));
  }, [isElectron]);

  // ── Stop everything when panel closes ───────────────────────────────────
  useEffect(() => {
    if (!open) {
      window.speechSynthesis?.cancel();
      stopRecording();
      setListening(false);
      setSpeakingIdx(null);
      if (vocalModeRef.current) { vocalModeRef.current = false; setVocalMode(false); }
    }
  }, [open]);

  useEffect(() => {
    if (open) messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading, open]);

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 150);
  }, [open]);

  // ── Whisper install ──────────────────────────────────────────────────────
  async function installWhisper() {
    if (!isElectron || whisperInstalling) return;
    setWhisperInstalling(true);
    setWhisperProgress({ pct: 0, label: "Starting voice input setup…" });
    const pulse = (window as any).pulse;
    const unsub = pulse.onWhisperProgress((p: { pct: number; label: string }) => setWhisperProgress(p));
    try {
      const result = await pulse.installWhisper();
      setWhisperReady(result.success);
      if (!result.success) setWhisperProgress({ pct: 0, label: result.error || "Setup failed" });
      else setWhisperProgress(null);
    } finally {
      unsub();
      setWhisperInstalling(false);
    }
  }

  // ── Device enumeration ───────────────────────────────────────────────────
  async function loadAudioDevices() {
    if (!isElectron) return;
    const devices: AudioDevice[] = await (window as any).pulse.listAudioDevices();
    setAudioDevices(devices);
  }

  // ── Raw mic capture + whisper transcription ─────────────────────────────
  function stopRecording() {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
    }
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach(t => t.stop());
      mediaStreamRef.current = null;
    }
  }

  async function startRecording(onTranscript: (text: string) => void) {
    stopRecording();
    try {
      const constraints: MediaStreamConstraints = {
        audio: selectedInputDevice
          ? { deviceId: { exact: selectedInputDevice } }
          : true,
      };
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      mediaStreamRef.current = stream;
      audioChunksRef.current = [];

      const recorder = new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };

      recorder.onstop = async () => {
        setListening(false);
        const blob = new Blob(audioChunksRef.current, { type: "audio/webm" });
        audioChunksRef.current = [];

        // Decode webm → AudioBuffer → encode to 16kHz WAV → whisper
        try {
          const arrayBuf = await blob.arrayBuffer();
          const audioCtx = new AudioContext();
          const audioBuf = await audioCtx.decodeAudioData(arrayBuf);
          audioCtx.close();
          const wavBytes = encodeWav(audioBuf);

          const result = await (window as any).pulse.transcribe(wavBytes);
          if (result.success && result.text?.trim()) {
            onTranscript(result.text.trim());
          } else if (!result.success) {
            console.error("[PulseAI] Transcription error:", result.error);
          }
        } catch (err) {
          console.error("[PulseAI] Audio decode/transcribe error:", err);
        }
      };

      recorder.start();
      setListening(true);
    } catch (err) {
      console.error("[PulseAI] Mic access error:", err);
      setListening(false);
    }
  }

  function stopAndTranscribe(onTranscript: (text: string) => void) {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
      // onstop handler calls onTranscript after processing
      const rec = mediaRecorderRef.current;
      // Reattach onstop with the current callback before stopping
      rec.onstop = async () => {
        setListening(false);
        const blob = new Blob(audioChunksRef.current, { type: "audio/webm" });
        audioChunksRef.current = [];
        try {
          const arrayBuf = await blob.arrayBuffer();
          const audioCtx = new AudioContext();
          const audioBuf = await audioCtx.decodeAudioData(arrayBuf);
          audioCtx.close();
          const wavBytes = encodeWav(audioBuf);
          const result = await (window as any).pulse.transcribe(wavBytes);
          if (result.success && result.text?.trim()) onTranscript(result.text.trim());
        } catch (err) {
          console.error("[PulseAI] Transcribe on stop error:", err);
        }
      };
      rec.stop();
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach(t => t.stop());
        mediaStreamRef.current = null;
      }
    }
  }

  // ── Send message ─────────────────────────────────────────────────────────
  async function sendMessage(textOverride?: string) {
    const text = (textOverride ?? input).trim();
    if (!text || loading) return;

    const userMessages: Message[] = [...messages, { role: "user", content: text }];
    setMessages(userMessages);
    setInput("");
    setLoading(true);

    if (ollamaStatus !== "online" || !model) {
      try {
        const r = await fetch("/api/pulse-ai", { cache: "no-store" });
        const data = await r.json();
        if (!data.online || !data.models?.length) {
          setMessages(prev => [...prev, { role: "assistant", content: "⚠️ Pulse AI is still starting up — try again in a few seconds." }]);
          setLoading(false);
          return;
        }
        setOllamaStatus("online");
        setModel(data.models[0]);
      } catch {
        setMessages(prev => [...prev, { role: "assistant", content: "⚠️ Can't reach Pulse AI. Make sure Ollama is installed and running." }]);
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
          messages: [{ role: "system", content: SYSTEM_PROMPT }, ...userMessages],
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
      setMessages(prev => [...prev, { role: "assistant", content: "" }]);

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        for (const line of chunk.split("\n").filter(l => l.trim())) {
          try {
            const json = JSON.parse(line);
            const delta = json.message?.content || "";
            if (delta) {
              assistantText += delta;
              setMessages(prev => {
                const updated = [...prev];
                updated[updated.length - 1] = { role: "assistant", content: assistantText };
                return updated;
              });
            }
          } catch {}
        }
      }

      if (!assistantText.trim()) {
        setMessages(prev => {
          const updated = [...prev];
          updated[updated.length - 1] = { role: "assistant", content: "⚠️ Pulse AI returned an empty response — try again." };
          return updated;
        });
      } else if (vocalModeRef.current) {
        const newIdx = userMessages.length; // index of new assistant msg
        setSpeakingIdx(newIdx);
        speak(assistantText, selectedOutputDevice, () => {
          setSpeakingIdx(null);
          if (vocalModeRef.current) {
            startRecording((transcript) => sendMessage(transcript));
          }
        });
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Unknown error";
      setMessages(prev => {
        const updated = [...prev];
        const last = updated[updated.length - 1];
        if (last?.role === "assistant" && !last.content) {
          updated[updated.length - 1] = { role: "assistant", content: `⚠️ Error: ${msg}` };
        } else {
          updated.push({ role: "assistant", content: `⚠️ Error: ${msg}` });
        }
        return updated;
      });
    } finally {
      setLoading(false);
    }
  }

  // ── Vocal Mode toggle ────────────────────────────────────────────────────
  function toggleVocalMode() {
    if (vocalModeRef.current) {
      vocalModeRef.current = false;
      setVocalMode(false);
      window.speechSynthesis?.cancel();
      stopRecording();
      setListening(false);
      setSpeakingIdx(null);
    } else {
      if (!whisperReady) { installWhisper(); return; }
      vocalModeRef.current = true;
      setVocalMode(true);
      startRecording((transcript) => sendMessage(transcript));
    }
  }

  // ── One-shot mic dictation button ────────────────────────────────────────
  async function handleMicButton() {
    if (!whisperReady) { await installWhisper(); return; }
    if (listening) {
      stopAndTranscribe((transcript) => {
        setInput(prev => (prev ? prev + " " + transcript : transcript));
        setTimeout(() => inputRef.current?.focus(), 50);
      });
    } else {
      startRecording((transcript) => {
        setInput(prev => (prev ? prev + " " + transcript : transcript));
        setTimeout(() => inputRef.current?.focus(), 50);
      });
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  }

  function renderContent(text: string) {
    return text.split("\n").map((line, li, arr) => (
      <span key={li}>
        {line.split(/(\*\*[^*]+\*\*)/g).map((part, i) =>
          part.startsWith("**") && part.endsWith("**")
            ? <strong key={i} style={{ color: "#e2e8f0", fontWeight: 600 }}>{part.slice(2, -2)}</strong>
            : <span key={i}>{part}</span>
        )}
        {li < arr.length - 1 && <br />}
      </span>
    ));
  }

  const statusColor =
    vocalMode && listening ? "#a78bfa"
    : vocalMode && speakingIdx !== null ? "#00e5cc"
    : ollamaStatus === "online" ? "#00e5cc"
    : ollamaStatus === "offline" ? "#f59e0b"
    : "#64748b";

  const statusLabel =
    vocalMode && listening ? "Listening…"
    : vocalMode && speakingIdx !== null ? "Speaking…"
    : vocalMode ? "Vocal Mode · On"
    : ollamaStatus === "online" ? `Online · ${model}`
    : ollamaStatus === "offline" ? `Starting up… (${retryCount})`
    : "Checking…";

  const inputDevices = audioDevices.filter(d => d.kind === "audioinput");

  return (
    <>
      {/* Trigger button */}
      <button
        onClick={() => setOpen(true)}
        style={{
          position: "fixed", bottom: 28, right: 28, zIndex: 200,
          display: "flex", alignItems: "center", gap: 8,
          padding: "11px 20px",
          background: "linear-gradient(135deg, #00e5cc 0%, #0099ff 100%)",
          border: "none", borderRadius: 50,
          color: "#0a0f1e", fontWeight: 700, fontSize: 13, cursor: "pointer",
          boxShadow: "0 0 24px rgba(0,229,204,0.35), 0 4px 16px rgba(0,0,0,0.4)",
        }}
      >
        <span style={{ fontSize: 15 }}>✦</span> Test Pulse AI
      </button>

      {/* Backdrop */}
      {open && (
        <div onClick={() => setOpen(false)} style={{
          position: "fixed", inset: 0, zIndex: 300,
          background: "rgba(0,0,0,0.45)", backdropFilter: "blur(2px)",
        }} />
      )}

      {/* Panel */}
      <div style={{
        position: "fixed", top: 0, right: 0, bottom: 0, zIndex: 400,
        width: 440, background: "#0d1526",
        borderLeft: "1px solid #1e293b",
        display: "flex", flexDirection: "column",
        transform: open ? "translateX(0)" : "translateX(100%)",
        transition: "transform 0.28s cubic-bezier(0.4,0,0.2,1)",
        boxShadow: open ? "-8px 0 48px rgba(0,0,0,0.6)" : "none",
      }}>

        {/* Header */}
        <div style={{ padding: "18px 20px 14px", borderBottom: "1px solid #1e293b", flexShrink: 0 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{
                width: 34, height: 34, borderRadius: 9,
                background: "linear-gradient(135deg, #00e5cc, #0099ff)",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 16, color: "#0a0f1e", fontWeight: 800,
              }}>✦</div>
              <div>
                <div style={{ fontSize: 15, fontWeight: 700, color: "#fff" }}>Pulse AI</div>
                <div style={{ display: "flex", alignItems: "center", gap: 5, marginTop: 2 }}>
                  <div style={{
                    width: 6, height: 6, borderRadius: "50%", background: statusColor,
                    ...(ollamaStatus === "offline" ? { animation: "pulse-dot 1.5s ease-in-out infinite" } : {}),
                  }} />
                  <span style={{ fontSize: 11, color: statusColor }}>{statusLabel}</span>
                </div>
              </div>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              {/* Vocal Mode toggle */}
              <button
                onClick={toggleVocalMode}
                title={vocalMode ? "Turn off Vocal Mode" : whisperReady ? "Turn on Vocal Mode (hands-free)" : "Set up voice input first"}
                style={{
                  background: vocalMode ? "rgba(167,139,250,0.15)" : "none",
                  border: vocalMode ? "1px solid #a78bfa" : "1px solid #1e293b",
                  color: vocalMode ? "#a78bfa" : "#64748b",
                  fontSize: 15, cursor: "pointer", padding: "4px 9px", borderRadius: 6,
                }}
              >
                {vocalMode ? "🎤" : "🎧"}
              </button>
              {/* Device settings (only shown in Electron) */}
              {isElectron && (
                <button
                  onClick={() => {
                    setShowDeviceSettings(s => !s);
                    if (!showDeviceSettings) loadAudioDevices();
                  }}
                  title="Audio device settings"
                  style={{
                    background: showDeviceSettings ? "rgba(0,229,204,0.1)" : "none",
                    border: showDeviceSettings ? "1px solid rgba(0,229,204,0.3)" : "1px solid #1e293b",
                    color: showDeviceSettings ? "#00e5cc" : "#64748b",
                    fontSize: 14, cursor: "pointer", padding: "4px 8px", borderRadius: 6,
                  }}
                >⚙</button>
              )}
              <button onClick={checkOllama} title="Retry connection" style={{
                background: "none", border: "1px solid #1e293b", color: "#64748b",
                fontSize: 11, cursor: "pointer", padding: "4px 8px", borderRadius: 6,
              }}>↺ Retry</button>
              <button onClick={() => setMessages(DEMO_SEED)} style={{
                background: "none", border: "1px solid #1e293b", color: "#64748b",
                fontSize: 11, cursor: "pointer", padding: "4px 8px", borderRadius: 6,
              }}>Reset</button>
              <button onClick={() => setOpen(false)} style={{
                background: "none", border: "none", color: "#64748b",
                fontSize: 22, cursor: "pointer", padding: 4, lineHeight: 1,
              }}>×</button>
            </div>
          </div>
          <p style={{ margin: "10px 0 0", fontSize: 12, color: "#475569", lineHeight: 1.5 }}>
            Runs locally on your machine — your data never leaves this device.
          </p>
        </div>

        {/* Device settings drawer */}
        {showDeviceSettings && (
          <div style={{
            padding: "12px 18px", borderBottom: "1px solid #1e293b",
            background: "#0a1020", flexShrink: 0,
          }}>
            <div style={{ fontSize: 11, color: "#64748b", fontWeight: 600, marginBottom: 8, letterSpacing: "0.05em" }}>AUDIO DEVICES</div>
            <div style={{ marginBottom: 10 }}>
              <label style={{ fontSize: 11, color: "#475569", display: "block", marginBottom: 4 }}>Microphone (input)</label>
              <select
                value={selectedInputDevice}
                onChange={e => setSelectedInputDevice(e.target.value)}
                style={{
                  width: "100%", background: "#0d1526", border: "1px solid #1e293b",
                  borderRadius: 6, color: "#cbd5e1", fontSize: 12, padding: "5px 8px",
                }}
              >
                <option value="">System default</option>
                {inputDevices.map(d => (
                  <option key={d.deviceId} value={d.deviceId}>{d.label || d.deviceId}</option>
                ))}
              </select>
            </div>
            <div style={{ fontSize: 11, color: "#334155", fontStyle: "italic" }}>
              Output device follows system default (Web Speech API limitation).
            </div>
            {/* Whisper install status */}
            <div style={{ marginTop: 10 }}>
              {whisperReady === false && !whisperInstalling && (
                <button
                  onClick={installWhisper}
                  style={{
                    background: "rgba(0,229,204,0.1)", border: "1px solid rgba(0,229,204,0.3)",
                    borderRadius: 6, color: "#00e5cc", fontSize: 11, padding: "5px 10px", cursor: "pointer",
                  }}
                >
                  ⬇ Install local voice engine (~150MB)
                </button>
              )}
              {whisperInstalling && whisperProgress && (
                <div style={{ fontSize: 11, color: "#a78bfa" }}>
                  {whisperProgress.label} ({whisperProgress.pct}%)
                  <div style={{
                    height: 3, background: "#1e293b", borderRadius: 2, marginTop: 4,
                  }}>
                    <div style={{
                      height: "100%", width: `${whisperProgress.pct}%`,
                      background: "#a78bfa", borderRadius: 2,
                      transition: "width 0.3s ease",
                    }} />
                  </div>
                </div>
              )}
              {whisperReady === true && (
                <div style={{ fontSize: 11, color: "#00e5cc" }}>✓ Voice engine ready</div>
              )}
            </div>
          </div>
        )}

        {/* Messages */}
        <div style={{
          flex: 1, overflowY: "auto", padding: "16px 18px",
          display: "flex", flexDirection: "column", gap: 14,
        }}>
          {messages.map((msg, i) => (
            <div key={i} style={{
              display: "flex", flexDirection: "column",
              alignItems: msg.role === "user" ? "flex-end" : "flex-start",
            }}>
              {msg.role === "assistant" && (
                <div style={{ fontSize: 10, color: "#334155", marginBottom: 4, fontWeight: 600, letterSpacing: "0.05em" }}>PULSE AI</div>
              )}
              <div style={{
                maxWidth: "90%", padding: "10px 14px",
                borderRadius: msg.role === "user" ? "12px 12px 2px 12px" : "2px 12px 12px 12px",
                background: msg.role === "user" ? "rgba(0,229,204,0.1)" : "#0a0f1e",
                border: msg.role === "user" ? "1px solid rgba(0,229,204,0.2)" : "1px solid #1e293b",
                color: "#cbd5e1", fontSize: 13, lineHeight: 1.65,
                whiteSpace: "pre-wrap", wordBreak: "break-word",
              }}>
                {renderContent(msg.content)}
                {loading && i === messages.length - 1 && msg.role === "assistant" && (
                  <span style={{ color: "#00e5cc" }}>▋</span>
                )}
              </div>
              {msg.role === "assistant" && msg.content && (
                <button
                  onClick={() => {
                    if (speakingIdx === i) { window.speechSynthesis?.cancel(); setSpeakingIdx(null); }
                    else { setSpeakingIdx(i); speak(msg.content, selectedOutputDevice, () => setSpeakingIdx(null)); }
                  }}
                  title={speakingIdx === i ? "Stop" : "Listen"}
                  style={{
                    marginTop: 4, background: "none", border: "none",
                    color: speakingIdx === i ? "#00e5cc" : "#334155",
                    fontSize: 11, cursor: "pointer", padding: "2px 4px",
                  }}
                >
                  {speakingIdx === i ? "⏹ Stop" : "🔊 Listen"}
                </button>
              )}
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>

        {/* Quick prompts */}
        <div style={{ padding: "8px 18px 0", display: "flex", gap: 6, flexWrap: "wrap", flexShrink: 0 }}>
          {["Draft Acme Co report", "Why is ROAS up?", "Flag any risks"].map(p => (
            <button key={p} onClick={() => { setInput(p); setTimeout(() => inputRef.current?.focus(), 50); }} style={{
              background: "rgba(0,229,204,0.05)", border: "1px solid rgba(0,229,204,0.15)",
              borderRadius: 20, padding: "4px 10px", color: "#64748b", fontSize: 11, cursor: "pointer",
            }}>{p}</button>
          ))}
        </div>

        {/* Input */}
        <div style={{ padding: "10px 16px 16px", flexShrink: 0 }}>
          {/* Listening indicator */}
          {listening && (
            <div style={{
              fontSize: 12, color: "#a78bfa", marginBottom: 6,
              padding: "4px 8px", background: "rgba(167,139,250,0.08)",
              borderRadius: 6, border: "1px solid rgba(167,139,250,0.2)",
              display: "flex", alignItems: "center", gap: 6,
            }}>
              <span style={{
                width: 6, height: 6, borderRadius: "50%", background: "#ef4444",
                display: "inline-block", animation: "pulse-dot 1s ease-in-out infinite",
              }} />
              Recording… tap mic to stop and transcribe
            </div>
          )}
          <div style={{ display: "flex", gap: 8, alignItems: "flex-end" }}>
            {/* Mic button */}
            <button
              onClick={handleMicButton}
              disabled={loading || vocalMode}
              title={!whisperReady ? "Voice engine not installed — click to set up" : listening ? "Stop and transcribe" : "Dictate message"}
              style={{
                width: 38, height: 38, flexShrink: 0,
                background: listening ? "rgba(239,68,68,0.15)" : !whisperReady ? "rgba(245,158,11,0.08)" : "rgba(255,255,255,0.03)",
                border: listening ? "1px solid #ef4444" : !whisperReady ? "1px solid rgba(245,158,11,0.3)" : "1px solid #1e293b",
                borderRadius: 10,
                color: listening ? "#ef4444" : !whisperReady ? "#f59e0b" : "#64748b",
                fontSize: 16, cursor: loading || vocalMode ? "not-allowed" : "pointer",
                display: "flex", alignItems: "center", justifyContent: "center",
              }}
            >
              {listening ? "⏹" : "🎤"}
            </button>
            <textarea
              ref={inputRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={ollamaStatus === "online" ? "Ask Pulse AI anything..." : "Ollama starting up — ask anyway and it'll retry..."}
              disabled={loading}
              rows={1}
              style={{
                flex: 1, background: "#0a0f1e", border: "1px solid #1e293b",
                borderRadius: 10, padding: "10px 14px", color: "#fff",
                fontSize: 13, resize: "none", outline: "none",
                fontFamily: "inherit", lineHeight: 1.5,
                maxHeight: 120, overflowY: "auto",
              }}
              onInput={e => {
                const t = e.currentTarget;
                t.style.height = "auto";
                t.style.height = Math.min(t.scrollHeight, 120) + "px";
              }}
              onFocus={e => { e.currentTarget.style.borderColor = "rgba(0,229,204,0.4)"; }}
              onBlur={e => { e.currentTarget.style.borderColor = "#1e293b"; }}
            />
            <button
              onClick={() => sendMessage()}
              disabled={loading || !input.trim()}
              style={{
                width: 38, height: 38, flexShrink: 0,
                background: loading || !input.trim() ? "rgba(0,229,204,0.08)" : "linear-gradient(135deg, #00e5cc, #0099ff)",
                border: "none", borderRadius: 10,
                color: loading || !input.trim() ? "#334155" : "#0a0f1e",
                fontSize: 17, cursor: loading || !input.trim() ? "not-allowed" : "pointer",
                display: "flex", alignItems: "center", justifyContent: "center",
              }}
            >
              {loading ? "·" : "↑"}
            </button>
          </div>
          <div style={{ marginTop: 7, fontSize: 11, color: "#1e293b", textAlign: "center" }}>
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
