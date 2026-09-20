"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "../../lib/auth";
import { DEMO_ACCOUNTS, DEMO_ENABLED, DEMO_PASSWORD } from "../../lib/demoAccounts";

const GOOGLE_ENABLED = process.env.NEXT_PUBLIC_ENABLE_GOOGLE_LOGIN === "true";

export default function LoginPage() {
  const { login, loginWithGoogle, user, loading } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Already signed in (or just finished signing in) → go to the right home screen.
  useEffect(() => {
    if (!loading && user) {
      router.replace(user.role === "admin" ? "/admin" : "/dashboard");
    }
  }, [user, loading, router]);

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

  async function handleDemo(demoEmail: string) {
    setError(null);
    setSubmitting(true);
    const result = await login(demoEmail, DEMO_PASSWORD);
    setSubmitting(false);
    if (!result.ok) {
      setError(
        `${result.error ?? "Could not log in."} If this is a fresh setup, the demo accounts may not be created in Supabase yet.`
      );
    }
  }

  async function handleGoogle() {
    setError(null);
    const result = await loginWithGoogle();
    if (!result.ok) setError(result.error ?? "Could not start Google sign-in.");
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
        <button type="button" className="secondary-btn" style={{ marginTop: 10 }} onClick={handleGoogle}>
          Continue with Google
        </button>
      )}

      {DEMO_ENABLED && (
        <section className="demo-account-list">
          <p className="hint">Just looking around? Try a demo account:</p>
          {DEMO_ACCOUNTS.map((a) => (
            <button
              key={a.email}
              type="button"
              className="option-btn demo-account-btn"
              disabled={submitting}
              onClick={() => handleDemo(a.email)}
            >
              <strong>{a.role.toUpperCase()}</strong> — {a.name}
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
