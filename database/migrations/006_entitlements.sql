-- GabayNegosyo v0.17 — Premium entitlements (admin-granted now, payment-ready later).
-- Run AFTER 005_account_lifecycle.sql. Safe to re-run.
--
-- Separation of concerns:
--   account      : auth.users + public.profiles (identity, role = free | premium | admin)
--   entitlement  : public.entitlements (WHO has Premium, from WHEN, until WHEN, WHY, granted by WHOM)
--   subscription / payment transaction : NOT created. When a payment provider is chosen, add its own
--                  tables and have the provider webhook insert an entitlement with source = 'subscription'
--                  and source_ref = the provider's subscription id. Nothing here needs rewriting.
-- No payment provider, credentials or transactions are invented by this file.

create table if not exists public.entitlements (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users (id) on delete cascade,
  source        text not null check (source in ('admin_grant', 'subscription')),
  source_ref    text,
  starts_at     timestamptz not null default now(),
  expires_at    timestamptz,
  granted_by    uuid references auth.users (id) on delete set null,
  grant_reason  text not null check (char_length(btrim(grant_reason)) between 3 and 300),
  revoked_at    timestamptz,
  revoked_by    uuid references auth.users (id) on delete set null,
  revoke_reason text,
  created_at    timestamptz not null default now(),
  check (expires_at is null or expires_at > starts_at)
);
create index if not exists idx_entitlements_user on public.entitlements (user_id, created_at desc);

alter table public.entitlements enable row level security;
drop policy if exists "entitlements: read own, admins read all" on public.entitlements;
create policy "entitlements: read own, admins read all"
  on public.entitlements for select to authenticated
  using (user_id = (select auth.uid()) or public.is_admin());
-- No insert/update/delete grants: writes happen only inside the audited functions below.
revoke all on public.entitlements from anon, authenticated;
grant select on public.entitlements to authenticated;

-- Internal: the ONE place that decides a user's plan. Server-side only; not executable by API roles.
-- Order: real admin role → active admin-granted/subscription entitlement → legacy role='premium' → expired/cancelled/free.
create or replace function public.entitlement_for(p_user uuid)
returns table (status text, source text, expires_at timestamptz)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare prole text; pdemo boolean; ent record;
begin
  select role, is_demo into prole, pdemo from public.profiles where id = p_user;
  if prole = 'admin' and not coalesce(pdemo, false) then
    return query select 'premium'::text, 'admin_role'::text, null::timestamptz; return;
  end if;

  select e.* into ent from public.entitlements e
   where e.user_id = p_user and e.revoked_at is null and e.starts_at <= now()
     and (e.expires_at is null or e.expires_at > now())
   order by (e.expires_at is null) desc, e.expires_at desc limit 1;
  if found then
    return query select 'premium'::text, ent.source, ent.expires_at; return;
  end if;

  -- Accounts upgraded before entitlements existed (profiles.role = 'premium') keep access until an admin reviews or revokes them.
  if prole = 'premium' then
    return query select 'premium'::text, 'legacy_role'::text, null::timestamptz; return;
  end if;

  select e.* into ent from public.entitlements e where e.user_id = p_user order by e.created_at desc limit 1;
  if found then
    if ent.revoked_at is not null then
      return query select 'cancelled'::text, ent.source, null::timestamptz;
    else
      return query select 'expired'::text, ent.source, ent.expires_at;
    end if;
    return;
  end if;
  return query select 'free'::text, 'none'::text, null::timestamptz;
end;
$$;
revoke execute on function public.entitlement_for(uuid) from public, anon, authenticated;

-- The signed-in user's own plan, computed on the server from the database (never from client-editable data).
create or replace function public.get_my_entitlement()
returns table (status text, source text, expires_at timestamptz, deactivated_at timestamptz)
language sql
stable
security definer
set search_path = ''
as $$
  select ef.status, ef.source, ef.expires_at, p.deactivated_at
    from public.entitlement_for((select auth.uid())) ef
    left join public.profiles p on p.id = (select auth.uid());
$$;
revoke execute on function public.get_my_entitlement() from public, anon;
grant  execute on function public.get_my_entitlement() to authenticated;

