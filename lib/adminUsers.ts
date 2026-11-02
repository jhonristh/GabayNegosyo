import { getSupabase } from "./supabase";
import { AdminActionError, expiryFromDate, friendlyAdminError } from "./adminActions";

export { AdminActionError, expiryFromDate, friendlyAdminError };

/**
 * Admin user management, backed by database/migrations/005 and 006.
 * Every call goes to a SECURITY DEFINER function that re-checks public.is_admin() on the server and writes an
 * audit row. This client code never decides who is allowed, and it never accepts a role from the UI.
 */
export interface DirectoryRow {
  id: string;
  email: string;
  name: string;
  role: "free" | "premium" | "admin";
  isDemo: boolean;
  createdAt: string;
  deactivatedAt: string | null;
  planStatus: "free" | "premium" | "expired" | "cancelled";
  planSource: string;
  planExpiresAt: string | null;
}

export interface AuditRow {
  id: string;
  createdAt: string;
  action: string;
  actorEmail: string | null;
  targetEmail: string | null;
  details: Record<string, unknown>;
}

const s = (v: unknown) => (typeof v === "string" ? v : "");

export async function fetchUserDirectory(opts: { limit: number; offset: number; role: "all" | "free" | "premium" | "admin"; search: string }): Promise<{ rows: DirectoryRow[]; total: number }> {
  const { data, error } = await getSupabase().rpc("admin_user_directory", {
    p_limit: opts.limit,
    p_offset: opts.offset,
    p_role: opts.role === "all" ? null : opts.role,
    p_search: opts.search.trim() === "" ? null : opts.search.trim().slice(0, 100),
  });
  if (error) throw friendlyAdminError(error.message, error.code);
  const list = (Array.isArray(data) ? data : []) as Record<string, unknown>[];
  return {
    total: list.length ? Number(list[0].total_count ?? 0) : 0,
    rows: list.map((r) => ({
      id: s(r.id),
      email: s(r.email),
      name: s(r.name),
      role: (["free", "premium", "admin"].includes(s(r.role)) ? s(r.role) : "free") as DirectoryRow["role"],
      isDemo: Boolean(r.is_demo),
      createdAt: s(r.created_at),
      deactivatedAt: typeof r.deactivated_at === "string" ? r.deactivated_at : null,
      planStatus: (["free", "premium", "expired", "cancelled"].includes(s(r.plan_status)) ? s(r.plan_status) : "free") as DirectoryRow["planStatus"],
      planSource: s(r.plan_source),
      planExpiresAt: typeof r.plan_expires_at === "string" ? r.plan_expires_at : null,
    })),
  };
}

export async function grantPremium(targetId: string, expiresOn: string, reason: string): Promise<void> {
  const { error } = await getSupabase().rpc("admin_grant_premium", { p_target: targetId, p_expires: expiryFromDate(expiresOn), p_reason: reason.trim() });
  if (error) throw friendlyAdminError(error.message, error.code);
}

export async function revokePremium(targetId: string, reason: string): Promise<void> {
  const { error } = await getSupabase().rpc("admin_revoke_premium", { p_target: targetId, p_reason: reason.trim() });
  if (error) throw friendlyAdminError(error.message, error.code);
}

/**
 * Deactivate / reactivate someone else. Goes through the server route (WP3) so the account's Supabase sign-in is blocked
 * or restored together with the audited database change. Returns an optional warning to show the admin.
 */
export async function setAccountStatus(targetId: string, deactivate: boolean, reason: string): Promise<{ warning?: string }> {
  const { data } = await getSupabase().auth.getSession();
  const token = data.session?.access_token;
  if (!token) throw new AdminActionError("Your session has expired. Please log in again.");
  let res: Response;
  try {
    res = await fetch("/api/admin/account-status", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ target: targetId, deactivate, reason: reason.trim() }),
    });
  } catch {
    throw new AdminActionError("We could not reach the server. Nothing was changed.");
  }
  const payload = (await res.json().catch(() => ({}))) as { error?: string; code?: string; warning?: string };
  if (!res.ok) {
    if (res.status === 404 && !payload.code) throw new AdminActionError("Account management is not available on this site yet.");
    if (payload.code === "not_configured" || payload.code === "ban_lift_failed" || payload.code === "lookup_failed") throw new AdminActionError(payload.error ?? "The change was not saved. Please try again.");
    if (payload.code === "not_deactivated") throw new AdminActionError("This account is not deactivated.");
    if (payload.code === "unauthenticated") throw new AdminActionError("Your session has expired. Please log in again.");
    throw friendlyAdminError(payload.error, payload.code);
  }
  return payload.warning ? { warning: payload.warning } : {};
}

export async function fetchAuditLog(limit: number, offset: number): Promise<AuditRow[]> {
  const { data, error } = await getSupabase().rpc("admin_list_audit_log", { p_limit: limit, p_offset: offset });
  if (error) throw friendlyAdminError(error.message, error.code);
  return ((Array.isArray(data) ? data : []) as Record<string, unknown>[]).map((r) => ({
    id: s(r.id),
    createdAt: s(r.created_at),
    action: s(r.action),
    actorEmail: typeof r.actor_email === "string" ? r.actor_email : null,
    targetEmail: typeof r.target_email === "string" ? r.target_email : null,
    details: (r.details && typeof r.details === "object" ? r.details : {}) as Record<string, unknown>,
  }));
}
