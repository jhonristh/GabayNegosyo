"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import AuthGuard from "../../components/AuthGuard";
import ProgressBar from "../../components/ProgressBar";
import RequirementCard from "../../components/RequirementCard";
import { useAuth } from "../../lib/auth";
import { db } from "../../lib/db";
import { generateApplicableRequirements, computeNextDueDate, computeStatus } from "../../lib/ruleEngine";
import type { BusinessProfile, Requirement, RequirementStatus } from "../../lib/types";

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
    const dueDate = computeNextDueDate(req);
    const completedAt = progress[req.id]?.completedAt;
    const status: RequirementStatus = computeStatus(dueDate, completedAt);
    return { req, dueDate, status };
  });

  const completed = items.filter((i) => i.status === "completed");
  const overdue = items.filter((i) => i.status === "overdue");
  const dueSoon = items.filter((i) => i.status === "due_soon");
  const upcoming = items.filter((i) => i.status === "upcoming");
  const percent = items.length ? Math.round((completed.length / items.length) * 100) : 0;

  function agencyName(agencyId: string) {
    return agencies.find((a) => a.id === agencyId)?.name ?? agencyId;
  }

  function dueLabel(d: Date) {
    return d.toLocaleDateString("en-PH", { month: "long", day: "numeric", year: "numeric" });
  }

  return (
    <main className="screen v05-dashboard">
      <header className="intro v05-dash-intro">
        <p className="v05-kicker">YOUR BUSINESS OVERVIEW</p>
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
          <p className="hint">{completed.length} of {items.length} requirements completed</p>
        </section>
        <section className="v05-next-card">
          <p className="v05-kicker">UP NEXT</p>
          {([...overdue, ...dueSoon, ...upcoming][0]) ? <>
            <h2>{[...overdue, ...dueSoon, ...upcoming][0].req.name}</h2>
            <p>{agencyName([...overdue, ...dueSoon, ...upcoming][0].req.agencyId)} · {dueLabel([...overdue, ...dueSoon, ...upcoming][0].dueDate)}</p>
            <Link href={`/requirements/${[...overdue, ...dueSoon, ...upcoming][0].req.id}`}>View requirement <span aria-hidden="true">↗</span></Link>
          </> : <><h2>All caught up.</h2><p>There are no pending items in your checklist.</p><Link href="/checklist">View checklist ↗</Link></>}
        </section>
      </div>
      {(overdue.length > 0 || dueSoon.length > 0) && (
        <section className="dashboard-alert-group">
          {overdue.length > 0 && (
            <div className="alert alert-overdue">
              {overdue.length} requirement{overdue.length > 1 ? "s are" : " is"} overdue.
            </div>
          )}
          {dueSoon.length > 0 && (
            <div className="alert alert-due-soon">
              {dueSoon.length} requirement{dueSoon.length > 1 ? "s" : ""} due within 2 weeks.
            </div>
          )}
        </section>
      )}

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
        {[...overdue, ...dueSoon, ...upcoming].length === 0 && <p className="hint">Nothing pending. Great work.</p>}
        {[...overdue, ...dueSoon, ...upcoming].slice(0, 5).map(({ req, status, dueDate }) => (
          <RequirementCard key={req.id} requirement={req} status={status} dueLabel={dueLabel(dueDate)} agencyName={agencyName(req.agencyId)} />
        ))}
      </section>

      {completed.length > 0 && (
        <section className="dashboard-section">
          <h2>Completed</h2>
          {completed.map(({ req, status, dueDate }) => (
            <RequirementCard key={req.id} requirement={req} status={status} dueLabel={dueLabel(dueDate)} agencyName={agencyName(req.agencyId)} />
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
