# v0.17 integration and QA preparation

Review and preparation only. Nothing here was run against a database, a browser or production. Statements below say how each item was checked: **code/SQL read**, **automated test** (`npm test`), or **needs a manual run**.

## 1. Migrations 005 and 006

### 1.1 What each one changes

**005_account_lifecycle.sql** (adds, replaces, never deletes data)

| Change | Kind |
|---|---|
| `profiles.deactivated_at`, `deactivated_by`, `deactivated_by_admin` columns | additive, nullable or defaulted |
| One-time backfill: `deactivated_by_admin = true` where an admin deactivation already exists | updates only rows that are already deactivated (none, if you have not used this feature) |
| Table `admin_audit_log` (RLS: admins read, nobody writes) | new |
| Table `account_deletion_log` (RLS on, no grants: server only) | new |
| Functions `log_admin_action`, `purge_expired_deletion_log`, `is_account_active`, `deactivate_my_account`, `reactivate_my_account`, `admin_set_account_status`; `admin_sync_profiles` replaced in place (same signature, now audited) | new / replaced |
| RESTRICTIVE policy `active account only` on `business_profiles`, `checklist_progress`, `task_progress`, `reminder_configs`, `sent_emails`; restrictive UPDATE policy on `profiles` | new policies (drops and recreates only its own named policies) |

**006_entitlements.sql**

| Change | Kind |
|---|---|
| Table `entitlements` (RLS: own row or admin reads; no write grants) | new |
| Functions `entitlement_for` (internal), `get_my_entitlement`, `admin_grant_premium`, `admin_revoke_premium`, `admin_user_directory`, `admin_list_audit_log`, `admin_premium_roster` | new |
| `drop function if exists public.upgrade_to_premium_demo()` | **the only destructive statement**; explicitly requested, removes the self-service upgrade |

### 1.2 Destructive operations and rollback

- No table, column or row is dropped. The single drop is `upgrade_to_premium_demo()`; it is intentionally not restored by any rollback (restoring it would re-open self-upgrade).
- Runtime effects (not at migration time): `admin_grant_premium` sets a legacy `role='premium'` account's role to `free` (its Premium then lives in `entitlements`); `admin_revoke_premium` sets a legacy Premium role to `free`. Both are audited.
- Both files are re-runnable. Rollback SQL is at the bottom of each file. Rolling back 005 removes the policies/functions but leaves the three profile columns and the two log tables (harmless; keep them as an audit trail).
- Before running anything, take a backup: Supabase → Database → Backups if your plan has it, otherwise export `profiles` and the five user-data tables from the Table Editor (CSV).

### 1.3 Compatibility with a v0.16.5 database

- Requires 001–004 (uses `public.is_admin()`, `profiles.is_demo`, `profiles.reminders_unsubscribed_at`). All three function signatures changed by `create or replace` keep their old return types.
- v0.16.5 app against the new database: works. Its "Upgrade now (demo)" button reports failure (function gone). The Users page, deadlines, checklist and sign-in are unaffected.
- v0.17 app against the old database: works. Plan falls back to `profiles.role`, the Users page shows the read-only list with a "run the migration" notice, deactivation and Premium actions say the migration is missing.
- 005 applied without 006: deactivation works; plan still reads from `profiles.role`.
- Not verified here: an actual run. Parse check only (PostgreSQL parser: valid syntax).

### 1.4 Safe execution sequence

1. Backup (above). Record the output of the legacy-Premium review query (section 3.2).
2. If you can, create a Supabase **branch** or a throwaway project with `database/supabase_setup.sql` plus migrations 002–006, and rehearse there first.
3. Deploy the v0.17.1 app (it tolerates a database without 005/006). Confirm the site loads and sign-in works.
4. Run 005. Run the verification block below. Stop if any result differs.
5. Run 006. Run its verification block.
6. Run the manual QA (section 6) with a test account and a test admin before announcing anything.

### 1.5 Verification SQL (run in the SQL editor; read-only unless stated)

