"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import PasswordField from "../../components/PasswordField";
import { friendlyAuthError, takeOAuthCallbackError } from "../../lib/authErrors";
import { db } from "../../lib/db";
import { useAuth } from "../../lib/auth";
import { DEMO_ACCOUNTS, DEMO_ENABLED, type DemoRole } from "../../lib/demoAccounts";
import { safeNextPath, validateLogin } from "../../lib/validation";

const GOOGLE_ENABLED = process.env.NEXT_PUBLIC_ENABLE_GOOGLE_LOGIN === "true";

export default function LoginPage() {
  const { login, loginWithGoogle, startDemo, user, loading } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<"email" | "password", string>>>({});
  const [submitting, setSubmitting] = useState(false);
  const [googlePending, setGooglePending] = useState(false);

  // Already signed in (or just finished signing in) → go to the right home screen.
  useEffect(() => {
    if (!loading && user) {
      // WP4: a person who was sent here from a private page returns to it (same-site paths only).
      const next = safeNextPath(new URLSearchParams(window.location.search).get("next"));
      if (next) {
        router.replace(next);
        return;
      }
      // New accounts (e.g. first Google sign-in) have no business profile yet → start the wizard.
      // If their saved data could not be loaded, do not send them through the wizard: the dashboard offers a retry.
      const hasProfile = Boolean(db.getBusinessProfile(user.id)) || Boolean(user.dataLoadFailed);
      router.replace(user.role === "admin" ? "/admin" : hasProfile ? "/dashboard" : "/wizard");
    }
  }, [user, loading, router]);

  // Google sign-in round-trip errors come back in the URL: show them in plain language.
  useEffect(() => {
    const raw = takeOAuthCallbackError();
    if (raw) setError(friendlyAuthError(raw));
  }, []);

  async function handleSubmit() {
    if (submitting) return;
    setError(null);
    const problems = validateLogin(email, password);
    setFieldErrors(problems);
    if (problems.email || problems.password) return;
    setSubmitting(true);
    let result: Awaited<ReturnType<typeof login>>;
    try {
      result = await login(email.trim(), password);
    } catch {
      setSubmitting(false);
      setError("We could not reach the sign-in service. Check your internet connection and try again.");
      return;
    }
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
              aria-invalid={Boolean(fieldErrors.email)}
              aria-describedby={fieldErrors.email ? "login-email-error" : undefined}
            />
            {fieldErrors.email && <p id="login-email-error" role="alert" className="auth-error">{fieldErrors.email}</p>}
          </div>

          <div className="auth-field">
            <label className="question-label" htmlFor="password">Password</label>
            <PasswordField id="password" autoComplete="current-password" value={password} onChange={setPassword} />
            {fieldErrors.password && <p id="login-password-error" role="alert" className="auth-error">{fieldErrors.password}</p>}
            <p className="hint"><Link href="/reset-password">Forgot password?</Link></p>
          </div>

          {error && (
            <p role="alert" className="auth-error">{error}</p>
          )}

          <button type="submit" className="primary-btn" disabled={submitting} aria-busy={submitting}>
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
      </section>
    </main>
  );
}
