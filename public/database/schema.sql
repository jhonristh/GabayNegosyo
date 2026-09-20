-- GabayNegosyo — target relational schema (PostgreSQL / Supabase)
--
-- The running prototype does NOT execute this file. It uses a local,
-- localStorage-backed data layer (lib/db.ts) so the app works with zero
-- external setup. This schema documents the structure that layer is
-- designed to migrate to — table names and fields map directly onto the
-- TypeScript types in lib/types.ts.

create extension if not exists "uuid-ossp";

create table users (
  id uuid primary key default uuid_generate_v4(),
  email text unique not null,
  name text not null,
  role text not null default 'free' check (role in ('free', 'premium', 'admin')),
  subscription_tier text not null default 'free',
  created_at timestamptz not null default now()
);

create table businesses (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references users(id) on delete cascade,
  business_name text not null,
  business_type text not null,
  business_structure text not null,
  tax_type text not null,
  employee_count int not null default 0,
  location text not null,
  status text not null,
  created_at timestamptz not null default now()
);
create index idx_businesses_user_id on businesses(user_id);

create table agencies (
  id text primary key,
  name text not null,
  description text not null,
  official_url text not null,
  archived boolean not null default false
);

create table services (
  id uuid primary key default uuid_generate_v4(),
  agency_id text not null references agencies(id) on delete cascade,
  name text not null,
  description text not null
);
create index idx_services_agency_id on services(agency_id);

create table requirements (
  id text primary key,
  agency_id text not null references agencies(id) on delete cascade,
  service_id uuid references services(id) on delete set null,
  name text not null,
  description text not null,
  who_it_applies_to text not null,
  applicability_rules jsonb not null default '{}',
  deadline_description text not null,
  deadline_month int not null check (deadline_month between 1 and 12),
  deadline_day int not null check (deadline_day between 1 and 31),
  penalty_rule jsonb not null default '{}',
  official_url text not null,
  last_verified date not null,
  archived boolean not null default false
);
create index idx_requirements_agency_id on requirements(agency_id);

create table required_documents (
  id uuid primary key default uuid_generate_v4(),
  requirement_id text not null references requirements(id) on delete cascade,
  name text not null,
  description text not null
);
create index idx_required_documents_requirement_id on required_documents(requirement_id);

create table resources (
  id text primary key,
  title text not null,
  resource_type text not null check (resource_type in ('form', 'guide', 'tutorial', 'official_website', 'requirement', 'document')),
  agency_id text not null references agencies(id) on delete cascade,
  description text not null,
  url text not null,
  related_requirement_id text references requirements(id) on delete set null,
  last_verified date not null,
  archived boolean not null default false
);
create index idx_resources_agency_id on resources(agency_id);

create table tutorials (
  id text primary key,
  title text not null,
  description text not null,
  video_url text not null,
  agency_id text not null references agencies(id) on delete cascade,
  requirement_id text references requirements(id) on delete set null,
  category text not null,
  is_placeholder boolean not null default true,
  archived boolean not null default false
);
create index idx_tutorials_agency_id on tutorials(agency_id);

create table checklists (
  id uuid primary key default uuid_generate_v4(),
  business_id uuid not null references businesses(id) on delete cascade,
  requirement_id text not null references requirements(id) on delete cascade,
  status text not null default 'upcoming' check (status in ('upcoming', 'due_soon', 'overdue', 'completed')),
  due_date date not null,
  completed_at timestamptz,
  unique (business_id, requirement_id)
);
create index idx_checklists_business_id on checklists(business_id);

create table saved_resources (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references users(id) on delete cascade,
  resource_id text not null references resources(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (user_id, resource_id)
);

create table reminders (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references users(id) on delete cascade,
  requirement_id text not null references requirements(id) on delete cascade,
  days_before int not null check (days_before in (7, 3, 1)),
  channel text not null default 'email',
  status text not null default 'disabled' check (status in ('enabled', 'disabled')),
  unique (user_id, requirement_id)
);

create table sent_emails (
  id uuid primary key default uuid_generate_v4(),
  to_email text not null,
  subject text not null,
  body text not null,
  sent_at timestamptz not null default now()
);

create table analytics_events (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references users(id) on delete set null,
  event_type text not null,
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now()
);
create index idx_analytics_events_type on analytics_events(event_type);

create table subscriptions (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references users(id) on delete cascade,
  tier text not null default 'free',
  status text not null default 'active',
  started_at timestamptz not null default now(),
  expires_at timestamptz
);
create index idx_subscriptions_user_id on subscriptions(user_id);

-- Row Level Security (enable + policies to be defined per deployment;
-- left as a migration TODO since the prototype does not connect to
-- Supabase by default).
-- alter table businesses enable row level security;
-- alter table checklists enable row level security;
-- alter table reminders enable row level security;
