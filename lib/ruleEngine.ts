import type { BusinessProfile, Requirement, ApplicabilityRule } from "./types";

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

/** Computes the next due date for a requirement relative to "today". */
export function computeNextDueDate(requirement: Requirement, today: Date = new Date()): Date {
  const year = today.getFullYear();
  let due = new Date(year, requirement.deadlineMonth - 1, requirement.deadlineDay);
  if (due < today) {
    due = new Date(year + 1, requirement.deadlineMonth - 1, requirement.deadlineDay);
  }
  return due;
}

export function computeStatus(
  dueDate: Date,
  completedAt: string | undefined,
  today: Date = new Date()
): "upcoming" | "due_soon" | "overdue" | "completed" {
  if (completedAt) return "completed";
  const daysUntil = Math.ceil((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  if (daysUntil < 0) return "overdue";
  if (daysUntil <= 14) return "due_soon";
  return "upcoming";
}
