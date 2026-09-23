"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "../../lib/auth";
import { trackConversion } from "../../lib/webAnalytics";

const MIN_PASSWORD_LENGTH = 8;
const GOOGLE_ENABLED = process.env.NEXT_PUBLIC_ENABLE_GOOGLE_LOGIN === "true";

export default function SignupPage() {
  const { signup, loginWithGoogle } = useAuth();
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [checkEmailFor, setCheckEmailFor] = useState<string | null>(null);

  const canSubmit = name.trim() && email.trim() && password.length >= MIN_PASSWORD_LENGTH && !submitting;

  async function handleSubmit() {
    if (!canSubmit) return;
    setError(null);
    setSubmitting(true);
    const result = await signup(name.trim(), email.trim(), password);
    setSubmitting(false);

    if (!result.ok) {
      setError(result.error ?? "Could not create your account. Please try again.");
      return;
    }
    trackConversion("signup_completed");
    if (result.needsEmailConfirmation) {
      setCheckEmailFor(email.trim());
      return;
    }
    router.push("/wizard");
  }

  async function handleGoogle() {
    setError(null);
    const result = await loginWithGoogle();
    if (!result.ok) setError(result.error ?? "Could not start Google sign-in.");
  }

  if (checkEmailFor) {
    return (
      <main className="screen">
        <header className="intro">
          <h1>Check your email</h1>
          <p>
            We sent a confirmation link to <strong>{checkEmailFor}</strong>. Open it on this device to finish creating
            your account, then land on the setup wizard.
          </p>
        </header>
        <p className="hint">
          Nothing after a few minutes? Check your spam folder, or <Link href="/login">go to log in</Link> once
          you&apos;ve confirmed.
        </p>
      </main>
    );
  }

  return (
    <main className="screen">
      <header className="intro">
        <h1>Create your account</h1>
        <p>Free forever. Upgrade later if you want the full detail.</p>
      </header>

      <section className="question">
        <label className="question-label" htmlFor="name">
          Your name
        </label>
        <input
          id="name"
          autoComplete="name"
          className="text-input"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Juana Dela Cruz"
        />
      </section>

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
          autoComplete="new-password"
          className="text-input"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <p className="hint">At least {MIN_PASSWORD_LENGTH} characters.</p>
      </section>

      {error && (
        <p role="alert" className="hint" style={{ color: "var(--red-text)" }}>
          {error}
        </p>
      )}

      <button type="button" className="primary-btn" disabled={!canSubmit} onClick={handleSubmit}>
        {submitting ? "Creating account…" : "Create account & start wizard"}
      </button>

      {GOOGLE_ENABLED && (
        <button type="button" className="secondary-btn" style={{ marginTop: 10 }} onClick={handleGoogle}>
          Sign up with Google
        </button>
      )}

      <p className="hint" style={{ marginTop: 20 }}>
        Already have an account? <Link href="/login">Log in</Link>
      </p>
    </main>
  );
}
