# GabayNegosyo — Database Security Review (Work Package 2)

| | |
|---|---|
| Reviewed build | `package.json` version **0.17.1** (ZIP `GabayNegosyo_v0.17.1_AFTER_TASK_01.zip`) |
| Review date | 2026-11-02 |
| Scope | Migrations `001`–`006`, `supabase_setup.sql`, the obsolete `schema.sql` / demo SQL, and the app code that talks to the database |
| **Production SQL run** | **None.** No SQL was executed against your Supabase project. Nothing was deployed. |
| **Status** | **STOPPED. Waiting for your approval before any database execution** (section 10). |

---

## 0. Summary in plain language

**The good news.** I ran the whole SQL history (baseline, then 001 to 006) in a real, throwaway PostgreSQL 16 on this machine and attacked it as different kinds of users. **153 checks passed, 0 failed.** The permission design holds up: ordinary users cannot read each other's data, cannot make themselves Premium or admin, cannot call admin functions, and a deactivated account loses access to its own data. Deleting an account cleans up every table. Migrations 001, 002 and 004 to 007 ran cleanly a second time.

**What I could not prove.** My local database is *not Supabase*. It uses a stand-in for Supabase's login system. So "passes here" means "the SQL logic is right", not "your live project is right". Nobody has yet run 005 or 006 on a real Supabase project, and I have not seen your live database.

**The five things that matter most**

| # | Finding | Severity | What to do |
|---|---|---|---|
| DB-01 | A function that lets any logged-in user make themselves Premium (`upgrade_to_premium_demo`) may still exist in your live database. I reproduced the problem locally with a stand-in for that function. Migration 006 deletes it. | **Critical if present** (unknown) | Run the read-only pre-flight (section 7A). One number tells us. |
| DB-02 | **Deploy order matters.** The v0.17.1 app asks the database for columns that only migration 005 creates. If the app is deployed *before* 005 runs, the profile lookup fails quietly and **everyone, including admins and Premium users, appears as Free.** | **High** | Apply the database migrations first, then deploy the app (section 7C). |
| DB-03 | Migrations 005 and 006 have never run on a real database, and the project keeps no record of what was applied, so I cannot tell you what state your live database is in. | **High** | Pre-flight first; rehearse on a spare Supabase project if you can. |
| DB-04 | The admin dashboard counts Premium users by the old `role` column, so accounts granted Premium show up as Free. Confirmed locally. | Medium | **Migration 007** (prepared, not applied) fixes it. |
| DB-10 | Re-running migration 003 *after* 005 or 007 silently reverts two admin functions. Confirmed locally. | Medium | Never re-run 003. A warning is now written into 007. |

Everything else is Low or informational (section 4).

**What I added** (nothing existing was edited except where noted in section 11): migration `007` (prepared, not applied), a local rehearsal script with 153 checks, two read-only SQL files you can paste into Supabase, 26 new automated tests, and this document.

---

## 1. How to read this report

Every claim says how it was established. The handoff rules say one kind of test must never be reported as proof of another.

