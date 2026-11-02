-- GabayNegosyo WP3 — POST-MIGRATION CHECKS for 008 (read-only). Paste into Supabase → SQL Editor → New query → Run, AFTER 008.
-- Reads catalogs and counts only; changes nothing. Every row should show ok = true.
-- NOT RUN when it was written (no PostgreSQL was available). It checks the SHAPE of the database (columns, triggers, privileges).
-- It does not test behaviour as a signed-in admin: use the manual tests in docs/ACCOUNT_LIFECYCLE_QA.md for that.
with checks(n, what, expected, actual) as (
  select 1, 'audit log has the reason and target_ref columns', '2',
    (select count(*) from information_schema.columns where table_schema = 'public' and table_name = 'admin_audit_log' and column_name in ('reason', 'target_ref'))::text
  union all select 2, 'append-only triggers exist (update/delete and truncate)', 'admin_audit_log_no_truncate, admin_audit_log_no_update_delete',
    (select string_agg(tgname::text, ', ' order by tgname) from pg_trigger where tgrelid = 'public.admin_audit_log'::regclass and not tgisinternal and tgenabled <> 'D')
  union all select 3, 'the reason requirement exists as a constraint', 'true',
    (select exists (select 1 from pg_constraint where conrelid = 'public.admin_audit_log'::regclass and conname = 'admin_audit_log_reason_present'))::text
  union all select 4, 'no existing audit row is missing its reason', '0',
    (select count(*) from public.admin_audit_log where reason is null)::text
  union all select 5, 'API roles have no write privilege on the audit log (authenticated, anon, service_role)', '0',
    (select count(*) from (values ('authenticated'), ('anon'), ('service_role')) r(role)
      cross join (values ('INSERT'), ('UPDATE'), ('DELETE'), ('TRUNCATE')) p(priv)
      where has_table_privilege(r.role, 'public.admin_audit_log', p.priv))::text
  union all select 6, 'signed-in users can still SELECT the audit log (row-level security limits it to real admins)', 'true',
    has_table_privilege('authenticated', 'public.admin_audit_log', 'SELECT')::text
  union all select 7, 'the guard function is not callable by API roles', '0',
    (select count(*) from pg_proc p where p.proname = 'admin_audit_log_guard' and p.pronamespace = 'public'::regnamespace
        and (has_function_privilege('authenticated', p.oid, 'execute') or has_function_privilege('anon', p.oid, 'execute')))::text
  union all select 8, 'log_admin_action still not callable by API roles', '0',
    (select count(*) from pg_proc p where p.proname = 'log_admin_action' and p.pronamespace = 'public'::regnamespace
        and (has_function_privilege('authenticated', p.oid, 'execute') or has_function_privilege('anon', p.oid, 'execute')))::text
  union all select 9, 'the four admin functions record before/after (new bodies installed)', '3',
    (select count(*) from pg_proc p where p.pronamespace = 'public'::regnamespace and p.proname in ('admin_set_account_status', 'admin_grant_premium', 'admin_revoke_premium')
        and pg_get_functiondef(p.oid) like '%''before''%' and pg_get_functiondef(p.oid) like '%''after''%')::text
  union all select 10, 'admin_sync_profiles records a reason', 'true',
    (select pg_get_functiondef(p.oid) like '%''reason''%' from pg_proc p where p.pronamespace = 'public'::regnamespace and p.proname = 'admin_sync_profiles')::text
  union all select 11, 'every SECURITY DEFINER function still pins an empty search_path', '0',
    (select count(*) from pg_proc p where p.pronamespace = 'public'::regnamespace and p.prosecdef
        and not exists (select 1 from pg_depend d where d.objid = p.oid and d.deptype = 'e')
        and not coalesce(array_to_string(p.proconfig, ',') like '%search_path=""%', false))::text
  union all select 12, 'audit-log links to accounts still use SET NULL', '2',
    (select count(*) from pg_constraint c where c.contype = 'f' and c.confrelid = 'auth.users'::regclass and c.confdeltype = 'n' and c.conrelid = 'public.admin_audit_log'::regclass)::text
)
select n as "#", what as check_name, expected, actual, (expected = actual) as ok
  from checks order by n;
