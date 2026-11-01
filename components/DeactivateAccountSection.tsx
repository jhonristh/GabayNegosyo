"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "../lib/auth";

/** Temporary, reversible deactivation. Separate from permanent deletion (DeleteAccountSection). Demo and admin accounts do not see it. */
export default function DeactivateAccountSection() {
  const { user, deactivateAccount } = useAuth();
  const router = useRouter();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const openerRef = useRef<HTMLButtonElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  if (!user || user.isDemo || user.isDemoRecord || user.role === "admin") return null;

  function open() {
    setError(null);
    dialogRef.current?.showModal();
  }
  function close() {
    if (busy) return;
    dialogRef.current?.close();
    openerRef.current?.focus();
  }
  async function confirm() {
    setBusy(true);
    setError(null);
    const result = await deactivateAccount();
    setBusy(false);
    if (!result.ok) {
      setError(result.error ?? "We could not deactivate your account. Nothing was changed.");
      return;
    }
    dialogRef.current?.close();
    router.replace("/account/deactivated");
  }

  return (
    <section className="checklist-card" aria-labelledby="deact-h">
      <h2 id="deact-h">Deactivate account</h2>
      <p>Pause your account without losing anything. Your data is kept, you are signed out, and you can reactivate any time by logging in again. This is not deletion.</p>
      <button ref={openerRef} type="button" className="secondary-btn" onClick={open}>Deactivate my account…</button>

      <dialog ref={dialogRef} className="confirm-dialog" aria-labelledby="deact-dlg-title" onCancel={(e) => busy && e.preventDefault()}>
        <h2 id="deact-dlg-title">Deactivate your account?</h2>
        <p>You will be signed out. Your business profile, checklist progress and settings are kept. Log in again and choose Reactivate to continue where you left off.</p>
        {error && <p role="alert" className="hint" style={{ color: "var(--red-text)" }}>{error}</p>}
        <div className="wizard-actions">
          <button type="button" className="secondary-btn" onClick={close} disabled={busy}>Cancel</button>
          <button type="button" className="primary-btn" onClick={confirm} disabled={busy} aria-busy={busy}>{busy ? "Deactivating…" : "Deactivate"}</button>
        </div>
      </dialog>
    </section>
  );
}
