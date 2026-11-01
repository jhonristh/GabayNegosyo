/**
 * CENTRAL ENTITLEMENT + FEATURE ACCESS (v0.17)
 * ────────────────────────────────────────────
 * One place answers "does this person have Premium?" and "may they use feature X?".
 * Pages and components call hasPremiumAccess() / canUse() instead of comparing `user.role` themselves.
 *
 * Where the truth lives:
 *   - Real accounts: the server function public.get_my_entitlement() (database/migrations/006_entitlements.sql)
 *     decides from admin-granted entitlements, expiry and revocation. The browser only displays the result.
 *   - Demo sessions are browser-only previews and carry source "demo", kept separate from real entitlements.
 *
 * Honest limit: the Premium *content* (requirement steps, documents, penalty text) ships in the app's data files,
 * so these checks control what the interface shows; they are not a content-protection boundary.
 * Server-enforced parts are the entitlement records themselves and routes such as /api/send-email.
 */
import type { Role } from "./types";

export type PlanStatus = "free" | "premium" | "expired" | "cancelled";
export type EntitlementSource = "none" | "admin_role" | "admin_grant" | "legacy_role" | "subscription" | "demo";

export interface Entitlement {
  status: PlanStatus;
  source: EntitlementSource;
  /** ISO timestamp, or null for "no expiry". */
  expiresAt: string | null;
}

export const FREE_ENTITLEMENT: Entitlement = { status: "free", source: "none", expiresAt: null };

const STATUSES: PlanStatus[] = ["free", "premium", "expired", "cancelled"];
const SOURCES: EntitlementSource[] = ["none", "admin_role", "admin_grant", "legacy_role", "subscription", "demo"];

/** Validates the row returned by public.get_my_entitlement(). Anything unexpected yields null (caller falls back). */
export function parseEntitlementRow(row: unknown): { entitlement: Entitlement; deactivatedAt: string | null } | null {
  const r = Array.isArray(row) ? row[0] : row;
  if (!r || typeof r !== "object") return null;
  const o = r as Record<string, unknown>;
  if (!STATUSES.includes(o.status as PlanStatus) || !SOURCES.includes(o.source as EntitlementSource)) return null;
  const expiresAt = typeof o.expires_at === "string" ? o.expires_at : null;
  const deactivatedAt = typeof o.deactivated_at === "string" ? o.deactivated_at : null;
  return { entitlement: { status: o.status as PlanStatus, source: o.source as EntitlementSource, expiresAt }, deactivatedAt };
}

/** Used only when the server function is unavailable (migration 006 not applied yet): mirrors the stored role. */
export function entitlementFromRole(role: Role | undefined): Entitlement {
  if (role === "admin") return { status: "premium", source: "admin_role", expiresAt: null };
  if (role === "premium") return { status: "premium", source: "legacy_role", expiresAt: null };
  return FREE_ENTITLEMENT;
}

/** Browser-only demo previews. Never mixed with real entitlements. */
export function demoEntitlement(role: Role): Entitlement {
  return role === "free" ? FREE_ENTITLEMENT : { status: "premium", source: "demo", expiresAt: null };
}

export type Feature =
  | "wizard_estimate" | "basic_checklist" | "requirement_info" | "agency_info" | "deadline_info" | "basic_tutorials"
  | "deadline_status" | "progress_tracking" | "resource_library"
  | "required_documents" | "step_instructions" | "penalty_info" | "penalty_simulator" | "email_reminders";

/**
 * Tier of each feature AS SHIPPED TODAY. Change a value here to move a feature between plans.
 *
 * Owner-confirmation pending: the v0.17 brief lists deadline_status, progress_tracking and resource_library as
 * Premium. In the shipped product they are visible to Free users (see README "Free vs. Premium"). They are left
 * Free here so no client-facing behaviour changes without sign-off; see PENDING_OWNER_TIERS.
 */
