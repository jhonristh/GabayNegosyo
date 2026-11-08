"use client";

import { useInterfaceSounds } from "../../../components/InterfaceSounds";
import { useMemo, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import AuthGuard from "../../../components/AuthGuard";
import TutorialCard from "../../../components/TutorialCard";
import FormPreviewCard from "../../../components/FormPreviewCard";
import PremiumGate from "../../../components/PremiumGate";
import StatusBadge from "../../../components/StatusBadge";
import { LoadingState } from "../../../components/StateBlocks";
import { useToast } from "../../../components/ToastProvider";
import { useAuth } from "../../../lib/auth";
import { db } from "../../../lib/db";
import { trackConversion } from "../../../lib/webAnalytics";
import { resolveObligation, explainApplicability, formatDueLabel } from "../../../lib/ruleEngine";
import { hasPremiumAccess } from "../../../lib/entitlements";
import type { RequirementStatus } from "../../../lib/types";

function RequirementDetailInner() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const { notify } = useToast();
  const { play } = useInterfaceSounds();
  const requirement = useMemo(() => db.getRequirements().find((r) => r.id === id), [id]);
  const agency = useMemo(() => (requirement ? db.getAgencies().find((a) => a.id === requirement.agencyId) : null), [requirement]);
  const tutorial = useMemo(() => (requirement?.tutorialId ? db.getTutorials().find((t) => t.id === requirement.tutorialId) : null), [requirement]);
  const relatedForms = useMemo(() => db.getResources().filter((r) => r.resourceType === "form" && r.relatedRequirementId === id), [id]);
  const [, forceRerender] = useState(0);

  // WP4: an unknown or removed requirement says so (it used to bounce silently to the dashboard).
  if (!requirement || !agency) {
    return (
      <main className="screen">
        <div className="empty-state">
          <h2>We could not find that requirement</h2>
          <p>The link may be out of date, or the requirement may have been removed. Your checklist lists every requirement that applies to you.</p>
          <Link href="/checklist" className="primary-btn">
            Go to my checklist
          </Link>
          <p className="hint">
            <Link href="/dashboard">Back to dashboard</Link>
          </p>
        </div>
      </main>
    );
  }
  if (!user) {
    return (
      <main className="screen">
        <LoadingState />
      </main>
    );
  }

  const profile = db.getBusinessProfile(user.id);
  const progress = db.getProgress();
  const { dueDate, dueKey, cycle, status: resolved } = resolveObligation(requirement, progress[requirement.id], new Date(), profile?.createdAt);
  const status: RequirementStatus = resolved;
  const premium = hasPremiumAccess(user);
  const isCompleted = status === "completed";
  const reasons = profile ? explainApplicability(requirement, profile) : [];

  const steps = requirement.instructions;
  const doneSteps = new Set(db.getDoneTasks(requirement.id, cycle));
  const stepsDone = steps.filter((_, i) => doneSteps.has(i)).length;

  function toggleComplete() {
    if (!user) return;
    if (isCompleted) {
      db.markIncomplete(requirement!.id);
      notify("Moved back to your to-do list.");
    } else {
      db.markComplete(requirement!.id, `biz-${user.id}`, dueKey);
      trackConversion("requirement_completed");
      notify("Marked as completed.");
    }
    play(isCompleted ? "undo" : "complete");
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
      notify("All steps done. Requirement marked as completed.");
    } else if (!checked && isCompleted) {
      db.markIncomplete(requirement!.id);
      notify("Requirement moved back to your to-do list.");
    }
    play(!checked ? "undo" : nowDone === steps.length ? "finish" : "complete");
    forceRerender((n) => n + 1);
  }

  const sourceLabel =
    requirement.contentSource === "prototype_placeholder"
      ? "Placeholder content, not yet reviewed"
      : "Gabay Negosyo compliance guide";

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
          {premium && <StatusBadge status={status} />}
          <span className="deadline">{dueDate ? `Due: ${formatDueLabel(dueDate)}` : `No fixed date: ${requirement.deadlineDescription}`}</span>
        </div>
      </header>

      {premium && <button type="button" className={`primary-btn ${isCompleted ? "secondary-btn" : ""}`} onClick={toggleComplete}>
        {isCompleted ? "Mark as not completed" : "Mark as Completed"}
      </button>}

      {/* Free: what it is, why it applies to you, and where the rule comes from. */}
      <section className="req-detail-section">
        <h2>What is this?</h2>
        <p>{requirement.description}</p>
      </section>

      <details className="req-detail-section ew-disclosure" open>
        <summary>Who needs this?</summary><div className="ew-disclosure-body">
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
      </div></details>

      <section className="req-detail-section">
        <h2>Official Resource</h2>
        <p className="source-tag">This links to the official government source, not GabayNegosyo content.</p>
        {premium && requirement.officialUrl ? <a href={requirement.officialUrl} target="_blank" rel="noreferrer" className="tutorial-link">Open Official Source</a> : <p className="hint">{premium ? "An official source URL has not been supplied or verified." : "Official source details are available with Premium."}</p>}
        <p className="verified">
          Content source: {sourceLabel}
          <br />
          Last verified: {requirement.lastVerified}
        </p>
      </section>

      {tutorial && !tutorial.isPlaceholder && <section className="req-detail-section"><h2>Free tutorial</h2><TutorialCard tutorial={tutorial} /></section>}

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
    <AuthGuard requireData>
      <RequirementDetailInner />
    </AuthGuard>
  );
}
