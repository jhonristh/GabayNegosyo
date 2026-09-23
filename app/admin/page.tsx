"use client";

import Link from "next/link";
import { useMemo } from "react";
import AdminGuard from "../../components/AdminGuard";
import { db } from "../../lib/db";

/**
 * DEMO DATA NOTE: this prototype runs entirely client-side against a single
 * browser's localStorage, so there is no real multi-user analytics backend.
 * The platform-wide numbers below (total users, growth, most-searched, etc.)
 * are illustrative DEMO figures to show what the admin experience looks
 * like — clearly labeled as such. Content counts (agencies/requirements/
 * resources/tutorials) and the sent-email log ARE real, drawn from this
 * browser's local data.
 */
const DEMO_METRICS = {
  totalUsers: 1248,
  freeUsers: 1081,
  premiumUsers: 167,
  mostCommonBusinessType: "Online Seller",
  mostAccessedAgency: "BIR",
  mostSearchedResource: "BIR Registration (Certificate of Registration)",
};

function AdminInner() {
  const agencies = useMemo(() => db.getAgencies(), []);
  const requirements = useMemo(() => db.getRequirements(), []);
  const resources = useMemo(() => db.getResources(), []);
  const tutorials = useMemo(() => db.getTutorials(), []);
  const sentEmails = useMemo(() => db.getSentEmails(), []);

  return (
    <main className="screen admin-screen">
      <header className="intro">
        <h1>Admin dashboard</h1>
        <p className="source-tag">Platform-wide figures below are demo/illustrative data. Content counts are live.</p>
      </header>

      <section className="v07-admin-links" aria-label="Admin sections">
        {[ ["Users", "/admin/users", "Review Free, Premium, and Admin accounts"], ["Requirements", "/admin/requirements", "Inspect stages and content status"], ["Agencies", "/admin/agencies", "Manage agency references"], ["Resources", "/admin/resources", "Review source links and forms"], ["Tutorials", "/admin/tutorials", "Review learning material"] ].map(([title,href,description]) => <Link key={href} href={href}><strong>{title} ↗</strong><span>{description}</span></Link>)}
      </section>
      <section className="metric-grid">
        <div className="metric-card">
          <p className="metric-label">Total users (demo)</p>
          <p className="metric-value">{DEMO_METRICS.totalUsers.toLocaleString()}</p>
        </div>
        <div className="metric-card">
          <p className="metric-label">Free users (demo)</p>
          <p className="metric-value">{DEMO_METRICS.freeUsers.toLocaleString()}</p>
        </div>
        <div className="metric-card">
          <p className="metric-label">Premium users (demo)</p>
          <p className="metric-value">{DEMO_METRICS.premiumUsers.toLocaleString()}</p>
        </div>
        <div className="metric-card">
          <p className="metric-label">Most common business type (demo)</p>
          <p className="metric-value small">{DEMO_METRICS.mostCommonBusinessType}</p>
        </div>
        <div className="metric-card">
          <p className="metric-label">Most accessed agency (demo)</p>
          <p className="metric-value small">{DEMO_METRICS.mostAccessedAgency}</p>
        </div>
        <div className="metric-card">
          <p className="metric-label">Most searched resource (demo)</p>
          <p className="metric-value small">{DEMO_METRICS.mostSearchedResource}</p>
        </div>
      </section>

      <section className="dashboard-section">
        <h2>Content health</h2>
        <p className="hint">{requirements.filter(r=>r.contentSource==="prototype_placeholder").length} requirements still carry prototype content · {tutorials.filter(t=>t.isPlaceholder).length} tutorials await verified videos.</p>
        <h2>Live content counts</h2>
        <div className="metric-grid">
          <div className="metric-card">
            <p className="metric-label">Agencies</p>
            <p className="metric-value">{agencies.length}</p>
          </div>
          <div className="metric-card">
            <p className="metric-label">Requirements</p>
            <p className="metric-value">{requirements.length}</p>
          </div>
          <div className="metric-card">
            <p className="metric-label">Resources</p>
            <p className="metric-value">{resources.length}</p>
          </div>
          <div className="metric-card">
            <p className="metric-label">Tutorials</p>
            <p className="metric-value">{tutorials.length}</p>
          </div>
        </div>
      </section>

      <section className="dashboard-section">
        <h2>Recent reminder emails sent (this browser, mock mode)</h2>
        {sentEmails.length === 0 && <p className="hint">No reminders sent yet.</p>}
        {sentEmails.slice(0, 10).map((e) => (
          <article key={e.id} className="checklist-card">
            <p className="docs">
              <strong>To:</strong> {e.to}
            </p>
            <p className="docs">
              <strong>Subject:</strong> {e.subject}
            </p>
            <p className="verified">{new Date(e.sentAt).toLocaleString()}</p>
          </article>
        ))}
      </section>
    </main>
  );
}

export default function AdminDashboardPage() {
  return (
    <AdminGuard>
      <AdminInner />
    </AdminGuard>
  );
}
