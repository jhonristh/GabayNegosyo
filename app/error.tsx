"use client";

import { useEffect } from "react";
import Link from "next/link";
import { reportError } from "../lib/observability";

/** Route-level error boundary: a failed screen shows a way forward instead of a blank page. */
export default function RouteError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    reportError({
      context: "error-boundary",
      message: error.message,
      digest: error.digest,
      url: typeof window !== "undefined" ? window.location.pathname : undefined,
    });
  }, [error]);

  return (
    <main className="screen">
      <div className="state-block state-block-error" role="alert">
        <h1>Something went wrong on this page.</h1>
        <p>Your saved checklist is safe. Try again, or go back to your overview.</p>
        <button type="button" className="primary-btn" onClick={reset}>
          Try again
        </button>
        <p className="hint">
          <Link href="/dashboard">Back to overview</Link>
        </p>
      </div>
    </main>
  );
}
