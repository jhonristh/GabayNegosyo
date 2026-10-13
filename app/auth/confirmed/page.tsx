"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "../../../lib/auth";
import { db } from "../../../lib/db";
import { classifyConfirmationError, type ConfirmationProblem } from "../../../lib/authErrors";

/**
 * Landing route for the email-confirmation link (emailRedirectTo).
 * supabase-js (implicit flow, detectSessionInUrl) reads the tokens in the URL hash
 * and restores the session; AuthProvider then hydrates the user's data. This page
 * only reports failures in plain language and routes onward. It does not exchange codes.
 */
function readProblem(): ConfirmationProblem {
  if (typeof window === "undefined") return null;
  const url = new URL(window.location.href);
  const hash = new URLSearchParams(url.hash.replace(/^#/, ""));
  const code = url.searchParams.get("error_code") ?? hash.get("error_code") ?? url.searchParams.get("error") ?? hash.get("error");
  const desc = url.searchParams.get("error_description") ?? hash.get("error_description");
  return classifyConfirmationError(code, desc);
}

export default function ConfirmedPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [problem, setProblem] = useState<ConfirmationProblem>(null);
  const [checked, setChecked] = useState(false);
  const [timedOut, setTimedOut] = useState(false);

  useEffect(() => {
    setProblem(readProblem());
    setChecked(true);
    const t = setTimeout(() => setTimedOut(true), 8000);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    if (!checked || problem || loading || !user || user.isDemo) return;
    router.replace(user.role === "admin" ? "/admin" : db.getBusinessProfile(user.id) ? "/dashboard" : "/wizard");
  }, [checked, problem, loading, user, router]);

  if (problem) {
    const message =
      problem === "expired"
        ? "This confirmation link has expired or was already used."
        : problem === "denied"
          ? "The confirmation was cancelled."
          : "This confirmation link is not valid.";
    return (
      <main className="screen">
        <header className="intro">
          <h1>We couldn&apos;t confirm your email</h1>
          <p role="alert">{message}</p>
        </header>
        <p className="hint">If you already confirmed, just log in. Otherwise sign up again to get a fresh link.</p>
        <div className="hero-actions">
          <Link href="/login" className="primary-btn">Go to log in</Link>
          <Link href="/signup" className="secondary-btn">Sign up again</Link>
        </div>
      </main>
    );
  }

  if (checked && !loading && !user && timedOut) {
    return (
      <main className="screen">
        <header className="intro">
          <h1>Email confirmation</h1>
          <p>We could not start your session from this link. Try logging in. If it keeps happening, sign up again for a new link.</p>
        </header>
        <div className="hero-actions">
          <Link href="/login" className="primary-btn">Go to log in</Link>
          <Link href="/signup" className="secondary-btn">Sign up again</Link>
        </div>
      </main>
    );
  }

  return (
    <main className="screen">
      <p role="status">Confirming your email…</p>
    </main>
  );
}
