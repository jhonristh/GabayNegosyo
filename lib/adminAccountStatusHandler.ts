/**
 * Pure, dependency-injected core of POST /api/admin/account-status (WP3, finding DB-05).
 *
 * WHY THIS EXISTS. public.admin_set_account_status() (migration 005) already blocks an admin-deactivated person from
 * reading or writing their data (RLS) and from lifting the deactivation themselves. But Supabase Auth knew nothing about it:
 * the person could still sign in, refresh their session and change their password. This route closes that gap by also
 * BANNING the Auth user (service key, server-only) when an admin deactivates an account, and un-banning on reactivation.
 * A banned user cannot sign in or refresh a session; an access token already issued stays valid until it expires
 * (up to the project's JWT lifetime) but the database still refuses its data requests during that time.
 *
 * ORDER OF OPERATIONS (each ordering is chosen so a failure leaves the SAFER state):
 *  - Every request first proves the caller is a real admin (the database's own is_admin(), evaluated with the caller's token).
 *  - Deactivate: the database function runs first (it is the audited source of truth and refuses admins, demo accounts,
 *    yourself, missing reasons). Only if it succeeded is the Auth user banned. If the ban fails, the account is still
 *    deactivated and blocked by RLS; the response carries a warning so the admin knows sign-in itself was not blocked.
 *  - Reactivate: the target is checked first (must exist, be a non-admin, non-demo account that really is deactivated), so
 *    this route can never lift a ban on some other account. Then the ban is lifted, then the database function runs. If the
 *    function fails after that, the account is still marked deactivated (RLS keeps blocking it) and the person simply sees
 *    the deactivated screen.
 *  - Nothing is ever banned for a target the database function refused (admin, demo, self, unknown).
 * The browser never names a role and never sends the service key; the target id is validated as a UUID.
 */
export interface AdminStatusDeps {
  getUserFromToken(token: string): Promise<{ id: string } | null>;
  /** True only when the database says the CALLER is a real (non-demo) admin. MUST throw if the check itself fails. */
  callerIsAdmin(token: string): Promise<boolean>;
  /**
   * Reads the target's status through the CALLER's token (row-level security lets real admins read profiles).
   * Resolves `found: false` when no such profile exists. MUST throw if the read itself fails.
   */
  getTargetState(token: string, target: string): Promise<{ found: boolean; role: string | null; isDemo: boolean; deactivated: boolean }>;
  /** Runs public.admin_set_account_status as the caller (so the audit row names the real admin). */
  setStatusAsCaller(token: string, input: { target: string; deactivate: boolean; reason: string }): Promise<{ error: { code?: string; message?: string } | null }>;
  /** Service-key call: ban or un-ban the Auth user. */
  setAuthBan(userId: string, banned: boolean): Promise<{ error: string | null }>;
}

export interface AdminStatusResult {
  status: number;
  body: { ok?: true; error?: string; code?: string; message?: string; warning?: string; sessionBlocked?: boolean };
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Maps a database error from admin_set_account_status to a status code the UI can show. The raw text is passed through for friendlyAdminError. */
function dbFailure(error: { code?: string; message?: string }): AdminStatusResult {
  const msg = error.message ?? "";
  const status = error.code === "42501" ? 403 : error.code === "22023" ? 400 : error.code === "P0002" ? 404 : 500;
  return { status, body: { error: msg || "The change was not saved.", code: error.code ?? "database_error" } };
}

export async function handleAdminAccountStatus(
  authorizationHeader: string | null,
  deps: AdminStatusDeps,
  input: { target?: unknown; deactivate?: unknown; reason?: unknown } = {}
): Promise<AdminStatusResult> {
  const token = authorizationHeader?.replace(/^Bearer\s+/i, "").trim();
  if (!token) return { status: 401, body: { error: "Not logged in.", code: "unauthenticated" } };

  const caller = await deps.getUserFromToken(token);
  if (!caller) return { status: 401, body: { error: "Invalid or expired session.", code: "unauthenticated" } };

  let admin = false;
  try {
    admin = await deps.callerIsAdmin(token);
  } catch {
    return { status: 503, body: { error: "We could not verify your admin access right now. Nothing was changed.", code: "lookup_failed" } };
  }
  if (!admin) return { status: 403, body: { error: "Admins only", code: "42501" } };

  const target = typeof input.target === "string" ? input.target.trim() : "";
  const reason = typeof input.reason === "string" ? input.reason.trim() : "";
  if (!UUID.test(target)) return { status: 400, body: { error: "Choose a valid account.", code: "invalid_target" } };
  if (typeof input.deactivate !== "boolean") return { status: 400, body: { error: "Say whether to deactivate or reactivate.", code: "invalid_action" } };
  if (reason.length < 3 || reason.length > 300) return { status: 400, body: { error: "A reason of 3–300 characters is required", code: "22023" } };
  if (target === caller.id) return { status: 403, body: { error: "You cannot change your own account status here", code: "42501" } };

  const deactivate = input.deactivate;

  if (!deactivate) {
    let state: Awaited<ReturnType<AdminStatusDeps["getTargetState"]>>;
    try {
      state = await deps.getTargetState(token, target);
    } catch {
      return { status: 503, body: { error: "We could not check that account right now. Nothing was changed.", code: "lookup_failed" } };
    }
    if (!state.found) return { status: 404, body: { error: "Account not found", code: "P0002" } };
    if (state.role === "admin") return { status: 403, body: { error: "Admin accounts cannot be deactivated here", code: "42501" } };
    if (state.isDemo) return { status: 403, body: { error: "Demo accounts cannot be deactivated", code: "42501" } };
    if (!state.deactivated) return { status: 409, body: { error: "This account is not deactivated.", code: "not_deactivated" } };

    // Lift the sign-in block first. If the database step then fails the account stays deactivated (safe).
    const unban = await deps.setAuthBan(target, false);
    if (unban.error) {
      return { status: 502, body: { error: "The account could not be unblocked for sign-in. Nothing else was changed. Please try again.", code: "ban_lift_failed" } };
    }
    const res = await deps.setStatusAsCaller(token, { target, deactivate: false, reason });
    if (res.error) return dbFailure(res.error);
    return { status: 200, body: { ok: true, sessionBlocked: false } };
  }

  const res = await deps.setStatusAsCaller(token, { target, deactivate: true, reason });
  if (res.error) return dbFailure(res.error); // refused (admin, demo, self, unknown, bad reason): nothing is banned
  const ban = await deps.setAuthBan(target, true);
  if (ban.error) {
    return {
      status: 200,
      body: {
        ok: true,
        sessionBlocked: false,
        warning: "The account is deactivated and its data is blocked, but its sign-in could not be blocked. Try deactivating again later or block it in the Supabase dashboard.",
      },
    };
  }
  return { status: 200, body: { ok: true, sessionBlocked: true } };
}
