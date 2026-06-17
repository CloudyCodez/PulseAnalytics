"use client";

import { useState, useEffect } from "react";

/**
 * Returns true if the current page is running inside the Pulse Electron app.
 *
 * Detection is based on the presence of `window.pulse`, which is injected
 * exclusively by electron/preload.js via contextBridge. It is always
 * `undefined` in the Vercel-hosted cloud portal, so this check is reliable.
 *
 * Safe to call server-side — returns false when `window` is not defined.
 */
export function isElectron(): boolean {
  return typeof window !== "undefined" && !!(window as any).pulse;
}

/**
 * React hook that resolves the Electron context on the client.
 *
 * Always returns `false` on the first render (SSR / hydration), then
 * updates to the real value after mount. Use this in any component that
 * needs to branch UI between the Vercel portal and the desktop app.
 *
 * @example
 * const inApp = useIsElectron();
 * return inApp ? <DesktopView /> : <PortalView />;
 */
export function useIsElectron(): boolean {
  const [inElectron, setInElectron] = useState(false);

  useEffect(() => {
    setInElectron(isElectron());
  }, []);

  return inElectron;
}
