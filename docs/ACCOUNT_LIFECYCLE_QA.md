# GabayNegosyo — Account Lifecycle and Premium QA (Work Package 3)

| | |
|---|---|
| Starting build | 0.17.1 (`GabayNegosyo_v0_17_1_AFTER_TASK_02.zip`); no newer work was present |
| Date | 2026-11-02 |
| `package.json` version | **unchanged (0.17.1)**: nothing here is validated in a browser, database or build, so no new version is claimed |
| Production SQL run | **None.** Migration 008 is prepared, **not applied anywhere** |
| Database tests | **Not run.** No PostgreSQL existed in this session. The new database checks are written but unexecuted |
| Browser tests | **Not run** |
| `tsc` project check / `next build` | **Not run** (no `node_modules`, no network). See section 7 |

## 0. Plain-language summary

**Fixed in code (and covered by tests that really ran):**
1. **Deleting an account now fails closed.** Before, an unreadable role or demo flag looked like "not an admin, not a demo" and the deletion went ahead (F-07). Now any failed lookup refuses with a 503 and deletes nothing.
2. **Admin-deactivated people can no longer keep a login (DB-05).** A new server route blocks their Supabase sign-in when an admin deactivates them, and restores it on reactivation. They also can no longer delete themselves, so an account an admin is reviewing cannot vanish.
3. **The browser plan check fails closed.** A network or permission error used to fall back to the stored role (so a Premium/admin role could show as Premium without verification). Now only a valid server answer, or the documented "migration 006 not installed yet" case, can produce Premium (F-08).
4. **Half-migrated sites no longer show everyone as Free** (DB-02): the profile lookup retries without the new columns.
5. The "this deletion happened" record is now written **after** the deletion succeeds, not before.
6. The browser-only profile picture is removed when an account is deleted.

**Prepared but not applied (migration 008):** the audit log becomes append-only and every row carries a reason; grant, revoke and deactivate record the status **before and after**; a hashed account reference keeps old rows identifiable after an account is deleted; revoking no longer relabels already-expired grants (DB-12).

**What I could not prove:** anything on your real Supabase project, any browser journey, whether Supabase really stops a banned user refreshing a session, and whether 008 runs cleanly (I read it carefully but could not execute it).

## 1. How to read this report

| Tag | Meaning |
|---|---|
| **EXECUTED** | A JavaScript test in this session ran the real TypeScript logic with fake dependencies and passed. |
| **TEXT** | A test checks a source or SQL file's *text*. It proves a guard is written, not that PostgreSQL/Next enforces it. |
| **REHEARSED-WP2** | Verified in WP2's throwaway local PostgreSQL (153 checks). SQL unchanged by WP3, so still valid for the 005/006 behaviour; not Supabase. |
| **WRITTEN-NOT-RUN** | Code or SQL written in WP3 that no test could execute. |
| **UNVERIFIED** | Needs your Supabase project, a browser or Vercel. |

## 2. Account lifecycle results

| Item | Result | Evidence and notes |
|---|---|---|
| Sign-up | **Code reviewed; browser UNVERIFIED** | `signup()` sends the name as metadata, uses the allow-listed redirect helper, detects an already-registered email without leaking details. Error wording EXECUTED. |
| Login | **Code reviewed; browser UNVERIFIED** | Error mapping EXECUTED (wrong password, unconfirmed email, rate limit, banned account). |
| Email confirmation | **UNVERIFIED** | Link returns to `/auth/confirmed`; failure classification (expired/denied/invalid) EXECUTED. Needs Supabase "Confirm email" on and your site URL in the redirect allow-list. |
| Google sign-in | **UNVERIFIED** | Wired to `/login` via the safe redirect helper, behind `NEXT_PUBLIC_ENABLE_GOOGLE_LOGIN`. Needs the Google provider configured in Supabase (`docs/GOOGLE_OAUTH_SETUP.md`). Provider-off message EXECUTED. |
| Profile creation | **Pass on design** | Signup trigger inserts id/email/name only, never a role (TEXT; REHEARSED-WP2: role `free`, null-email user still gets a profile). |
| Profile updates | **Pass on design; observation** | A user can change **only `profiles.name`** (column grant; REHEARSED-WP2). **No screen edits the name today.** I did not add one (scope). Business-profile updates go through the wizard (WP4). |
| Self deactivation | **Pass (data); browser UNVERIFIED** | RLS blocks the person's own data while deactivated; admins and demo accounts refused (REHEARSED-WP2 + TEXT). Screen shows only the reactivation notice (TEXT). |
| Self reactivation | **Pass** | Needs a signed-in session; refuses when an admin imposed it (REHEARSED-WP2 + TEXT). |
| **Admin deactivation** | **Improved; WRITTEN-NOT-RUN against Supabase** | See section 4. |
| **Permanent deletion** | **Pass (logic EXECUTED); route and Supabase UNVERIFIED** | See section 3. |

