"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import AuthGuard from "../../components/AuthGuard";
import ProgressBar from "../../components/ProgressBar";
import AgencyProgress, { buildAgencyProgress } from "../../components/AgencyProgress";
import StatusBadge from "../../components/StatusBadge";
import RequirementCard from "../../components/RequirementCard";
import { useAuth } from "../../lib/auth";
import { db } from "../../lib/db";
import { generateApplicableRequirements, resolveObligation, compareByDue, formatDueLabel } from "../../lib/ruleEngine";
import type { BusinessProfile, RequirementStatus } from "../../lib/types";

function DashboardInner() {
  const { user } = useAuth();
  const router = useRouter();
  const [profile, setProfile] = useState<BusinessProfile | null | undefined>(undefined);
  const requirements = useMemo(() => db.getRequirements(), []);
  const agencies = useMemo(() => db.getAgencies(), []);

  useEffect(() => {
    if (!user) return;
    const p = db.getBusinessProfile(user.id);
    setProfile(p);
  }, [user]);

  // K10: /dashboard#checklist used to BE the checklist (an anchor into this
  // page). Now that /checklist is its own real route, redirect old links
  // to it instead of leaving a dead anchor.
  useEffect(() => {
    if (typeof window !== "undefined" && window.location.hash === "#checklist") {
      router.replace("/checklist");
    }
  }, [router]);

  if (profile === undefined) {
    return (
      <main className="screen">
        <p>Loading your dashboard…</p>
      </main>
    );
  }

  if (profile === null) {
    return (
      <main className="screen">
        <div className="empty-state">
          <h2>Let's set up your business profile</h2>
          <p>Answer a few quick questions so we can build your personalized checklist.</p>
          <Link href="/wizard" className="primary-btn">
            Start the wizard
          </Link>
        </div>
      </main>
    );
  }

  const applicable = generateApplicableRequirements(profile, requirements);
  const progress = db.getProgress();

  const items = applicable.map((req) => {
    const { dueDate, status } = resolveObligation(req, progress[req.id], new Date(), profile.createdAt);
    return { req, dueDate, status: status as RequirementStatus };
  });

  const completed = items.filter((i) => i.status === "completed");
  const overdue = items.filter((i) => i.status === "overdue");
  const dueToday = items.filter((i) => i.status === "due_today");
  const dueSoon = items.filter((i) => i.status === "due_soon");
  const upcoming = items.filter((i) => i.status === "upcoming");
  const noDeadline = items.filter((i) => i.status === "no_deadline");
  // Most urgent first, then soonest deadline. Previously "Up next" and the
  // five-item list followed data-file order, so the nearest deadline could
  // be hidden behind items due months later.
  const byDate = (a: (typeof items)[number], b: (typeof items)[number]) => compareByDue(a, b);
  const pending = [...overdue.sort(byDate), ...dueToday, ...dueSoon.sort(byDate), ...upcoming.sort(byDate), ...noDeadline];
  const next = pending[0];
  const percent = items.length ? Math.round((completed.length / items.length) * 100) : 0;

  const agencyRows = buildAgencyProgress(agencies, items);
  const statusRows: { status: RequirementStatus; count: number }[] = [
    { status: "overdue", count: overdue.length },
    { status: "due_today", count: dueToday.length },
    { status: "due_soon", count: dueSoon.length },
    { status: "upcoming", count: upcoming.length },
    { status: "no_deadline", count: noDeadline.length },
    { status: "completed", count: completed.length },
  ];

  function agencyName(agencyId: string) {
    return agencies.find((a) => a.id === agencyId)?.name ?? agencyId;
  }

  const dueLabel = formatDueLabel;

  return (
    <main className="screen v05-dashboard">
      <header className="intro v05-dash-intro kit-ledger-top">
        <p className="v05-kicker">YOUR BUSINESS WORKSPACE</p>
        <h1>Welcome back, {user?.name.split(" ")[0]}.</h1>
        <p>Here’s where your compliance journey stands today.</p>
        <div className="business-chip-row">
          <span className="business-name">{profile.businessName}</span>
          <span className="chip">{profile.taxpayerType.replace(/_/g, " ")}</span>
          <span className="chip">{profile.barangay}{profile.rdoCode ? ` · ${profile.rdoCode}` : ""}</span>
        </div>
      </header>

      <div className="v05-dash-hero">
        <section className="dashboard-progress">
          <p className="v05-kicker">YOUR PROGRESS</p>
          <strong className="v05-progress-number">{percent}<small>%</small></strong>
          <ProgressBar percent={percent} />
          <p className="hint">{completed.length} of {items.length} requirements completed · {pending.length} pending</p>
        </section>
        <section className="v05-next-card">
          <p className="v05-kicker">UP NEXT</p>
          {next ? <>
            <h2>{next.req.name}</h2>
            <p>{agencyName(next.req.agencyId)} · {next.dueDate ? dueLabel(next.dueDate) : next.req.deadlineDescription}</p>
            <Link href={`/requirements/${next.req.id}`}>View requirement <span aria-hidden="true">↗</span></Link>
          </> : <><h2>All caught up.</h2><p>There are no pending items in your checklist.</p><Link href="/checklist">View checklist ↗</Link></>}
        </section>
      </div>
      {(overdue.length > 0 || dueToday.length > 0 || dueSoon.length > 0) && (
        <section className="dashboard-alert-group">
          {overdue.length > 0 && (
            <div className="alert alert-overdue">
              {overdue.length} requirement{overdue.length > 1 ? "s are" : " is"} overdue.
            </div>
          )}
          {dueToday.length > 0 && (
            <div className="alert alert-due-soon">
              {dueToday.length} requirement{dueToday.length > 1 ? "s are" : " is"} due today.
            </div>
          )}
          {dueSoon.length > 0 && (
            <div className="alert alert-due-soon">
              {dueSoon.length} requirement{dueSoon.length > 1 ? "s" : ""} due within 2 weeks.
            </div>
          )}
        </section>
      )}

      <div className="kit-ledger-row">
        <AgencyProgress rows={agencyRows} />
        <section className="kit-panel kit-status" aria-labelledby="kit-status-title">
          <h2 id="kit-status-title">Where things stand</h2>
          <ul>
            {statusRows.map(({ status, count }) => (
              <li key={status}>
                <StatusBadge status={status} />
                <b>{count}</b>
              </li>
            ))}
          </ul>
          <p className="hint">Verify dates with the issuing agency before relying on them.</p>
        </section>
      </div>

      <section className="quick-actions" aria-label="Quick actions">
        <Link href="/checklist" className="quick-action-btn">
          Full checklist
        </Link>
        <Link href="/deadlines" className="quick-action-btn">
          View deadlines
        </Link>
        <Link href="/resources" className="quick-action-btn">
          Resource library
        </Link>
        <Link href="/tutorials" className="quick-action-btn">
          Learning hub
        </Link>
      </section>

      <section className="dashboard-section v05-pending">
        <div className="checklist-card-header">
          <h2>Pending &amp; upcoming</h2>
          <Link href="/checklist" className="tutorial-link">
            View full checklist
          </Link>
        </div>
        {pending.length === 0 && <p className="hint">Nothing pending. Great work.</p>}
        {pending.slice(0, 5).map(({ req, status, dueDate }) => (
          <RequirementCard key={req.id} requirement={req} status={status} dueLabel={dueDate ? `Due: ${dueLabel(dueDate)}` : "No fixed date"} agencyName={agencyName(req.agencyId)} />
        ))}
      </section>

      {completed.length > 0 && (
        <section className="dashboard-section">
          <h2>Completed</h2>
          {completed.map(({ req, status, dueDate }) => (
            <RequirementCard key={req.id} requirement={req} status={status} dueLabel={dueDate ? `Due: ${dueLabel(dueDate)}` : "No fixed date"} agencyName={agencyName(req.agencyId)} />
          ))}
        </section>
      )}
    </main>
  );
}

export default function DashboardPage() {
  return (
    <AuthGuard>
      <DashboardInner />
    </AuthGuard>
  );
}
