"use client";

import Link from "next/link";
import { useMemo } from "react";
import AdminGuard from "../../components/AdminGuard";
import { db } from "../../lib/db";
import AdminHelp from "../../components/AdminHelp";
import { agencyShortName } from "../../components/AgencyProgress";
import ContentStatusBadge from "../../components/ContentStatusBadge";
import { isResourceStale, requirementContentStatus } from "../../lib/contentHealth";

function AdminInner() {
  const agencies = useMemo(() => db.getAgencies(), []);
  const requirements = useMemo(() => db.getRequirements(), []);
  const resources = useMemo(() => db.getResources(), []);
  const tutorials = useMemo(() => db.getTutorials(), []);
  const sentEmails = useMemo(() => db.getSentEmails(), []);

  // Command Desk review queue: every row is computed from real content fields
  // (contentSource, deadline wording, placeholder video flag, lastVerified).
  const agencyLabel = (id: string) => { const a = agencies.find((x) => x.id === id); return a ? agencyShortName(a) : id.toUpperCase(); };
  const queue = useMemo(() => {
    type Row = { key: string; item: string; agency: string; href: string; state: React.ReactNode; kind: string };
    const rows: Row[] = [];
    for (const r of requirements) {
      const status = requirementContentStatus(r);
      if (status !== "workbook_verified") {
        rows.push({ key: `req-${r.id}`, item: r.name, agency: agencyLabel(r.agencyId), href: "/admin/requirements", kind: "Requirement", state: <ContentStatusBadge status={status} /> });
      }
    }
    for (const t of tutorials) {
      if (t.isPlaceholder) {
        rows.push({ key: `tut-${t.id}`, item: t.title, agency: agencyLabel(t.agencyId), href: "/admin/tutorials", kind: "Tutorial", state: <span className="kit-flag">Verify video</span> });
      }
    }
    for (const res of resources) {
      if (isResourceStale(res)) {
        rows.push({ key: `res-${res.id}`, item: res.title, agency: agencyLabel(res.agencyId), href: "/admin/resources", kind: "Resource", state: <span className="kit-flag">Check link</span> });
      }
    }
    return rows;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [requirements, tutorials, resources, agencies]);
  const QUEUE_LIMIT = 8;

  return (
    <main className="screen admin-screen kit-command">
      <header className="intro">
        <p className="v06-eyebrow">ADMIN · CONTENT IN THIS BROWSER</p>
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
      <section className="kit-panel kit-queue" aria-labelledby="kit-queue-title">
        <h2 id="kit-queue-title">Content review queue</h2>
        <p className="hint">
          {requirements.filter((r) => r.contentSource === "prototype_placeholder").length} requirements still carry prototype content · {tutorials.filter((t) => t.isPlaceholder).length} tutorials await verified videos · {resources.filter((r) => isResourceStale(r)).length} resources are past their check date.
        </p>
        {queue.length === 0 ? (
          <p className="hint">Nothing needs attention right now.</p>
        ) : (
          <div className="kit-table-wrap">
            <table className="kit-table">
              <thead>
                <tr>
                  <th scope="col">Item</th>
                  <th scope="col" className="kit-col-agency">Agency</th>
                  <th scope="col">State</th>
                </tr>
              </thead>
              <tbody>
                {queue.slice(0, QUEUE_LIMIT).map((row) => (
                  <tr key={row.key}>
                    <td>
                      <Link href={row.href}><strong>{row.item}</strong></Link>
                      <small>{row.kind}<span className="kit-agency-inline"> · {row.agency}</span></small>
                    </td>
                    <td className="kit-col-agency">{row.agency}</td>
                    <td>{row.state}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {queue.length > QUEUE_LIMIT && <p className="hint">Showing {QUEUE_LIMIT} of {queue.length}. Open Requirements, Resources, or Tutorials above to see the rest.</p>}
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
