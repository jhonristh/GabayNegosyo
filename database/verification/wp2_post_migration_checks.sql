-- GabayNegosyo WP2 — POST-MIGRATION CHECKS (read-only). Paste into Supabase → SQL Editor → New query → Run, AFTER 005 and 006 (and 007 if approved).
-- Reads catalogs only; changes nothing. Rows 1–17 should show ok = true. Row 18 is informational: it is false until 007 is approved and applied.
-- These prove the database OBJECTS and PERMISSIONS are as designed. They do NOT test behaviour as a signed-in user:
-- that needs the manual test accounts in docs/DATABASE_SECURITY_REVIEW.md section 8 (the SQL editor has no signed-in user).
with fns as (
  select p.proname, p.prosecdef, p.oid, p.proconfig
    from pg_proc p join pg_namespace n on n.oid = p.pronamespace
   where n.nspname = 'public' and not exists (select 1 from pg_depend d where d.objid = p.oid and d.deptype = 'e')
),
checks(n, what, expected, actual) as (
  select 1, 'self-upgrade function is gone', '0', (select count(*) from fns where proname = 'upgrade_to_premium_demo')::text
  union all select 2, 'all 18 project functions exist', '18',
    (select count(*) from fns where proname in ('is_admin','handle_new_user','handle_user_updated','admin_account_overview','admin_sync_profiles','is_account_active','log_admin_action','purge_expired_deletion_log','deactivate_my_account','reactivate_my_account','admin_set_account_status','entitlement_for','get_my_entitlement','admin_grant_premium','admin_revoke_premium','admin_user_directory','admin_list_audit_log','admin_premium_roster'))::text
  union all select 3, 'every SECURITY DEFINER function pins search_path to empty', '0',
    (select count(*) from fns where prosecdef and not coalesce(array_to_string(proconfig, ',') like '%search_path=""%', false))::text
  union all select 4, 'no definer function is executable by anon', '0',
    (select count(*) from fns where prosecdef and has_function_privilege('anon', oid, 'execute'))::text
  union all select 5, 'functions signed-in users may call (each re-checks its caller)',
    'admin_account_overview, admin_grant_premium, admin_list_audit_log, admin_premium_roster, admin_revoke_premium, admin_set_account_status, admin_sync_profiles, admin_user_directory, deactivate_my_account, get_my_entitlement, is_account_active, is_admin, purge_expired_deletion_log, reactivate_my_account',
    (select string_agg(proname, ', ' order by proname) from fns where prosecdef and has_function_privilege('authenticated', oid, 'execute'))
  union all select 6, 'entitlement_for / log_admin_action are NOT callable by API roles', '0',
    (select count(*) from fns where proname in ('entitlement_for','log_admin_action') and (has_function_privilege('authenticated', oid, 'execute') or has_function_privilege('anon', oid, 'execute')))::text
  union all select 7, 'tables in public without row level security', '0',
    (select count(*) from pg_class c join pg_namespace n on n.oid = c.relnamespace where n.nspname = 'public' and c.relkind = 'r' and not c.relrowsecurity)::text
  union all select 8, 'anon has no privilege on any public table', '0',
    (select count(*) from information_schema.role_table_grants where table_schema = 'public' and grantee = 'anon')::text
  union all select 9, 'RESTRICTIVE "active account only" policies on the 5 user-data tables', '5',
    (select count(*) from pg_policies where schemaname = 'public' and policyname = 'active account only' and permissive = 'RESTRICTIVE')::text
  union all select 10, 'RESTRICTIVE update policy on profiles', '1',
    (select count(*) from pg_policies where schemaname = 'public' and tablename = 'profiles' and permissive = 'RESTRICTIVE' and cmd = 'UPDATE')::text
  union all select 11, 'signed-in users can update only profiles.name', 'name',
    (select string_agg(attname::text, ', ') from pg_attribute where attrelid = 'public.profiles'::regclass and attnum > 0 and not attisdropped and has_column_privilege('authenticated', 'public.profiles', attname, 'UPDATE'))
  union all select 12, 'no INSERT/UPDATE/DELETE for API roles on entitlements, audit log, deletion log, deliveries', '0',
    (select count(*) from (values ('entitlements'),('admin_audit_log'),('account_deletion_log'),('reminder_deliveries')) t(x)
      cross join (values ('authenticated'),('anon')) r(role)
      where has_table_privilege(r.role, 'public.' || t.x, 'INSERT') or has_table_privilege(r.role, 'public.' || t.x, 'UPDATE') or has_table_privilege(r.role, 'public.' || t.x, 'DELETE'))::text
  union all select 13, 'API roles cannot read the deletion log or reminder deliveries', '0',
    (select count(*) from (values ('account_deletion_log'),('reminder_deliveries')) t(x) cross join (values ('authenticated'),('anon')) r(role) where has_table_privilege(r.role, 'public.' || t.x, 'SELECT'))::text
  union all select 14, 'deactivation columns exist on profiles', '3',
    (select count(*) from information_schema.columns where table_schema = 'public' and table_name = 'profiles' and column_name in ('deactivated_at','deactivated_by','deactivated_by_admin'))::text
  union all select 15, 'user-owned tables cascade-delete with the auth user', '8',
    (select count(*) from pg_constraint c where c.contype = 'f' and c.confrelid = 'auth.users'::regclass and c.confdeltype = 'c'
        and c.conrelid::regclass::text in ('profiles','business_profiles','checklist_progress','reminder_configs','sent_emails','task_progress','reminder_deliveries','entitlements'))::text
  union all select 16, 'audit-log links use SET NULL (history survives account deletion)', '2',
    (select count(*) from pg_constraint c where c.contype = 'f' and c.confrelid = 'auth.users'::regclass and c.confdeltype = 'n' and c.conrelid = 'public.admin_audit_log'::regclass)::text
  union all select 17, 'check constraint: entitlement source limited to admin_grant / subscription', 'true',
    (select exists (select 1 from pg_constraint where conrelid = 'public.entitlements'::regclass and contype = 'c' and pg_get_constraintdef(oid) like '%admin_grant%subscription%'))::text
  union all select 18, 'INFO ONLY: 007 applied? (false is normal until 007 is approved)', 'true',
    coalesce((select (pg_get_functiondef(oid) like '%entitlement_for%')::text from fns where proname = 'admin_account_overview'), 'missing')
)
select n as "#", what as check_name, expected, actual, (expected = actual) as ok
  from checks order by n;
