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
  const [progressVersion, setProgressVersion] = useState(0);

  useEffect(() => {
    if (!user) return;
    const p = db.getBusinessProfile(user.id);
    setProfile(p);
  }, [user]);

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
    <main className="screen">
      <header className="intro">
        <h1>Welcome back, {user?.name.split(" ")[0]}</h1>
        <div className="business-chip-row">
          <span className="business-name">{profile.businessName}</span>
          <span className="chip">{profile.businessStructure.replace(/_/g, " ")}</span>
          <span className="chip">{profile.businessType.replace(/_/g, " ")}</span>
        </div>
      </header>

      <section className="dashboard-progress">
        <p className="question-label">Compliance Progress</p>
        <ProgressBar percent={percent} />
        <p className="hint">
          {completed.length} of {items.length} requirements completed
        </p>
      </section>

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

      <section className="quick-actions">
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

      <section id="checklist" className="dashboard-section">
        <h2>Pending &amp; upcoming</h2>
        {[...overdue, ...dueSoon, ...upcoming].length === 0 && <p className="hint">Nothing pending — great work.</p>}
        {[...overdue, ...dueSoon, ...upcoming].map(({ req, status, dueDate }) => (
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
