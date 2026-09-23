-- 001_sent_emails_sent_at_index.sql
-- B1: the admin dashboard's "Recent reminder emails sent" log orders by
-- sent_at desc with a limit; sent_emails already has a user_id index
-- (database/supabase_setup.sql) but nothing on sent_at, so that query does
-- a full scan + sort once this table has any real volume.
--
-- Apply: paste into the Supabase SQL editor, or run via the Supabase CLI.
-- Rollback: drop index if exists idx_sent_emails_sent_at;

create index if not exists idx_sent_emails_sent_at on public.sent_emails (sent_at desc);
