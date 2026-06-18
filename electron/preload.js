const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("pulse", {
  // ── App info ──────────────────────────────────────────────────────────────
  version: process.env.npm_package_version || "0.1.0",

  // ── OAuth ─────────────────────────────────────────────────────────────────
  /** Start an OAuth flow. Opens system browser, returns { success, error? } */
  startOAuth: (provider) => ipcRenderer.invoke("oauth:start", provider),

  /** Listen for live OAuth result pushed from main process */
  onOAuthResult: (cb) => {
    const handler = (_e, data) => cb(data);
    ipcRenderer.on("oauth:result", handler);
    return () => ipcRenderer.removeListener("oauth:result", handler);
  },

  /** Redeem a pending OAuth code that was captured before sign-in */
  redeemOAuth: (provider, userId) => ipcRenderer.invoke("oauth:redeem", provider, userId),

  // ── Verification ──────────────────────────────────────────────────────────
  /** Verify a Shopify token is valid. Returns { success, shopName?, error? } */
  verifyShopify: (store, token) => ipcRenderer.invoke("verify:shopify", store, token),

  /** Verify a Klaviyo API key. Returns { success, orgName?, error? } */
  verifyKlaviyo: (apiKey) => ipcRenderer.invoke("verify:klaviyo", apiKey),

  /**
   * Verify a license by email against the Pulse server (Supabase users table).
   * Returns { valid, plan?, email?, reason? } where reason is one of
   * "not_found" | "not_active" | "server_error" on failure.
   */
  verifyLicense: (email) => ipcRenderer.invoke("license:verify", email),

  // ── Config ────────────────────────────────────────────────────────────────
  /** Persist key/value config to disk */
  saveConfig: (values) => ipcRenderer.invoke("config:save", values),

  /** Read config from disk. Optional dotted key e.g. "shopify.store" */
  getConfig: (key) => ipcRenderer.invoke("config:get", key),

  // ── Ollama / AI ───────────────────────────────────────────────────────────
  /**
   * Install Ollama + pull the AI model.
   * Progress events arrive via onOllamaProgress listener.
   * Returns { success, error? }
   */
  installOllama: (progressCb) => {
    // Register a one-shot progress listener before invoking
    if (progressCb) {
      const handler = (_e, data) => progressCb(data);
      ipcRenderer.on("ollama:progress", handler);
      return ipcRenderer.invoke("ollama:install").finally(() => {
        ipcRenderer.removeListener("ollama:progress", handler);
      });
    }
    return ipcRenderer.invoke("ollama:install");
  },

  /** Subscribe to ongoing Ollama install progress events */
  onOllamaProgress: (cb) => {
    const handler = (_e, data) => cb(data);
    ipcRenderer.on("ollama:progress", handler);
    return () => ipcRenderer.removeListener("ollama:progress", handler);
  },

  // ── Whisper / Voice input ─────────────────────────────────────────────────────────
  /** Returns { ready: boolean } — whether whisper binary + model are on disk */
  whisperStatus: () => ipcRenderer.invoke("whisper:status"),

  /**
   * Download + install whisper.cpp binary and base.en model (~150MB one-time).
   * Progress events fire on onWhisperProgress. Returns { success, error? }.
   */
  installWhisper: () => ipcRenderer.invoke("whisper:install"),

  /** Subscribe to whisper install progress events */
  onWhisperProgress: (cb) => {
    const handler = (_e, data) => cb(data);
    ipcRenderer.on("whisper:progress", handler);
    return () => ipcRenderer.removeListener("whisper:progress", handler);
  },

  /**
   * Transcribe a 16kHz mono PCM WAV passed as a Uint8Array.
   * Returns { success, text?, error? }.
   */
  transcribe: (wavBytes) => ipcRenderer.invoke("whisper:transcribe", wavBytes),

  /**
   * Enumerate audio input/output devices. Returns an array of
   * { deviceId, kind, label } objects so the UI can offer device pickers.
   */
  listAudioDevices: async () => {
    try {
      await navigator.mediaDevices.getUserMedia({ audio: true }).then(s => s.getTracks().forEach(t => t.stop())).catch(() => {});
      const devices = await navigator.mediaDevices.enumerateDevices();
      return devices.map(d => ({ deviceId: d.deviceId, kind: d.kind, label: d.label || d.deviceId }));
    } catch {
      return [];
    }
  },

  // ── Setup lifecycle ────────────────────────────────────────────────────────────
  /** Mark setup complete and open the main app window */
  completeSetup: () => ipcRenderer.invoke("setup:complete"),

  // ── Utility ───────────────────────────────────────────────────────────────
  /** Open a URL in the system default browser */
  openExternal: (url) => ipcRenderer.invoke("shell:openExternal", url),
});
