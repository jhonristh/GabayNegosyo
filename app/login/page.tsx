"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
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
    <main className="screen">
      <header className="intro">
        <h1>Log in</h1>
        <p>Welcome back. Log in to see your checklist and deadlines.</p>
      </header>

      <section className="question">
        <label className="question-label" htmlFor="email">
          Email
        </label>
        <input
          id="email"
          type="email"
          autoComplete="email"
          className="text-input"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@email.com"
        />
      </section>

      <section className="question">
        <label className="question-label" htmlFor="password">
          Password
        </label>
        <input
          id="password"
          type="password"
          autoComplete="current-password"
          className="text-input"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && email.trim() && password && !submitting) handleSubmit();
          }}
        />
      </section>

      {error && (
        <p role="alert" className="hint" style={{ color: "var(--red-text)" }}>
          {error}
        </p>
      )}

      <button
        type="button"
        className="primary-btn"
        style={{ marginTop: 10 }}
        disabled={!email.trim() || !password || submitting}
        onClick={handleSubmit}
      >
        {submitting ? "Logging in…" : "Log in"}
      </button>

      {GOOGLE_ENABLED && (
        <button
          type="button"
          className="secondary-btn"
          style={{ marginTop: 10 }}
          disabled={googlePending}
          aria-busy={googlePending}
          onClick={handleGoogle}
        >
          {googlePending ? "Opening Google…" : "Continue with Google"}
        </button>
      )}

      {DEMO_ENABLED && (
        <section className="demo-account-list">
          <p className="hint">Just looking around? Try a demo. It runs only in this browser, with sample data. No account is created.</p>
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

      <p className="hint" style={{ marginTop: 20 }}>
        New here? <Link href="/signup">Create a free account</Link>
      </p>
    </main>
  );
}
