import type { BusinessProfile, Requirement, ApplicabilityRule, ChecklistItem, RequirementStatus } from "./types";

/**
 * RULE ENGINE
 * ───────────
 * Business Profile → Eligibility Rules → Applicable Requirements → Checklist
 *
 * Each requirement declares an `applicabilityRules` object (data, not code).
 * This engine is the ONLY place that interprets those rules. UI components
 * never re-implement eligibility logic — they just render what this
 * function returns. To add a new rule dimension, extend `ApplicabilityRule`
 * in types.ts and add one matcher function below.
 */

type Matcher = (rule: ApplicabilityRule, profile: BusinessProfile) => boolean;

const matchers: Matcher[] = [
  (rule, profile) =>
    !rule.businessType || rule.businessType.includes(profile.businessType),
  (rule, profile) =>
    !rule.businessStructure || rule.businessStructure.includes(profile.businessStructure),
  (rule, profile) => !rule.taxType || rule.taxType.includes(profile.taxType),
  (rule, profile) => !rule.taxpayerType || rule.taxpayerType.includes(profile.taxpayerType),
  (rule, profile) =>
    rule.hasEmployees === undefined || rule.hasEmployees === profile.hasEmployees,
  (rule, profile) =>
    rule.minEmployeeCount === undefined || profile.employeeCount >= rule.minEmployeeCount,
  (rule, profile) => rule.hasLease === undefined || rule.hasLease === profile.hasLease,
  (rule, profile) =>
    rule.isRegisteringNewBusiness === undefined ||
    rule.isRegisteringNewBusiness === profile.isRegisteringNewBusiness,
  (rule, profile) => !rule.status || rule.status.includes(profile.status),
];

export function requirementApplies(requirement: Requirement, profile: BusinessProfile): boolean {
  return matchers.every((matcher) => matcher(requirement.applicabilityRules, profile));
}

export function generateApplicableRequirements(
  profile: BusinessProfile,
  allRequirements: Requirement[]
): Requirement[] {
  return allRequirements
    .filter((r) => !r.archived)
    .filter((r) => requirementApplies(r, profile));
}

const MS_PER_DAY = 24 * 60 * 60 * 1000;

function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

/** Whole calendar days from `from` to `to` (DST-safe; 0 = same calendar day). */
function calendarDaysBetween(from: Date, to: Date): number {
  const a = Date.UTC(from.getFullYear(), from.getMonth(), from.getDate());
  const b = Date.UTC(to.getFullYear(), to.getMonth(), to.getDate());
  return Math.round((b - a) / MS_PER_DAY);
}

/**
 * Computes the next due date for a requirement relative to "today".
 *
 * Compared by calendar day, not by clock time: a deadline that falls on
 * today's date is still "today's" deadline all day. (Previously a midnight
 * due date was already "in the past" by 00:01, so on the actual deadline day
 * the app jumped to next year and never showed "Due today".)
 */
export function computeNextDueDate(requirement: Requirement, today: Date = new Date()): Date {
  const year = today.getFullYear();
  const month = (requirement.deadlineMonth ?? 1) - 1;
  const day = requirement.deadlineDay ?? 1;
  let due = new Date(year, month, day);
  if (due < startOfDay(today)) {
    due = new Date(year + 1, month, day);
  }
  return due;
}

export function computeStatus(
  dueDate: Date,
  completedAt: string | undefined,
  today: Date = new Date()
): "upcoming" | "due_soon" | "due_today" | "overdue" | "completed" {
  if (completedAt) return "completed";
  const daysUntil = calendarDaysBetween(today, dueDate);
  if (daysUntil < 0) return "overdue";
  if (daysUntil === 0) return "due_today";
  if (daysUntil <= 14) return "due_soon";
  return "upcoming";
}

// ─────────────────────────────────────────────────────────────────────────
// v0.12 — obligation resolver (BUG-004 / BUG-005)
//
// computeNextDueDate() above always rolls a past date to next year, so a
// missed deadline could never be "overdue", and a completion lasted forever.
// resolveObligation() replaces it for the UI:
//   - only fixed_annual items have a date; everything else is "no_deadline"
//     (or "completed") and never shows an invented date;
//   - fixed_annual items are tracked per CYCLE (the due year). A completion
//     only counts for the cycle it was recorded for, so it resets next year;
//   - a cycle that already passed before the person's profile existed is not
//     flagged overdue (we can't know they were obliged then) — it rolls to
//     the next cycle instead.
// ─────────────────────────────────────────────────────────────────────────