export const FEATURE_TIER: Record<Feature, "free" | "premium"> = {
  wizard_estimate: "free",
  basic_checklist: "free",
  requirement_info: "free",
  agency_info: "free",
  deadline_info: "free",
  basic_tutorials: "free",
  deadline_status: "free",
  progress_tracking: "free",
  resource_library: "free",
  required_documents: "premium",
  step_instructions: "premium",
  penalty_info: "premium",
  penalty_simulator: "premium",
  email_reminders: "premium",
};

export const PENDING_OWNER_TIERS: Feature[] = ["deadline_status", "progress_tracking", "resource_library"];

interface AccessSubject {
  role?: Role;
  entitlement?: Entitlement;
  deactivatedAt?: string | null;
}

/** True when the person currently has Premium (or admin) access. Deactivated accounts never do. */
export function hasPremiumAccess(user: AccessSubject | null | undefined): boolean {
  if (!user || user.deactivatedAt) return false;
  const ent = user.entitlement ?? entitlementFromRole(user.role);
  if (ent.status !== "premium") return false;
  if (ent.expiresAt && Date.parse(ent.expiresAt) <= Date.now()) return false; // expired since it was loaded
  return true;
}

export function canUse(user: AccessSubject | null | undefined, feature: Feature): boolean {
  if (!user || user.deactivatedAt) return false;
  return FEATURE_TIER[feature] === "free" || hasPremiumAccess(user);
}

export function planLabel(user: AccessSubject | null | undefined): string {
  if (!user) return "Free";
  if (user.role === "admin" && !user.entitlement) return "Admin";
  const ent = user.entitlement ?? entitlementFromRole(user.role);
  if (ent.source === "admin_role") return "Admin";
  if (ent.source === "demo" && ent.status === "premium") return "Premium (demo)";
  if (ent.status === "premium") return "Premium";
  if (ent.status === "expired") return "Free (Premium expired)";
  if (ent.status === "cancelled") return "Free (Premium ended)";
  return "Free";
}

export interface ServerAccess {
  premium: boolean;
  deactivated: boolean;
  /** False when the plan could not be verified. Callers MUST refuse the action (fail closed). */
  verified: boolean;
}

function isMissingFunction(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const e = error as { code?: unknown; message?: unknown };
  return e.code === "PGRST202" || (typeof e.message === "string" && /could not find the function|does not exist/i.test(e.message));
}

/**
 * Server-side decision for API routes (e.g. /api/send-email). Inputs come from the CALLER'S OWN token:
 * the profile role and deactivated_at read through row-level security, and the result of public.get_my_entitlement().
 *
 * FAILS CLOSED: if the entitlement cannot be verified for any reason other than "the function is not installed yet"
 * (migration 006 not applied), `verified` is false and the caller must refuse. Only in that one rollout case does it fall back
 * to the stored role, and even then an account whose own profile row says it is deactivated is never allowed.
 */
export function resolveServerAccess(
  role: string | null | undefined,
  entitlementRow: unknown,
  entitlementError: unknown,
  profileDeactivatedAt?: string | null
): ServerAccess {
  const profileDeactivated = typeof profileDeactivatedAt === "string" && profileDeactivatedAt !== "";
  const parsed = entitlementError ? null : parseEntitlementRow(entitlementRow);
  if (parsed) {
    const exp = parsed.entitlement.expiresAt;
    const expired = exp !== null && Date.parse(exp) <= Date.now();
    const deactivated = parsed.deactivatedAt !== null || profileDeactivated;
    return { premium: !deactivated && parsed.entitlement.status === "premium" && !expired, deactivated, verified: true };
  }
  if (entitlementError && isMissingFunction(entitlementError)) {
    return {
      premium: !profileDeactivated && entitlementFromRole(role as Role | undefined).status === "premium",
      deactivated: profileDeactivated,
      verified: true,
    };
  }
  return { premium: false, deactivated: profileDeactivated, verified: false };
}
