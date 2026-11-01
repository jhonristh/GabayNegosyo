"use client";

import { useEffect, useState } from "react";

/**
 * Tells the person when the connection drops or returns. It does not queue or fake anything: actions that need the
 * server (saving progress, sending a test reminder, account changes) still report their own honest errors.
 */
export default function OfflineBanner() {
  const [state, setState] = useState<"online" | "offline" | "back">("online");

  useEffect(() => {
    if (typeof navigator !== "undefined" && navigator.onLine === false) setState("offline");
    let timer: ReturnType<typeof setTimeout> | undefined;
    const goOffline = () => {
      if (timer) clearTimeout(timer);
      setState("offline");
    };
    const goOnline = () => {
      setState("back");
      timer = setTimeout(() => setState("online"), 4000);
    };
    window.addEventListener("offline", goOffline);
    window.addEventListener("online", goOnline);
    return () => {
      window.removeEventListener("offline", goOffline);
      window.removeEventListener("online", goOnline);
      if (timer) clearTimeout(timer);
    };
  }, []);

  if (state === "online") return null;
  return (
    <div className={`offline-banner offline-banner--${state}`} role="status" aria-live="polite">
      {state === "offline"
        ? "You're offline. Anything that needs the server, such as saving progress, will not be saved until you reconnect."
        : "You're back online."}
    </div>
  );
}