### 3. Permanent deletion, requirement by requirement

| Requirement | Result |
|---|---|
| Fresh authentication | The server requires the Supabase `last_sign_in_at` to be within 10 minutes (EXECUTED: exactly at the limit passes, 1 ms over is refused, missing value refused). The dialog also re-checks the password, which renews that timestamp. **Caveat:** Google accounts have no password, so they depend on signing in again within 10 minutes. Whether a real token *refresh* leaves `last_sign_in_at` untouched is UNVERIFIED. |
| Typed `DELETE` | Enforced by the server, not only the dialog (EXECUTED: `delete`, `Delete`, `DELET`, empty, non-strings all refused). |
| Server-side execution | `/api/delete-account` with the service key, which never reaches the browser (TEXT). Only the identity proven by the token is deleted; a body naming another user is ignored (EXECUTED). |
| Removes all intended records | `auth.users` deletion cascades to 8 tables (REHEARSED-WP2: 0 rows left; TEXT re-checks every FK). The browser-only profile picture is now removed too (TEXT). |
| Minimal record only | `account_deletion_log`: hash of the id, role, dates; no email/name/token (TEXT). Written **only after** a successful deletion (EXECUTED); a logging failure never undoes the deletion; a failed deletion leaves no record. Admin audit rows keep their content but their account links become NULL. |
| Other accounts unaffected | Only the caller's id is ever passed (EXECUTED); REHEARSED-WP2 showed other users' rows untouched. |
| Refused cases | Not signed in, wrong word, stale sign-in, admin, demo (browser id and database flag), **admin-deactivated**, and **any failed lookup** (503). All EXECUTED, each proving nothing was deleted or recorded. |

**Owner decision needed (DB-05):** an admin-deactivated person can no longer delete themselves; the message tells them to contact the site owner. This protects accounts under review but means they must ask you. If you want them able to delete anyway (for example for privacy-law reasons), it is one line in `lib/deleteAccountHandler.ts`.
**Known limit:** `account_deletion_log` rows are purged only when someone runs `select public.purge_expired_deletion_log();` (nothing is scheduled), so "30 days" is a maximum you must enforce.

## 4. Admin-deactivated accounts and the valid-session problem

What was already true (REHEARSED-WP2): the database stops the person reading or writing their data, and they cannot lift the deactivation.

What was missing: Supabase Auth did not know, so they could still sign in, refresh a session and change their password.

**Implemented** (`POST /api/admin/account-status`, `lib/adminAccountStatusHandler.ts`):
- The caller must pass the database's own `is_admin()` (real, non-demo admin). Ordinary users get 403 (EXECUTED).
- **Deactivate:** the audited database function runs first (it refuses admins, demo accounts, yourself, missing reasons), and only if it succeeds is the person's Auth user **banned**. A refused target is never banned (EXECUTED). If the ban fails, the deactivation stands, the data stays blocked, and the admin sees a warning (EXECUTED).
- **Reactivate:** the target is checked first (exists, not admin, not demo, really deactivated), the ban is lifted, then the database step runs. If it fails, the account is still marked deactivated (EXECUTED). It cannot lift a ban on some other account.
- Banned sign-in attempts show: "deactivated by an administrator" (EXECUTED).
- Self-deactivated people are **not** banned; they must log in to reactivate.