-- Admin: grant Premium (optionally until a date). Audited.
create or replace function public.admin_grant_premium(p_target uuid, p_expires timestamptz, p_reason text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare me uuid := (select auth.uid()); trole text; tdemo boolean; new_id uuid;
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

  insert into public.entitlements (user_id, source, expires_at, granted_by, grant_reason)
  values (p_target, 'admin_grant', p_expires, me, btrim(p_reason))
  returning id into new_id;
  perform public.log_admin_action(me, 'grant_premium', p_target,
          jsonb_build_object('expires_at', p_expires, 'reason', btrim(p_reason), 'entitlement_id', new_id));
  return new_id;
end;
$$;
revoke execute on function public.admin_grant_premium(uuid, timestamptz, text) from public, anon;
grant  execute on function public.admin_grant_premium(uuid, timestamptz, text) to authenticated;

-- Admin: revoke Premium. Ends active entitlements and clears a legacy role='premium'. Audited.
create or replace function public.admin_revoke_premium(p_target uuid, p_reason text)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare me uuid := (select auth.uid()); trole text; ended integer := 0; legacy integer := 0;
begin
  if not public.is_admin() then raise exception 'Admins only' using errcode = '42501'; end if;
  if p_reason is null or char_length(btrim(p_reason)) < 3 or char_length(p_reason) > 300 then
    raise exception 'A reason of 3–300 characters is required' using errcode = '22023';
  end if;
  select role into trole from public.profiles where id = p_target;
  if not found then raise exception 'Account not found' using errcode = 'P0002'; end if;
  if trole = 'admin' then raise exception 'Admin access is changed in the database, not here' using errcode = '42501'; end if;

  with u as (
    update public.entitlements set revoked_at = now(), revoked_by = me, revoke_reason = btrim(p_reason)
     where user_id = p_target and revoked_at is null returning 1
  ) select count(*) into ended from u;
  if trole = 'premium' then
    update public.profiles set role = 'free' where id = p_target;
    legacy := 1;
  end if;
  if ended + legacy = 0 then raise exception 'This account has no Premium access to revoke' using errcode = 'P0002'; end if;

  perform public.log_admin_action(me, 'revoke_premium', p_target,
          jsonb_build_object('reason', btrim(p_reason), 'entitlements_ended', ended, 'legacy_role_cleared', legacy = 1));
  return ended + legacy;
end;
$$;
revoke execute on function public.admin_revoke_premium(uuid, text) from public, anon;
grant  execute on function public.admin_revoke_premium(uuid, text) to authenticated;

-- Admin: one page of the user directory with plan and status. Real admins only; bounded page size.
create or replace function public.admin_user_directory(p_limit integer, p_offset integer, p_role text, p_search text)
returns table (
  id uuid, email text, name text, role text, is_demo boolean, created_at timestamptz,
  deactivated_at timestamptz, plan_status text, plan_source text, plan_expires_at timestamptz, total_count bigint
)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare lim integer := least(greatest(coalesce(p_limit, 20), 1), 50);
        off integer := greatest(coalesce(p_offset, 0), 0);
        needle text := lower(btrim(coalesce(p_search, '')));
begin
  if not public.is_admin() then raise exception 'Admins only' using errcode = '42501'; end if;
  if p_role is not null and p_role not in ('free', 'premium', 'admin') then
    raise exception 'Unknown role filter' using errcode = '22023';
  end if;
  return query
  with base as (
    select p.* from public.profiles p
     where (p_role is null or p.role = p_role)
       and (needle = '' or position(needle in lower(p.email)) > 0 or position(needle in lower(p.name)) > 0)
  )
  select b.id, b.email, b.name, b.role, b.is_demo, b.created_at, b.deactivated_at,
         ef.status, ef.source, ef.expires_at, (select count(*) from base)
    from base b
    cross join lateral public.entitlement_for(b.id) ef
   order by b.created_at desc
   limit lim offset off;
end;
$$;
revoke execute on function public.admin_user_directory(integer, integer, text, text) from public, anon;
grant  execute on function public.admin_user_directory(integer, integer, text, text) to authenticated;

-- Admin: audit log page with readable emails.
create or replace function public.admin_list_audit_log(p_limit integer, p_offset integer)
returns table (id uuid, created_at timestamptz, action text, actor_email text, target_email text, details jsonb)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not public.is_admin() then raise exception 'Admins only' using errcode = '42501'; end if;
  return query
  select l.id, l.created_at, l.action, a.email, t.email, l.details
    from public.admin_audit_log l
    left join public.profiles a on a.id = l.actor_id
    left join public.profiles t on t.id = l.target_user_id
   order by l.created_at desc
   limit least(greatest(coalesce(p_limit, 25), 1), 100) offset greatest(coalesce(p_offset, 0), 0);
end;
$$;
revoke execute on function public.admin_list_audit_log(integer, integer) from public, anon;
grant  execute on function public.admin_list_audit_log(integer, integer) to authenticated;

-- Remove the self-service demo upgrade: no ordinary user can promote their own account any more.
-- (Deploy the v0.17 app first or at the same time; the old app's "Upgrade now (demo)" button will simply report failure.)
drop function if exists public.upgrade_to_premium_demo();

-- ── Verification ─────────────────────────────────────────────────────────
-- 1) select count(*) from pg_proc where proname = 'upgrade_to_premium_demo';                    -- 0
-- 2) As a normal user:  select * from public.get_my_entitlement();                              -- one row, status free/premium/…
-- 3) As a normal user:  select public.admin_grant_premium('<any uuid>', null, 'test');           -- ERROR: Admins only
-- 4) As the real admin: select public.admin_grant_premium('<TEST user uuid>', now() + interval '7 days', 'QA test');
--                       select * from public.admin_list_audit_log(10, 0);                       -- shows grant_premium
-- 5) Review legacy Premium:  select email, role from public.profiles where role = 'premium' and not is_demo;
--
-- Rollback: drop the functions above and `drop table public.entitlements;` (this removes grants, not accounts).
-- The dropped upgrade_to_premium_demo() is intentionally not restored.
