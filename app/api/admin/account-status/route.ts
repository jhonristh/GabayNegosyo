import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { handleAdminAccountStatus } from "../../../../lib/adminAccountStatusHandler";

/**
 * POST /api/admin/account-status    Header: Authorization: Bearer <admin's Supabase access token>
 * Body: { "target": "<account uuid>", "deactivate": true | false, "reason": "3–300 characters" }
 *
 * Server-only. Needs SUPABASE_SERVICE_ROLE_KEY (never NEXT_PUBLIC_, never sent to the browser).
 * Admin check, validation and the audit row are done by the database (public.admin_set_account_status, run with the
 * CALLER's token so the audit log names the real admin). The service key is used for ONE thing: banning / un-banning the
 * target in Supabase Auth so an administrator-deactivated person cannot keep or refresh a login session (finding DB-05).
 * See lib/adminAccountStatusHandler.ts for the order of operations and why.
 */
const BAN_FOREVER = "876000h"; // about 100 years; "none" lifts it

export async function POST(req: Request) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !anonKey || !serviceKey) {
    return NextResponse.json({ error: "Account management is not available right now. Nothing was changed.", code: "not_configured" }, { status: 503 });
  }

  let input: { target?: unknown; deactivate?: unknown; reason?: unknown } = {};
  try {
    const parsed = await req.json();
    if (parsed && typeof parsed === "object") {
      const p = parsed as { target?: unknown; deactivate?: unknown; reason?: unknown };
      input = { target: p.target, deactivate: p.deactivate, reason: p.reason };
    }
  } catch {
    /* no or invalid body: the handler refuses it */
  }

  const asCaller = (token: string) =>
    createClient(url, anonKey, { global: { headers: { Authorization: `Bearer ${token}` } }, auth: { persistSession: false, autoRefreshToken: false } });
  const service = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });

  const result = await handleAdminAccountStatus(
    req.headers.get("authorization"),
    {
      async getUserFromToken(token) {
        const { data, error } = await asCaller(token).auth.getUser(token);
        if (error || !data.user) return null;
        return { id: data.user.id };
      },
      async callerIsAdmin(token) {
        const { data, error } = await asCaller(token).rpc("is_admin");
        if (error) throw new Error(`admin check failed: ${error.code ?? "error"}`);
        return data === true;
      },
      async getTargetState(token, target) {
        // Real admins may read every profile through row-level security; anyone else would see nothing (and was refused earlier).
        const { data, error } = await asCaller(token).from("profiles").select("role, is_demo, deactivated_at").eq("id", target).maybeSingle();
        if (error) throw new Error(`target lookup failed: ${error.code ?? "error"}`);
        if (!data) return { found: false, role: null, isDemo: false, deactivated: false };
        return { found: true, role: (data.role as string | null) ?? null, isDemo: Boolean(data.is_demo), deactivated: Boolean(data.deactivated_at) };
      },
      async setStatusAsCaller(token, { target, deactivate, reason }) {
        const { error } = await asCaller(token).rpc("admin_set_account_status", { p_target: target, p_deactivate: deactivate, p_reason: reason });
        return { error: error ? { code: error.code, message: error.message } : null };
      },
      async setAuthBan(userId, banned) {
        const { error } = await service.auth.admin.updateUserById(userId, { ban_duration: banned ? BAN_FOREVER : "none" });
        if (error) console.error("[admin-account-status] auth ban change failed:", error.status ?? "error");
        return { error: error ? error.message : null };
      },
    },
    input
  );

  return NextResponse.json(result.body, { status: result.status });
}
