"use client";

import Link from "next/link";
import { useState } from "react";
import { useAuth } from "../../lib/auth";

export default function ResetPasswordPage() {
  const { resetPassword } = useAuth();
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim() || submitting) return;
    setError(null);
    setSubmitting(true);
    const result = await resetPassword(email.trim());
    setSubmitting(false);
    if (!result.ok) {
      setError(result.error ?? "We could not send a reset link. Please try again.");
      return;
    }
    setSent(true);
  }

  return (
    <main className="screen auth-simple">
      <header className="intro">
        <p className="gn-kicker">ACCOUNT RECOVERY</p>
        <h1>Reset your password</h1>
        <p>Enter the email address connected to your GabayNegosyo account.</p>
      </header>
      {sent ? (
        <section className="state-block" role="status">
          <h2>Check your email</h2>
          <p>If an account exists for {email.trim()}, we sent a password-reset link. Check your spam folder if it does not arrive shortly.</p>
          <Link href="/login" className="primary-btn">Return to log in</Link>
        </section>
      ) : (
        <form className="question auth-form" onSubmit={submit}>
          <div className="auth-field">
            <label className="question-label" htmlFor="reset-email">Email</label>
            <input id="reset-email" type="email" autoComplete="email" className="text-input" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@email.com" required />
          </div>
          {error && <p role="alert" className="auth-error">{error}</p>}
          <button type="submit" className="primary-btn" disabled={!email.trim() || submitting}>{submitting ? "Sending…" : "Send reset link"}</button>
          <p className="hint">Your answers are used to build your checklist. GabayNegosyo does not file anything for you.</p>
          <p className="auth-switch"><Link href="/login">Back to log in</Link></p>
        </form>
      )}
    </main>
  );
}
