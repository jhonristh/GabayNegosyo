"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import PasswordField from "../../components/PasswordField";
import { getSupabase } from "../../lib/supabase";
import { useAuth } from "../../lib/auth";
import { friendlyEmailAuthError } from "../../lib/authErrors";

export default function ResetPasswordPage() {
  const { resetPassword } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [recoverySession, setRecoverySession] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    const supabase = getSupabase();

    supabase.auth.getSession().then(({ data }) => {
      if (active) {
        setRecoverySession(Boolean(data.session));
        setCheckingSession(false);
      }
    }).catch(() => {
      if (active) setCheckingSession(false);
    });

    const { data: subscription } = supabase.auth.onAuthStateChange((event, session) => {
      if (!active) return;
      if (event === "PASSWORD_RECOVERY" || (event === "SIGNED_IN" && session)) {
        setRecoverySession(true);
      }
    });

    return () => {
      active = false;
      subscription.subscription.unsubscribe();
    };
  }, []);

  async function requestReset() {
    if (submitting || !email.trim()) return;
    setSubmitting(true);
    setError(null);
    setMessage(null);
    const result = await resetPassword(email.trim());
    setSubmitting(false);
    if (!result.ok) {
      setError(result.error ?? "We could not send the reset email. Please try again.");
      return;
    }
    setMessage("If an account exists for that email, a password-reset link will be sent. Please check your inbox and spam folder.");
  }

  async function saveNewPassword() {
    if (submitting || password.length < 8 || password !== confirmPassword) return;
    setSubmitting(true);
    setError(null);
    setMessage(null);
    try {
      const { error: updateError } = await getSupabase().auth.updateUser({ password });
      if (updateError) {
        setError(friendlyEmailAuthError(updateError.message));
      } else {
        setMessage("Your password has been updated. You can now log in with your new password.");
        setPassword("");
        setConfirmPassword("");
        setRecoverySession(false);
        await getSupabase().auth.signOut();
      }
    } catch (err) {
      setError(friendlyEmailAuthError(err instanceof Error ? err.message : String(err)));
    } finally {
      setSubmitting(false);
    }
  }

  if (checkingSession) {
    return <main className="auth-shell"><section className="auth-card"><p>Checking your password-reset link…</p></section></main>;
  }

  return (
    <main className="auth-shell">
      <aside className="auth-aside">
        <p className="gn-kicker">ACCOUNT SECURITY</p>
        <p className="auth-aside-title">Get back to your business.</p>
        <ul className="auth-points">
          <li><span aria-hidden="true">✓</span> Use a secure password you have not used elsewhere</li>
          <li><span aria-hidden="true">✓</span> Keep your compliance checklist and progress protected</li>
        </ul>
      </aside>
      <section className="auth-card" aria-labelledby="reset-title">
        <header className="auth-head">
          <h1 id="reset-title">{recoverySession ? "Choose a new password" : "Reset your password"}</h1>
          <p>{recoverySession ? "Choose a new password for your GabayNegosyo account." : "Enter your account email and we’ll send a password-reset link if an account matches."}</p>
        </header>

        {recoverySession ? (
          <form className="auth-form" onSubmit={(e) => { e.preventDefault(); void saveNewPassword(); }}>
            <div className="auth-field">
              <label className="question-label" htmlFor="new-password">New password</label>
              <PasswordField id="new-password" autoComplete="new-password" value={password} onChange={setPassword} />
              <p className="hint">Use at least 8 characters.</p>
            </div>
            <div className="auth-field">
              <label className="question-label" htmlFor="confirm-password">Confirm new password</label>
              <PasswordField id="confirm-password" autoComplete="new-password" value={confirmPassword} onChange={setConfirmPassword} />
            </div>
            {password && password.length < 8 && <p className="auth-error" role="alert">Use at least 8 characters.</p>}
            {confirmPassword && password !== confirmPassword && <p className="auth-error" role="alert">The passwords do not match.</p>}
            {error && <p className="auth-error" role="alert">{error}</p>}
            {message && <p className="hint" role="status">{message}</p>}
            <button className="primary-btn" type="submit" disabled={submitting || password.length < 8 || password !== confirmPassword}>
              {submitting ? "Updating password…" : "Update password"}
            </button>
          </form>
        ) : (
          <form className="auth-form" onSubmit={(e) => { e.preventDefault(); void requestReset(); }}>
            <div className="auth-field">
              <label className="question-label" htmlFor="email">Email</label>
              <input id="email" type="email" autoComplete="email" className="text-input" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@email.com" required />
            </div>
            {error && <p className="auth-error" role="alert">{error}</p>}
            {message && <p className="hint" role="status">{message}</p>}
            <button className="primary-btn" type="submit" disabled={submitting || !email.trim()}>
              {submitting ? "Sending link…" : "Send reset link"}
            </button>
          </form>
        )}

        <p className="auth-switch"><Link href="/login">Back to log in</Link></p>
      </section>
    </main>
  );
}
