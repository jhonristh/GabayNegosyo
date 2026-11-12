"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import AuthGuard from "../../components/AuthGuard";
import { useInterfaceSounds } from "../../components/InterfaceSounds";
import EmptyStateIllustration from "../../components/EmptyStateIllustration";
import ChecklistProgress from "../../components/ChecklistProgress";
import StatusBadge from "../../components/StatusBadge";
import JourneyStepper, { JourneyNext } from "../../components/JourneyStepper";
import { useAuth } from "../../lib/auth";
import { db } from "../../lib/db";
import { generateApplicableRequirements, resolveObligation, compareByDue, formatDueLabel, describeUndatedRequirement } from "../../lib/ruleEngine";
import { hasPremiumAccess } from "../../lib/entitlements";
import { useToast } from "../../components/ToastProvider";
import type { RequirementStatus } from "../../lib/types";

/**
 * WP2/WP5/K10: the real /checklist route. Previously "Checklist" in the
 * nav linked to /dashboard#checklist, and the active-state check stripped
 * the hash before comparing pathnames — so Home and Checklist highlighted
 * at the same time. This is its own route with its own content: grouped
 * by compliance stage, sorted by due date, filterable by status and
 * agency, searchable.
 */
const STATUS_FILTERS: { value: "all" | RequirementStatus; label: string }[] = [
  { value: "all", label: "All" },
  { value: "overdue", label: "Overdue" },
  { value: "due_today", label: "Due today" },
  { value: "due_soon", label: "Due soon" },
  { value: "upcoming", label: "Upcoming" },
  { value: "no_deadline", label: "Unscheduled" },
  { value: "completed", label: "Completed" },
];

