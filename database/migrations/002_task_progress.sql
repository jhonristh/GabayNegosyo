-- v0.12: task-level checklist progress.
-- Run once in the Supabase SQL editor (safe to re-run).
-- One row per checked step. `cycle` is the due year for yearly deadlines
-- (so a step checked for 2026 does not carry into 2027) or 'once' otherwise.

create table if not exists public.task_progress (
  user_id        uuid not null references auth.users (id) on delete cascade,
  requirement_id text not null,
  cycle          text not null,
  task_index     int  not null check (task_index >= 0),
  completed_at   timestamptz not null default now(),
  primary key (user_id, requirement_id, cycle, task_index)
);

alter table public.task_progress enable row level security;

drop policy if exists "task_progress: owner only" on public.task_progress;
create policy "task_progress: owner only"
  on public.task_progress for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

revoke all on public.task_progress from anon, authenticated;
grant select, insert, update, delete on public.task_progress to authenticated;
