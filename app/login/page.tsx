"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import PasswordField from "../../components/PasswordField";
import { friendlyAuthError, takeOAuthCallbackError } from "../../lib/authErrors";
import { db } from "../../lib/db";
import { useAuth } from "../../lib/auth";
import { DEMO_ACCOUNTS, DEMO_ENABLED, type DemoRole } from "../../lib/demoAccounts";

const GOOGLE_ENABLED = process.env.NEXT_PUBLIC_ENABLE_GOOGLE_LOGIN === "true";

export default function LoginPage() {
  const { login, loginWithGoogle, startDemo, user, loading } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [googlePending, setGooglePending] = useState(false);

  // Already signed in (or just finished signing in) → go to the right home screen.
  useEffect(() => {
    if (!loading && user) {
      // New accounts (e.g. first Google sign-in) have no business profile yet → start the wizard.
      router.replace(user.role === "admin" ? "/admin" : db.getBusinessProfile(user.id) ? "/dashboard" : "/wizard");
    }
  }, [user, loading, router]);

  // Google sign-in round-trip errors come back in the URL: show them in plain language.
  useEffect(() => {
    const raw = takeOAuthCallbackError();
    if (raw) setError(friendlyAuthError(raw));
  }, []);

  async function handleSubmit() {
    if (submitting || !email.trim() || !password) return;
    setError(null);
    setSubmitting(true);
    const result = await login(email.trim(), password);
    setSubmitting(false);
    if (!result.ok) {
      setError(result.error ?? "Could not log in. Please try again.");
    }
    // On success, the effect above redirects once `user` is set.
  }

  function handleDemo(role: DemoRole) {
    setError(null);
    startDemo(role); // browser-only: no Supabase call, no password
  }

  async function handleGoogle() {
    if (googlePending) return; // prevent duplicate clicks while the redirect starts
    setError(null);
    setGooglePending(true);
    const result = await loginWithGoogle();
    if (!result.ok) {
      setError(result.error ?? friendlyAuthError(null));
      setGooglePending(false);
    }
    // On success the browser leaves for Google, so the button stays disabled.
  }

  return (
    <main className="auth-shell">
      <aside className="auth-aside">
        <p className="gn-kicker">WELCOME BACK</p>
        <p className="auth-aside-title">Pick up where you left off.</p>
        <ul className="auth-points">
          <li><span aria-hidden="true">✓</span> Your checklist, tailored to your business</li>
          <li><span aria-hidden="true">✓</span> Deadlines shown with their official source</li>
          <li><span aria-hidden="true">✓</span> Progress you can see at a glance</li>
        </ul>
        <picture className="auth-aside-art">
          <source srcSet="/images/gabaynegosyo-growth-arrow.webp" type="image/webp" />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/images/gabaynegosyo-growth-arrow.png" alt="" aria-hidden="true" width={1400} height={836} loading="lazy" decoding="async" />
        </picture>
      </aside>

      <section className="auth-card" aria-labelledby="login-title">
        <header className="auth-head">
          <h1 id="login-title">Log in</h1>
          <p>Welcome back. Log in to see your checklist and deadlines.</p>
        </header>

        <form
          className="auth-form"
          onSubmit={(e) => {
            e.preventDefault();
            handleSubmit();
          }}
        >
          <div className="auth-field">
            <label className="question-label" htmlFor="email">Email</label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              className="text-input"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@email.com"
            />
          </div>

          <div className="auth-field">
            <label className="question-label" htmlFor="password">Password</label>
            <PasswordField id="password" autoComplete="current-password" value={password} onChange={setPassword} />
            <Link href="/reset-password" className="auth-recovery-link">Forgot your password?</Link>
          </div>

          {error && (
            <p role="alert" className="auth-error">{error}</p>
          )}

          <button type="submit" className="primary-btn" disabled={!email.trim() || !password || submitting}>
            {submitting ? "Logging in…" : "Log in"}
          </button>
        </form>

        {GOOGLE_ENABLED && (
          <button
            type="button"
            className="secondary-btn auth-google"
            disabled={googlePending}
            aria-busy={googlePending}
            onClick={handleGoogle}
          >
            {googlePending ? "Opening Google…" : "Continue with Google"}
          </button>
        )}

        {DEMO_ENABLED && (
          <section className="demo-account-list" aria-labelledby="demo-title">
            <p className="auth-divider" id="demo-title"><span>or look around first</span></p>
            <p className="hint">It runs only in this browser, with sample data. No account is created.</p>
            {DEMO_ACCOUNTS.map((a) => (
              <button
                key={a.role}
                type="button"
                className="option-btn demo-account-btn"
                onClick={() => handleDemo(a.role)}
              >
                <strong>{a.role.toUpperCase()}</strong>: {a.name}
                <br />
                <span className="hint">{a.blurb}</span>
              </button>
            ))}
          </section>
        )}

        <p className="auth-switch">
          New here? <Link href="/signup">Create a free account</Link>
        </p>
        <p className="auth-privacy-note">Your answers build your checklist. GabayNegosyo does not file anything for you.</p>
      </section>
    </main>
  );
}
