"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "../lib/auth";

/** Delete account: confirmation dialog, re-authentication, honest success/failure. Demo never reaches the server. */
export default function DeleteAccountSection() {
  const { user, deleteAccount, resetDemo } = useAuth();
  const router = useRouter();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [confirmText, setConfirmText] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  if (!user) return null;

  if (user.isDemo) {
    return (
      <section className="checklist-card">
        <h2>Demo data</h2>
        <p>This is a demo. Nothing here is a real account, so there is nothing to delete.</p>
        <button type="button" className="secondary-btn" onClick={resetDemo}>Reset demo data</button>
      </section>
    );
  }

  const needsPassword = true; // email/password accounts re-enter their password; Google accounts see the sign-in-again hint on failure
  const ready = confirmText.trim() === "DELETE" && !busy;

  function open() {
    setError(null);
    setConfirmText("");
    setPassword("");
    dialogRef.current?.showModal();
  }
  function close() {
    if (busy) return;
    dialogRef.current?.close();
  }
  async function confirm() {
    if (!ready) return;
    setBusy(true);
    setError(null);
    const result = await deleteAccount(needsPassword && password ? password : undefined);
    setBusy(false);
    if (!result.ok) {
      setError(result.error ?? "We could not delete your account. Nothing was deleted.");
      return;
    }
    dialogRef.current?.close();
    router.replace("/account/deleted");
  }

  return (
    <section className="checklist-card danger-zone">
      <h2>Delete account</h2>
      <p>Permanently delete your sign-in and the data linked to it: business profile, checklist progress, reminder settings and sent-reminder log. This cannot be undone.</p>
      <button type="button" className="danger-btn" onClick={open}>Delete my account…</button>

      <dialog ref={dialogRef} className="confirm-dialog" aria-labelledby="del-title" onCancel={(e) => busy && e.preventDefault()}>
        <h2 id="del-title">Delete your account?</h2>
        <p>This is permanent. You will lose your checklist progress and saved answers. Type <strong>DELETE</strong> to confirm.</p>
        <label className="question-label" htmlFor="del-confirm">Type DELETE</label>
        <input id="del-confirm" className="text-input" autoComplete="off" value={confirmText} onChange={(e) => setConfirmText(e.target.value)} />
        <label className="question-label" htmlFor="del-pass">Password (to confirm it&apos;s you)</label>
        <input id="del-pass" type="password" autoComplete="current-password" className="text-input" value={password} onChange={(e) => setPassword(e.target.value)} />
        <p className="hint">Signed in with Google? Leave the password empty. If asked, log out, sign in again, and retry within 10 minutes.</p>
        {error && <p role="alert" className="hint" style={{ color: "var(--red-text)" }}>{error}</p>}
        <div className="wizard-actions">
          <button type="button" className="secondary-btn" onClick={close} disabled={busy}>Cancel</button>
          <button type="button" className="danger-btn" onClick={confirm} disabled={!ready} aria-busy={busy}>
            {busy ? "Deleting…" : "Delete permanently"}
          </button>
        </div>
      </dialog>
    </section>
  );
}
