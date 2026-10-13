import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { handleDeleteAccount } from "../../../lib/deleteAccountHandler";

/**
 * POST /api/delete-account    Header: Authorization: Bearer <Supabase access token>
 *
 * Server-only. Needs SUPABASE_SERVICE_ROLE_KEY (never NEXT_PUBLIC_, never in the browser).
 * Deleting the auth user cascades to profiles, business_profiles, checklist_progress,
 * reminder_configs, sent_emails and task_progress (all declared `on delete cascade`
 * in database/supabase_setup.sql and migrations/002). Shared content is not touched.
 */
export async function POST(req: Request) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !anonKey || !serviceKey) {
    return NextResponse.json(
      { error: "Account deletion is not available right now. Nothing was deleted.", code: "not_configured" },
      { status: 503 }
    );
  }

  const admin = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });

  const result = await handleDeleteAccount(req.headers.get("authorization"), {
    async getUserFromToken(token) {
      const anon = createClient(url, anonKey, { auth: { persistSession: false, autoRefreshToken: false } });
      const { data, error } = await anon.auth.getUser(token);
      if (error || !data.user) return null;
      return { id: data.user.id, lastSignInAt: data.user.last_sign_in_at ?? null };
    },
    async getRole(userId) {
      const { data } = await admin.from("profiles").select("role").eq("id", userId).maybeSingle();
      return (data?.role as string | undefined) ?? null;
    },
    async deleteAuthUser(userId) {
      const { error } = await admin.auth.admin.deleteUser(userId);
      return { error: error ? error.message : null };
    },
    now: () => Date.now(),
  });

  return NextResponse.json(result.body, { status: result.status });
}
