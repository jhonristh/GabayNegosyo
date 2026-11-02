-- READ ONLY: execute in Supabase SQL Editor after migration 009.
-- These queries return schema/privilege diagnostics only (no customer PII).
select to_regclass('public.manual_reminder_records') is not null as manual_table_exists,
       to_regprocedure('public.admin_manual_reminder_queue()') is not null as queue_rpc_exists,
       to_regprocedure('public.admin_manual_reminder_history()') is not null as history_rpc_exists,
       to_regprocedure('public.admin_record_manual_reminder(uuid,text,date,smallint)') is not null as record_rpc_exists;

select relname, relrowsecurity
from pg_class where oid = 'public.manual_reminder_records'::regclass;

select has_table_privilege('anon','public.manual_reminder_records','SELECT') as anon_select,
       has_table_privilege('authenticated','public.manual_reminder_records','SELECT') as authenticated_select,
       has_table_privilege('authenticated','public.manual_reminder_records','INSERT') as authenticated_insert;

select has_function_privilege('anon','public.admin_manual_reminder_queue()','EXECUTE') as anon_can_queue,
       has_function_privilege('authenticated','public.admin_manual_reminder_queue()','EXECUTE') as signed_in_can_call_queue,
       has_function_privilege('anon','public.admin_record_manual_reminder(uuid,text,date,smallint)','EXECUTE') as anon_can_record;
-- Authenticated EXECUTE does NOT grant access by itself: each function verifies public.is_admin().
-- To confirm authorization, use two real non-demo test accounts in the browser;
-- an ordinary user must receive an admin-only error when calling the RPC.
