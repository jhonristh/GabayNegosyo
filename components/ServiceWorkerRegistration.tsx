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
    navigator.serviceWorker.register("/sw.js").catch((err) => {
      console.error("[sw] registration failed", err);
    });
  }, []);

  return null;
}
