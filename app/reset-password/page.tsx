"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import PasswordField from "../../components/PasswordField";
import { useAuth } from "../../lib/auth";
import { getSupabase } from "../../lib/supabase";

/**
 * Two modes on one page:
 *  - "request": enter your email and we send a reset link.
 *  - "update":  you arrived from that emailed link (Supabase fires PASSWORD_RECOVERY),
 *               so choose a new password.
 */
export default function ResetPasswordPage() {
  const { resetPassword, updatePassword } = useAuth();
  const [mode, setMode] = useState<"request" | "update">("request");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    let sub: { unsubscribe: () => void } | null = null;
    try {
      if (typeof window !== "undefined" && window.location.hash.includes("type=recovery")) setMode("update");
      const { data } = getSupabase().auth.onAuthStateChange((event) => {
        if (event === "PASSWORD_RECOVERY") setMode("update");
      });
      sub = data.subscription;
    } catch {
      /* Supabase not configured: the request form will report the problem when used. */
    }
    return () => sub?.unsubscribe();
  }, []);

  async function handleRequest() {
    if (submitting || !email.trim()) return;
    setError(null);
    setNotice(null);
    setSubmitting(true);
    const result = await resetPassword(email);
    setSubmitting(false);
    if (!result.ok) {
      setError(result.error ?? "Could not send the reset link. Please try again.");
      return;
    }
    setNotice("If an account exists for that email, a reset link is on its way. Check your inbox and spam folder.");
  }

  async function handleUpdate() {
    if (submitting) return;
    setError(null);
    if (password.length < 8) {
      setError("Please choose a password with at least 8 characters.");
      return;
    }
    if (password !== confirm) {
      setError("The two passwords do not match.");
      return;
    }
    setSubmitting(true);
    const result = await updatePassword(password);
    setSubmitting(false);
    if (!result.ok) {
      setError(result.error ?? "Could not update your password. Please try again.");
      return;
    }
    setDone(true);
  }

  return (
    <main className="screen auth-screen">
      <header className="intro">
        <h1>{mode === "update" ? "Choose a new password" : "Reset your password"}</h1>
        <p>{mode === "update" ? "Enter a new password for your account." : "Enter your email and we will send you a link to reset your password."}</p>
      </header>

      {done ? (
        <section>
          <p role="status">Your password was updated.</p>
          <Link href="/dashboard" className="primary-btn">Continue</Link>
        </section>
      ) : mode === "request" ? (
        <section>
          <label htmlFor="reset-email">Email</label>
          <input
            id="reset-email"
            type="email"
            autoComplete="email"
            className="text-input"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleRequest()}
          />
          <button type="button" className="primary-btn" onClick={handleRequest} disabled={submitting || !email.trim()}>
            {submitting ? "Sending…" : "Send reset link"}
          </button>
        </section>
      ) : (
        <section>
          <label htmlFor="new-password">New password</label>
          <PasswordField id="new-password" autoComplete="new-password" value={password} onChange={setPassword} />
          <label htmlFor="confirm-password">Confirm new password</label>
          <PasswordField id="confirm-password" autoComplete="new-password" value={confirm} onChange={setConfirm} onKeyDown={(e) => e.key === "Enter" && handleUpdate()} />
          <button type="button" className="primary-btn" onClick={handleUpdate} disabled={submitting}>
            {submitting ? "Saving…" : "Save new password"}
          </button>
        </section>
      )}

      {error && <p role="alert" className="auth-error">{error}</p>}
      {notice && <p role="status">{notice}</p>}
      <p className="hint"><Link href="/login">Back to log in</Link></p>
    </main>
  );
}
