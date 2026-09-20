"use client";

import { useEffect, useState } from "react";
import AdminGuard from "../../../components/AdminGuard";
import { DEMO_USERS } from "../../../lib/auth";
import { db } from "../../../lib/db";

/**
 * USER MANAGEMENT (V0.2 IA §5)
 *
 * Scope honesty: this prototype has no shared user database, so there is no
 * real user list to administer. What exists locally is the set of demo
 * accounts plus whichever account signed up in this browser. We show that
 * truthfully and explain what this screen becomes once Supabase is wired up,
 * rather than inventing a fake roster of users.
 *
 * Privacy (§21): even here we show role and plan rather than dumping every
 * stored field.
 */
function UsersInner() {
  const [mounted, setMounted] = useState(false);
  const [localProfileCount, setLocalProfileCount] = useState(0);

  useEffect(() => {
    setMounted(true);
    // Count business profiles stored in this browser (0 or 1 in practice).
    const demoIds = Object.values(DEMO_USERS).map((u) => u.id);
    const count = demoIds.filter((id) => db.getBusinessProfile(id)).length;
    setLocalProfileCount(count);
  }, []);

  const users = Object.values(DEMO_USERS);

  return (
    <main className="screen admin-screen">
      <header className="intro">
        <h1>User management</h1>
        <p>Accounts available in this local prototype.</p>
      </header>

      <div className="dev-notice">
        Prototype/demo data. There is no shared user database in this build — the accounts below
        are the built-in demo logins. Once Supabase Auth is connected, this screen lists real
        registered users with role and subscription management.
      </div>

      <section className="dashboard-section">
        <h2>Demo accounts</h2>
        {users.map((u) => (
          <article key={u.id} className="checklist-card">
            <div className="checklist-card-header">
              <div>
                <h3>{u.name}</h3>
                <p className="docs">{u.email}</p>
              </div>
              <span className={`content-badge content-badge-${u.role === "admin" ? "prototype" : u.role === "premium" ? "verified" : "archived"}`}>
                {u.role}
              </span>
            </div>
          </article>
        ))}
      </section>

      <section className="dashboard-section">
        <h2>Local state</h2>
        <div className="metric-grid">
          <div className="metric-card">
            <p className="metric-label">Demo accounts</p>
            <p className="metric-value">{users.length}</p>
          </div>
          <div className="metric-card">
            <p className="metric-label">Business profiles on this device</p>
            <p className="metric-value">{mounted ? localProfileCount : 0}</p>
          </div>
        </div>
      </section>
    </main>
  );
}

export default function AdminUsersPage() {
  return (
    <AdminGuard>
      <UsersInner />
    </AdminGuard>
  );
}
