"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "../../lib/auth";
import { db } from "../../lib/db";
import { generateApplicableRequirements, resolveObligation, formatDueLabel } from "../../lib/ruleEngine";
import type { BusinessProfile } from "../../lib/types";

/**
 * v0.12 (BUG-001): the guest half of the flow.
 *   wizard → read-only preview → create account / log in → saved checklist.
 * Nothing here is written to the database; the answers sit in this tab's
 * sessionStorage until the person signs in (db.adoptGuestProfile).
 */
export default function PreviewPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [profile, setProfile] = useState<BusinessProfile | null | undefined>(undefined);
  const requirements = useMemo(() => db.getRequirements(), []);
  const agencies = useMemo(() => db.getAgencies(), []);

  useEffect(() => {
    if (loading) return;
    if (user) {
      router.replace("/checklist");
      return;
    }
    setProfile(db.getGuestProfile());
  }, [loading, user, router]);

  if (loading || user || profile === undefined) {
    return (
      <main className="screen">
        <p>Loading…</p>
      </main>
    );
  }

  if (profile === null) {
    return (
      <main className="screen">
        <div className="empty-state">
          <h2>No answers to preview yet</h2>
          <p>Answer a few quick questions and your personalized checklist will appear here.</p>
          <Link href="/wizard" className="primary-btn">
            Start the wizard
          </Link>
        </div>
      </main>
    );
  }

  const applicable = generateApplicableRequirements(profile, requirements);
  const byAgency = agencies
    .map((agency) => ({ agency, items: applicable.filter((r) => r.agencyId === agency.id) }))
    .filter((group) => group.items.length > 0);

  return (
    <main className="screen">
      <header className="intro">
        <p className="v06-eyebrow">PREVIEW · NOT SAVED YET</p>
        <h1>Your checklist preview</h1>
        <p>
          {applicable.length} requirement{applicable.length === 1 ? "" : "s"} apply to {profile.businessName || "your business"}. Create a free account to save this
          checklist, tick things off, and see your progress.
        </p>
        <div className="hero-actions">
          <Link href="/signup" className="primary-btn">
            Create free account to save
          </Link>
          <Link href="/login" className="secondary-btn">
            I already have an account
          </Link>
          <Link href="/wizard" className="secondary-btn">
            Change my answers
          </Link>
        </div>
      </header>

      <div className="guide-note">
        <strong>This is a preview</strong>
        <p>
          Your answers are kept only in this browser tab until you sign in. Dates are shown only where the source gives a fixed annual deadline; confirm
          everything with the issuing agency.
        </p>
      </div>

      {byAgency.map(({ agency, items }) => (
        <section key={agency.id} className="agency-group">
          <h2>{agency.name}</h2>
          {items.map((req) => {
            const { dueDate } = resolveObligation(req, undefined, new Date(), profile.createdAt);
            return (
              <article key={req.id} className="checklist-card">
                <h3>{req.name}</h3>
                <p className="deadline">{dueDate ? `Due ${formatDueLabel(dueDate)}` : `No fixed date: ${req.deadlineDescription}`}</p>
                <p>{req.whoItAppliesTo}</p>
              </article>
            );
          })}
        </section>
      ))}
    </main>
  );
}
