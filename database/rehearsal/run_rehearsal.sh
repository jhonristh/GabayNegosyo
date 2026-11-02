#!/usr/bin/env bash
# GabayNegosyo — LOCAL database rehearsal (WP2).
# Applies the baseline + migrations 001–007 to a THROWAWAY local PostgreSQL and checks security behaviour as
# different roles. It refuses to run against anything that is not a local socket / localhost.
#
# Usage (example, local scratch cluster):   PGHOST=/tmp PGPORT=54329 PGUSER=postgres bash database/rehearsal/run_rehearsal.sh
# It DROPS and recreates a database called gn_rehearsal. Never point it at Supabase.
set -u
HERE="$(cd "$(dirname "$0")" && pwd)"; DB_DIR="$(dirname "$HERE")"
export PGHOST="${PGHOST:-/tmp}" PGPORT="${PGPORT:-54329}" PGUSER="${PGUSER:-postgres}"
case "$PGHOST" in /*|localhost|127.0.0.1) ;; *) echo "REFUSING: PGHOST=$PGHOST is not local. This script is for a disposable local database only."; exit 2;; esac
case "$PGHOST" in *supabase*) echo "REFUSING: host looks like Supabase."; exit 2;; esac

P=(psql -X -q -At -v ON_ERROR_STOP=1 -d gn_rehearsal)
ERRF="$(mktemp)"; trap 'rm -f "$ERRF"' EXIT
PASS=0; FAIL=0
ok()   { PASS=$((PASS+1)); echo "  PASS  $1"; }
bad()  { FAIL=$((FAIL+1)); echo "  FAIL  $1 -- $2"; }
su()   { "${P[@]}" -c "$1" 2>&1; }                                   # as superuser (like the SQL editor)
as()   { local uid="$1" role="$2" sql="$3"; "${P[@]}" -c "select set_config('request.jwt.claim.sub','$uid',false); set role $role; $sql" 2>&1 | tail -n +2; }
expect_ok()  { local n="$1"; shift; local out; out="$("$@")"; if echo "$out" | grep -qi "error"; then bad "$n" "$out"; else ok "$n"; fi; }
expect_err() { local n="$1" pat="$2"; shift 2; local out; out="$("$@")"; if echo "$out" | grep -qiE "$pat"; then ok "$n"; else bad "$n" "expected /$pat/ got: $out"; fi; }
expect_eq()  { local n="$1" want="$2"; shift 2; local out; out="$("$@" | tail -n 1)"; if [ "$out" = "$want" ]; then ok "$n"; else bad "$n" "expected '$want' got '$out'"; fi; }

psql -X -q -d postgres -c "drop database if exists gn_rehearsal" -c "create database gn_rehearsal" || exit 2
run_file() { "${P[@]}" -f "$1" >/dev/null 2>"$ERRF" && ok "applied $(basename "$1")" || bad "apply $(basename "$1")" "$(head -3 "$ERRF")"; }

A=aaaaaaaa-0000-0000-0000-000000000001;  A2=aaaaaaaa-0000-0000-0000-000000000002
U1=11111111-0000-0000-0000-000000000001; U2=22222222-0000-0000-0000-000000000002; U3=33333333-0000-0000-0000-000000000003
L=44444444-0000-0000-0000-000000000004;  D=dddddddd-0000-0000-0000-000000000001; DA=dddddddd-0000-0000-0000-000000000002
NOBODY=99999999-0000-0000-0000-000000000009

echo "== 1. Fresh install, in the documented order"
run_file "$HERE/00_supabase_stub.sql"
run_file "$DB_DIR/supabase_setup.sql"
run_file "$DB_DIR/migrations/001_sent_emails_sent_at_index.sql"
run_file "$DB_DIR/migrations/002_task_progress.sql"
run_file "$DB_DIR/migrations/003_sync_profiles.sql"
run_file "$DB_DIR/migrations/004_reminder_digest.sql"
run_file "$DB_DIR/migrations/005_account_lifecycle.sql"

echo "== 2. Fixtures (signup trigger creates every profile)"
su "insert into auth.users (id,email,raw_user_meta_data) values
 ('$A','admin@test.local','{\"name\":\"Admin One\"}'),('$A2','admin2@test.local','{}'),
 ('$U1','u1@test.local','{\"name\":\"User One\"}'),('$U2','u2@test.local','{}'),('$U3','u3@test.local','{}'),
 ('$L','legacy@test.local','{}'),('$D','demo@test.local','{}'),('$DA','demoadmin@test.local','{}');
 update public.profiles set role='admin' where id in ('$A','$A2','$DA');
 update public.profiles set role='premium' where id in ('$L');
 update public.profiles set role='premium', is_demo=true where id='$D';
 update public.profiles set is_demo=true where id='$DA';
 insert into public.business_profiles(user_id,data) values ('$U1','{\"who\":\"u1\"}'),('$U2','{\"who\":\"u2\"}');
 insert into public.checklist_progress(user_id,requirement_id,business_id,due_date) values ('$U1','r1','b','2026-01-01'),('$U2','r1','b','2026-01-01');
 insert into public.task_progress(user_id,requirement_id,cycle,task_index) values ('$U1','r1','2026',0),('$U2','r1','2026',0);
 insert into public.reminder_configs(user_id,requirement_id) values ('$U1','r1'),('$U2','r1');
 insert into public.sent_emails(user_id,to_email,subject,body) values ('$U1','u1@test.local','s','b'),('$U2','u2@test.local','s','b');" >/dev/null
expect_eq "signup trigger: new user gets role free" "free" su "select role from public.profiles where id='$U1'"
expect_eq "signup trigger: name copied from metadata" "User One" su "select name from public.profiles where id='$U1'"
expect_eq "signup trigger: user with NULL email still gets a profile (email '')" "1" su "insert into auth.users(id,email,raw_user_meta_data) values ('55555555-0000-0000-0000-000000000005',null,'{}'); select count(*) from public.profiles where id='55555555-0000-0000-0000-000000000005' and email=''"
su "update auth.users set email='u1-new@test.local' where id='$U1'" >/dev/null
expect_eq "profile sync: email change in Auth reaches profiles" "u1-new@test.local" su "select email from public.profiles where id='$U1'"
su "update auth.users set email='u1@test.local' where id='$U1'" >/dev/null

echo "== 3. Pre-006 state: reproduce the self-upgrade hole (RECONSTRUCTED stand-in for upgrade_to_premium_demo)"
su "create function public.upgrade_to_premium_demo() returns void language sql security definer set search_path='' as \$f\$ update public.profiles set role='premium' where id=(select auth.uid()) \$f\$; grant execute on function public.upgrade_to_premium_demo() to authenticated;" >/dev/null
as $U3 authenticated "select public.upgrade_to_premium_demo()" >/dev/null
expect_eq "BEFORE 006 a normal user can self-promote through that function (the F-00 hole, if it exists in production)" "premium" su "select role from public.profiles where id='$U3'"
su "update public.profiles set role='free' where id='$U3'" >/dev/null

run_file "$DB_DIR/migrations/006_entitlements.sql"
expect_eq "AFTER 006 upgrade_to_premium_demo no longer exists" "0" su "select count(*) from pg_proc where proname='upgrade_to_premium_demo'"

echo "== 4. Re-run safety (005, 006, 002, 004, 001 are meant to be idempotent)"
for f in 001_sent_emails_sent_at_index 002_task_progress 004_reminder_digest 005_account_lifecycle 006_entitlements; do run_file "$DB_DIR/migrations/$f.sql"; done

echo "== 5. Row isolation between users (RLS)"
for t in business_profiles checklist_progress task_progress reminder_configs sent_emails; do
  expect_eq "U1 sees only own rows in $t" "1" as $U1 authenticated "select count(*) from public.$t"
done
expect_err "U1 cannot insert a business profile for U2" "row-level security" as $U1 authenticated "insert into public.business_profiles(user_id,data) values ('$U2','{}')"
expect_eq   "U1 cannot update U2's progress (0 rows touched)" "0" as $U1 authenticated "with u as (update public.checklist_progress set status='completed' where user_id='$U2' returning 1) select count(*) from u"
expect_eq   "U1 cannot delete U2's task progress (0 rows)" "0" as $U1 authenticated "with d as (delete from public.task_progress where user_id='$U2' returning 1) select count(*) from d"
expect_eq   "U1 sees only own profile row" "1" as $U1 authenticated "select count(*) from public.profiles"
expect_err "anon cannot read profiles" "permission denied" as "" anon "select * from public.profiles"
expect_err "anon cannot read business_profiles" "permission denied" as "" anon "select * from public.business_profiles"

echo "== 6. Privilege escalation attempts by a normal signed-in user"
expect_err "user cannot change own role" "permission denied" as $U1 authenticated "update public.profiles set role='admin' where id='$U1'"
expect_err "user cannot clear is_demo / flags" "permission denied" as $U1 authenticated "update public.profiles set is_demo=false where id='$U1'"
expect_err "user cannot write deactivated_* columns" "permission denied" as $U1 authenticated "update public.profiles set deactivated_at=null where id='$U1'"
expect_err "user cannot write reminders_unsubscribed_at" "permission denied" as $U1 authenticated "update public.profiles set reminders_unsubscribed_at=null where id='$U1'"
expect_ok  "user CAN change own name" as $U1 authenticated "update public.profiles set name='Renamed' where id='$U1'"
expect_err "user cannot insert into entitlements" "permission denied" as $U1 authenticated "insert into public.entitlements(user_id,source,grant_reason) values ('$U1','admin_grant','self')"
expect_err "user cannot insert into admin_audit_log" "permission denied" as $U1 authenticated "insert into public.admin_audit_log(action) values ('x')"
expect_err "user cannot read account_deletion_log" "permission denied" as $U1 authenticated "select * from public.account_deletion_log"
expect_err "user cannot read reminder_deliveries" "permission denied" as $U1 authenticated "select * from public.reminder_deliveries"
expect_err "user cannot call entitlement_for directly" "permission denied" as $U1 authenticated "select * from public.entitlement_for('$U1')"
expect_err "user cannot call log_admin_action directly" "permission denied" as $U1 authenticated "select public.log_admin_action('$U1','x','$U1','{}')"
expect_err "anon cannot call get_my_entitlement" "permission denied" as "" anon "select * from public.get_my_entitlement()"
expect_err "anon cannot call is_admin" "permission denied" as "" anon "select public.is_admin()"
expect_err "user cannot call handle_new_user" "permission denied" as $U1 authenticated "select public.handle_new_user()"

echo "== 7. Admin-only functions reject non-admins, demo admins and anon"
for fn in "admin_premium_roster()" "admin_user_directory(10,0,null,null)" "admin_list_audit_log(10,0)" "admin_account_overview()" "admin_sync_profiles()" "purge_expired_deletion_log()" "admin_grant_premium('$U2',null,'test')" "admin_revoke_premium('$U2','test')" "admin_set_account_status('$U2',true,'test')"; do
  expect_err "normal user rejected: $fn" "Admins only" as $U1 authenticated "select * from public.$fn"
  expect_err "DEMO admin rejected: $fn" "Admins only" as $DA authenticated "select * from public.$fn"
  expect_err "anon rejected: $fn" "permission denied" as "" anon "select * from public.$fn"
done
expect_err "user cannot read audit log table" "^$|permission|0" as $U1 authenticated "select count(*) from public.admin_audit_log"
expect_eq   "user sees 0 audit rows even via SELECT grant (RLS)" "0" as $U1 authenticated "select count(*) from public.admin_audit_log"
expect_eq   "user sees 0 entitlement rows of others" "0" as $U1 authenticated "select count(*) from public.entitlements where user_id<>'$U1'"

echo "== 8. Premium entitlement lifecycle"
expect_eq "free user: plan is free" "free" as $U1 authenticated "select status from public.get_my_entitlement()"
expect_err "grant needs a reason" "reason of 3" as $A authenticated "select public.admin_grant_premium('$U1',null,'')"
expect_err "grant expiry must be future" "future" as $A authenticated "select public.admin_grant_premium('$U1',now()-interval '1 day','test')"
expect_err "cannot grant to a demo account" "Demo accounts" as $A authenticated "select public.admin_grant_premium('$D',null,'test')"
expect_err "cannot grant to an admin" "full access" as $A authenticated "select public.admin_grant_premium('$A2',null,'test')"
expect_err "unknown account" "not found" as $A authenticated "select public.admin_grant_premium('$NOBODY',null,'test')"
as $A authenticated "select public.admin_grant_premium('$U1', now()+interval '7 days','QA grant')" >/dev/null
expect_eq "after grant: premium" "premium" as $U1 authenticated "select status from public.get_my_entitlement()"
expect_eq "after grant: role column stays free (so role-based code would miss it)" "free" su "select role from public.profiles where id='$U1'"
expect_eq "directory 'premium' filter includes the granted user" "1" as $A authenticated "select count(*) from public.admin_user_directory(50,0,'premium',null) where id='$U1'"
expect_eq "directory 'free' filter excludes the granted user" "0" as $A authenticated "select count(*) from public.admin_user_directory(50,0,'free',null) where id='$U1'"
expect_eq "roster includes the granted user" "1" as $A authenticated "select count(*) from public.admin_premium_roster() where user_id='$U1'"
expect_eq "roster excludes demo, admin and legacy-free accounts" "0" as $A authenticated "select count(*) from public.admin_premium_roster() where user_id in ('$D','$A','$A2','$DA','$U2')"
expect_eq "audit log recorded the grant" "1" as $A authenticated "select count(*) from public.admin_list_audit_log(50,0) where action='grant_premium'"
echo "   (F-13 check) admin_account_overview counts by role, so it under-counts the granted user:"
expect_eq "F-13 CONFIRMED: dashboard overview premium_count counts role only (legacy+demo = 2)..." "2" as $A authenticated "select premium_count from public.admin_account_overview()"
expect_eq "F-13 CONFIRMED: ...while the computed plan directory finds 3 Premium accounts (adds the admin-granted user)" "3" as $A authenticated "select max(total_count) from public.admin_user_directory(50,0,'premium',null)"
run_file "$DB_DIR/migrations/007_admin_overview_computed_plan.sql"
expect_eq "007: overview premium_count now equals the computed-plan directory (3)" "3" as $A authenticated "select premium_count from public.admin_account_overview()"
expect_eq "007: free + premium + admin = total accounts" "t" as $A authenticated "select (free_count+premium_count+admin_count)=total from public.admin_account_overview()"
expect_err "007: still admins only (normal user)" "Admins only" as $U1 authenticated "select * from public.admin_account_overview()"
expect_err "007: still admins only (demo admin)" "Admins only" as $DA authenticated "select * from public.admin_account_overview()"
expect_err "007: anon still blocked" "permission denied" as "" anon "select * from public.admin_account_overview()"
run_file "$DB_DIR/migrations/007_admin_overview_computed_plan.sql"
# expire it
su "update public.entitlements set starts_at=now()-interval '3 days', expires_at=now()-interval '1 day' where user_id='$U1'" >/dev/null
expect_eq "after expiry: status expired" "expired" as $U1 authenticated "select status from public.get_my_entitlement()"
expect_eq "expired user is not in the roster" "0" as $A authenticated "select count(*) from public.admin_premium_roster() where user_id='$U1'"
su "update public.profiles set role='premium' where id='$U1'" >/dev/null
expect_eq "EXPIRED + stale role='premium' must NOT regain Premium (legacy fallback closed)" "expired" as $U1 authenticated "select status from public.get_my_entitlement()"
su "update public.profiles set role='free' where id='$U1'" >/dev/null
as $A authenticated "select public.admin_grant_premium('$U1',null,'second grant')" >/dev/null
expect_eq "re-grant works after expiry" "premium" as $U1 authenticated "select status from public.get_my_entitlement()"
# NOTE: revoke also stamps the earlier, already-expired grant as revoked, so it reports 2 (one active + one expired). See review finding DB-12.
expect_eq "revoke ends the active grant AND stamps the old expired one (reports 2)" "2" as $A authenticated "select public.admin_revoke_premium('$U1','QA revoke')"
expect_eq "after revoke: cancelled" "cancelled" as $U1 authenticated "select status from public.get_my_entitlement()"
expect_err "revoking again is refused" "no Premium access" as $A authenticated "select public.admin_revoke_premium('$U1','again')"
expect_err "cannot revoke an admin" "changed in the database" as $A authenticated "select public.admin_revoke_premium('$A2','QA test')"

echo "== 9. Legacy role='premium' account"
expect_eq "legacy premium keeps access before review" "legacy_role" as $L authenticated "select source from public.get_my_entitlement()"
as $A authenticated "select public.admin_grant_premium('$L', now()+interval '1 day','move into entitlements')" >/dev/null
expect_eq "grant moves legacy role to free" "free" su "select role from public.profiles where id='$L'"
su "update public.entitlements set starts_at=now()-interval '3 days', expires_at=now()-interval '1 day' where user_id='$L'" >/dev/null
expect_eq "legacy account then honours expiry" "expired" as $L authenticated "select status from public.get_my_entitlement()"
expect_eq "real admin counts as premium via admin_role" "admin_role" as $A authenticated "select source from public.get_my_entitlement()"
expect_eq "DEMO admin does NOT get admin_role premium" "free" as $DA authenticated "select status from public.get_my_entitlement()"

echo "== 10. Deactivation and reactivation"
as $U2 authenticated "select public.deactivate_my_account()" >/dev/null
expect_eq "deactivated user: business_profiles invisible" "0" as $U2 authenticated "select count(*) from public.business_profiles"
expect_eq "deactivated user: task_progress invisible" "0" as $U2 authenticated "select count(*) from public.task_progress"
expect_err "deactivated user: cannot write progress" "row-level security" as $U2 authenticated "insert into public.checklist_progress(user_id,requirement_id,business_id,due_date) values ('$U2','r9','b',now())"
expect_err "deactivated user: cannot rename" "0|row-level|^$" as $U2 authenticated "update public.profiles set name='x' where id='$U2'"
expect_eq "deactivated user: name unchanged" "" su "select name from public.profiles where id='$U2'"
expect_eq "deactivated user can still read own profile (reactivation screen)" "1" as $U2 authenticated "select count(*) from public.profiles"
expect_eq "get_my_entitlement reports deactivation" "t" as $U2 authenticated "select deactivated_at is not null from public.get_my_entitlement()"
as $U2 authenticated "select public.reactivate_my_account()" >/dev/null
expect_eq "self reactivation restores data access" "1" as $U2 authenticated "select count(*) from public.business_profiles"
as $A authenticated "select public.admin_set_account_status('$U2',true,'QA admin deactivate')" >/dev/null
expect_err "admin-deactivated user cannot self-reactivate" "administrator" as $U2 authenticated "select public.reactivate_my_account()"
expect_eq "admin-deactivated user has no data access" "0" as $U2 authenticated "select count(*) from public.business_profiles"
expect_err "admin deactivation needs a reason" "reason of 3" as $A authenticated "select public.admin_set_account_status('$U3',true,'')"
expect_err "admin cannot deactivate self" "own account" as $A authenticated "select public.admin_set_account_status('$A',true,'test')"
expect_err "admin cannot deactivate another admin" "Admin accounts" as $A authenticated "select public.admin_set_account_status('$A2',true,'test')"
expect_err "admin cannot deactivate a demo account" "Demo accounts" as $A authenticated "select public.admin_set_account_status('$D',true,'test')"
expect_err "admin account cannot self-deactivate" "Admin accounts" as $A authenticated "select public.deactivate_my_account()"
expect_err "demo account cannot self-deactivate" "Demo accounts" as $D authenticated "select public.deactivate_my_account()"
as $A authenticated "select public.admin_set_account_status('$U2',false,'QA lift')" >/dev/null
expect_eq "admin can lift it" "1" as $U2 authenticated "select count(*) from public.business_profiles"

echo "== 11. Admin deactivation survives deletion of the acting admin"
as $A2 authenticated "select public.admin_set_account_status('$U3',true,'QA tracking')" >/dev/null
su "delete from auth.users where id='$A2'" >/dev/null
expect_eq "deactivated_by cleared when that admin is deleted" "t" su "select deactivated_by is null from public.profiles where id='$U3'"
expect_eq "deactivated_by_admin flag is kept" "t" su "select deactivated_by_admin from public.profiles where id='$U3'"
expect_err "user still cannot self-reactivate" "administrator" as $U3 authenticated "select public.reactivate_my_account()"
expect_eq "audit rows from deleted admin are kept with actor NULL" "t" su "select count(*)>0 from public.admin_audit_log where actor_id is null and action='deactivate_account'"

echo "== 12. Account deletion cleanup (cascade)"
su "insert into public.reminder_deliveries(user_id,requirement_id,due_date,days_before) values ('$U1','r1','2026-01-01',7)" >/dev/null
su "delete from auth.users where id='$U1'" >/dev/null
for t in profiles business_profiles checklist_progress task_progress reminder_configs sent_emails reminder_deliveries entitlements; do
  col=user_id; [ $t = profiles ] && col=id
  expect_eq "no $t rows remain for deleted user" "0" su "select count(*) from public.$t where $col='$U1'"
done
expect_eq "audit log keeps rows about the deleted user (target NULL)" "t" su "select count(*)>0 from public.admin_audit_log where target_user_id is null and action='grant_premium'"
expect_eq "other users untouched by the delete" "1" su "select count(*) from public.business_profiles where user_id='$U2'"

echo "== 13. Definer-function hygiene (catalog checks)"
expect_eq "every SECURITY DEFINER function pins search_path to empty" "0" su "select count(*) from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.prosecdef and not coalesce(array_to_string(p.proconfig,',') like '%search_path=\"\"%',false)"
expect_eq "no public SECURITY DEFINER function is executable by anon" "0" su "select count(*) from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.prosecdef and has_function_privilege('anon',p.oid,'execute')"
echo "   Functions executable by 'authenticated' (each must check its own caller):"
su "select '   - ' || p.proname from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.prosecdef and has_function_privilege('authenticated',p.oid,'execute') order by 1"
expect_eq "RLS is enabled on every table in public" "0" su "select count(*) from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relkind='r' and not c.relrowsecurity"
expect_eq "anon has no privilege on any public table" "0" su "select count(*) from information_schema.role_table_grants where table_schema='public' and grantee='anon'"

echo "== 14. Known weak spots, demonstrated (informational; these PASS when the weakness is present)"
expect_ok  "DB-09: a user can insert a forged sent_emails log row with any recipient/subject" as $U2 authenticated "insert into public.sent_emails(user_id,to_email,subject,body) values ('$U2','ceo@bank.example','Forged','forged')"
expect_eq  "DB-09: ...and a real admin can see that forged row in the admin log" "1" as $A authenticated "select count(*) from public.sent_emails where to_email='ceo@bank.example'"
expect_eq  "service role (no JWT user) may run the purge" "0" as "" service_role "select public.purge_expired_deletion_log()"
run_file "$DB_DIR/migrations/003_sync_profiles.sql"
expect_eq  "DB-10: re-running 003 AFTER 007 reverts admin_account_overview to role-based counts" "f" su "select pg_get_functiondef('public.admin_account_overview'::regproc) like '%entitlement_for%'"
expect_eq  "DB-10: re-running 003 AFTER 005 silently replaces admin_sync_profiles with the un-audited version" "f" su "select pg_get_functiondef('public.admin_sync_profiles'::regproc) like '%log_admin_action%'"
run_file "$DB_DIR/migrations/005_account_lifecycle.sql"
run_file "$DB_DIR/migrations/007_admin_overview_computed_plan.sql"
expect_eq  "...and re-running 005 + 007 restores the audited version" "t" su "select pg_get_functiondef('public.admin_sync_profiles'::regproc) like '%log_admin_action%'"

echo; echo "RESULT: $PASS passed, $FAIL failed"; [ "$FAIL" -eq 0 ]