```sql
-- After 005
select column_name from information_schema.columns
 where table_schema='public' and table_name='profiles' and column_name like 'deactivated%' order by 1;      -- 3 rows
select tablename, policyname, permissive from pg_policies
 where policyname like '%active account only%' order by 1;                                                    -- 6 rows, all RESTRICTIVE
select relname, relrowsecurity from pg_class
 where relname in ('admin_audit_log','account_deletion_log') order by 1;                                      -- both true
select grantee, privilege_type from information_schema.role_table_grants
 where table_name in ('admin_audit_log','account_deletion_log','entitlements') order by 1,2;                   -- only 'authenticated SELECT' on admin_audit_log (and entitlements after 006)

-- After 006
select count(*) from pg_proc where proname = 'upgrade_to_premium_demo';                                       -- 0
select proname from pg_proc p join pg_namespace n on n.oid=p.pronamespace
 where n.nspname='public' and proname in ('entitlement_for','get_my_entitlement','admin_grant_premium',
       'admin_revoke_premium','admin_user_directory','admin_list_audit_log','admin_premium_roster') order by 1;   -- 7 rows

-- Foreign keys to auth.users: 'c' (cascade) for user data, 'n' (set null) for audit links
select conrelid::regclass as table_name, confdeltype from pg_constraint
 where confrelid = 'auth.users'::regclass and contype = 'f' order by 1;
-- Expect 'c' for: profiles, business_profiles, checklist_progress, task_progress, reminder_configs,
-- sent_emails, reminder_deliveries, entitlements. Expect 'n' for the log/actor columns (admin_audit_log, entitlements.granted_by/revoked_by, profiles.deactivated_by).
```

## 2. Account lifecycle review

| Check | Result | How verified |
|---|---|---|
| Deactivate/reactivate act only on the caller | The functions take no user id; they use `auth.uid()` | code/SQL read |
| Admin deactivate/reactivate | `admin_set_account_status` checks `is_admin()` first, needs a 3–300 character reason, refuses self, admins and demo accounts, writes an audit row | code/SQL read; automated structure tests |
| Admin-imposed deactivation survives the admin's deletion | Stored as `deactivated_by_admin` (not the clearable foreign key) | fixed in 0.17.1; test |
| Reauthentication | **Deletion:** server requires a sign-in within 10 minutes. **Deactivation:** none (reversible). **Admin actions:** an admin session only | code read |
| Typed DELETE | Checked in the dialog **and** on the server (400 otherwise) | automated test |
| No client-supplied user id | Route reads the token only | automated test |
| Data cleanup | `auth.users` delete cascades to every user table (query in 1.5 confirms on your database); no Supabase Storage files exist; profile picture is browser-only | needs a manual run on your DB |
| Deletion record privacy and retention | SHA-256 of id, role, method, dates; no email/name/business data; 30-day `purge_after`; server-only table. **The purge is not scheduled**: run `select public.purge_expired_deletion_log();` monthly or add pg_cron | code/SQL read |
| Admin and demo restrictions | Admins cannot self-deactivate or self-delete; demo (browser) ids refused; database `is_demo` profiles refused by the SQL functions and the delete route (0.17.1) | automated tests |
| Access while deactivated | RESTRICTIVE RLS on the five user-data tables and profile edits; `AuthGuard` shows only the reactivation screen; `/api/send-email` refuses | SQL read; needs a manual run |

**Remaining risks (decide before release):**

1. **Deactivated users keep a valid Supabase session.** Self-deactivation signs out with the default global scope, which revokes all refresh tokens. An admin deactivation does not touch the person's other sessions: they keep an access token (about one hour) and may refresh it. What they can do meanwhile is limited to reading their own profile row, calling `get_my_entitlement`/`reactivate_my_account` (refused for admin-imposed), and deleting their account. All user data tables are blocked by RLS. A hard block would need a server route using the service key to ban the user; not built.
2. A user deactivated by an admin can still permanently delete their own account. That respects erasure rights but lets them escape a deactivation.
3. Deactivation needs no password or recent login. Someone at an unlocked device can deactivate (reversible by logging in again).
4. The 30-day purge needs a human or pg_cron.
5. Any future table holding user data needs its own restrictive "active account only" policy.

