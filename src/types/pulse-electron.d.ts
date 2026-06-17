// Type declarations for the `window.pulse` API exposed by electron/preload.js.
//
// This object only exists when the app is running inside the Pulse desktop
// app (Electron injects it via contextBridge). It is always undefined on the
// Vercel-hosted cloud portal — that presence/absence check is exactly how
// `isElectron()` in `src/lib/electron.ts` tells the two contexts apart.

export interface PulseOAuthResult {
  success: boolean;
  error?: string;
}

export interface PulseConfigResult {
  success: boolean;
  config?: Record<string, unknown>;
  error?: string;
}

export interface PulseAPI {
  version: string;

  /**
   * Kick off an OAuth flow for the given provider in the system browser.
   * Pass the signed-in Clerk user id when available (i.e. any time after
   * the user has logged in) so the connection persists to Supabase under
   * the right account. During first-run setup, before sign-in, omit it —
   * main.js falls back to a pending-code flow that gets reconciled later
   * via redeemPendingOAuth.
   */
  startOAuth: (provider: "google" | "meta", userId?: string) => Promise<PulseOAuthResult>;

  /** Listen for live OAuth result updates pushed from the main process. */
  onOAuthResult: (
    callback: (data: { provider: string; success: boolean; error?: string }) => void
  ) => () => void;

  /** Persist arbitrary config to the on-disk store (e.g. Shopify store/token). */
  saveConfig: (values: Record<string, unknown>) => Promise<PulseConfigResult>;

  /** Read config back, optionally by a dotted key (e.g. "shopify.store"). */
  getConfig: (key?: string) => Promise<any>;

  /**
   * Re-exchange a code captured during first-run setup (before the user was
   * signed in) now that we know their real Clerk user id. No-ops if there's
   * no pending code for the provider.
   */
  redeemPendingOAuth: (provider: "google" | "meta", userId: string) => Promise<PulseOAuthResult>;

  /** Marks setup complete and opens the main app window. */
  completeSetup: () => Promise<{ success: boolean; error?: string }>;

  /** Opens a URL in the system browser. */
  openExternal: (url: string) => Promise<{ success: boolean; error?: string }>;
}

declare global {
  interface Window {
    pulse?: PulseAPI;
  }
}

export {};
