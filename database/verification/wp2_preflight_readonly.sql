-- GabayNegosyo WP2 — PRE-FLIGHT (read-only). Paste into Supabase → SQL Editor → New query → Run. Run it BEFORE applying anything.
-- It only reads catalogs and counts. It changes nothing. It returns ONE table; send it (or a screenshot) back to the next session.
-- No emails, names or passwords are shown, only counts and object names.
with fns as (
  select p.proname, p.prosecdef, p.oid
    from pg_proc p join pg_namespace n on n.oid = p.pronamespace
   where n.nspname = 'public'
     and not exists (select 1 from pg_depend d where d.objid = p.oid and d.deptype = 'e')   -- ignore extension functions
),
expected(name) as (values
  ('is_admin'),('handle_new_user'),('handle_user_updated'),('admin_account_overview'),('admin_sync_profiles'),
  ('is_account_active'),('log_admin_action'),('purge_expired_deletion_log'),('deactivate_my_account'),('reactivate_my_account'),
  ('admin_set_account_status'),('entitlement_for'),('get_my_entitlement'),('admin_grant_premium'),('admin_revoke_premium'),
  ('admin_user_directory'),('admin_list_audit_log'),('admin_premium_roster')),
tbls as (
  select c.relname, c.relrowsecurity from pg_class c join pg_namespace n on n.oid = c.relnamespace
   where n.nspname = 'public' and c.relkind = 'r'
)
select '01 DANGER if not 0: self-upgrade function upgrade_to_premium_demo exists' as check_name,
       (select count(*) from fns where proname = 'upgrade_to_premium_demo')::text as result
union all select '02 functions in public that this project does not know about (drift)',
       coalesce((select string_agg(proname, ', ' order by proname) from fns where proname not in (select name from expected)), 'none')
union all select '03 migration 001 applied (index idx_sent_emails_sent_at)',
       (exists (select 1 from pg_indexes where schemaname = 'public' and indexname = 'idx_sent_emails_sent_at'))::text
union all select '04 migration 002 applied (table task_progress)',
       (exists (select 1 from tbls where relname = 'task_progress'))::text
union all select '05 migration 003 applied (handle_user_updated + admin_account_overview)',
       (exists (select 1 from fns where proname = 'handle_user_updated') and exists (select 1 from fns where proname = 'admin_account_overview'))::text
union all select '06 migration 004 applied (reminders_unsubscribed_at + reminder_deliveries)',
       (exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'profiles' and column_name = 'reminders_unsubscribed_at')
        and exists (select 1 from tbls where relname = 'reminder_deliveries'))::text
union all select '07 migration 005 applied (deactivated_at, audit + deletion tables, is_account_active)',
       (exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'profiles' and column_name = 'deactivated_at')
        and exists (select 1 from tbls where relname = 'admin_audit_log') and exists (select 1 from tbls where relname = 'account_deletion_log')
        and exists (select 1 from fns where proname = 'is_account_active'))::text
union all select '08 migration 006 applied (entitlements + get_my_entitlement)',
       (exists (select 1 from tbls where relname = 'entitlements') and exists (select 1 from fns where proname = 'get_my_entitlement'))::text
union all select '09 migration 007 applied (overview uses the computed plan)',
       coalesce((select (pg_get_functiondef(oid) like '%entitlement_for%')::text from fns where proname = 'admin_account_overview'), 'function missing')
union all select '10 tables in public', coalesce((select string_agg(relname, ', ' order by relname) from tbls), 'none')
union all select '11 tables in public WITHOUT row level security (should be none)',
       coalesce((select string_agg(relname, ', ' order by relname) from tbls where not relrowsecurity), 'none')
union all select '12 definer functions in public that anon can execute (should be none)',
       coalesce((select string_agg(proname, ', ' order by proname) from fns where prosecdef and has_function_privilege('anon', oid, 'execute')), 'none')
union all select '13 real admin accounts (role = admin and not demo)',
       (select count(*) from public.profiles where role = 'admin' and not is_demo)::text
union all select '14 legacy Premium accounts (role = premium and not demo): review these before 006',
       (select count(*) from public.profiles where role = 'premium' and not is_demo)::text
union all select '15 demo-flagged profiles (old demo users; should be 0 if cleaned up)',
       (select count(*) from public.profiles where is_demo)::text
union all select '16 auth users / profiles / auth users with no profile',
       (select count(*) from auth.users)::text || ' / ' || (select count(*) from public.profiles)::text || ' / ' ||
       (select count(*) from auth.users u where not exists (select 1 from public.profiles p where p.id = u.id))::text
order by 1;
