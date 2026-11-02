-- GabayNegosyo — migration 008: tamper-resistant audit log and status-change detail (Work Package 3).
-- STATUS: PREPARED, NOT APPLIED to any database. Not executed in the session that wrote it (no PostgreSQL was available).
-- Run in Supabase → SQL Editor → New query → Run, AFTER 005 and 006 (007 is independent). Written to be safe to re-run.
--
-- What it does
--   1. admin_audit_log gets two real columns: `reason` (required for every new row) and `target_ref` (a SHA-256 of the target
--      account id, the same scheme account_deletion_log uses). target_ref lets an admin still tell WHICH account an old
--      row was about after that account was deleted (target_user_id becomes NULL by design), without keeping an email or name.
--   2. The audit log can no longer be changed or erased: UPDATE and DELETE are refused, and so is TRUNCATE, for every role.
--      The ONE allowed UPDATE is the automatic "set actor_id / target_user_id to NULL" that happens when an account is deleted.
--      INSERT / UPDATE / DELETE / TRUNCATE are also revoked from service_role (it keeps SELECT).
--   3. The four admin functions that change an account now record the status BEFORE and AFTER (details.before / details.after),
--      next to the reason. admin_sync_profiles records a fixed reason (it has no free-text field).
--   4. admin_revoke_premium only ends grants that are still active (finding DB-12): an already-expired grant is no longer
--      relabelled "cancelled" and the count it logs is accurate.
--
-- WARNING (same family as DB-10): this file REPLACES functions that 005 and 006 define
--   (admin_set_account_status, admin_sync_profiles, admin_grant_premium, admin_revoke_premium, log_admin_action).
--   Do NOT re-run 003, 005 or 006 after applying 008: that would silently put the old versions back. If it happens,
--   re-run this file. Output columns and parameters of every function are unchanged, so the app needs no change for them.
-- A database OWNER (postgres / supabase_admin) can still drop the triggers below; no SQL file can protect a table from its owner.
-- Nothing here deletes or rewrites existing user data.

-- ── 1. Columns ───────────────────────────────────────────────────────────
alter table public.admin_audit_log add column if not exists reason text;
alter table public.admin_audit_log add column if not exists target_ref text;

-- ── 2. Remove the guard triggers first, so the backfill below (and any re-run of this file) is possible ──
drop trigger if exists admin_audit_log_no_update_delete on public.admin_audit_log;
drop trigger if exists admin_audit_log_no_truncate on public.admin_audit_log;

-- Backfill from the data that is already there. Only rows that lack the new values are touched.
update public.admin_audit_log
   set reason = btrim(details ->> 'reason')
 where reason is null and nullif(btrim(details ->> 'reason'), '') is not null;
update public.admin_audit_log
   set reason = 'Manual profile synchronization (no free-text reason is asked for this action)'
 where reason is null and action = 'sync_profiles';
update public.admin_audit_log
   set target_ref = encode(sha256(convert_to(target_user_id::text, 'UTF8')), 'hex')
 where target_ref is null and target_user_id is not null;

-- Every NEW row must carry a reason of 3-300 characters. NOT VALID = existing rows are not re-checked, new rows are.
do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'admin_audit_log_reason_present' and conrelid = 'public.admin_audit_log'::regclass) then
    alter table public.admin_audit_log
      add constraint admin_audit_log_reason_present
      check (reason is not null and char_length(btrim(reason)) between 3 and 300) not valid;
  end if;
end $$;

-- ── 3. The one place that writes an audit row (same signature as before; still not callable by any API role) ──
create or replace function public.log_admin_action(p_actor uuid, p_action text, p_target uuid, p_details jsonb)
returns void
language sql
security definer
set search_path = ''
as $$
  insert into public.admin_audit_log (actor_id, action, target_user_id, details, reason, target_ref)
  values (p_actor, p_action, p_target, coalesce(p_details, '{}'::jsonb),
          btrim(p_details ->> 'reason'),
          case when p_target is null then null else encode(sha256(convert_to(p_target::text, 'UTF8')), 'hex') end);
$$;
revoke execute on function public.log_admin_action(uuid, text, uuid, jsonb) from public, anon, authenticated;

-- ── 4. Make the audit log append-only ────────────────────────────────────
create or replace function public.admin_audit_log_guard()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  -- The only change ever allowed: the foreign keys being set to NULL because the linked account was deleted.
  if tg_op = 'UPDATE'
     and new.id is not distinct from old.id
     and new.action is not distinct from old.action
     and new.details is not distinct from old.details
     and new.created_at is not distinct from old.created_at
     and new.reason is not distinct from old.reason
     and new.target_ref is not distinct from old.target_ref
     and (new.actor_id is null or new.actor_id is not distinct from old.actor_id)
     and (new.target_user_id is null or new.target_user_id is not distinct from old.target_user_id)
  then
    return new;
  end if;
  raise exception 'The audit log cannot be changed' using errcode = '42501';