export interface ResolvedObligation {
  /** null when the content source gives no single calendar date */
  dueDate: Date | null;
  status: RequirementStatus;
  /** "YYYY" for fixed_annual cycles, "once" otherwise — the key task progress is stored under */
  cycle: string;
  /** "YYYY-MM-DD" of dueDate (local calendar date), or null */
  dueKey: string | null;
}

/** Local calendar date as YYYY-MM-DD (never goes through UTC, so no off-by-one-day). */
export function toDateKey(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** Year of a stored due date: date keys / ISO strings both start with the year. */
function cycleYearOf(stored: string | undefined): number | null {
  if (!stored) return null;
  const y = parseInt(stored.slice(0, 4), 10);
  return Number.isFinite(y) ? y : null;
}

export function resolveObligation(
  requirement: Requirement,
  progress: ChecklistItem | undefined,
  today: Date = new Date(),
  profileCreatedAt?: string
): ResolvedObligation {
  const completedAt = progress?.completedAt;

  if (requirement.deadlineKind !== "fixed_annual" || !requirement.deadlineMonth || !requirement.deadlineDay) {
    return { dueDate: null, status: completedAt ? "completed" : "no_deadline", cycle: "once", dueKey: null };
  }

  const month = requirement.deadlineMonth - 1;
  const day = requirement.deadlineDay;
  const todayStart = startOfDay(today);
  const completedForYear = completedAt ? cycleYearOf(progress?.dueDate) : null;

  let year = today.getFullYear();
  let due = new Date(year, month, day);

  if (due < todayStart && completedForYear !== year) {
    // This year's date has passed and it isn't done. Overdue only if the
    // person was already using the app (or the profile) when it fell due.
    const created = profileCreatedAt ? startOfDay(new Date(profileCreatedAt)) : null;
    if (created && due < created) {
      year += 1;
      due = new Date(year, month, day);
    }
  }

  const done = Boolean(completedAt) && completedForYear === year;
  return {
    dueDate: due,
    status: done ? "completed" : computeStatus(due, undefined, today),
    cycle: String(year),
    dueKey: toDateKey(due),
  };
}

/** Sort key: dated items by date, undated items last. */
export function compareByDue(a: { dueDate: Date | null }, b: { dueDate: Date | null }): number {
  if (a.dueDate && b.dueDate) return a.dueDate.getTime() - b.dueDate.getTime();
  if (a.dueDate) return -1;
  if (b.dueDate) return 1;
  return 0;
}

export function formatDueLabel(d: Date | null): string {
  return d ? d.toLocaleDateString("en-PH", { month: "long", day: "numeric", year: "numeric" }) : "No fixed date";
}

const TAXPAYER_LABELS: Record<string, string> = {
  purely_compensation: "Purely Compensation",
  self_employment_or_profession: "Self-Employment or Profession",
  purely_business: "Purely Business",
  mixed_income_earner: "Mixed Income Earner",
};

/**
 * v0.12: plain-language reasons this requirement is on the person's checklist,
 * derived from the same rule object the engine matched (never hand-written per
 * requirement). Returns [] when the rule is open to everyone.
 */
export function explainApplicability(requirement: Requirement, profile: BusinessProfile): string[] {
  const rule = requirement.applicabilityRules;
  const reasons: string[] = [];
  if (rule.isRegisteringNewBusiness !== undefined) {
    reasons.push(rule.isRegisteringNewBusiness ? "You said you are registering a new business." : "You said your business is already registered.");
  }
  if (rule.taxpayerType) {
    reasons.push(`Your taxpayer type is ${TAXPAYER_LABELS[profile.taxpayerType] ?? profile.taxpayerType}.`);
  }
  if (rule.hasEmployees !== undefined || rule.minEmployeeCount !== undefined) {
    reasons.push(profile.hasEmployees ? `You have ${profile.employeeCount} employee${profile.employeeCount === 1 ? "" : "s"}.` : "You have no employees.");
  }
  if (rule.hasLease !== undefined) {
    reasons.push(profile.hasLease ? "You lease your business space." : "You do not lease your business space.");
  }
  if (rule.status) {
    reasons.push(`Your business stage is "${profile.status.replace(/_/g, " ")}".`);
  }
  return reasons;
}
