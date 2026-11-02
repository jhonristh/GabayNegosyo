-- GabayNegosyo (Work Package 2, prepared after v0.17.1) — admin dashboard counts the COMPUTED plan, not profiles.role.
-- STATUS: PREPARED, NOT APPLIED. Run only after the owner approves, and only AFTER 001–006 (it calls entitlement_for from 006).
-- Safe to re-run: the function is replaced in place; no table, column, policy, grant or user data is touched.
--
-- Why: admin_account_overview() (003) counted role = 'free' / 'premium'. An account granted Premium by an admin keeps
-- role = 'free' (006 only stores the grant in public.entitlements), so the dashboard showed it as Free while the Users
-- page showed it as Premium. This version uses the same decision function as the Users page (entitlement_for), so both
-- screens agree. Output columns, their order and their types are unchanged, so the app needs no change.
--   premium_count : non-admin accounts whose computed plan is Premium (admin grant, subscription, or legacy role)
--   free_count    : non-admin accounts whose computed plan is not Premium (free, expired or cancelled)
--   admin_count   : role = 'admin' (unchanged)    demo_count: is_demo (unchanged; demo rows are ALSO counted above, as before)
-- Do NOT re-run 003 after this file: 003 recreates the old role-based version. If you ever do, run this file again.

create or replace function public.admin_account_overview()
returns table (
  total            bigint,
  free_count       bigint,
  premium_count    bigint,
  admin_count      bigint,
  demo_count       bigint,
  new_7d           bigint,
  auth_users       bigint,
  missing_profiles bigint,
  orphan_profiles  bigint
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not public.is_admin() then
    raise exception 'Admins only' using errcode = '42501';
  end if;
  return query
  select
    (select count(*) from public.profiles),
    (select count(*) from public.profiles p where p.role <> 'admin' and (select ef.status from public.entitlement_for(p.id) ef) <> 'premium'),
    (select count(*) from public.profiles p where p.role <> 'admin' and (select ef.status from public.entitlement_for(p.id) ef) = 'premium'),
    (select count(*) from public.profiles where role = 'admin'),
    (select count(*) from public.profiles where is_demo),
    (select count(*) from public.profiles where created_at >= now() - interval '7 days'),
    (select count(*) from auth.users),
    (select count(*) from auth.users u where not exists (select 1 from public.profiles p where p.id = u.id)),
    (select count(*) from public.profiles p where not exists (select 1 from auth.users u where u.id = p.id));
end;
$$;
revoke execute on function public.admin_account_overview() from public, anon;
grant  execute on function public.admin_account_overview() to authenticated;

-- ── Verification ─────────────────────────────────────────────────────────
-- As a REAL admin in the app (the SQL editor has no signed-in user, so is_admin() is false there):
--   select premium_count, free_count from public.admin_account_overview();
--   select max(total_count) from public.admin_user_directory(50, 0, 'premium', null);   -- must equal premium_count
--
-- Rollback (restores the 003 role-based counts; touches no data):
--   re-run the `create or replace function public.admin_account_overview()` block from 003_sync_profiles.sql.
