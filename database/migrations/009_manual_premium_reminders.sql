-- Work Package 5: MANUAL reminder roster and evidence of staff-recorded sends.
-- Requires 004, 005, 006, 007, 008 in this order. Apply manually in Supabase SQL Editor
-- after backup and verification. Do not enable SMTP, cron, or background jobs.
-- This file is safe to re-run: read function is replaceable, insert is idempotent.

create table if not exists public.manual_reminder_records (
  user_id uuid not null references auth.users(id) on delete cascade,
  requirement_id text not null check (length(requirement_id) between 1 and 120),
  due_date date not null,
  days_before smallint not null check (days_before in (1,3,7)),
  recorded_at timestamptz not null default now(),
  recorded_by uuid references auth.users(id) on delete set null,
  primary key (user_id, requirement_id, due_date, days_before)
);
create index if not exists manual_reminder_records_recent on public.manual_reminder_records (recorded_at desc);
alter table public.manual_reminder_records enable row level security;
revoke all on public.manual_reminder_records from public, anon, authenticated;
-- All reads/writes are SECURITY DEFINER functions that verify real-admin access.

-- Return minimal profile fields needed to compute applicability using the
-- existing client-side rule engine. Do not expose raw full business profile JSON.
-- Only eligible users WITH an enabled saved preference appear. No silent sends.
create or replace function public.admin_manual_reminder_queue()
returns table (
  user_id uuid, email text, display_name text, business_name text,
  profile_data jsonb, requirement_id text, days_before smallint,
  plan_expires_at timestamptz
)
language plpgsql stable security definer set search_path = '' as $$
begin
  if not public.is_admin() then raise exception 'Admins only' using errcode = '42501'; end if;
  return query
  select p.id, p.email, p.name,
         left(coalesce(b.data->>'businessName',''),120),
         jsonb_build_object(
           'id', coalesce(b.data->>'id',''),
           'userId', p.id::text,
           'isRegisteringNewBusiness', b.data->'isRegisteringNewBusiness',
           'taxpayerType', b.data->'taxpayerType',
           'hasLease', b.data->'hasLease',
           'hasEmployees', b.data->'hasEmployees',
           'employeeCount', b.data->'employeeCount',
           'projectedGrossSales', b.data->'projectedGrossSales',
           'deductionMethod', b.data->'deductionMethod',
           'bmbeIntent', b.data->'bmbeIntent',
           'bmbeAssetsExcludingLand', b.data->'bmbeAssetsExcludingLand',
           'status', b.data->'status',
           'businessType', b.data->'businessType',
           'businessStructure', b.data->'businessStructure',
           'taxType', b.data->'taxType',
           'createdAt', b.data->'createdAt'
         ),
         c.requirement_id, c.days_before::smallint, ef.expires_at
    from public.profiles p
    join public.business_profiles b on b.user_id=p.id
    join public.reminder_configs c on c.user_id=p.id and c.enabled is true
    cross join lateral public.entitlement_for(p.id) ef
   where ef.status='premium'
     and (ef.expires_at is null or ef.expires_at > now())
     and p.role <> 'admin'
     and p.is_demo is not true
     and p.deactivated_at is null
     and p.reminders_unsubscribed_at is null
   order by p.email, c.requirement_id
   limit 2000;
end;
$$;
revoke execute on function public.admin_manual_reminder_queue() from public, anon;
grant execute on function public.admin_manual_reminder_queue() to authenticated;

-- Return only existing manual records for the eligible queue. This prevents
-- a browser caller from reading records for an arbitrary user.
create or replace function public.admin_manual_reminder_history()
returns table (user_id uuid, requirement_id text, due_date date, days_before smallint, recorded_at timestamptz)
language plpgsql stable security definer set search_path = '' as $$
begin
  if not public.is_admin() then raise exception 'Admins only' using errcode = '42501'; end if;
  return query
  select r.user_id, r.requirement_id, r.due_date, r.days_before, r.recorded_at
    from public.manual_reminder_records r
   where exists (select 1 from public.profiles p where p.id=r.user_id)
   order by r.recorded_at desc limit 5000;
end;
$$;
revoke execute on function public.admin_manual_reminder_history() from public, anon;
grant execute on function public.admin_manual_reminder_history() to authenticated;

-- Only explicitly marked manual sends. Database checks the current entitlement,
-- unsubscribe, demo/admin/deactivated status, and active preference AGAIN before
-- recording. Unique primary key prevents duplicates even under concurrency.
create or replace function public.admin_record_manual_reminder(
 p_user uuid, p_requirement text, p_due date, p_days smallint
)
returns boolean language plpgsql security definer set search_path = '' as $$
declare eligible boolean;
begin
  if not public.is_admin() then raise exception 'Admins only' using errcode = '42501'; end if;
  if p_due is null or p_due < current_date - 7 or p_due > current_date + 370 then
    raise exception 'Deadline must be recent or within the next year' using errcode='22023';
  end if;
  if p_days not in (1,3,7) or p_requirement is null or length(p_requirement) not between 1 and 120 then
    raise exception 'Invalid reminder key' using errcode='22023';
  end if;
  select exists (
    select 1 from public.profiles p
    join public.reminder_configs c on c.user_id=p.id and c.requirement_id=p_requirement
        and c.enabled and c.days_before=p_days
    join public.business_profiles b on b.user_id=p.id
    cross join lateral public.entitlement_for(p.id) ef
    where p.id=p_user and p.role<>'admin' and not p.is_demo
      and p.deactivated_at is null and p.reminders_unsubscribed_at is null
      and ef.status='premium' and (ef.expires_at is null or ef.expires_at>now())
  ) into eligible;
  if not eligible then raise exception 'Reminder recipient is not eligible' using errcode='42501'; end if;
  insert into public.manual_reminder_records
    (user_id, requirement_id, due_date, days_before, recorded_by)
  values (p_user,p_requirement,p_due,p_days,(select auth.uid()))
  on conflict (user_id,requirement_id,due_date,days_before) do nothing;
  return found;
end;
$$;
revoke execute on function public.admin_record_manual_reminder(uuid,text,date,smallint) from public, anon;
grant execute on function public.admin_record_manual_reminder(uuid,text,date,smallint) to authenticated;
