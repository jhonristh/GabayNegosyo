-- GabayNegosyo v0.17 — account lifecycle, audit log and deletion record.
-- Run in Supabase → SQL Editor → New query → Run, AFTER 001–004. Safe to re-run.
-- Run order: 005 first, then 006_entitlements.sql (006 writes to the audit log created here).
-- Re-running this file after an earlier run is safe: every statement is idempotent, and functions are replaced in place.
-- Nothing here deletes or rewrites existing user data.

-- ── 1. Deactivation columns ──────────────────────────────────────────────
-- deactivated_at   : set while the account is deactivated (NULL = active).
-- deactivated_by   : NULL when the user deactivated themselves; the admin's id when an admin did (informational only).
-- Users cannot write these columns directly: profiles only grants UPDATE(name) to `authenticated`.
-- Existing SELECT grants cover the new columns, so the app can read its own status.
alter table public.profiles add column if not exists deactivated_at timestamptz;
alter table public.profiles add column if not exists deactivated_by uuid references auth.users (id) on delete set null;
-- deactivated_by_admin records THAT an admin imposed the deactivation, independently of which admin it was.
-- (deactivated_by is cleared if that admin's account is later deleted; this flag is not.) It, not deactivated_by,
-- decides whether the user may reactivate themselves.
alter table public.profiles add column if not exists deactivated_by_admin boolean not null default false;
-- One-time, additive backfill for any deactivation recorded before this column existed. Touches only deactivated rows.
update public.profiles set deactivated_by_admin = true
 where deactivated_at is not null and deactivated_by is not null and not deactivated_by_admin;

-- ── 2. Admin audit log ───────────────────────────────────────────────────
-- Written ONLY by the SECURITY DEFINER functions below. Real admins can read it; nobody can write it directly.
-- Foreign keys use ON DELETE SET NULL so deleting an account removes the link to that person.
create table if not exists public.admin_audit_log (
  id             uuid primary key default gen_random_uuid(),
  actor_id       uuid references auth.users (id) on delete set null,
  action         text not null,
  target_user_id uuid references auth.users (id) on delete set null,
  details        jsonb not null default '{}'::jsonb,
  created_at     timestamptz not null default now()
);
create index if not exists idx_admin_audit_log_created on public.admin_audit_log (created_at desc);
create index if not exists idx_admin_audit_log_target on public.admin_audit_log (target_user_id);

alter table public.admin_audit_log enable row level security;
drop policy if exists "admin_audit_log: admins read" on public.admin_audit_log;
create policy "admin_audit_log: admins read"
  on public.admin_audit_log for select to authenticated
  using (public.is_admin());
revoke all on public.admin_audit_log from anon, authenticated;
grant select on public.admin_audit_log to authenticated;

-- Internal helper. Not executable by any API role; only the definer functions in this file call it.
create or replace function public.log_admin_action(p_actor uuid, p_action text, p_target uuid, p_details jsonb)
returns void
language sql
security definer
set search_path = ''
as $$
  insert into public.admin_audit_log (actor_id, action, target_user_id, details)
  values (p_actor, p_action, p_target, coalesce(p_details, '{}'::jsonb));
$$;
revoke execute on function public.log_admin_action(uuid, text, uuid, jsonb) from public, anon, authenticated;

-- ── 3. Minimal deletion record (retained at most 30 days) ────────────────
-- Stores NO email, name, password, token or business data. user_ref is a SHA-256 of the account id
-- (computed by the server), kept only so a "was my account really deleted?" support question can be
-- answered. Only the server (service role) writes it; no API role can read it.
create table if not exists public.account_deletion_log (
  id            uuid primary key default gen_random_uuid(),
  user_ref      text not null,
  role_at_delete text not null,
  method        text not null default 'self_service',
  deleted_at    timestamptz not null default now(),
  purge_after   timestamptz not null default (now() + interval '30 days')
);
create index if not exists idx_account_deletion_log_purge on public.account_deletion_log (purge_after);
alter table public.account_deletion_log enable row level security;
revoke all on public.account_deletion_log from anon, authenticated;

-- Removes rows older than 30 days. Run manually, or schedule it yourself (pg_cron) — this file schedules nothing.
-- Callable by a real admin (or by the service role / SQL editor).
create or replace function public.purge_expired_deletion_log()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare n integer;
begin
  if (select auth.uid()) is not null and not public.is_admin() then
    raise exception 'Admins only' using errcode = '42501';
  end if;
  with d as (delete from public.account_deletion_log where purge_after <= now() returning 1)
  select count(*) into n from d;
  return n;
end;
$$;
revoke execute on function public.purge_expired_deletion_log() from public, anon;
grant  execute on function public.purge_expired_deletion_log() to authenticated;

-- ── 4. Is the caller's account active? ───────────────────────────────────
create or replace function public.is_account_active()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select not exists (
    select 1 from public.profiles
    where id = (select auth.uid()) and deactivated_at is not null
  );
$$;
revoke execute on function public.is_account_active() from public, anon;
grant  execute on function public.is_account_active() to authenticated;

-- RESTRICTIVE policies are AND-ed with the existing owner-only policies, so a deactivated account
-- loses read/write access to its own data without weakening anything else. The profiles table is
-- deliberately NOT restricted: the app must still read the profile to show the reactivation screen.
do $$
declare t text;
begin
  foreach t in array array['business_profiles','checklist_progress','task_progress','reminder_configs','sent_emails']
  loop
    execute format('drop policy if exists "active account only" on public.%I', t);
    execute format(
      'create policy "active account only" on public.%I as restrictive for all to authenticated using (public.is_account_active()) with check (public.is_account_active())',
      t);
  end loop;
end $$;

-- A deactivated account also cannot edit its own profile row (e.g. its name). Reading stays allowed so the app can show
-- the reactivation screen. The reactivate/deactivate functions below are SECURITY DEFINER, so they are not blocked.
drop policy if exists "profiles: active account only (update)" on public.profiles;
create policy "profiles: active account only (update)"
  on public.profiles as restrictive for update to authenticated
  using (public.is_account_active()) with check (public.is_account_active());

-- ── 5. Self-service deactivate / reactivate ──────────────────────────────
create or replace function public.deactivate_my_account()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare r text; d boolean;
begin
  select role, is_demo into r, d from public.profiles where id = (select auth.uid());
  if not found then raise exception 'No profile for this account' using errcode = 'P0002'; end if;
  if r = 'admin' then raise exception 'Admin accounts cannot be deactivated here' using errcode = '42501'; end if;
  if coalesce(d, false) then raise exception 'Demo accounts cannot be deactivated' using errcode = '42501'; end if;
  update public.profiles
     set deactivated_at = now(), deactivated_by = null, deactivated_by_admin = false
   where id = (select auth.uid()) and deactivated_at is null;
end;
$$;
revoke execute on function public.deactivate_my_account() from public, anon;
grant  execute on function public.deactivate_my_account() to authenticated;

-- Reactivation requires a signed-in session (the person must log in first), so it never bypasses authentication.
-- An admin-imposed deactivation can only be lifted by an admin.
create or replace function public.reactivate_my_account()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare by_admin boolean; was_deactivated timestamptz;
begin
  select deactivated_at, deactivated_by_admin into was_deactivated, by_admin
    from public.profiles where id = (select auth.uid());
  if not found then raise exception 'No profile for this account' using errcode = 'P0002'; end if;
  if was_deactivated is null then return; end if;
  if by_admin then
    raise exception 'This account was deactivated by an administrator' using errcode = '42501';
  end if;
  update public.profiles set deactivated_at = null, deactivated_by = null, deactivated_by_admin = false where id = (select auth.uid());
end;
$$;
revoke execute on function public.reactivate_my_account() from public, anon;
grant  execute on function public.reactivate_my_account() to authenticated;

-- ── 6. Admin: deactivate / reactivate someone else (audited) ─────────────
create or replace function public.admin_set_account_status(p_target uuid, p_deactivate boolean, p_reason text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare me uuid := (select auth.uid()); trole text; tdemo boolean;
begin
  if not public.is_admin() then raise exception 'Admins only' using errcode = '42501'; end if;
  if p_reason is null or char_length(btrim(p_reason)) < 3 or char_length(p_reason) > 300 then
    raise exception 'A reason of 3–300 characters is required' using errcode = '22023';
  end if;
  if p_target = me then raise exception 'You cannot change your own account status here' using errcode = '42501'; end if;
  select role, is_demo into trole, tdemo from public.profiles where id = p_target;
  if not found then raise exception 'Account not found' using errcode = 'P0002'; end if;
  if trole = 'admin' then raise exception 'Admin accounts cannot be deactivated here' using errcode = '42501'; end if;
  if coalesce(tdemo, false) then raise exception 'Demo accounts cannot be deactivated' using errcode = '42501'; end if;

  if p_deactivate then
    update public.profiles set deactivated_at = now(), deactivated_by = me, deactivated_by_admin = true where id = p_target;
  else
    update public.profiles set deactivated_at = null, deactivated_by = null, deactivated_by_admin = false where id = p_target;
  end if;
  perform public.log_admin_action(me, case when p_deactivate then 'deactivate_account' else 'reactivate_account' end,
                                  p_target, jsonb_build_object('reason', btrim(p_reason)));
end;
$$;
revoke execute on function public.admin_set_account_status(uuid, boolean, text) from public, anon;
grant  execute on function public.admin_set_account_status(uuid, boolean, text) to authenticated;

-- Existing admin sync is now audited as well (same behaviour, plus a log row).
create or replace function public.admin_sync_profiles()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare inserted integer;
begin
  if not public.is_admin() then raise exception 'Admins only' using errcode = '42501'; end if;
  with ins as (
    insert into public.profiles (id, email, name)
    select u.id, coalesce(u.email, ''),
           coalesce(u.raw_user_meta_data ->> 'name', u.raw_user_meta_data ->> 'full_name', '')
    from auth.users u
    where not exists (select 1 from public.profiles p where p.id = u.id)
    on conflict (id) do nothing
    returning 1
  )
  select count(*) into inserted from ins;
  perform public.log_admin_action((select auth.uid()), 'sync_profiles', null, jsonb_build_object('created', inserted));
  return inserted;
end;
$$;
revoke execute on function public.admin_sync_profiles() from public, anon;
grant  execute on function public.admin_sync_profiles() to authenticated;

-- ── Verification (run after the migration) ───────────────────────────────
-- 1) columns:    select column_name from information_schema.columns where table_schema='public' and table_name='profiles' and column_name like 'deactivated%';   -- 3 rows
-- 2) policies:   select tablename, policyname, permissive from pg_policies where policyname like '%active account only%';                                           -- 6 rows, RESTRICTIVE
-- 3) log tables: select count(*) from public.admin_audit_log; select count(*) from public.account_deletion_log;                                                    -- run as postgres
-- 4) as a normal signed-in user: select public.deactivate_my_account(); select public.reactivate_my_account();  -- use a TEST account only
--
-- Rollback (does not touch user data):
--   drop policy if exists "active account only" on public.business_profiles;  (repeat for checklist_progress, task_progress, reminder_configs, sent_emails)
--   drop policy if exists "profiles: active account only (update)" on public.profiles;
--   drop function if exists public.deactivate_my_account(), public.reactivate_my_account(), public.admin_set_account_status(uuid, boolean, text), public.is_account_active();
--   -- keep admin_audit_log / account_deletion_log unless you intend to discard the audit trail.
