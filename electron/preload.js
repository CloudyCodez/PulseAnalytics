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

  // ── Setup lifecycle ───────────────────────────────────────────────────────
  /** Mark setup complete and open the main app window */
  completeSetup: () => ipcRenderer.invoke("setup:complete"),

  // ── Utility ───────────────────────────────────────────────────────────────
  /** Open a URL in the system default browser */
  openExternal: (url) => ipcRenderer.invoke("shell:openExternal", url),
});
