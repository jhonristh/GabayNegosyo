"use client";

import { useState } from "react";
import { useAuth } from "../lib/auth";

/**
 * Shown instead of the app while an account is deactivated. Reactivation needs the person to be signed in
 * (so it never bypasses authentication). An administrator-imposed deactivation can only be lifted by an administrator;
 * the database enforces that, this screen only reports it.
 */
export default function DeactivatedNotice() {
  const { reactivateAccount, logout } = useAuth();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function reactivate() {
    setBusy(true);
    setError(null);
    const result = await reactivateAccount();
    setBusy(false);
    if (!result.ok) setError(result.error ?? "We could not reactivate your account. Nothing was changed.");
  }

  return (
    <main className="screen" aria-labelledby="deact-title">
      <header className="intro">
        <h1 id="deact-title">Your account is deactivated</h1>
        <p>Your saved business profile and checklist progress are kept, but the app is paused until you reactivate.</p>
      </header>
      {error && <p role="alert" className="hint" style={{ color: "var(--red-text)" }}>{error}</p>}
      <div className="wizard-actions">
        <button type="button" className="primary-btn" onClick={reactivate} disabled={busy} aria-busy={busy}>
          {busy ? "Reactivating…" : "Reactivate my account"}
        </button>
        <button type="button" className="secondary-btn" onClick={() => void logout()} disabled={busy}>Log out</button>
      </div>
    </main>
  );
}
