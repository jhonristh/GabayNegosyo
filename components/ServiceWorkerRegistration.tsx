"use client";

import { useEffect } from "react";

/**
 * L13: registered from a component (not an inline <script> in the HTML
 * head), which is what a strict Content-Security-Policy requires — an
 * inline script needs 'unsafe-inline' or a nonce, an external/component-
 * mounted one doesn't.
 */
export default function ServiceWorkerRegistration() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    // Development: a leftover service worker caches /_next/static/* cache-first and serves stale CSS
    // (unstyled login/legal pages). Remove it and its caches; only production registers it.
    if (process.env.NODE_ENV !== "production") {
      navigator.serviceWorker.getRegistrations().then((regs) => regs.forEach((r) => r.unregister())).catch(() => {});
      if ("caches" in window) caches.keys().then((keys) => keys.filter((k) => k.startsWith("gn-")).forEach((k) => caches.delete(k))).catch(() => {});
      return;
    }
    navigator.serviceWorker.register("/sw.js").catch((err) => {
      console.error("[sw] registration failed", err);
    });
  }, []);

  return null;
}