## 3. Premium entitlements

### 3.1 Review

| Check | Result |
|---|---|
| Grant and revoke | Only via `admin_grant_premium` / `admin_revoke_premium` (admin check, reason, audit). No insert/update/delete grants on `entitlements`. |
| Optional expiry and fallback to Free | `entitlement_for()` compares `expires_at` to `now()` on every read. No job. Expired shows as "Free (Premium expired)". Unit-tested in the client helper; SQL needs a manual run. |
| Legacy Premium never outlives a grant | **Fixed in 0.17.1** (Issue 2): legacy `role='premium'` counts only for accounts with no entitlement history; granting moves the account fully into `entitlements`. |
| Admin filter | **Fixed in 0.17.1** (Issue 1): filters on the computed plan. |
| Client-side escalation | The browser's plan comes from `get_my_entitlement()`. Editing `role` or the entitlement in memory changes only what the interface shows. Premium *content* is in the app's data files, so this is presentation, not protection. The server-enforced parts are entitlement writes and `/api/send-email`. |
| Email route | Fails closed (0.17.1, Issue 4): unverifiable plan → 503; the profile's own `deactivated_at` is read independently. The role fallback exists only if the function is not installed. |
| Demo accounts | Browser-only demos have source `demo`; database `is_demo` accounts cannot be granted Premium, deactivated or deleted. |

### 3.2 Review existing Premium accounts (safe, read-only) **run before migrating**

Before 006 (no `entitlements` table yet):

```sql
select email, name, created_at
  from public.profiles
 where role = 'premium' and not is_demo
 order by created_at;
```

After 006 (also shows who is already managed through entitlements):

```sql
select p.email, p.created_at,
       exists (select 1 from public.entitlements e where e.user_id = p.id) as already_in_entitlements
  from public.profiles p
 where p.role = 'premium' and not p.is_demo
 order by p.created_at;
```

Each row is either a paying/approved person (grant them Premium in Admin → Users, which migrates them; choose an expiry if appropriate) or a leftover from the old demo upgrade (revoke). Do not bulk-convert without reviewing the list.

## 4. Admin controls

Every admin function is `SECURITY DEFINER`, pins `search_path`, has `execute` revoked from `public` and `anon`, and begins with `if not public.is_admin()`. `is_admin()` is false for demo profiles.

| Action | Server check | Audit row |
|---|---|---|
| Grant Premium | admin, reason, future expiry, not an admin or demo target | `grant_premium` |
| Revoke Premium | admin, reason, not an admin target, something to revoke | `revoke_premium` |
| Deactivate / reactivate another account | admin, reason, not self, not an admin, not demo | `deactivate_account` / `reactivate_account` |
| Sync profiles | admin | `sync_profiles` |
| User directory, audit log, Premium roster | admin (read-only) | none (reads) |

A non-admin cannot: call any of the above (error "Admins only"); read other people's profiles (`profiles` select is own row or admin); read others' entitlements; read or write the audit log (no grants beyond admin `select`); write `entitlements`. Audit rows can still be changed by the database owner (SQL editor / service role); that is inherent to Supabase.

Manual checks for a non-admin test account (SQL editor, as that user):

```sql
begin;
  set local role authenticated;
  select set_config('request.jwt.claim.sub', '<NON-ADMIN TEST USER UUID>', true);
  select public.admin_grant_premium('<ANY UUID>', null, 'test');          -- expect: ERROR Admins only
  select public.admin_set_account_status('<ANY UUID>', true, 'test');     -- expect: ERROR Admins only
  select * from public.admin_user_directory(10,0,null,null);              -- expect: ERROR Admins only
  select count(*) from public.admin_audit_log;                            -- expect: 0 rows visible (policy)
  insert into public.entitlements (user_id, source, grant_reason) values ('<ANY UUID>','admin_grant','x');  -- expect: permission denied
rollback;
```

## 5. Manual reminders for the first release

Decision: the GabayNegosyo team sends Premium reminders by hand. **Keep disabled and do not build an email system.**