**What is still not guaranteed (UNVERIFIED / limits):**
1. Whether Supabase blocks the *refresh* of an existing session after a ban, and exactly how long an already-issued access token stays valid (the project's JWT lifetime, usually about an hour). During that time the database still refuses their data, but they could still reach pages that need no database data.
2. A ban is applied only through the new route. An admin who calls the database function directly with their own token (not through the app) deactivates without banning. Admins are trusted; the data block still applies.
3. The ban outcome is shown to the admin but not stored in the audit log (the log can be written only from inside the database).

## 5. Premium entitlements

| Scenario | Result | Evidence |
|---|---|---|
| Admin can grant Premium | Pass on design | `admin_grant_premium` is admins-only, reason required, audited (REHEARSED-WP2; TEXT on 008 version) |
| Optional expiry | Pass | Future date only; empty = no expiry (REHEARSED-WP2; UI date → Manila end of day EXECUTED in v0.17 tests) |
| Admin can revoke | Pass | Ends active grants, clears a legacy role, refuses when nothing to revoke (REHEARSED-WP2) |
| Expired returns to Free | Pass | Evaluated each time the plan is read, no job needed: premium → `expired` → Free (EXECUTED client + server decision; REHEARSED-WP2 in SQL) |
| Revoked returns to Free | Pass | `cancelled` → Free (EXECUTED; REHEARSED-WP2) |
| Users cannot grant themselves Premium | Pass | No write grants on `entitlements`/role (REHEARSED-WP2); admin functions refuse non-admins, demo admins and anon (REHEARSED-WP2); an edited browser role cannot override the server plan (EXECUTED); a scan finds no client code that writes entitlements, roles or the audit log (TEXT) |
| Demo accounts | Pass | Browser-only previews use source `demo` and never reach Supabase. Database profiles flagged `is_demo`: no automatic admin power, cannot be granted Premium, cannot be deactivated or deleted (REHEARSED-WP2 + EXECUTED handler). *Observation:* an old database demo row with `role='premium'` still resolves Premium through the legacy rule; those rows are deprecated (`supabase_demo_accounts.sql` must never be run). |
| Legacy Premium handled consistently | Pass in SQL and display | Legacy `role='premium'` counts **only** for accounts that never had an entitlement; granting moves them in so expiry works; revoke clears it (TEXT + REHEARSED-WP2). Admin Users list, dashboard (needs 007) and the reminder roster all use the computed plan. |
| Fails closed | Fixed | Browser and server resolvers EXECUTED against 6 error types × 3 roles and 7 malformed rows: always Free/unverified. |

**Still inconsistent (not fixed, belongs to WP5):** the disabled reminder cron selects its audience with `role in ('premium','admin')`, ignoring entitlements. It is switched off (no cron schedule), but if it is ever re-enabled it would email expired accounts and miss granted ones. The manual reminder workflow should use `admin_premium_roster()`.
**Owner decision pending (unchanged):** `deadline_status`, `progress_tracking` and `resource_library` are Free in the app while the project context lists "expanded supporting documents/resources" as Premium. I changed no feature tiers.

## 6. Admin audit trail

What each operation records:

| Operation | Actor | Target | Time | Reason | Status change |
|---|---|---|---|---|---|
| Grant Premium | admin (from the login, not a parameter) | account | database clock | required | before/after plan, expiry, entitlement id, legacy migration flag (008) |
| Revoke Premium | same | same | same | required | before/after plan, entitlements ended (008) |
| Deactivate / reactivate | same | same | same | required | before/after active flag and "by admin" flag (008) |
| Profile sync | same | none | same | fixed text (008) | rows created |

**Unauthorised modification (008, WRITTEN-NOT-RUN):** update, delete and truncate are refused by triggers for every role including the table owner; the only allowed update is the automatic unlink when a linked account is deleted. `INSERT/UPDATE/DELETE/TRUNCATE` are also revoked from `service_role`; signed-in users can only `SELECT` (RLS: real admins). Backed by TEXT tests, plus rehearsal section 15 (about 50 checks) that nobody has been able to run. **Without 008, rows are protected only by missing grants, which a database owner or service key could bypass.** Even with 008, a database owner can drop the triggers; no SQL file can prevent that.

**Not audited (gaps):**
- Changing a role to `admin`/`premium` by SQL in the Supabase editor leaves no audit row (no function exists for it). Recommend never using SQL for this once admin tooling exists, or recording it by hand.
- Self-service deactivate/reactivate by users, and running the deletion-log purge, are not in the admin log (they are not admin actions).
- After an account is deleted its audit rows keep reason, status changes and a hashed account reference but not the email.

## 7. Tests: what was and was not run

**Run, with actual results**

| Check | Result |
|---|---|
| `npm test` (all of `tests/*.test.js`) | **268 tests, 268 pass, 0 fail, 0 todo.** Baseline was 232 (229 pass, 3 todo). The 3 `todo` tests became real guards; 36 new tests are in `tests/wp3_account_lifecycle.test.js` |
| Mutation check | Four deliberate breakages (broad "does not exist" fallback, unreadable role allowing deletion, missing truncate trigger, ban before the database step) each made the suite fail; files restored and byte-compared |
| Type check of the pure logic files (`lib/entitlements.ts`, `deleteAccountHandler.ts`, `adminAccountStatusHandler.ts`, `authErrors.ts`, `types.ts`) with TypeScript 6.0.3, strict | Passed |
| Type check of the two routes and `lib/adminUsers.ts` with the third-party modules stubbed as `any` | Only error: an unrelated missing stub (`SupabaseClient`). Weak evidence, since Supabase's real types were not present |
| `bash -n` on `run_rehearsal.sh` | Syntax OK (not executed) |

**Existing tests I changed (and why):** `v017` "record BEFORE deletion" → now AFTER (behaviour change, section 3); `v017` admin client test → account status now goes through the server route; `v013` and `wp2` service-key lists → include the new admin route; `wp2` three `todo` flags removed; `wp2` "demo lookup that throws" now expects a 503 instead of an exception.

**Not run**
- `npm run lint` (project `tsc`), `npm run build`, `npm audit`: no dependencies and no network.
- **Any SQL**, including migration 008, `wp3_post_migration_checks.sql` and rehearsal section 15.
- Anything on Supabase (ban behaviour, redirects, Google), any browser journey, Vercel.

## 8. Findings

| ID | Finding | Severity | Status |
|---|---|---|---|
| WP3-01 | F-08: any "does not exist" error treated as "function not installed" | Medium | Fixed, EXECUTED |
| WP3-02 | F-07: delete route lookups failed open | Medium | Fixed, EXECUTED |
| WP3-03 | Browser plan fell back to stored role on any error; unreadable profile hid migration gaps (DB-02) | Medium | Fixed (logic EXECUTED; page behaviour UNVERIFIED) |
| WP3-04 | DB-05: admin-deactivated user keeps/refreshes login, can self-delete | Medium | Mitigated: ban route + delete block, WRITTEN-NOT-RUN against Supabase |
| WP3-05 | Deletion record written before deleting | Low | Fixed, EXECUTED |
| WP3-06 | Audit log not append-only; no reason column or status change | Medium | **008 prepared, not applied** |
| WP3-07 | DB-12 revoke relabels expired grants | Low | In 008 |
| WP3-08 | Role changes by SQL are unaudited | Medium | **Open** |
| WP3-09 | **Re-running 003/005/006 after 008 silently reverts five functions** | Medium | Documented in 008 header; re-run 008 to restore |
| WP3-10 | Reminder cron audience ignores entitlements | Low (cron off) | Open → WP5 |
| WP3-11 | Browser profile picture survived deletion | Low | Fixed, TEXT |
| WP3-12 | No screen to edit the account name | Info | Not added (scope) |
| WP3-13 | Deletion-log purge is manual | Low | Open, documented |

## 9. Manual tests for you (test accounts only, never real customers)

Apply order, only after your approval and the WP2 pre-flight: **005 → 006 → (007) → 008**, then `database/verification/wp3_post_migration_checks.sql` (all rows `true`), then deploy the app. Back up first (WP2 section 7B).

| # | Test | Expected |
|---|---|---|
| 1 | Sign up with email; open the confirmation link; log in | Lands on the wizard; plan Free |
| 2 | Log in with Google (if enabled) | Same; profile row exists |
| 3 | Admin → Users → Grant Premium (expiry tomorrow, reason) | User shows Premium until that date; Audit log shows **Change: Free → Premium until …** |
| 4 | Revoke it | User is Free; Audit shows Premium → Free (Premium revoked) |
| 5 | Set an expiry in the near future (ask for help to shorten) | After it passes: "Free (Premium expired)" |
| 6 | As a free user, try the API probes in `DATABASE_SECURITY_REVIEW.md` §8 (rpc grant, PATCH role) | Refused |
| 7 | User deactivates self, logs in again, reactivates | Data intact |
| 8 | Admin deactivates a user (with reason) | Admin sees "Saved" with **no warning**. User cannot log in ("deactivated by an administrator"). An already-open session soon loses access |
| 9 | Admin reactivates them | They can log in and use the app |
| 10 | Admin-deactivated user (before step 9) tries the delete endpoint | 403 "contact the site owner" |
| 11 | Try to deactivate an admin, yourself, and a demo row | Refused, nothing banned |
| 12 | Delete a test account (type DELETE, password) | Account gone; Table Editor shows no rows for it; audit rows remain with no email |
| 13 | As a signed-in admin, try to `update`/`delete` an audit row through the API | Refused |
| 14 | Log in as a Google user, wait 11 minutes, try to delete | Asked to sign in again |

## 10. Decisions and actions for you

1. Approve (or not) applying **008** after 005/006 (and optionally 007); preferably on a spare project first.
2. Decide whether admin-deactivated people may self-delete (section 3).
3. Confirm the Free/Premium tiers still pending (section 5).
4. Run the new rehearsal (`database/rehearsal/run_rehearsal.sh`, local PostgreSQL only) if you can; section 15 has never been executed and may need small fixes.
5. Run `npm ci`, `npm run lint`, `npm run build` on your machine; I could not.

## 11. Session report (handoff protocol)

**Inspected:** the full lifecycle path: `lib/auth.tsx`, `entitlements.ts`, `authorization.ts`, `deleteAccountHandler.ts`, `adminUsers.ts`, `adminActions.ts`, `authErrors.ts`, `authRedirect.ts`; routes `delete-account`, `send-email`, `cron/send-reminders` (audience query); admin Users and Audit pages; Account, guards and notices; migrations 005, 006 and the baseline; WP2 tests, rehearsal and verification files.

**Added:** `database/migrations/008_audit_hardening.sql` (not applied); `database/verification/wp3_post_migration_checks.sql`; `app/api/admin/account-status/route.ts`; `lib/adminAccountStatusHandler.ts`; `tests/wp3_account_lifecycle.test.js`; `docs/ACCOUNT_LIFECYCLE_QA.md`; `docs/HANDOFF_AFTER_WP3.md`.

**Modified:** `lib/entitlements.ts`, `lib/auth.tsx`, `lib/deleteAccountHandler.ts`, `lib/adminUsers.ts`, `lib/authErrors.ts`, `app/api/delete-account/route.ts`, `app/admin/users/page.tsx`, `app/admin/audit/page.tsx`, `database/rehearsal/run_rehearsal.sh` (new section 15 appended), `tests/v013.test.js`, `tests/v017.test.js`, `tests/wp2_database.test.js`, `docs/ACCOUNT_AND_ACCESS.md`, `CHANGELOG.md`. Migrations 001–007, `supabase_setup.sql`, `data/*` and all client-facing content are untouched. **Deleted:** none.

**Next recommended task:** Work Package 4 (Core User Experience), after you return the WP2 pre-flight and decide on applying 005 → 008.
