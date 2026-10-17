-- GabayNegosyo v0.15 — keep public.profiles in sync with Supabase Auth (auth.users).
-- Run once in Supabase → SQL Editor → New query → Run. Safe to re-run.
--
-- Why: profiles were only created by the on_auth_user_created trigger. That left three gaps:
--   1. Accounts created before the trigger existed (or while it failed) have no profile row,
--      so they never show up in Admin → Users and cannot load a role.
--   2. A user with no email on their auth record (phone / some OAuth providers) made the trigger
--      insert NULL into a NOT NULL column, which can BLOCK that signup entirely.
--   3. Email / name changes in Auth never reached profiles.

-- ── 1. Make the signup trigger safe ──────────────────────────────────────
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, email, name)
  values (
    new.id,
    coalesce(new.email, ''),
    coalesce(new.raw_user_meta_data ->> 'name', new.raw_user_meta_data ->> 'full_name', '')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;
revoke execute on function public.handle_new_user() from public, anon, authenticated;

-- ── 2. Backfill every Auth user that has no profile yet ──────────────────
-- Role is always 'free'. Nobody is promoted by this script.
insert into public.profiles (id, email, name)
select u.id,
       coalesce(u.email, ''),
       coalesce(u.raw_user_meta_data ->> 'name', u.raw_user_meta_data ->> 'full_name', '')
from auth.users u
where not exists (select 1 from public.profiles p where p.id = u.id)
on conflict (id) do nothing;

-- ── 3. Carry email / name changes from Auth into profiles ────────────────
create or replace function public.handle_user_updated()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.profiles p
  set email = coalesce(new.email, p.email),
      name  = case
                when p.name = '' then coalesce(new.raw_user_meta_data ->> 'name', new.raw_user_meta_data ->> 'full_name', '')
                else p.name          -- never overwrite a name the user chose themselves
              end
  where p.id = new.id
    and (p.email is distinct from coalesce(new.email, p.email) or p.name = '');
  return new;
end;
$$;
revoke execute on function public.handle_user_updated() from public, anon, authenticated;

drop trigger if exists on_auth_user_updated on auth.users;
create trigger on_auth_user_updated
  after update of email, raw_user_meta_data on auth.users
  for each row execute function public.handle_user_updated();

-- ── 4. Admin-only overview + manual re-sync (used by Admin → Dashboard) ──
-- Both check public.is_admin() (real admins only; the shared demo admin does not count).
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
    (select count(*) from public.profiles where role = 'free'),
    (select count(*) from public.profiles where role = 'premium'),
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

create or replace function public.admin_sync_profiles()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  inserted integer;
begin
  if not public.is_admin() then
    raise exception 'Admins only' using errcode = '42501';
  end if;
  with ins as (
    insert into public.profiles (id, email, name)
    select u.id,
           coalesce(u.email, ''),
           coalesce(u.raw_user_meta_data ->> 'name', u.raw_user_meta_data ->> 'full_name', '')
    from auth.users u
    where not exists (select 1 from public.profiles p where p.id = u.id)
    on conflict (id) do nothing
    returning 1
  )
  select count(*) into inserted from ins;
  return inserted;
end;
$$;
revoke execute on function public.admin_sync_profiles() from public, anon;
grant  execute on function public.admin_sync_profiles() to authenticated;