What is switched off / unchanged:
- `vercel.json` now schedules **no** cron job (it was calling the route daily; the route returned "off", but nothing should be scheduled). The route code remains.
- `REMINDERS_MODE` defaults to `off`. `lib/mailer.ts` sends nothing unless `EMAIL_PROVIDER` is `gmail` or `resend` with keys. **Check Vercel → Environment Variables**: if `EMAIL_PROVIDER`, `GMAIL_USER`, `GMAIL_APP_PASSWORD`, `RESEND_API_KEY`, `EMAIL_FROM`, `CRON_SECRET` or `REMINDERS_MODE` were set during v0.16, remove or blank them. While `EMAIL_PROVIDER` is set, the **"Send test reminder"** button on Deadlines would send a real email to the signed-in Premium user. Unset, it only logs a mock entry.
- Reminder preferences (`reminder_configs`), deadline data and the Deadlines page are untouched.
- Nodemailer/Resend are not enabled and `nodemailer` is not upgraded here (see OPEN_ITEMS).

Who is eligible: **`select * from public.admin_premium_roster();`** (new in 006, admin-only, read-only). It uses the computed entitlement, so admin-granted Premium counts and expired/revoked Premium does not; it excludes demo, deactivated, unsubscribed and admin accounts. The old `profiles.role` field is not used.

