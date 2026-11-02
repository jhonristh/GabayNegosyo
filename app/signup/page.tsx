"use client";

import PasswordField from "../../components/PasswordField";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { friendlyAuthError } from "../../lib/authErrors";
import { useAuth } from "../../lib/auth";
import { db } from "../../lib/db";
import { trackConversion } from "../../lib/webAnalytics";
import { MIN_PASSWORD_LENGTH, validateSignup, type SignupErrors } from "../../lib/validation";

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
  const [googlePending, setGooglePending] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<SignupErrors>({});

  async function handleSubmit() {
    if (submitting) return;
    setError(null);
    // WP4: say exactly what is wrong instead of leaving the button silently disabled.
    const problems = validateSignup({ name, email, password });
    setFieldErrors(problems);
    if (problems.name || problems.email || problems.password) return;
    setSubmitting(true);
    let result: Awaited<ReturnType<typeof signup>>;
    try {
      result = await signup(name.trim(), email.trim(), password);
    } catch {
      setSubmitting(false);
      setError("We could not reach the sign-in service. Check your internet connection and try again.");
      return;
    }
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
    // A guest who already answered the wizard goes straight to their saved checklist. By now the sign-in has already
    // moved the guest answers into the account (db.adoptGuestProfile), so ask the account, not the guest store.
    const hasSavedProfile = Boolean(result.user && db.getBusinessProfile(result.user.id));
    router.push(hasSavedProfile ? "/checklist" : "/wizard");
  }

  async function handleGoogle() {
    if (googlePending) return;
    setError(null);
    setGooglePending(true);
    const result = await loginWithGoogle();
    if (!result.ok) {
      setError(result.error ?? friendlyAuthError(null));
      setGooglePending(false);
    }
  }

  if (checkEmailFor) {
    return (
      <main className="screen">
        <header className="intro">
          <h1>Check your email</h1>
          <p>
            We sent a confirmation link to <strong>{checkEmailFor}</strong>. Open it on this device to finish creating
            your account, then continue to the setup wizard.
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
          aria-invalid={Boolean(fieldErrors.name)}
          aria-describedby={fieldErrors.name ? "name-error" : undefined}
        />
        {fieldErrors.name && <p id="name-error" role="alert" className="hint" style={{ color: "var(--red-text)" }}>{fieldErrors.name}</p>}
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
          aria-invalid={Boolean(fieldErrors.email)}
          aria-describedby={fieldErrors.email ? "email-error" : undefined}
        />
        {fieldErrors.email && <p id="email-error" role="alert" className="hint" style={{ color: "var(--red-text)" }}>{fieldErrors.email}</p>}
      </section>

      <section className="question">
        <label className="question-label" htmlFor="password">
          Password
        </label>
        <PasswordField id="password" autoComplete="new-password" value={password} onChange={setPassword} />
        <p className="hint">At least {MIN_PASSWORD_LENGTH} characters.</p>
        {fieldErrors.password && <p id="password-error" role="alert" className="hint" style={{ color: "var(--red-text)" }}>{fieldErrors.password}</p>}
      </section>

      {error && (
        <p role="alert" className="hint" style={{ color: "var(--red-text)" }}>
          {error}
        </p>
      )}

      <button type="button" className="primary-btn" disabled={submitting} aria-busy={submitting} onClick={handleSubmit}>
        {submitting ? "Creating account…" : "Create account & start wizard"}
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
          {googlePending ? "Opening Google…" : "Sign up with Google"}
        </button>
      )}

      <p className="hint" style={{ marginTop: 20 }}>
        Already have an account? <Link href="/login">Log in</Link>
      </p>
    </main>
  );
}
