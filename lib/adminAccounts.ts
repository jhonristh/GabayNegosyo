import { getSupabase } from "./supabase";

/**
 * Admin → account overview, backed by database/migrations/003_sync_profiles.sql.
 * Both calls are admin-only on the server (public.is_admin()); the client never
 * decides who is allowed. If the migration has not been run, the error says so plainly.
 */
export interface AccountOverview {
  total: number;
  free: number;
  premium: number;
  admins: number;
  demo: number;
  new7d: number;
  authUsers: number;
  missingProfiles: number;
  orphanProfiles: number;
}

const MIGRATION_HINT = "Run database/migrations/003_sync_profiles.sql in the Supabase SQL editor, then refresh.";

function friendly(message: string, code?: string): string {
  if (code === "PGRST202" || /could not find the function|does not exist/i.test(message)) return MIGRATION_HINT;
  if (code === "42501" || /admins only|permission denied/i.test(message)) return "Only a real admin account can read this.";
  return message || "Could not reach Supabase.";
}

const n = (v: unknown) => Number(v ?? 0);

export async function fetchAccountOverview(): Promise<AccountOverview> {
  const { data, error } = await getSupabase().rpc("admin_account_overview");
  if (error) throw new Error(friendly(error.message, error.code));
  const r = (Array.isArray(data) ? data[0] : data) ?? {};
  return {
    total: n(r.total),
    free: n(r.free_count),
    premium: n(r.premium_count),
    admins: n(r.admin_count),
    demo: n(r.demo_count),
    new7d: n(r.new_7d),
    authUsers: n(r.auth_users),
    missingProfiles: n(r.missing_profiles),
    orphanProfiles: n(r.orphan_profiles),
  };
}

/** Creates a profile row for every Auth user that lacks one. Returns how many were created. */
export async function syncMissingProfiles(): Promise<number> {
  const { data, error } = await getSupabase().rpc("admin_sync_profiles");
  if (error) throw new Error(friendly(error.message, error.code));
  return n(data);
}
