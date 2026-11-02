/**
 * Pure, dependency-injected core of POST /api/delete-account so it can be unit-tested
 * without Next or a network. The route wires real Supabase calls into `deps`.
 *
 * Safety rules:
 *  - Only the identity proven by the bearer token can be deleted; there is no user-id input.
 *  - The token must have been issued by a recent sign-in (re-authentication window).
 *  - Admins cannot self-delete here (prevents locking the project out of its last admin).
 *  - Demo identities are refused (browser demo ids by prefix; database profiles flagged is_demo by lookup).
 *  - v0.17: the typed confirmation word DELETE is re-checked here, so a request made without the dialog is refused.
 *  - v0.17: a minimal deletion record (hashed id, role, date; purged after 30 days) is written ONLY AFTER the account
 *    was really deleted (WP3: a record written first would claim a deletion that may have failed). If the record cannot be
 *    written (e.g. migration 005 not applied) the deletion has already happened and the response is still success.
 *  - WP3 (F-07): every lookup FAILS CLOSED. An unreadable role (error or missing profile row) or a lookup that throws
 *    refuses the request with 503 and deletes nothing. A failed lookup can never look like "not an admin, not a demo".
 *  - WP3 (DB-05): an account an ADMINISTRATOR deactivated cannot delete itself through this route. An admin deactivated it
 *    for a reason that may need the data (e.g. an abuse review); the person must contact the site owner instead. A
 *    self-deactivated account may still delete itself (it chose to leave).
 */
export const REAUTH_WINDOW_MS = 10 * 60 * 1000;

export interface DeleteDeps {
  getUserFromToken(token: string): Promise<{ id: string; lastSignInAt: string | null } | null>;
  /** The profile role, or null when it cannot be determined (query error OR no profile row). Null refuses the deletion. */
  getRole(userId: string): Promise<string | null>;
  /** Optional: true when the database profile is flagged is_demo. Such accounts are refused. MUST throw if the lookup fails. */
  isDemoAccount?(userId: string): Promise<boolean>;
  /**
   * Optional: whether an ADMINISTRATOR deactivated this account. MUST throw if the lookup fails.
   * Resolve `false` when the deactivation columns do not exist yet (migration 005 not applied): there is no such state then.
   */
  isDeactivatedByAdmin?(userId: string): Promise<boolean>;
  deleteAuthUser(userId: string): Promise<{ error: string | null }>;
  /** Optional: records {hashed id, role, date} AFTER a successful deletion. Failures are ignored by the handler. */
  recordDeletion?(userId: string, role: string | null): Promise<void>;
  now(): number;
}

export interface DeleteInput {
  confirm?: unknown;
}

export interface DeleteResult {
  status: number;
  body: { ok?: true; error?: string; code?: string };
}

export async function handleDeleteAccount(
  authorizationHeader: string | null,
  deps: DeleteDeps,
  input: DeleteInput = {}
): Promise<DeleteResult> {
  const token = authorizationHeader?.replace(/^Bearer\s+/i, "").trim();
  if (!token) return { status: 401, body: { error: "Not logged in.", code: "unauthenticated" } };

  const caller = await deps.getUserFromToken(token);
  if (!caller) return { status: 401, body: { error: "Invalid or expired session.", code: "unauthenticated" } };
  if (caller.id.startsWith("demo-")) return { status: 403, body: { error: "Demo accounts cannot be deleted.", code: "demo" } };

  if (typeof input.confirm !== "string" || input.confirm.trim() !== "DELETE") {
    return { status: 400, body: { error: "Type DELETE to confirm. Nothing was deleted.", code: "confirmation_required" } };
  }

  const last = caller.lastSignInAt ? Date.parse(caller.lastSignInAt) : NaN;
  if (!Number.isFinite(last) || deps.now() - last > REAUTH_WINDOW_MS) {
    return { status: 403, body: { error: "For your security, please log in again and then retry deleting your account.", code: "reauth_required" } };
  }

  const unavailable: DeleteResult = {
    status: 503,
    body: { error: "We could not check your account right now. Nothing was deleted. Please try again in a moment.", code: "lookup_failed" },
  };

  let role: string | null;
  try {
    role = await deps.getRole(caller.id);
  } catch {
    return unavailable;
  }
  if (role === null || role === undefined) return unavailable; // unknown role: fail closed

  if (role === "admin") {
    return { status: 403, body: { error: "Admin accounts cannot be deleted from here. Ask another admin to change your role first.", code: "admin_protected" } };
  }

  try {
    if (await deps.isDemoAccount?.(caller.id)) {
      return { status: 403, body: { error: "Demo accounts cannot be deleted.", code: "demo" } };
    }
    if (await deps.isDeactivatedByAdmin?.(caller.id)) {
      return {
        status: 403,
        body: { error: "An administrator deactivated this account, so it cannot be deleted from here. Please contact the site owner.", code: "admin_deactivated" },
      };
    }
  } catch {
    return unavailable;
  }

  const { error } = await deps.deleteAuthUser(caller.id);
  if (error) return { status: 500, body: { error: "We could not delete your account. Nothing was changed. Please try again.", code: "delete_failed" } };

  try {
    await deps.recordDeletion?.(caller.id, role);
  } catch {
    /* the deletion record is best-effort by design; the account is already gone */
  }
  return { status: 200, body: { ok: true } };
}
