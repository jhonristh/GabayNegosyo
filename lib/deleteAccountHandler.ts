/**
 * Pure, dependency-injected core of POST /api/delete-account so it can be unit-tested
 * without Next or a network. The route wires real Supabase calls into `deps`.
 *
 * Safety rules:
 *  - Only the identity proven by the bearer token can be deleted; there is no user-id input.
 *  - The token must have been issued by a recent sign-in (re-authentication window).
 *  - Admins cannot self-delete here (prevents locking the project out of its last admin).
 *  - Demo identities are refused.
 */
export const REAUTH_WINDOW_MS = 10 * 60 * 1000;

export interface DeleteDeps {
  getUserFromToken(token: string): Promise<{ id: string; lastSignInAt: string | null } | null>;
  getRole(userId: string): Promise<string | null>;
  deleteAuthUser(userId: string): Promise<{ error: string | null }>;
  now(): number;
}

export interface DeleteResult {
  status: number;
  body: { ok?: true; error?: string; code?: string };
}

export async function handleDeleteAccount(authorizationHeader: string | null, deps: DeleteDeps): Promise<DeleteResult> {
  const token = authorizationHeader?.replace(/^Bearer\s+/i, "").trim();
  if (!token) return { status: 401, body: { error: "Not logged in.", code: "unauthenticated" } };

  const caller = await deps.getUserFromToken(token);
  if (!caller) return { status: 401, body: { error: "Invalid or expired session.", code: "unauthenticated" } };
  if (caller.id.startsWith("demo-")) return { status: 403, body: { error: "Demo accounts cannot be deleted.", code: "demo" } };

  const last = caller.lastSignInAt ? Date.parse(caller.lastSignInAt) : NaN;
  if (!Number.isFinite(last) || deps.now() - last > REAUTH_WINDOW_MS) {
    return { status: 403, body: { error: "For your security, please log in again and then retry deleting your account.", code: "reauth_required" } };
  }

  const role = await deps.getRole(caller.id);
  if (role === "admin") {
    return { status: 403, body: { error: "Admin accounts cannot be deleted from here. Ask another admin to change your role first.", code: "admin_protected" } };
  }

  const { error } = await deps.deleteAuthUser(caller.id);
  if (error) return { status: 500, body: { error: "We could not delete your account. Nothing was changed. Please try again.", code: "delete_failed" } };
  return { status: 200, body: { ok: true } };
}
