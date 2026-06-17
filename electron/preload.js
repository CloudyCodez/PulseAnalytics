const { contextBridge, ipcRenderer } = require("electron");

/**
 * Preload — bridges the renderer (setup.html / Next.js pages) to the
 * Electron main process via a minimal, typed contextBridge API.
 *
 * Available as `window.pulse` in any renderer that loads this preload.
 */
contextBridge.exposeInMainWorld("pulse", {
  // ── App info ──────────────────────────────────────────────────────────────
  version: process.env.npm_package_version || "0.1.0",

  // ── OAuth (Google / Meta) ─────────────────────────────────────────────────
  /**
   * Kick off an OAuth flow for the given provider.
   * Opens the system browser, waits for the redirect, then returns
   * { success: true } or { success: false, error: string }.
   * @param {"google" | "meta"} provider
   */
  startOAuth: (provider) => ipcRenderer.invoke("oauth:start", provider),

  /**
   * Listen for live OAuth result updates pushed from main.
   * Callback receives { provider, success, error? }.
   */
  onOAuthResult: (callback) => {
    const handler = (_event, data) => callback(data);
    ipcRenderer.on("oauth:result", handler);
    // Return a cleanup function so callers can unsubscribe if needed
    return () => ipcRenderer.removeListener("oauth:result", handler);
  },

  // ── Config (Shopify + anything key/value) ─────────────────────────────────
  /**
   * Persist arbitrary config to the encrypted on-disk store.
   * @param {Record<string, unknown>} values  e.g. { shopify: { store, token } }
   */
  saveConfig: (values) => ipcRenderer.invoke("config:save", values),

  /**
   * Read the current config (or a subset by key).
   * @param {string=} key  optional dotted key, e.g. "shopify.store"
   */
  getConfig: (key) => ipcRenderer.invoke("config:get", key),

  /**
   * Re-exchange a pending OAuth code that was captured during first-run setup
   * (before the Clerk session existed). Pass the now-known Clerk userId.
   * No-ops silently if there is no pending code for the provider.
   * @param {"google" | "meta"} provider
   * @param {string} userId  Clerk user id (user.id from useUser())
   */
  redeemPendingOAuth: (provider, userId) =>
    ipcRenderer.invoke("oauth:redeem", provider, userId),

  // ── Setup lifecycle ───────────────────────────────────────────────────────
  /**
   * Called by setup.html when the user clicks "Launch Pulse".
   * Main process marks setup as complete and opens the main window.
   */
  completeSetup: () => ipcRenderer.invoke("setup:complete"),

  // ── Utility ───────────────────────────────────────────────────────────────
  /**
   * Open a URL in the system browser (same as shell.openExternal).
   * Useful for "Learn more" links inside the setup wizard.
   */
  openExternal: (url) => ipcRenderer.invoke("shell:openExternal", url),
});
