"use client";

import { useEffect } from "react";
import { reportError } from "../lib/observability";

/**
 * Last-resort boundary for errors in the root layout itself. It replaces the
 * whole document, so it must render its own <html>/<body> and cannot rely on
 * the app's providers or global stylesheet.
 */
export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    reportError({
      context: "global-error-boundary",
      message: error.message,
      digest: error.digest,
      url: typeof window !== "undefined" ? window.location.pathname : undefined,
    });
  }, [error]);

  return (
    <html lang="en">
      <body style={{ fontFamily: "system-ui, sans-serif", padding: 24, color: "#10251d", background: "#f7faf6" }}>
        <main role="alert" style={{ maxWidth: 520, margin: "48px auto" }}>
          <h1>GabayNegosyo hit a problem.</h1>
          <p>Reload to try again. Your saved checklist is not affected.</p>
          <button
            type="button"
            onClick={reset}
            style={{ padding: "12px 20px", borderRadius: 12, border: 0, background: "#145d2d", color: "#fff", fontSize: 16 }}
          >
            Try again
          </button>
        </main>
      </body>
    </html>
  );
}
