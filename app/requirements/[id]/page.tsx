"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import AuthGuard from "../../../components/AuthGuard";
import PremiumGate from "../../../components/PremiumGate";
import StatusBadge from "../../../components/StatusBadge";
import { useAuth } from "../../../lib/auth";
import { db } from "../../../lib/db";
import { trackConversion } from "../../../lib/webAnalytics";
import { computeNextDueDate, computeStatus } from "../../../lib/ruleEngine";
import type { RequirementStatus } from "../../../lib/types";

function RequirementDetailInner() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const router = useRouter();
  const requirement = useMemo(() => db.getRequirements().find((r) => r.id === id), [id]);
  const agency = useMemo(() => (requirement ? db.getAgencies().find((a) => a.id === requirement.agencyId) : null), [requirement]);
  const tutorial = useMemo(() => (requirement?.tutorialId ? db.getTutorials().find((t) => t.id === requirement.tutorialId) : null), [requirement]);
  const [, forceRerender] = useState(0);

  useEffect(() => {
    if (!requirement) router.replace("/dashboard");
  }, [requirement, router]);

  if (!requirement || !agency) {
    return (
      <main className="screen">
        <p>Loading…</p>
      </main>
    );
  }

  const dueDate = computeNextDueDate(requirement);
  const progress = db.getProgress();
  const completedAt = progress[requirement.id]?.completedAt;
  const status: RequirementStatus = computeStatus(dueDate, completedAt);
  const dueLabel = dueDate.toLocaleDateString("en-PH", { month: "long", day: "numeric", year: "numeric" });

  function toggleComplete() {
    if (!user) return;
    if (completedAt) {
      db.markIncomplete(requirement!.id);
    } else {
      db.markComplete(requirement!.id, `biz-${user.id}`, dueDate.toISOString());
      trackConversion("requirement_completed");
    }
    forceRerender((n) => n + 1);
  }

  return (
    <main className="screen">
      <p className="breadcrumb">
        <Link href="/dashboard">← Back to dashboard</Link>
      </p>

      <header className="intro">
        <p className="req-agency-tag">
          {agency.name}
          {requirement.complianceStage ? ` · ${requirement.complianceStage}` : ""}
        </p>
        <h1>{requirement.name}</h1>
        <div className="req-detail-meta">
          <StatusBadge status={status} />
          <span className="deadline">Due: {dueLabel}</span>
        </div>
      </header>

      <button type="button" className={`primary-btn ${completedAt ? "secondary-btn" : ""}`} onClick={toggleComplete}>
        {completedAt ? "Mark as not completed" : "Mark as Completed"}
      </button>

      <PremiumGate>
        <section className="req-detail-section">
          <h2>What is this?</h2>
          <p>{requirement.description}</p>
        </section>

        <section className="req-detail-section">
          <h2>Who needs this?</h2>
          <p>{requirement.whoItAppliesTo}</p>
        </section>

        <section className="req-detail-section">
          <h2>Required Documents</h2>
          <ul className="doc-checklist">
            {requirement.requiredDocuments.map((doc) => (
              <li key={doc.name}>
                <strong>{doc.name}</strong>: {doc.description}
              </li>
            ))}
          </ul>
        </section>

        <section className="req-detail-section">
          <h2>How to complete</h2>
          <ol className="instructions-list">
            {requirement.instructions.map((step, i) => (
              <li key={i}>{step}</li>
            ))}
          </ol>
        </section>

        {tutorial && (
          <section className="req-detail-section">
            <h2>Tutorial</h2>
            <p className="source-tag">External content: {tutorial.isPlaceholder ? "placeholder link for this prototype" : "curated video"}</p>
            <a href={tutorial.videoUrl} target="_blank" rel="noreferrer" className="tutorial-link">
              Watch Tutorial: {tutorial.title}
            </a>
          </section>
        )}

        <section className="req-detail-section">
          <h2>Official Resource</h2>
          <p className="source-tag">This links to the official government source, not GabayNegosyo content.</p>
          <a href={requirement.officialUrl} target="_blank" rel="noreferrer" className="tutorial-link">
            Open Official Source
          </a>
          <p className="verified">
            Source:{" "}
            {requirement.contentSource === "flowchart_final_workbook"
              ? "Client-provided reference workbook (Flowchart.FINAL.xlsx)"
              : requirement.contentSource === "registration_wizard_txt"
                ? "Client-provided registration wizard content"
                : "Prototype placeholder content, not yet sourced from client material"}
            <br />
            Last verified: {requirement.lastVerified}
          </p>
        </section>

        <section className="req-detail-section">
          <h2>Potential Penalty</h2>
          <p className="penalty">{requirement.penaltyRule.description}</p>
          <Link href="/premium/penalty-simulator" className="tutorial-link">
            Estimate my exact penalty
          </Link>
        </section>
      </PremiumGate>
    </main>
  );
}

export default function RequirementDetailPage() {
  return (
    <AuthGuard>
      <RequirementDetailInner />
    </AuthGuard>
  );
}
