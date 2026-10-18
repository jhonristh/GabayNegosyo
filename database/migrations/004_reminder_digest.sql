-- GabayNegosyo v0.16 — automatic daily reminder digest.
-- Run once in the Supabase SQL Editor. Safe to re-run.

-- 1. A person can stop all digests with one click (unsubscribe link in every email).
--    Users cannot edit this column from the browser (column grants only allow `name`);
--    it is written by the server using the service-role key.
alter table public.profiles add column if not exists reminders_unsubscribed_at timestamptz;

-- 2. Delivery log used to prevent duplicate sends (one row per requirement/cycle/offset).
create table if not exists public.reminder_deliveries (
  user_id        uuid not null references auth.users (id) on delete cascade,
  requirement_id text not null,
  due_date       date not null,
  days_before    int  not null check (days_before in (7, 3, 1)),
  sent_at        timestamptz not null default now(),
  primary key (user_id, requirement_id, due_date, days_before)
);

alter table public.reminder_deliveries enable row level security;
-- No policies and no grants for anon/authenticated: only the server (service role) reads or writes this table.
revoke all on public.reminder_deliveries from anon, authenticated;

-- Check:
-- select count(*) from public.reminder_deliveries;
-- To let someone receive digests again after unsubscribing:
-- update public.profiles set reminders_unsubscribed_at = null where lower(email) = 'person@example.com';
