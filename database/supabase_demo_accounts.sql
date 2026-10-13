-- ⚠️ DEPRECATED in v0.13. Do NOT run this file for new setups.
-- Demo mode is now browser-only (lib/demoAccounts.ts): it creates no Supabase users or
-- profiles and needs no password. Nothing in the app signs in with these accounts anymore.
-- If you ALREADY created them, they are harmless but unused; delete those three users in
-- Supabase → Authentication → Users when convenient (this release deletes nothing for you).
-- Kept only so existing projects can see what was created.

-- GabayNegosyo — demo accounts (free / premium / admin)
-- Run in Supabase → SQL Editor AFTER you have created the 3 users in
-- Authentication → Users (see docs/SUPABASE_SETUP.md, "Demo accounts").
-- Idempotent: safe to run again. Also safe if you ran an older supabase_setup.sql
-- that did not have the is_demo column yet.

-- ── Part A: make sure the sandbox pieces exist ──────────────────────────
alter table public.profiles add column if not exists is_demo boolean not null default false;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.profiles
    where id = (select auth.uid()) and role = 'admin' and not is_demo
  );
$$;

-- ── Part B: mark the three users as demo accounts ───────────────────────
-- (the emails must match lib/demoAccounts.ts)
update public.profiles set role = 'free',    is_demo = true, name = 'Juana Dela Cruz'
  where email = 'free@demo.gabaynegosyo.ph';
update public.profiles set role = 'premium', is_demo = true, name = 'Marco Santos'
  where email = 'premium@demo.gabaynegosyo.ph';
update public.profiles set role = 'admin',   is_demo = true, name = 'GabayNegosyo Admin'
  where email = 'admin@demo.gabaynegosyo.ph';

-- Should return exactly 3 rows: free / premium / admin, all is_demo = true.
select email, name, role, is_demo from public.profiles where is_demo order by role;

-- ── Part C: RESET the demo accounts (run whenever you want a clean demo) ─
-- Wipes everything visitors did on the demo accounts and restores their roles.
-- Uncomment the block below and run it; leave it commented for the first setup.
--
-- do $$
-- declare demo_ids uuid[];
-- begin
--   select array_agg(id) into demo_ids from public.profiles where is_demo;
--   delete from public.business_profiles  where user_id = any(demo_ids);
--   delete from public.checklist_progress where user_id = any(demo_ids);
--   delete from public.reminder_configs   where user_id = any(demo_ids);
--   delete from public.sent_emails        where user_id = any(demo_ids);
--   update public.profiles set role = 'free'    where email = 'free@demo.gabaynegosyo.ph';
--   update public.profiles set role = 'premium' where email = 'premium@demo.gabaynegosyo.ph';
--   update public.profiles set role = 'admin'   where email = 'admin@demo.gabaynegosyo.ph';
-- end $$;
