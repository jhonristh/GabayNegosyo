"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth, DEMO_USERS } from "../../lib/auth";

export default function LoginPage() {
  const { loginDemo, user } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState("");

  function handleLogin(targetEmail: string) {
    loginDemo(targetEmail);
    router.push(targetEmail.includes("admin") ? "/admin" : "/dashboard");
  }

  if (user) {
    router.replace(user.role === "admin" ? "/admin" : "/dashboard");
  }

  return (
    <main className="screen">
      <header className="intro">
        <h1>Log in</h1>
        <p>This prototype uses demo accounts — no password needed.</p>
      </header>

      <section className="question">
        <label className="question-label" htmlFor="email">
          Demo account email
        </label>
        <input
          id="email"
          className="text-input"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="free@demo.gabaynegosyo.ph"
        />
        <button
          type="button"
          className="primary-btn"
          style={{ marginTop: 10 }}
          disabled={!DEMO_USERS[email]}
          onClick={() => handleLogin(email)}
        >
          Log in
        </button>
      </section>

      <section className="demo-account-list">
        <p className="hint">Or pick one directly:</p>
        {Object.values(DEMO_USERS).map((u) => (
          <button key={u.email} type="button" className="option-btn demo-account-btn" onClick={() => handleLogin(u.email)}>
            <strong>{u.role.toUpperCase()}</strong> — {u.name} ({u.email})
          </button>
        ))}
      </section>

      <p className="hint" style={{ marginTop: 20 }}>
        New here? <Link href="/signup">Create a free account</Link>
      </p>
    </main>
  );
}
