"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import AuthGuard from "../../../components/AuthGuard";
import TutorialCard from "../../../components/TutorialCard";
import FormPreviewCard from "../../../components/FormPreviewCard";
import PremiumGate from "../../../components/PremiumGate";
import StatusBadge from "../../../components/StatusBadge";
import { useAuth } from "../../../lib/auth";
import { db } from "../../../lib/db";
import { trackConversion } from "../../../lib/webAnalytics";
import { resolveObligation, explainApplicability, formatDueLabel } from "../../../lib/ruleEngine";
import { isPremiumRole } from "../../../lib/authorization";
import type { RequirementStatus } from "../../../lib/types";

function RequirementDetailInner() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const router = useRouter();
  const requirement = useMemo(() => db.getRequirements().find((r) => r.id === id), [id]);
  const agency = useMemo(() => (requirement ? db.getAgencies().find((a) => a.id === requirement.agencyId) : null), [requirement]);
  const tutorial = useMemo(() => (requirement?.tutorialId ? db.getTutorials().find((t) => t.id === requirement.tutorialId) : null), [requirement]);
  const relatedForms = useMemo(() => db.getResources().filter((r) => r.resourceType === "form" && r.relatedRequirementId === id), [id]);
  const [, forceRerender] = useState(0);

  useEffect(() => {
    if (!requirement) router.replace("/dashboard");
  }, [requirement, router]);

  if (!requirement || !agency || !user) {
    return (
      <main className="screen">
        <p>Loading…</p>
      </main>
    );
  }

  const profile = db.getBusinessProfile(user.id);
  const progress = db.getProgress();
  const { dueDate, dueKey, cycle, status: resolved } = resolveObligation(requirement, progress[requirement.id], new Date(), profile?.createdAt);
  const status: RequirementStatus = resolved;
  const isCompleted = status === "completed";
  const reasons = profile ? explainApplicability(requirement, profile) : [];

  const steps = requirement.instructions;
  const doneSteps = new Set(db.getDoneTasks(requirement.id, cycle));
  const stepsDone = steps.filter((_, i) => doneSteps.has(i)).length;

  function toggleComplete() {
    if (!user) return;
    if (isCompleted) {
      db.markIncomplete(requirement!.id);
    } else {
      db.markComplete(requirement!.id, `biz-${user.id}`, dueKey);
      trackConversion("requirement_completed");
    }
    forceRerender((n) => n + 1);
  }

  // Requirement progress follows its steps: checking the last step completes the
  // requirement, and unchecking a step on a completed requirement reopens it.
  function toggleStep(index: number, checked: boolean) {
    if (!user) return;
    db.setTaskDone(requirement!.id, cycle, index, checked);
    const nowDone = steps.filter((_, i) => (i === index ? checked : doneSteps.has(i))).length;
    if (checked && nowDone === steps.length && !isCompleted) {
      db.markComplete(requirement!.id, `biz-${user.id}`, dueKey);
      trackConversion("requirement_completed");
    } else if (!checked && isCompleted) {
      db.markIncomplete(requirement!.id);
    }
    forceRerender((n) => n + 1);
  }

  const sourceLabel =
    requirement.contentSource === "flowchart_final_workbook"
      ? "Client-provided reference workbook (Flowchart.FINAL.xlsx)"
      : requirement.contentSource === "registration_wizard_txt"
        ? "Client-provided registration wizard content"
        : "Prototype placeholder content, not yet sourced from client material";

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
          <span className="deadline">{dueDate ? `Due: ${formatDueLabel(dueDate)}` : `No fixed date: ${requirement.deadlineDescription}`}</span>
        </div>
      </header>

      <button type="button" className={`primary-btn ${isCompleted ? "secondary-btn" : ""}`} onClick={toggleComplete}>
        {isCompleted ? "Mark as not completed" : "Mark as Completed"}
      </button>

      {/* Free: what it is, why it applies to you, and where the rule comes from. */}
      <section className="req-detail-section">
        <h2>What is this?</h2>
        <p>{requirement.description}</p>
      </section>

      <section className="req-detail-section">
        <h2>Who needs this?</h2>
        <p>{requirement.whoItAppliesTo}</p>
        {reasons.length > 0 && (
          <>
            <h3>Why it is on your checklist</h3>
            <ul>
              {reasons.map((reason) => (
                <li key={reason}>{reason}</li>
              ))}
            </ul>
          </>
        )}
      </section>

      <section className="req-detail-section">
        <h2>Official Resource</h2>
        <p className="source-tag">This links to the official government source, not GabayNegosyo content.</p>
        <a href={requirement.officialUrl} target="_blank" rel="noreferrer" className="tutorial-link">
          Open Official Source
        </a>
        <p className="verified">
          Content source: {sourceLabel}
          <br />
          Last verified: {requirement.lastVerified}
        </p>
      </section>

      {/* Premium: working detail — documents, steps, forms, tutorial, penalty. */}
      <PremiumGate>
        <section className="req-detail-section">
          <h2>Required Documents</h2>
          <ul className="doc-checklist">
            {requirement.requiredDocuments.map((doc) => (
              <li key={doc.name}>
                <strong>{doc.name}</strong>
                {doc.description ? `: ${doc.description}` : ""}
              </li>
            ))}
          </ul>
        </section>

        <section className="req-detail-section">
          <h2>How to complete</h2>
          <p className="task-count" aria-live="polite">
            {stepsDone} of {steps.length} steps done
          </p>
          <ol className="task-list">
            {steps.map((step, i) => {
              const checked = doneSteps.has(i);
              return (
                <li key={i} className={checked ? "task-done" : ""}>
                  <label>
                    <input type="checkbox" checked={checked} onChange={(e) => toggleStep(i, e.target.checked)} />
                    <span>{step}</span>
                  </label>
                </li>
              );
            })}
          </ol>
        </section>

        {relatedForms.length > 0 && <section className="req-detail-section"><h2>Related forms</h2><div className="v06-media-grid">{relatedForms.map((form) => <FormPreviewCard key={form.id} resource={form} />)}</div></section>}
        {tutorial && <section className="req-detail-section"><h2>Tutorial</h2><TutorialCard tutorial={tutorial} /></section>}

        <section className="req-detail-section">
          <h2>Potential Penalty</h2>
          <p className="penalty">{requirement.penaltyRule.description}</p>
          <Link href="/penalties" className="tutorial-link">
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
