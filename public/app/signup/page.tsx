"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "../../lib/auth";

export default function SignupPage() {
  const { signup } = useAuth();
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");

  function handleSubmit() {
    if (!name.trim() || !email.trim()) return;
    signup(name.trim(), email.trim());
    router.push("/wizard");
  }

  return (
    <main className="screen">
      <header className="intro">
        <h1>Create your account</h1>
        <p>Free forever — upgrade later if you want the full detail.</p>
      </header>

      <section className="question">
        <label className="question-label" htmlFor="name">
          Your name
        </label>
        <input id="name" className="text-input" value={name} onChange={(e) => setName(e.target.value)} placeholder="Juana Dela Cruz" />
      </section>

      <section className="question">
        <label className="question-label" htmlFor="email">
          Email
        </label>
        <input
          id="email"
          type="email"
          className="text-input"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@email.com"
        />
        <p className="hint">
          Demo mode: no password or verification required. In production this would use Supabase
          Auth with Google OAuth.
        </p>
      </section>

      <button type="button" className="primary-btn" disabled={!name.trim() || !email.trim()} onClick={handleSubmit}>
        Create account &amp; start wizard
      </button>

      <p className="hint" style={{ marginTop: 20 }}>
        Already have an account? <Link href="/login">Log in</Link>
      </p>
    </main>
  );
}