end;
$$;
revoke execute on function public.admin_audit_log_guard() from public, anon, authenticated;

create trigger admin_audit_log_no_update_delete
  before update or delete on public.admin_audit_log
  for each row execute function public.admin_audit_log_guard();
create trigger admin_audit_log_no_truncate
  before truncate on public.admin_audit_log
  for each statement execute function public.admin_audit_log_guard();

-- Table privileges: read for signed-in users (RLS limits that to real admins); nothing else for any API role.
revoke all on public.admin_audit_log from anon, authenticated;
grant select on public.admin_audit_log to authenticated;
do $$
begin
  if exists (select 1 from pg_roles where rolname = 'service_role') then
    revoke insert, update, delete, truncate on public.admin_audit_log from service_role;
  end if;
end $$;

-- ── 5. Admin: deactivate / reactivate someone else — now records the status before and after ──
create or replace function public.admin_set_account_status(p_target uuid, p_deactivate boolean, p_reason text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare me uuid := (select auth.uid()); trole text; tdemo boolean;
        was_deactivated boolean; was_by_admin boolean; now_deactivated boolean; now_by_admin boolean;
begin
  if not public.is_admin() then raise exception 'Admins only' using errcode = '42501'; end if;
  if p_reason is null or char_length(btrim(p_reason)) < 3 or char_length(p_reason) > 300 then
    raise exception 'A reason of 3–300 characters is required' using errcode = '22023';
  end if;
  if p_target = me then raise exception 'You cannot change your own account status here' using errcode = '42501'; end if;
  select role, is_demo, deactivated_at is not null, deactivated_by_admin
    into trole, tdemo, was_deactivated, was_by_admin
    from public.profiles where id = p_target;
  if not found then raise exception 'Account not found' using errcode = 'P0002'; end if;
  if trole = 'admin' then raise exception 'Admin accounts cannot be deactivated here' using errcode = '42501'; end if;
  if coalesce(tdemo, false) then raise exception 'Demo accounts cannot be deactivated' using errcode = '42501'; end if;

  if p_deactivate then
    update public.profiles set deactivated_at = now(), deactivated_by = me, deactivated_by_admin = true where id = p_target;
  else
    update public.profiles set deactivated_at = null, deactivated_by = null, deactivated_by_admin = false where id = p_target;
  end if;

  select deactivated_at is not null, deactivated_by_admin into now_deactivated, now_by_admin from public.profiles where id = p_target;
  perform public.log_admin_action(me, case when p_deactivate then 'deactivate_account' else 'reactivate_account' end, p_target,
          jsonb_build_object('reason', btrim(p_reason),
                             'before', jsonb_build_object('deactivated', was_deactivated, 'deactivated_by_admin', was_by_admin),
                             'after',  jsonb_build_object('deactivated', now_deactivated, 'deactivated_by_admin', now_by_admin)));
end;
$$;
revoke execute on function public.admin_set_account_status(uuid, boolean, text) from public, anon;
grant  execute on function public.admin_set_account_status(uuid, boolean, text) to authenticated;

-- ── 6. Admin: profile sync — records a fixed reason ──────────────────────
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
  perform public.log_admin_action((select auth.uid()), 'sync_profiles', null,
          jsonb_build_object('created', inserted, 'reason', 'Manual profile synchronization requested by an administrator'));
  return inserted;
end;
$$;
revoke execute on function public.admin_sync_profiles() from public, anon;
grant  execute on function public.admin_sync_profiles() to authenticated;

-- ── 7. Admin: grant Premium — now records the plan before and after ──────
create or replace function public.admin_grant_premium(p_target uuid, p_expires timestamptz, p_reason text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare me uuid := (select auth.uid()); trole text; tdemo boolean; new_id uuid;
        b_status text; b_source text; b_expires timestamptz; a_status text; a_source text; a_expires timestamptz;
begin
  if not public.is_admin() then raise exception 'Admins only' using errcode = '42501'; end if;
  if p_reason is null or char_length(btrim(p_reason)) < 3 or char_length(p_reason) > 300 then
    raise exception 'A reason of 3–300 characters is required' using errcode = '22023';
  end if;
  if p_expires is not null and p_expires <= now() then
    raise exception 'The expiry must be in the future' using errcode = '22023';
  end if;
  select role, is_demo into trole, tdemo from public.profiles where id = p_target;
  if not found then raise exception 'Account not found' using errcode = 'P0002'; end if;
  if trole = 'admin' then raise exception 'Admins already have full access' using errcode = '22023'; end if;
  if tdemo then raise exception 'Demo accounts do not use entitlements' using errcode = '22023'; end if;

  select ef.status, ef.source, ef.expires_at into b_status, b_source, b_expires from public.entitlement_for(p_target) ef;

  insert into public.entitlements (user_id, source, expires_at, granted_by, grant_reason)
  values (p_target, 'admin_grant', p_expires, me, btrim(p_reason))
  returning id into new_id;
  -- Move a legacy role='premium' account fully into the entitlement system so its expiry is honoured.
  if trole = 'premium' then
    update public.profiles set role = 'free' where id = p_target;
  end if;

  select ef.status, ef.source, ef.expires_at into a_status, a_source, a_expires from public.entitlement_for(p_target) ef;
  perform public.log_admin_action(me, 'grant_premium', p_target,
          jsonb_build_object('expires_at', p_expires, 'reason', btrim(p_reason), 'entitlement_id', new_id,
                             'legacy_role_migrated', trole = 'premium',
                             'before', jsonb_build_object('plan_status', b_status, 'plan_source', b_source, 'plan_expires_at', b_expires),
                             'after',  jsonb_build_object('plan_status', a_status, 'plan_source', a_source, 'plan_expires_at', a_expires)));
  return new_id;
end;
$$;
revoke execute on function public.admin_grant_premium(uuid, timestamptz, text) from public, anon;
grant  execute on function public.admin_grant_premium(uuid, timestamptz, text) to authenticated;

-- ── 8. Admin: revoke Premium — records the plan before and after; ends only grants that are still active ──
create or replace function public.admin_revoke_premium(p_target uuid, p_reason text)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare me uuid := (select auth.uid()); trole text; ended integer := 0; legacy integer := 0;
        b_status text; b_source text; b_expires timestamptz; a_status text; a_source text; a_expires timestamptz;
begin
  if not public.is_admin() then raise exception 'Admins only' using errcode = '42501'; end if;
  if p_reason is null or char_length(btrim(p_reason)) < 3 or char_length(p_reason) > 300 then
    raise exception 'A reason of 3–300 characters is required' using errcode = '22023';
  end if;
  select role into trole from public.profiles where id = p_target;
  if not found then raise exception 'Account not found' using errcode = 'P0002'; end if;
  if trole = 'admin' then raise exception 'Admin access is changed in the database, not here' using errcode = '42501'; end if;

  select ef.status, ef.source, ef.expires_at into b_status, b_source, b_expires from public.entitlement_for(p_target) ef;

  with u as (
    update public.entitlements set revoked_at = now(), revoked_by = me, revoke_reason = btrim(p_reason)
     where user_id = p_target and revoked_at is null and (expires_at is null or expires_at > now()) returning 1
  ) select count(*) into ended from u;
  if trole = 'premium' then
    update public.profiles set role = 'free' where id = p_target;
    legacy := 1;
  end if;
  if ended + legacy = 0 then raise exception 'This account has no Premium access to revoke' using errcode = 'P0002'; end if;

  select ef.status, ef.source, ef.expires_at into a_status, a_source, a_expires from public.entitlement_for(p_target) ef;
  perform public.log_admin_action(me, 'revoke_premium', p_target,
          jsonb_build_object('reason', btrim(p_reason), 'entitlements_ended', ended, 'legacy_role_cleared', legacy = 1,
                             'before', jsonb_build_object('plan_status', b_status, 'plan_source', b_source, 'plan_expires_at', b_expires),
                             'after',  jsonb_build_object('plan_status', a_status, 'plan_source', a_source, 'plan_expires_at', a_expires)));
  return ended + legacy;
end;
$$;
revoke execute on function public.admin_revoke_premium(uuid, text) from public, anon;
grant  execute on function public.admin_revoke_premium(uuid, text) to authenticated;

-- ── Verification (run after the migration; SQL editor = no signed-in user, so these only check the OBJECTS) ──
-- 1) columns:   select column_name from information_schema.columns where table_schema='public' and table_name='admin_audit_log' and column_name in ('reason','target_ref');   -- 2 rows
-- 2) triggers:  select tgname from pg_trigger where tgrelid='public.admin_audit_log'::regclass and not tgisinternal order by 1;     -- admin_audit_log_no_truncate, admin_audit_log_no_update_delete
-- 3) append-only (as postgres):  update public.admin_audit_log set action='x';  -- ERROR: The audit log cannot be changed   (run it in a transaction you ROLL BACK, or on a rehearsal copy)
-- 4) service role: select has_table_privilege('service_role','public.admin_audit_log','UPDATE');   -- false
-- Behaviour as a real admin (grant / revoke / deactivate show details.before and details.after in Admin → Audit log) needs the manual tests in docs/ACCOUNT_LIFECYCLE_QA.md.
--
-- Rollback (does not touch accounts or user data):
--   drop trigger if exists admin_audit_log_no_update_delete on public.admin_audit_log;
--   drop trigger if exists admin_audit_log_no_truncate on public.admin_audit_log;
--   drop function if exists public.admin_audit_log_guard();
--   alter table public.admin_audit_log drop constraint if exists admin_audit_log_reason_present;
--   -- then re-run 005 and 006 to restore the previous versions of the five functions above (and 004-006 order rules apply).
--   -- The columns `reason` and `target_ref` can stay; nothing reads them except the audit screens.
