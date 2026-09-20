-- GabayNegosyo — Supabase setup (Stage 1: auth + per-user data)
-- Paste this whole file into Supabase → SQL Editor → New query → Run.
-- Safe to run once on a fresh project. Do NOT also run the old database/schema.sql
-- (it creates a separate `users` table that is not linked to Supabase Auth and has no security rules).

-- ════════════════════════════════════════════════════════════════════════
-- 1. profiles — one row per signed-up user (linked 1:1 to Supabase's auth.users)
-- ════════════════════════════════════════════════════════════════════════
create table public.profiles (
  id         uuid primary key references auth.users (id) on delete cascade,
  email      text not null,
  name       text not null default '',
  role       text not null default 'free' check (role in ('free', 'premium', 'admin')),
  is_demo    boolean not null default false,  -- true only for the shared public demo accounts
  created_at timestamptz not null default now()
);

-- Helper used by security rules: "is the person making this request a REAL admin?"
-- The shared demo admin (is_demo = true) deliberately does NOT count: its password is public,
-- so it must never get "read everything" powers. It only sees its own rows like any other user.
-- SECURITY DEFINER lets it read profiles without triggering the profiles rules again (avoids recursion).
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
revoke execute on function public.is_admin() from public, anon;
grant  execute on function public.is_admin() to authenticated;

-- Auto-create a profile whenever someone signs up (email OR Google).
-- Role is ALWAYS 'free' here — it is never read from anything the user sends.
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
    new.email,
    coalesce(new.raw_user_meta_data ->> 'name', new.raw_user_meta_data ->> 'full_name', '')
  );
  return new;
end;
$$;
revoke execute on function public.handle_new_user() from public, anon, authenticated;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

alter table public.profiles enable row level security;

create policy "profiles: read own row, admins read all"
  on public.profiles for select to authenticated
  using (id = (select auth.uid()) or public.is_admin());

create policy "profiles: update own row"
  on public.profiles for update to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

-- Column-level lock: a signed-in user may change their NAME only.
-- Nobody can change their own role from the browser — that is what stops self-promotion to admin.
revoke all on public.profiles from anon, authenticated;
grant select on public.profiles to authenticated;
grant update (name) on public.profiles to authenticated;

-- DEMO ONLY: lets the "Upgrade now (demo)" button work until real payments exist.
-- Delete this function when you add billing.
create or replace function public.upgrade_to_premium_demo()
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.profiles
  set role = 'premium'
  where id = (select auth.uid()) and role = 'free';
end;
$$;
revoke execute on function public.upgrade_to_premium_demo() from public, anon;
grant  execute on function public.upgrade_to_premium_demo() to authenticated;

-- ════════════════════════════════════════════════════════════════════════
-- 2. business_profiles — the wizard result, one per user.
--    Stored as JSON (`data`) because the wizard questions are still evolving;
--    it matches the BusinessProfile type in lib/types.ts exactly.
-- ════════════════════════════════════════════════════════════════════════
create table public.business_profiles (
  user_id    uuid primary key references auth.users (id) on delete cascade,
  data       jsonb not null,
  updated_at timestamptz not null default now()
);

alter table public.business_profiles enable row level security;
create policy "business_profiles: owner only"
  on public.business_profiles for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

revoke all on public.business_profiles from anon, authenticated;
grant select, insert, update, delete on public.business_profiles to authenticated;

-- ════════════════════════════════════════════════════════════════════════
-- 3. checklist_progress — which requirements the user has completed
--    (requirement_id refers to ids in data/requirements.json for now)
-- ════════════════════════════════════════════════════════════════════════
create table public.checklist_progress (
  user_id        uuid not null references auth.users (id) on delete cascade,
  requirement_id text not null,
  business_id    text not null,
  status         text not null default 'upcoming'
                 check (status in ('upcoming', 'due_soon', 'overdue', 'completed')),
  due_date       timestamptz not null,
  completed_at   timestamptz,
  primary key (user_id, requirement_id)
);

alter table public.checklist_progress enable row level security;
create policy "checklist_progress: owner only"
  on public.checklist_progress for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

revoke all on public.checklist_progress from anon, authenticated;
grant select, insert, update, delete on public.checklist_progress to authenticated;

-- ════════════════════════════════════════════════════════════════════════
-- 4. reminder_configs — per-requirement reminder settings (Premium feature)
-- ════════════════════════════════════════════════════════════════════════
create table public.reminder_configs (
  user_id        uuid not null references auth.users (id) on delete cascade,
  requirement_id text not null,
  enabled        boolean not null default false,
  days_before    int not null default 7 check (days_before in (7, 3, 1)),
  primary key (user_id, requirement_id)
);

alter table public.reminder_configs enable row level security;
create policy "reminder_configs: owner only"
  on public.reminder_configs for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

revoke all on public.reminder_configs from anon, authenticated;
grant select, insert, update, delete on public.reminder_configs to authenticated;

-- ════════════════════════════════════════════════════════════════════════
-- 5. sent_emails — log shown in the admin dashboard ("Recent reminder emails sent")
-- ════════════════════════════════════════════════════════════════════════
create table public.sent_emails (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users (id) on delete cascade,
  to_email   text not null,
  subject    text not null,
  body       text not null,
  sent_at    timestamptz not null default now()
);
create index idx_sent_emails_user_id on public.sent_emails (user_id);

alter table public.sent_emails enable row level security;
create policy "sent_emails: read own, admins read all"
  on public.sent_emails for select to authenticated
  using (user_id = (select auth.uid()) or public.is_admin());
create policy "sent_emails: insert own"
  on public.sent_emails for insert to authenticated
  with check (user_id = (select auth.uid()));

revoke all on public.sent_emails from anon, authenticated;
grant select, insert on public.sent_emails to authenticated;