function ChecklistInner() {
  const { user } = useAuth();
  const { notify } = useToast();
  const { play } = useInterfaceSounds();
  const requirements = useMemo(() => db.getRequirements(), []);
  const agencies = useMemo(() => db.getAgencies(), []);
  const [statusFilter, setStatusFilter] = useState<"all" | RequirementStatus>("all");
  const [agencyFilter, setAgencyFilter] = useState("all");
  const [query, setQuery] = useState("");
  const [, rerender] = useState(0);

  if (!user) return null;
  const profile = db.getBusinessProfile(user.id);

  if (!profile) {
    return (
      <main className="screen">
        <div className="empty-state">
          <EmptyStateIllustration variant="no-profile" /><h2>No checklist yet</h2>
          <p>Answer a few quick questions so we can build your personalized checklist.</p>
          <Link href="/wizard" className="primary-btn">
            Start the wizard
          </Link>
        </div>
      </main>
    );
  }

  const premium = hasPremiumAccess(user);
  const applicable = generateApplicableRequirements(profile, requirements);
  const progress = db.getProgress();

  function agencyName(agencyId: string) {
    return agencies.find((a) => a.id === agencyId)?.name ?? agencyId;
  }
  let items = applicable.map((req) => {
    const { dueDate, dueKey, status, cycle } = resolveObligation(req, progress[req.id], new Date(), profile.createdAt);
    return { req, dueDate, dueKey, status: status as RequirementStatus, cycle };
  });

  if (premium && statusFilter !== "all") items = items.filter((i) => i.status === statusFilter);
  if (agencyFilter !== "all") items = items.filter((i) => i.req.agencyId === agencyFilter);
  if (query.trim()) {
    const q = query.trim().toLowerCase();
    items = items.filter((i) => i.req.name.toLowerCase().includes(q) || (i.req.complianceStage ?? "").toLowerCase().includes(q));
  }
  items.sort(compareByDue);

  const counts = {
    all: applicable.length,
    overdue: 0,
    due_today: 0,
    due_soon: 0,
    upcoming: 0,
    no_deadline: 0,
    completed: 0,
  } as Record<"all" | RequirementStatus, number>;
  for (const req of applicable) {
    counts[resolveObligation(req, progress[req.id], new Date(), profile.createdAt).status] += 1;
  }

  // Hierarchy: open items first (To do), completed items below in their own section.
  // Each section is then grouped by compliance stage.
  const openItems = premium ? items.filter((i) => i.status !== "completed") : items;
  const doneItems = premium ? items.filter((i) => i.status === "completed") : [];

  function toggle(requirementId: string, dueKey: string | null, isCompleted: boolean) {
    if (!user || !premium) return;
    if (isCompleted) {
      db.markIncomplete(requirementId);
      play("undo");
      notify("Moved back to your to-do list.");
    } else {
      db.markComplete(requirementId, `biz-${user.id}`, dueKey);
      play("complete");
      notify("Marked as completed.");
    }
    rerender((n) => n + 1);
  }

  function renderStageGroups(list: typeof items) {
    const grouped = list.reduce<Record<string, typeof items>>((acc, item) => {
      const stage = item.req.complianceStage ?? agencyName(item.req.agencyId);
      if (!acc[stage]) acc[stage] = [];
      acc[stage].push(item);
      return acc;
    }, {});
    return Object.entries(grouped).map(([stage, stageItems]) => (
      <section key={stage} className="agency-group">
        <h3>{stage}</h3>
        {stageItems.map(({ req, status, dueDate, dueKey, cycle }) => {
          const isCompleted = status === "completed";
          const stepTotal = premium ? req.instructions.length : 0; // steps are a Premium feature
          const stepsDone = db.getDoneTasks(req.id, cycle).filter((i) => i < stepTotal).length;
          return (
            <article key={req.id} className={`checklist-card ${isCompleted ? "is-completed" : "is-open"}`}>
              <div className="checklist-card-header">
                <div>
                  <span className="req-agency-tag">{agencyName(req.agencyId)}</span>
                  <h4>
                    <Link href={`/requirements/${req.id}`}>{req.name}</Link>
                  </h4>
                  <p className="deadline">
                    {dueDate ? `Due ${formatDueLabel(dueDate)}` : `${describeUndatedRequirement(req)}: ${req.deadlineDescription}`}
                  </p>
                  <p className="verified">Content last reviewed: {req.lastVerified}</p>
                  {req.contentSource === "prototype_placeholder" && (
                    <p className="hint">Placeholder content, not yet reviewed. Confirm with the agency.</p>
                  )}
                  {stepTotal > 0 && (
                    <p className="task-count">
                      {stepsDone} of {stepTotal} steps done
                    </p>
                  )}
                </div>
                {premium && <StatusBadge status={status} />}
              </div>
              <div className="ew-checklist-actions"><Link href={`/requirements/${req.id}`} className="ew-detail-link">View details <span aria-hidden="true">→</span></Link>
              {premium && <button type="button" className="secondary-btn" aria-label={`${isCompleted ? "Mark incomplete" : "Mark complete"}: ${req.name}`} onClick={() => toggle(req.id, dueKey, isCompleted)}>
                {isCompleted ? "Mark as not completed" : "Mark as completed"}
              </button>}</div>
            </article>
          );
        })}
      </section>
    ));
  }

  return (
    <main className="screen kit-pocket">
      <p className="hint">Unreviewed agency guidance is excluded from your checklist and progress totals. Confirm coverage with the relevant agency.</p>
      <JourneyStepper current="checklist" />
      <header className="intro">
        <p className="v06-eyebrow">STEP 1 OF 5 · WHAT DO I NEED?</p>
        <h1>Your checklist</h1>
        <p>
          Based on your answers, these are the requirements that apply to you. {premium ? `${counts.completed} of ${counts.all} completed.` : "Progress tracking and deadline status are available with Premium."}
        </p>
      </header>

      <div className="guide-note"><strong>About these dates</strong><p>Verified annual, quarterly, monthly and window dates are used where enough information is available. Conditional dates without an event date remain described in words; confirm all filing dates with the agency. Need to change your answers? <Link href="/wizard">Update your business profile</Link>.</p></div>

      {premium && <ChecklistProgress completed={counts.completed} total={counts.all} overdue={counts.overdue} onShow={setStatusFilter} />}

      <input
        type="search"
        className="text-input search-input"
        placeholder="Search by requirement or stage…"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        aria-label="Search checklist"
      />

      {premium && <div className="filter-row">
        {STATUS_FILTERS.map((f) => (
          <button
            key={f.value}
            type="button"
            aria-pressed={statusFilter === f.value}
            className={`filter-chip ${statusFilter === f.value ? "selected" : ""}`}
            onClick={() => setStatusFilter(f.value)}
          >
            {f.label} ({counts[f.value]})
          </button>
        ))}
      </div>}

      <div className="filter-row">
        <button type="button" aria-pressed={agencyFilter === "all"} className={`filter-chip ${agencyFilter === "all" ? "selected" : ""}`} onClick={() => setAgencyFilter("all")}>
          All agencies
        </button>
        {agencies.map((a) => (
          <button key={a.id} type="button" aria-pressed={agencyFilter === a.id} className={`filter-chip ${agencyFilter === a.id ? "selected" : ""}`} onClick={() => setAgencyFilter(a.id)}>
            {a.id.toUpperCase()}
          </button>
        ))}
      </div>

      <div className="gn-filter-summary" aria-live="polite"><p className="hint">{items.length} of {applicable.length} requirements</p>{(query || agencyFilter !== "all" || (premium && statusFilter !== "all")) && <button className="text-btn" type="button" onClick={() => {setQuery(""); setAgencyFilter("all"); setStatusFilter("all");}}>Clear filters</button>}</div>
      {items.length === 0 && (
        <div className="empty-state">
          <EmptyStateIllustration variant="no-results" /><h2>No matches</h2>
          <p>Try a different status, agency, or search term.</p>
          <button
            type="button"
            className="secondary-btn"
            onClick={() => {
              setStatusFilter("all");
              setAgencyFilter("all");
              setQuery("");
            }}
          >
            Clear filters
          </button>
        </div>
      )}

      {openItems.length > 0 && (
        <section className="checklist-section checklist-open" aria-labelledby="checklist-open-h">
          <h2 id="checklist-open-h">{premium ? "To do" : "Requirements"} <span className="checklist-count">({openItems.length})</span></h2>
          {renderStageGroups(openItems)}
        </section>
      )}

      {doneItems.length > 0 && (
        <section className="checklist-section checklist-done" aria-labelledby="checklist-done-h">
          <h2 id="checklist-done-h">Completed <span className="checklist-count">({doneItems.length})</span></h2>
          <p className="hint">Completed items stay here. Mark one as not completed to move it back to To do.</p>
          {renderStageGroups(doneItems)}
        </section>
      )}

      <JourneyNext current="checklist" />
    </main>
  );
}

export default function ChecklistPage() {
  return (
    <AuthGuard requireData>
      <ChecklistInner />
    </AuthGuard>
  );
}
