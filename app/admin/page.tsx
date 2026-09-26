"use client";

import Link from "next/link";
import { useMemo } from "react";
import AdminGuard from "../../components/AdminGuard";
import { db } from "../../lib/db";
import AdminHelp from "../../components/AdminHelp";

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
        <p>Review content, see what needs attention, and open an editor in one click.</p>
      </header>

      <section className="v07-admin-links" aria-label="Admin sections">
        {[ ["Users", "/admin/users", "Review Free, Premium, and Admin accounts"], ["Requirements", "/admin/requirements", "Inspect stages and content status"], ["Agencies", "/admin/agencies", "Manage agency references"], ["Resources", "/admin/resources", "Review source links and forms"], ["Tutorials", "/admin/tutorials", "Review learning material"] ].map(([title,href,description]) => <Link key={href} href={href}><strong>{title} ↗</strong><span>{description}</span></Link>)}
      </section>
      <AdminHelp>Start with items needing review, then open Agencies, Requirements, Resources, or Tutorials. Content changes here are stored only in this browser; the Users tab reads Supabase and is read-only.</AdminHelp>
      <section className="metric-grid" aria-label="Content overview">
        {[["Agencies in scope", agencies.length], ["Requirements", requirements.length], ["Resources", resources.length], ["Tutorials", tutorials.length], ["Requirements needing review",requirements.filter(r=>r.contentSource==="prototype_placeholder").length], ["Videos awaiting verification", tutorials.filter(t=>t.isPlaceholder).length]].map(([label,value])=><article key={label} className="metric-card"><p className="metric-label">{label}</p><p className="metric-value">{value}</p></article>)}
      </section>
      <section className="dashboard-section">
        <h2>Content review queue</h2>
        <p className="hint">{requirements.filter(r=>r.contentSource==="prototype_placeholder").length} requirements still carry prototype content · {tutorials.filter(t=>t.isPlaceholder).length} tutorials await verified videos.</p>
        <h2>Content by type</h2>
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
        <h2>Recent reminder emails sent</h2>
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