| Tag | Meaning |
|---|---|
| **REHEARSED** | I ran it in a throwaway local PostgreSQL 16.15 with a Supabase *stand-in* (roles, `auth.users`, `auth.uid()`, Supabase's default permissions). Real SQL behaviour, but **not Supabase**. |
| **READ** | I read the code or SQL. It has not been executed. |
| **TESTED-JS** | An automated test in `tests/`. These check file *text* and pure logic. They prove a guard is *written*, not that it *works*. |
| **UNVERIFIED** | Needs your real Supabase project, a browser, or Vercel. I could not check it. |

Severity: **Critical** (exploitable or release-stopping), **High**, **Medium**, **Low**, **Info**.

---

## 2. Starting point and discrepancies

- Starting version: **0.17.1**, matching the handoff. The ZIP already contains `docs/PROTOTYPE_AUDIT_v1.md` from Work Package 1, so no newer work was overwritten.
- Migrations `005` and `006` are present, as expected. The ZIP has **no `.git` folder**, so I cannot compare against any deployed commit.
- The ZIP filename (`..._AFTER_TASK_01`) and the handoff both say 0.17.1; consistent.
- I took your Work Package 1 audit findings (F-nn) as the starting list and re-verified the database-related ones. Where I refer to them I keep the F-nn number.

---

## 3. Migration inventory

| File | Purpose | Needs first | Safe to re-run? | Reverts |
|---|---|---|---|---|
| `supabase_setup.sql` | Baseline: `profiles`, `business_profiles`, `checklist_progress`, `reminder_configs`, `sent_emails`, `task_progress`, `is_admin()`, signup trigger, RLS | an empty project | **No.** Plain `create table/policy/trigger` (DB-13) | n/a |
| `001` | Index on `sent_emails.sent_at` | baseline | Yes | `drop index` |
| `002` | `task_progress` (already inside the baseline) | baseline | Yes | — |
| `003` | Profile sync trigger, `admin_account_overview()`, `admin_sync_profiles()` | baseline | **Re-running it after 005/007 reverts functions (DB-10)** | — |
| `004` | `reminders_unsubscribed_at`, `reminder_deliveries` | baseline | Yes | — |
| `005` | Deactivation columns, audit log, deletion log, `is_account_active()`, restrictive policies, deactivate/reactivate/admin-status functions, audited `admin_sync_profiles()` | 001–004 | Yes | in file |
| `006` | `entitlements`, `entitlement_for()`, grant/revoke, user directory, audit-log reader, `admin_premium_roster()`, **drops `upgrade_to_premium_demo()`** | **005** (writes to its audit log) and **004** (`reminders_unsubscribed_at`) | Yes | in file (see 7F) |
| **`007` (new)** | Admin dashboard counts by computed plan | 006 | Yes | re-run 003's overview block |
| `schema.sql` | **Obsolete**, a different schema with security switched off | — | — | **Never run** (DB-13) |
| `supabase_demo_accounts.sql` | **Deprecated** demo-account script | — | — | **Never run** (DB-13) |

**Ordering facts (REHEARSED and READ).** 005 must come before 006 (006 writes to 005's audit table), and 004 must come before 006 (the roster reads `reminders_unsubscribed_at`). On a fresh database the order `baseline → 001 → 002 → 003 → 004 → 005 → 006 → 007` applied with no error, and 001, 002, 004, 005, 006, 007 re-ran cleanly a second time.

---

## 4. Findings

Numbering: `DB-nn` are this report's findings. "F-nn" refers to the Work Package 1 audit.

### DB-01 — The self-upgrade function may still exist in production · **Critical if present** · UNVERIFIED (F-00)

- **Evidence.** Old builds created a function `upgrade_to_premium_demo()` that any signed-in user could call. Migration 006 ends with `drop function if exists public.upgrade_to_premium_demo()`. Removing the button from the app does not remove the function.
- **REHEARSED (with a stand-in).** I do not have the original source of that function, so I wrote a minimal look-alike that flips the caller's own role to `premium`. Before 006, a normal user calling it became Premium. After 006 the function no longer exists. This shows the *kind* of hole and that 006 closes it. It does not show whether your live database has it.
- **Action.** Run the pre-flight (7A). Row 01 must be `0`. If it is `1`, tell me, and the drop should be approved and applied first. If you cannot run 006 yet, `drop function if exists public.upgrade_to_premium_demo();` on its own is a safe, one-line fix.
- **Also look at row 02 of the pre-flight.** It lists any function in your database that this project does not know about (drift).

### DB-02 — App v0.17.1 breaks (silently) on a database that has not had 005 · **High** · READ

- **Evidence.** `lib/auth.tsx` `loadUser()` reads `deactivated_at` from `profiles` in a single query and never checks that query's error. If that column does not exist, the whole query fails, `profile` is `null`, and the code falls back to `role = "free"`.
- **Impact.** Deploy the new app before migration 005 and every user, including admins and Premium users, would look like a Free user in the app. Nothing crashes, so it would look like a mysterious permissions bug.
- **Rule.** **Database first, then app.** (Section 7C.) For a rollback of the database to before 005, the app must also go back to a pre-0.17 Vercel deployment (7F).
- **Later fix (WP3/WP4).** Make `loadUser` retry without the new column, or surface an error instead of defaulting to Free. I did not change app code in this package.
- The send-email route already tolerates the missing column (it handles error code `42703`).

### DB-03 — Migrations never run on a real database, and no history is kept · **High** · UNVERIFIED (F-02)

- **Evidence.** There is no Supabase CLI setup and no migration-history table, so the only way to know what is applied is to look at the database. 005/006 were only syntax-parsed in earlier sessions. I ran them for the first time in my local rehearsal.
- **Action.** Run the pre-flight (7A); it reports which of 001–007 are present and any unknown functions. If your plan lets you create a second Supabase project, apply 005 → 006 → 007 there first and run the post-migration checks plus the manual tests in section 8, then do production.

### DB-04 — Admin dashboard under-counts Premium (F-13) · **Medium** · REHEARSED · **fix prepared: migration 007**

- **Evidence.** `admin_account_overview()` (003) counts `role = 'premium'`. A user granted Premium by an admin keeps `role = 'free'`. In the rehearsal the dashboard function reported **2** Premium accounts while the Users directory (computed plan) reported **3**.
- **Fix.** `007_admin_overview_computed_plan.sql` replaces that one function so both screens use the same decision function. Same output columns, so the app needs no change. REHEARSED: after 007 the two numbers match, free + premium + admin = total, non-admins and demo admins are still refused, and the file re-runs cleanly. Not applied to anything real.

### DB-05 — Admin-deactivated users keep a login session (F-06) · **Medium** · REHEARSED (data side) / UNVERIFIED (session side)

- **What is verified.** After an admin deactivates an account, the database stops that person reading or writing their own data (REHEARSED), they cannot lift the deactivation themselves (REHEARSED), and the flag survives if the acting admin is later deleted (REHEARSED).
- **What is not blocked.** Supabase Auth itself is untouched. The person can still sign in and refresh their session, change their password, and call `/api/delete-account`, which would erase the account an admin wanted to act on. Existing sessions also stay valid until their token expires.
- **Decision for WP3.** Accept and document, or add a server route that bans the Auth user using the service key. Also decide whether admin-deactivated users may delete themselves.

### DB-06 — Fail-open fallbacks in the app (F-07, F-08) · **Medium** · TESTED-JS (as TODO)

- **F-07.** The delete route's role and demo-flag lookups ignore errors. A failed lookup looks like "not an admin, not a demo", so those protections are skipped. Three tests describe the correct behaviour and are marked `todo`, so they report but do not fail the suite until WP3 fixes the code.
- **F-08.** `resolveServerAccess` treats *any* error containing "does not exist" as "migration 006 is not installed" and falls back to the stored role. An unrelated error such as `relation ... does not exist` matches too. Marked `todo`.
- **Note.** A throwing demo lookup does *not* delete (the handler lets the error escape); that is a normal, passing test.

### DB-07 — Privacy: what admins and users can see · **Low/Medium** · READ

- Admins can read **every user's `sent_emails`** (recipient, subject, body) by design (policy "read own, admins read all"). `db.hydrate()` also loads the **50 newest rows of everyone's** log into an admin's browser memory. Fine for one trusted admin; worth a line in the privacy notice (F-22).
- `profiles` is granted `SELECT` at table level, so a user can read **every column of their own row**, including `deactivated_by` (the acting admin's internal id). It is only an unguessable id, but it is more than the user needs.

### DB-08 — Restrictive policies call `is_account_active()` per row · **Low (performance)** · READ

`using (public.is_account_active())` is evaluated for each row. Supabase recommends `(select public.is_account_active())` so it is evaluated once per query. Irrelevant at prototype scale. I did **not** change it: it would rewrite security policies on five tables for no visible benefit. Revisit if tables grow.

### DB-09 — `sent_emails` can be forged and has no size limit · **Low** · REHEARSED

A user may insert rows into their own `sent_emails` with any recipient, subject and body (needed so the send route can log with the user's own token). A real admin then sees those rows in the admin log. There are no length limits (the route limits 200/5000 characters, the database does not). **Best fixed by WP5** (removing or hard-disabling the email path, F-03), which makes the table unnecessary. I did not change this table.

### DB-10 — Re-running 003 undoes later fixes · **Medium** · REHEARSED

003 defines `admin_account_overview()` and `admin_sync_profiles()`; 005 replaces the second with an audited version and 007 replaces the first. If anyone runs 003 again later, both revert (no audit row for syncs; role-based counts). REHEARSED, and re-running 005 then 007 restores them. **Rule: never re-run 003.** 007 carries this warning in its header.

### DB-11 — Notes on the powerful roles · **Info** · REHEARSED / READ

- Supabase's default permissions give `service_role` execute on new functions. `entitlement_for` and `log_admin_action` are revoked from `anon`/`authenticated` but remain callable by `service_role`. That role is used only by trusted server code (and the three routes using it are the only ones that mention the key: TESTED-JS).
- `purge_expired_deletion_log()` skips its admin check when `auth.uid()` is null (the service role or SQL editor). Safe because only `authenticated` and `service_role` can execute it; confirmed that a normal user and a demo admin are refused.

### DB-12 — Revoke also stamps old, expired grants · **Low** · REHEARSED

`admin_revoke_premium` marks *every* unrevoked grant as revoked, including ones that had already expired. The count it returns and logs (`entitlements_ended`) is therefore inflated (2 in the rehearsal, with one active and one expired grant) and an expired grant turns into "cancelled". Access decisions are unaffected. Not changed.

### DB-13 — Obsolete and non-repeatable SQL files (F-17) · **Medium** · READ

- `database/schema.sql` describes an unused schema with security commented out. Running it on a real project would create insecure tables. `supabase_demo_accounts.sql` is deprecated. **Neither was touched.** Recommend archiving them with your approval in WP8.
- `supabase_setup.sql` is not repeatable. A second run will stop at the first object that already exists. I did not test how the Supabase SQL editor handles that mid-script, so treat it as "do not re-run." Your live project already has it applied.

### DB-14 — Future-dated entitlement reads as "expired" · **Info** · READ

`entitlement_for` reports an entitlement whose start date is still in the future as `expired`. The admin grant function always starts "now", so this cannot happen through the app; only a hand-written insert could. No change.

---

## 5. Security requirements checklist (prompt section 2)

| Requirement | Result | Evidence |
|---|---|---|
| Users reach only their own private records | **Pass** | REHEARSED: with two users' rows in every table, each user saw only their own 1 of 2 rows in the 5 data tables and in `profiles`; inserting, updating or deleting another user's rows was rejected or touched 0 rows; `anon` could read nothing |
| Deactivated accounts cannot reach protected data | **Pass (data)** | REHEARSED: 0 rows visible, writes rejected, rename blocked; profile row stays readable for the reactivation screen. Session caveat: DB-05 |
| Admin operations require a verified admin | **Pass** | REHEARSED: all 9 admin functions refuse a normal user, a **demo admin** and `anon` (27 checks) |
| Demo accounts cannot do restricted account operations | **Pass** | REHEARSED: demo admin has no admin powers and no automatic Premium; demo cannot self-deactivate, be deactivated or be granted Premium. App-side delete protection has the F-07 gap |
| Premium cannot be granted by client-side manipulation | **Pass, once 006 is applied** | REHEARSED: role/flag/entitlement/audit writes all rejected for a signed-in user; direct calls to `entitlement_for` and `log_admin_action` rejected. Depends on DB-01 being resolved in production |
| Service-role use is limited to trusted server code | **Pass** | TESTED-JS: only the delete, unsubscribe and cron routes use the key; no client file and no `NEXT_PUBLIC_` name exposes it |
| Definer functions are not injectable via search path | **Pass** | REHEARSED: all 18 pin an empty `search_path`; none is executable by `anon` |
| RLS on every table | **Pass** | REHEARSED + TESTED-JS |

Functions a signed-in user may call (each checks the caller itself): `admin_account_overview`, `admin_grant_premium`, `admin_list_audit_log`, `admin_premium_roster`, `admin_revoke_premium`, `admin_set_account_status`, `admin_sync_profiles`, `admin_user_directory`, `deactivate_my_account`, `get_my_entitlement`, `is_account_active`, `is_admin`, `purge_expired_deletion_log`, `reactivate_my_account`.

---

## 6. Data integrity (prompt section 3)

| Area | Result | Evidence |
|---|---|---|
| Profile creation after signup | **Pass** | REHEARSED: new user gets role `free` and the name from sign-up metadata; a user with **no email** still gets a profile (email stored as empty) instead of blocking signup |
| Profile synchronization | **Pass** | REHEARSED: an email change in Auth reaches `profiles`. 003's backfill and `admin_sync_profiles` are READ |
| Business profile persistence | **Pass on design** | TESTED-JS: `upsert` targets `user_id`, which is the primary key; `user_id` always comes from the session, never from input. Actual browser save/reload: UNVERIFIED (WP4). Load failure drops saves: F-04 (WP4) |
| Checklist progress | **Pass on design** | TESTED-JS: `onConflict` matches the primary key; every status written is allowed by the `CHECK` constraint |
| Individual task progress | **Pass on design** | TESTED-JS: composite primary key `(user_id, requirement_id, cycle, task_index)` matches the upsert; REHEARSED: isolation between users |
| Reminder preferences | **Pass on design** | TESTED-JS: `7 | 3 | 1` in the app equals the `CHECK`. Nothing consumes them while email is off (F-03) |
| Premium entitlements | **Pass** | REHEARSED: grant, expiry, re-grant, revoke, revoke-twice refused, legacy account honours expiry, an expired account with a stale `role='premium'` does **not** regain Premium |
| Account deletion cleanup | **Pass** | REHEARSED: after deleting the auth user, **0 rows** remained in 8 tables (`profiles`, 5 user tables, `reminder_deliveries`, `entitlements`); audit rows were kept with the person's link set to NULL; other users untouched |
| Audit trail survives admin deletion | **Pass** | REHEARSED: deleting the acting admin keeps the rows (actor NULL) and the "deactivated by an admin" flag |

---

## 7. Migration preparation

> **Nothing below has been run. Every step needs your approval first.** Whoever runs it needs access to your Supabase project (that is you).

### 7A. Pre-flight (read-only, safe to run now)

1. Supabase → **SQL Editor → New query**.
2. Paste the full contents of `database/verification/wp2_preflight_readonly.sql` and press **Run**. It reads catalogs only and shows counts and object names, no emails or passwords.
3. Send the resulting table (or a screenshot) to the next session.

How to read it:

| Row | Good | If not |
|---|---|---|
| 01 `upgrade_to_premium_demo` | `0` | `1` = DB-01 is live: stop and tell me |
| 02 unknown functions | `none` | anything listed is drift, tell me |
| 03–08 migration 001–006 applied | `true` for the ones you believe you ran | `false` for 005/006 is expected today |
| 09 007 applied | `false` | expected until approved |
| 11 tables without RLS | `none` | any name is a problem |
| 12 anon-executable definer functions | `none` | any name is a problem |
| 14 legacy Premium accounts | note the number | review before 006 (see `docs/ACCOUNT_AND_ACCESS.md` §4) |
| 15 demo-flagged profiles | `0` | old demo users exist: delete them in Authentication → Users when convenient |

I tested this file on two local databases (a "before 005" one with the stand-in hole, and the fully migrated one).

### 7B. Backup before changing anything

I have **not** checked which backup features your Supabase plan includes, so look in **Dashboard → Database → Backups** first. If a downloadable or point-in-time backup is offered, take one and note the time.

Whatever your plan offers, also take this simple, tool-free copy (all of it is read-only):

1. **Data.** Dashboard → Table Editor → for each of `profiles`, `business_profiles`, `checklist_progress`, `task_progress`, `reminder_configs`, `sent_emails` (and `reminder_deliveries`, `admin_audit_log`, `entitlements`, `account_deletion_log` if they exist) → **Export → CSV**. Keep the files out of the repository (they contain personal data).
2. **Structure.** Run these two queries in the SQL editor and use **Download CSV** on each result:
   - `select p.proname, pg_get_functiondef(p.oid) from pg_proc p join pg_namespace n on n.oid = p.pronamespace where n.nspname = 'public' order by 1;`
   - `select schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check from pg_policies where schemaname = 'public' order by 2, 3;`

   Those files let someone rebuild the old functions and policies by hand if a rollback is ever needed.
3. Write down the current Vercel deployment (Vercel → Deployments → the live one). That is your app rollback point.

### 7C. Safe execution order

Do it in this order and **stop at the first surprise**.

| Step | Action | Who | Expect |
|---|---|---|---|
| 0 | Pre-flight 7A, backups 7B | you | numbers sent back; backup files saved |
| 1 | *(Only if 7A row 01 = 1)* `drop function if exists public.upgrade_to_premium_demo();` | you, after approval | Success. Re-run row 01: `0` |
| 2 | *(Strongly recommended)* Do steps 3–6 on a spare Supabase project first | you | all checks pass |
| 3 | Run `migrations/005_account_lifecycle.sql` | you, after approval | "Success. No rows returned." |
| 4 | Run `migrations/006_entitlements.sql` | you, after approval | same |
| 5 | Run `migrations/007_admin_overview_computed_plan.sql` *(optional but recommended)* | you, after approval | same |
| 6 | Run `database/verification/wp2_post_migration_checks.sql` | you | rows 1–17 `ok = true` (row 18 `true` only after step 5) |
| 7 | **Then** deploy the v0.17.1+ app on Vercel (DB-02) | you | site loads; log in as admin; confirm the Admin menu appears |
| 8 | Manual tests, section 8 | you + next session | all pass |

**Do not run:** `supabase_setup.sql` (already applied, not repeatable), `schema.sql`, `supabase_demo_accounts.sql`, or `003` again.

**Compatibility notes.** The old app against the new database: its "Upgrade now (demo)" button simply fails (the function is gone, intended); accounts granted Premium through an admin keep `role = 'free'`, so only the new app shows them as Premium. So deploy the app soon after step 6. New app against the old database: see DB-02.

### 7D. Post-migration verification SQL

`database/verification/wp2_post_migration_checks.sql` (read-only; one table; checks functions, permissions, policies, columns and cascades). I ran it against my rehearsal database: all 17 checks `true`, row 18 `true` after 007. It checks the *shape* of your database. Behaviour as a real signed-in user needs section 8.

### 7E. Behaviour tests on the real database (section 8)

See section 8.

### 7F. Rollback

Rollbacks do not touch accounts or user data unless stated. Reverse order: 007 → 006 → 005.

| Undo | How | Cautions |
|---|---|---|
| **007** | Re-run the `create or replace function public.admin_account_overview()` block from `003_sync_profiles.sql` | Dashboard goes back to role-based counts |
| **006** | The rollback comment at the end of the file: drop the functions, then `drop table public.entitlements;` | (1) **Export `entitlements` and `admin_audit_log` to CSV first.** Dropping loses all grants. (2) Granting or revoking Premium to a *legacy* account set its `role` to `free`. Before dropping, restore them: `update public.profiles set role = 'premium' where id in (select target_user_id from public.admin_audit_log where action = 'grant_premium' and details ->> 'legacy_role_migrated' = 'true');` — check each person against the audit log first, since a later revoke may have been intentional. (3) `upgrade_to_premium_demo()` is **deliberately not restored**. |
| **005** | The rollback comment at the end of the file | (1) **Dropping the restrictive policies instantly gives deactivated users their access back.** Decide what you want first. (2) Keep `admin_audit_log` and `account_deletion_log` unless you accept losing the audit trail. (3) 006 depends on 005's audit table, so undo 006 first. |
| **App** | Vercel → Deployments → *Promote to production* on the old deployment from 7B | If you roll the **database back before 005**, you must also roll the **app back to a pre-0.17 deployment** (DB-02). Rolling back only the app, with 005/006 still applied, is fine. |

---

## 8. Manual behaviour tests on the real database (need test accounts)

The SQL editor has no signed-in user, so `is_admin()` is false there. These must be done through the app or with a real user token. Use **test accounts, never real customers.** Preparing a test admin needs one SQL statement by you (`update public.profiles set role = 'admin' where email = '<test admin email>';`), which needs your explicit approval.

| # | Test | Expected |
|---|---|---|
| 1 | Free user opens Account | Plan = Free |
| 2 | Admin grants Premium (with expiry) in Admin → Users | Free user, after refresh, is Premium; Users list and Dashboard both count them (needs 007 for the dashboard) |
| 3 | Admin revokes it | User becomes Free; "ended" label |
| 4 | Grant with an expiry for tomorrow, then wait, or ask me for a way to simulate | Becomes "expired", not Premium |
| 5 | User deactivates themselves | Sees reactivation screen only; reactivates; data intact |
| 6 | Admin deactivates a user | User cannot reactivate themselves; admin can lift it |
| 7 | Direct API probe as the free user (replace the placeholders; **never paste real keys into chat or a file**): `curl -X POST "<PROJECT_URL>/rest/v1/rpc/admin_grant_premium" -H "apikey: <ANON_KEY>" -H "Authorization: Bearer <FREE_USER_ACCESS_TOKEN>" -H "Content-Type: application/json" -d '{"p_target":"<ANY_UUID>","p_expires":null,"p_reason":"test"}'` | Error containing `Admins only` |
| 8 | Same style probe: `PATCH <PROJECT_URL>/rest/v1/profiles?id=eq.<OWN_ID>` with body `{"role":"admin"}` | `permission denied` and the role is unchanged |
| 9 | Same probe for `rpc/upgrade_to_premium_demo` | `404`/"could not find the function" |
| 10 | Delete a **test** account from Account → Delete | All its rows gone (check Table Editor); audit rows remain |

---

## 9. Tests: what was run and what was not

**Run**

| Check | Result |
|---|---|
| Local database rehearsal (`database/rehearsal/run_rehearsal.sh`) on PostgreSQL 16.15 | **153 passed, 0 failed.** Log: `database/rehearsal/LAST_RUN.txt` |
| `npm test` (all JS tests) | **232 tests: 229 pass, 0 fail, 3 TODO.** The original 206 still pass; 26 are new in `tests/wp2_database.test.js` |
| Guard sanity check | Temporarily appended `grant select on public.entitlements to anon;` to 006: the new test failed as intended; file restored and byte-compared identical to the ZIP |
| Read-only SQL files | Both run against local databases; outputs as described |

**The 26 new JS tests cover:** migration numbering; no grants to `anon`; RLS on every table; cascade deletion and audit `SET NULL`; empty `search_path` and `anon` revoke on every definer function; every browser-callable function checks its caller; internal functions not callable; the self-upgrade function is dropped and never created; no write grants on sensitive tables; migration 007 shape; app-to-schema contract (every table, every RPC name, the profile columns, the columns the admin screens read, the plan values, the `onConflict` keys and CHECK values); service-role containment; data-layer write guards; fail-closed server-access cases; and 3 TODO tests for F-07/F-08.

**Not run (and why)**

- `npx tsc --noEmit` and `npm run build`: **not run.** This session could not reach the npm registry, so `npm ci` failed and no dependencies could be installed. I changed no TypeScript or app files, only SQL, tests, a shell script and docs, so the risk is low, but this is not proof. Run `npm run lint` and `npm run build` locally.
- Anything on your real Supabase project; the PostgREST/API layer; Supabase Auth's real schema; Supabase's SQL editor behaviour; any browser test; the deployed site; Vercel.
- **Limits of the rehearsal:** the `auth` schema and roles are a stand-in; the real project may have extra triggers, extensions or owner differences; my `upgrade_to_premium_demo` is a reconstruction; and PostgREST's request handling (how a JWT becomes `auth.uid()`) was simulated with a setting.

---

## 10. Decisions and approvals needed from you

1. **Pre-flight (7A)** — read-only; run it and send me the table. *(Needed before anything else.)*
2. **Approve** applying `005`, `006` and (optionally) `007` — to a spare project first if possible, then production — in the order in 7C.
3. Do you want migration **007** at all? (It only changes the admin dashboard counts.)
4. Create a **spare Supabase project** for rehearsal if your plan allows.
5. Carry-over decisions from WP1 that affect later packages: admin-deactivated sessions and self-delete (DB-05), email code removal (F-03, also closes DB-09), archiving `schema.sql`/demo SQL (DB-13).

**I have stopped here. I will not run, and have not run, any SQL against your Supabase project.**

---

## 11. Session report (handoff protocol)

**Starting version:** 0.17.1, as expected.

**Inspected:** all SQL (`supabase_setup.sql`, `001`–`006`, `schema.sql`, demo SQL); `lib/entitlements.ts`, `authorization.ts`, `auth.tsx`, `db.ts` (all read/write paths), `adminUsers.ts`, `adminActions.ts`, `adminAccounts.ts`, `deleteAccountHandler.ts`; routes `delete-account`, `send-email`, and the cron audience query; the existing `tests/v017.test.js`.

**Added (new files only):**
- `database/migrations/007_admin_overview_computed_plan.sql` (prepared, **not applied**)
- `database/rehearsal/00_supabase_stub.sql`, `run_rehearsal.sh`, `LAST_RUN.txt`
- `database/verification/wp2_preflight_readonly.sql`, `wp2_post_migration_checks.sql`
- `tests/wp2_database.test.js`
- `docs/DATABASE_SECURITY_REVIEW.md` (this file), `docs/HANDOFF_AFTER_WP2.md`

**Modified:** nothing. Migrations 001–006, `supabase_setup.sql`, app code, `data/*`, `package.json` and all client-facing content are byte-identical to the ZIP. (`package.json` version stays 0.17.1: no app behaviour changed and 007 is not applied.)

**Deleted / renamed:** none.

**Known risks left open:** DB-01 (unknown), DB-02 (deploy order), DB-03, DB-05, DB-06 (todo tests), DB-07 to DB-14 as listed.

**Manual owner actions:** section 10.

**Next recommended task:** owner returns the pre-flight and approves the migration steps; then **Work Package 3, Account Lifecycle and Premium**, which fixes DB-06 (turn the 3 `todo` tests into real guards), decides DB-05, and tests the account journeys with real test accounts.