**Minimum to add later (recommendation, not built):**
1. *Zero code:* each week run the roster query; look up each person's tax type and status (Admin → Users shows plan only, so use the Supabase table editor on `business_profiles`) and the fixed due dates in `data/requirements.json`; email from the team inbox; record "who/what/when" in a shared sheet.
2. *Smallest code step:* one table `manual_reminder_log(id, user_id, requirement_id, due_date, sent_by, sent_at, note)` with a unique key on `(user_id, requirement_id, due_date)`, and two admin functions: `admin_log_manual_reminder(...)` and `admin_list_manual_reminders(...)`.
3. *Admin screen:* "Reminders": list the roster; for each person, compute upcoming dates in the browser with the existing rule engine (needs an admin-readable view of that person's business profile, which also needs a privacy-notice line saying staff may view it to send reminders); a **Mark sent** button writes the log row. Skip templates and sending.

## 6. Manual QA checklist (prioritized)

Use a **test project or test accounts**, never your own real account. Record evidence as: date, build version (footer or `package.json`), browser and device, account email (test only), and a screenshot or short screen recording; for database results paste the query output.

**P0: must pass before release**

| # | Test | Expected | Evidence |
|---|---|---|---|
| 1 | Sign up with email, confirm by email link | Account created, confirmation email arrives, login works, wizard opens | Screenshot of confirmation and dashboard |
| 2 | Log in with an existing account | Dashboard shows the saved profile and checklist progress | Screenshot |
| 3 | Google login (if enabled) | Lands on dashboard; profile row exists | Screenshot + `select email, role from profiles where email = '…'` |
| 4 | Deactivate (test account) | Signed out, "deactivated" page; logging in shows only the reactivation screen; data not loaded | Screenshots; `select deactivated_at, deactivated_by_admin from profiles where email='…'` |
| 5 | Reactivate | Dashboard returns with the same data | Screenshot |
| 6 | Admin deactivates that account | User cannot reactivate (clear message); admin can reactivate; audit log shows both | Screenshots + audit page |
| 7 | Permanent deletion (test account): wrong word, stale login, then success | Wrong word refused; stale login asks to log in again; success signs out and shows the deleted page; rows gone from every table; one hashed row in `account_deletion_log`, no email | Screenshots + queries for each table by user id |
| 8 | Premium grant with a short expiry | After refresh Premium features unlock; Account shows the end date; audit shows grant with reason | Screenshots + audit page |
| 9 | Premium expiry | After `expires_at` passes (set it a minute ahead on the test project) the account is Free again without any action | Screenshot + `select * from get_my_entitlement()` as that user |
| 10 | Premium revocation | Free immediately after refresh; audit shows revoke | Screenshots |
| 11 | Admin filter | A newly granted account appears under Premium, not Free | Screenshot |
| 12 | Non-admin authorization | SQL block in section 4 returns the expected errors; the Users page redirects a non-admin | Pasted output |
| 13 | Demo accounts | Demo Premium works; cannot be deactivated or deleted; nothing is written to Supabase | Screenshots + empty audit/log tables |
| 14 | Send-email fail-closed | A deactivated Premium account and a free account cannot send a test reminder | Screenshot of the refusal (or a `curl` with the token showing 403) |

**P1: before announcing**

| # | Test | Expected | Evidence |
|---|---|---|---|
| 15 | Dashboard and checklist | Counts, statuses, step ticks and notes persist after reload and on a second device | Screenshots on two devices |
| 16 | Mobile responsiveness at 320, 360, 375, 390, 414, 768 px | No horizontal scroll, no clipped buttons or dialogs, tap targets usable | One screenshot per width on Home, Wizard, Dashboard, Checklist, Account |
| 17 | Keyboard | Tab reaches every control in order with a visible focus ring; dialogs trap focus, Esc closes, focus returns to the opener; no keyboard trap | Short screen recording |
| 18 | PWA install: Android Chrome and desktop Chrome/Edge | Install prompt/menu item appears; opens standalone with icon and theme color | Screenshots of install and launch |
| 19 | Offline behaviour | Airplane mode shows the offline banner; previously visited public pages load; /offline page for uncached ones; saving shows an honest error; reconnect shows "back online" | Screenshots at each step |
| 20 | Logout clears cached account pages | After logout, going offline does not show the previous user's pages | Screenshot |

**P2: nice to have:** Safari/iOS, Samsung Internet, screen reader pass (NVDA or VoiceOver), low-end Android performance feel, 200% browser zoom.

## 7. Final report (v0.17.1)

**Files changed since 0.17.0:** `database/migrations/005_account_lifecycle.sql`, `006_entitlements.sql`, `lib/entitlements.ts`, `lib/auth.tsx`, `lib/types.ts`, `lib/deleteAccountHandler.ts`, `app/api/send-email/route.ts`, `app/api/delete-account/route.ts`, `components/DeactivateAccountSection.tsx`, `components/DeleteAccountSection.tsx`, `vercel.json`, `tests/v017.test.js`, `tests/reminders.test.js`, docs (this file, `ACCOUNT_AND_ACCESS.md`, `REMINDERS_SETUP.md`, `OPEN_ITEMS.md`, `CHANGELOG.md`, `PROGRESS.md`), version files.

**Security concerns:** deactivated sessions (2, item 1); admin-deactivated user can self-delete; deactivation without re-login; manual 30-day purge; `nodemailer` high advisory (breaking upgrade, email disabled); Premium content is client-visible by design; check Vercel for leftover email variables.

**Database changes required:** apply 005 then 006 (section 1.4). One destructive statement: dropping `upgrade_to_premium_demo()`.

**Tests already passed (observed):** `npm test` 206/206, `tsc --noEmit`, contrast check, production build, SQL syntax parse of 005/006/setup. These are code-level checks; none ran against a database or browser.

**Not yet performed:** every item in section 6; execution of the migrations; rehearsal on a copy; real deletion on a database; session behaviour after admin deactivation; PWA install; low-end Android; screen reader.

**Recommended deployment order:** backup → rehearse on a branch → deploy 0.17.1 → run 005 → verify → run 006 → verify → P0 QA → P1 QA → announce.

**Rollback:** redeploy the previous Vercel build (safe against the new database, except the upgrade button which stays gone); run each file's rollback block for the database; do not restore `upgrade_to_premium_demo()`.

**Release blockers:** (1) migrations applied and verified; (2) P0 tests 1–14 passed with evidence; (3) legacy Premium list reviewed; (4) Vercel email variables confirmed unset; (5) decision on the admin-deactivation session risk (accept or add a server ban route); (6) Premium feature tiers confirmed by the owner (resource library, progress, deadline status); (7) content verification (separate track, not a code blocker).
