"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import AuthGuard from "../../components/AuthGuard";
import ChecklistProgress from "../../components/ChecklistProgress";
import StatusBadge from "../../components/StatusBadge";
import JourneyStepper, { JourneyNext } from "../../components/JourneyStepper";
import { useAuth } from "../../lib/auth";
import { db } from "../../lib/db";
import { generateApplicableRequirements, resolveObligation, compareByDue, formatDueLabel } from "../../lib/ruleEngine";
import { isPremiumRole } from "../../lib/authorization";
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
  { value: "no_deadline", label: "No fixed date" },
  { value: "completed", label: "Completed" },
];

function ChecklistInner() {
  const { user } = useAuth();
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
          <h2>No checklist yet</h2>
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

  function agencyName(agencyId: string) {
    return agencies.find((a) => a.id === agencyId)?.name ?? agencyId;
  }
  let items = applicable.map((req) => {
    const { dueDate, dueKey, status, cycle } = resolveObligation(req, progress[req.id], new Date(), profile.createdAt);
    return { req, dueDate, dueKey, status: status as RequirementStatus, cycle };
  });

  if (statusFilter !== "all") items = items.filter((i) => i.status === statusFilter);
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

  const grouped = items.reduce<Record<string, typeof items>>((acc, item) => {
    const stage = item.req.complianceStage ?? agencyName(item.req.agencyId);
    if (!acc[stage]) acc[stage] = [];
    acc[stage].push(item);
    return acc;
  }, {});

  function toggle(requirementId: string, dueKey: string | null, isCompleted: boolean) {
    if (!user) return;
    if (isCompleted) {
      db.markIncomplete(requirementId);
    } else {
      db.markComplete(requirementId, `biz-${user.id}`, dueKey);
    }
    rerender((n) => n + 1);
  }

  return (
    <main className="screen kit-pocket">
      <JourneyStepper current="checklist" />
      <header className="intro">
        <p className="v06-eyebrow">STEP 1 OF 5 · WHAT DO I NEED?</p>
        <h1>Your checklist</h1>
        <p>
          Based on your answers, these are the requirements that apply to you. {counts.completed} of {counts.all} completed.
        </p>
      </header>

      <div className="guide-note"><strong>About these dates</strong><p>A date is shown only when the source gives a fixed annual deadline. One-time, monthly, quarterly, and event-based obligations are labelled “No fixed date” with their timing rule instead of a made-up date. Confirm actual filing dates with the agency. Need to change your answers? <Link href="/wizard">Update your business profile</Link>.</p></div>

      <ChecklistProgress completed={counts.completed} total={counts.all} overdue={counts.overdue} onShow={setStatusFilter} />

      <input
        type="search"
        className="text-input search-input"
        placeholder="Search by requirement or stage…"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        aria-label="Search checklist"
      />

      <div className="filter-row">
        {STATUS_FILTERS.map((f) => (
          <button
            key={f.value}
            type="button"
            className={`filter-chip ${statusFilter === f.value ? "selected" : ""}`}
            onClick={() => setStatusFilter(f.value)}
          >
            {f.label} ({counts[f.value]})
          </button>
        ))}
      </div>

      <div className="filter-row">
        <button type="button" className={`filter-chip ${agencyFilter === "all" ? "selected" : ""}`} onClick={() => setAgencyFilter("all")}>
          All agencies
        </button>
        {agencies.map((a) => (
          <button key={a.id} type="button" className={`filter-chip ${agencyFilter === a.id ? "selected" : ""}`} onClick={() => setAgencyFilter(a.id)}>
            {a.id.toUpperCase()}
          </button>
        ))}
      </div>

      {items.length === 0 && (
        <div className="empty-state">
          <h2>No matches</h2>
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

      {Object.entries(grouped).map(([stage, stageItems]) => (
        <section key={stage} className="agency-group">
          <h2>{stage}</h2>
          {stageItems.map(({ req, status, dueDate, dueKey, cycle }) => {
            const isCompleted = status === "completed";
            const stepTotal = isPremiumRole(user.role) ? req.instructions.length : 0; // steps are a Premium feature
            const stepsDone = db.getDoneTasks(req.id, cycle).filter((i) => i < stepTotal).length;
            return (
              <article key={req.id} className="checklist-card">
                <div className="checklist-card-header">
                  <div>
                    <span className="req-agency-tag">{agencyName(req.agencyId)}</span>
                    <h3>
                      <Link href={`/requirements/${req.id}`}>{req.name}</Link>
                    </h3>
                    <p className="deadline">
                      {dueDate ? `Due ${formatDueLabel(dueDate)}` : `No fixed date: ${req.deadlineDescription}`}
                    </p>
                    {stepTotal > 0 && (
                      <p className="task-count">
                        {stepsDone} of {stepTotal} steps done
                      </p>
                    )}
                  </div>
                  <StatusBadge status={status} />
                </div>
                <button type="button" className="secondary-btn" onClick={() => toggle(req.id, dueKey, isCompleted)}>
                  {isCompleted ? "Mark as not completed" : "Mark as completed"}
                </button>
              </article>
            );
          })}
        </section>
      ))}

      <JourneyNext current="checklist" />
    </main>
  );
}

export default function ChecklistPage() {
  return (
    <AuthGuard>
      <ChecklistInner />
    </AuthGuard>
  );
}
