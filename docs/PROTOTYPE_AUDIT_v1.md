# GabayNegosyo — Prototype Audit v1 (Work Package 1)

| | |
|---|---|
| Audited build | `package.json` version **0.17.1** (supplied ZIP `GabayNegosyo-v0.17.1.zip`) |
| Audit date | 2026-11-02 |
| Scope | Read-only audit. No source, data, SQL, or content file was changed. This document is the only file added. |
| Not touched | `data/*` (client-facing content and datasets), `database/*`, `app/*`, `lib/*`, `components/*`, `public/*` |

## How to read this report

Every finding says **how it was established**, because the handoff rules forbid treating one kind of check as proof of another:

| Tag | Meaning |
|---|---|
| **RAN** | I executed it in this environment and observed the result. |
| **READ** | I read the code or SQL. It has not been executed against a database or browser. |
| **DOC** | The repository's own documentation says so. I did not independently confirm it. |
| **UNVERIFIED** | Cannot be established from the ZIP. Needs the owner's Supabase, Vercel, or browser access. |

Severity: **Critical** (exploitable or release-stopping), **High**, **Medium**, **Low**.

---

## 0. Executive summary

**Where v0.17.1 stands:** the code is in good shape for a prototype. It type-checks, builds, and passes all 206 automated tests. The five defects found in the v0.17.0 review are fixed in the code (section 2.1). But **nothing in the account, entitlement, or admin system has ever run against a real database or a real browser.** Migrations 005 and 006 were only syntax-parsed. Several of the "tests" are source-text assertions, not behavior tests.

**The five things that matter most:**

1. **Possible live self-upgrade hole (Critical, UNVERIFIED).** Until migration 006 runs, the production database may still contain `upgrade_to_premium_demo()`, which lets any signed-in user promote themselves to Premium. The v0.17.1 app no longer calls it, but the function is a database object, so it works if called directly. Migration 006 drops it. Whether it exists in production is unknown.
2. **The manual reminder workflow does not exist (High, READ).** The read-only `admin_premium_roster()` function was added, but nothing in the app calls it. There is no admin screen, no copy-reminder-text feature, and no "mark as sent" log.
3. **Live email code is still present and wired to the UI (High, READ).** `/api/send-email`, the "Send test reminder" button, `lib/mailer.ts`, `nodemailer`, and the cron route all still exist. They stay inert only while certain Vercel variables are unset. This conflicts with the Version 1 rule "no email provider integration or automated email." It also carries the one `npm audit` high-severity advisory (nodemailer).
4. **A failed data load silently discards the user's saves (High, READ).** If `db.hydrate()` fails at login, the wizard and checklist writes are dropped with no error shown.
5. **Premium is a UI paywall, not a content boundary (Medium, DOC + READ).** All Premium content ships in the JavaScript bundle. The code is honest about this, but the owner needs to decide that it is acceptable for Version 1. The Free/Premium feature matrix is also still unconfirmed.

**What I could not check:** anything needing a database, a browser, Vercel, or the deployed site. See section 9.

---

## 1. Current system architecture

### 1.1 Stack (READ + RAN)

| Layer | Actual |
|---|---|
| Framework | Next.js **16.4.3** (Turbopack), App Router |
| UI | React **18.3.1** (the build warns that React 18 is deprecated in Next 16), TypeScript 5.5.4 |
| Backend | Supabase (Auth + Postgres + RLS) via `@supabase/supabase-js` ^2.116 |
| Hosting | Vercel (`vercel.json` has `"crons": []`) |
| Email | `nodemailer` ^7 (Gmail SMTP) or Resend HTTP API, both in `lib/mailer.ts` |
| Analytics | `@vercel/analytics` (cookieless) |
| Node | `engines` requires **>=22.18** (tests rely on built-in TypeScript stripping) |

### 1.2 Shape of the application

- **Almost every page is a client component.** There is no `middleware`/`proxy` file and no server component that fetches user data. Route protection is `AuthGuard` / `AdminGuard`, which run in the browser. This is acceptable only because the real protection is Row Level Security and the SECURITY DEFINER SQL functions. It means page HTML and bundled content are served to anyone.
- **Data layer (`lib/db.ts`).** After login, `db.hydrate()` loads the user's rows into an in-memory cache so the UI can read synchronously. Writes update the cache first, then fire-and-forget to Supabase. A failed save shows a toast (`DbErrorToasts`) but the cache is not rolled back.
- **Content (agencies, requirements, resources, tutorials)** ships as JSON in `data/` inside the bundle. Admin edits are stored **only in the admin's own browser localStorage** (`gn_store_v1`) and never reach other users (section 5, F-09).
- **Four API routes:**

| Route | Purpose | Auth |
|---|---|---|
| `POST /api/send-email` | Sends a test reminder to the caller's own address | Bearer token; Premium; rate limit 5/hour |
| `POST /api/delete-account` | Deletes the caller's account (service-role key) | Bearer token; `DELETE` word; recent sign-in (10 min) |
| `GET/POST /api/unsubscribe` | Stops reminder digests | HMAC-signed link |
| `GET /api/cron/send-reminders` | Daily digest job | `CRON_SECRET`; off unless `REMINDERS_MODE` is set |

- **Build output (RAN):** 40 route entries, including 4 dynamic API routes and `/requirements/[id]`.

### 1.3 Database (READ)

Base tables (`supabase_setup.sql`): `profiles`, `business_profiles`, `checklist_progress`, `reminder_configs`, `sent_emails`, `task_progress`.
Added by migrations: `reminder_deliveries` (004), `admin_audit_log` and `account_deletion_log` (005), `entitlements` (006).

Key functions: `is_admin()`, `is_account_active()`, `entitlement_for()` (internal, not callable by API roles), `get_my_entitlement()`, `deactivate_my_account()`, `reactivate_my_account()`, `admin_set_account_status()`, `admin_grant_premium()`, `admin_revoke_premium()`, `admin_user_directory()`, `admin_list_audit_log()`, `admin_premium_roster()`, `admin_account_overview()`, `admin_sync_profiles()`, `purge_expired_deletion_log()`.

The access model is sound on paper:
- Users can only update `profiles.name` (column-level grant).
- RLS is owner-only on all user-data tables.
- Five user-data tables get a RESTRICTIVE "active account only" policy.
- Entitlements and the audit log have no write grants; changes go only through audited definer functions.
- `is_admin()` excludes `is_demo` profiles.

### 1.4 Plan decision flow (READ)

`entitlement_for(user)` returns, in order: admin role → active unrevoked unexpired entitlement → legacy `role='premium'` only if the user has **never** had an entitlement row → most recent entitlement as `cancelled`/`expired` → `free`. The browser gets the result from `get_my_entitlement()`; `/api/send-email` re-derives it server-side and refuses on any verification failure.

---

## 2. Verification of the v0.17.1 claims

### 2.1 Claimed fixes: are they present in the ZIP? (READ unless noted)

| Claimed in handoff | Found? | Notes |
|---|---|---|
| Admin Premium filters use computed plan | **Yes** | `admin_user_directory()` filters on `entitlement_for()`, not `profiles.role` (006). |
| Legacy Premium fallback limited to never-entitled accounts | **Yes** | `entitlement_for()`: `not exists (select 1 from entitlements …)`. |
| Demo accounts blocked from deactivate/delete | **Yes, with a gap** | Blocked in `deactivate_my_account`, `admin_set_account_status`, `admin_grant_premium`, and the delete route. The delete route's lookups fail open (F-07). |
| Entitlement verification fails closed | **Partly** | True for `/api/send-email` (returns 503 when unverified). The browser falls back to the stored role if the RPC errors (F-10). The cron audience still uses `profiles.role` (F-12). |
| Admin deactivation tracked separately | **Yes** | `deactivated_by_admin boolean` (005), independent of `deactivated_by`. |
| `admin_premium_roster()` added | **Yes, but unused** | No caller anywhere in `app/`, `lib/`, or `components/`. |
| Cron schedule removed from `vercel.json` | **Yes** | The route code is still present and reachable with `CRON_SECRET`. |
| 206/206 tests, typecheck, contrast, build pass | **Reproduced** | See 2.2. |

### 2.2 Checks I ran (RAN)

| Check | Result |
|---|---|
| `npm ci` | Succeeded |
| `npm test` | **206 / 206 pass** (reproduces the handoff) |
| `npx tsc --noEmit` | Pass |
| `npm run build` (dummy Supabase variables) | Pass, 40 route entries |
| `node scripts/contrast-check.mjs` | 40 / 40 pairs pass |
| `npm audit --omit=dev` | **1 high-severity** package: `nodemailer` 7.x (many advisories; fix is a breaking major, 10.x) |

Not run: any SQL, any browser, the dev server, the deployed site, or Supabase.

Side effect worth knowing: `contrast-check` **rewrites `docs/CONTRAST_REPORT.md`** in place. I restored the original from the ZIP. A check script that edits a tracked file is a small hygiene problem (F-23).

### 2.3 Discrepancies against the handoff

- The ZIP contains **no `.git` directory**, so the commit, history, and diff against `004d050` or the deployed build cannot be checked. (UNVERIFIED)
- The handoff mentions "38 routes" at v0.16.5. The v0.17.1 build lists 40 route entries; the increase is plausible (new admin audit page and account routes) and not a concern.
- Test count rose from 162 to 206, consistent with the handoff.
- Migrations 005 and 006 **are present**, as the handoff expected.
- The ZIP has no `.env` files and no `node_modules`/`.next` (good).

---

## 3. Feature inventory

Access levels follow what the code actually enforces today. "Browser tested" is **No** for every feature: no document in the repository records a completed browser run, and `docs/QA_REPORT.md` explicitly lists browser interaction as NOT RUN.

"Tests" means automated tests in `tests/`. Many of those check source text rather than behavior (see F-14), so "Yes" does not mean "verified at runtime".

| # | Feature | Key files | How it works today | DB dependencies | Access | Tests | Browser tested | Known bugs / gaps |
|---|---|---|---|---|---|---|---|---|
| 1 | Public pages (home, credits, privacy, terms, disclaimer, 404, offline) | `app/page.tsx`, `app/privacy`, `app/terms`, `app/disclaimer`, `app/credits`, `components/LegalPage.tsx` | Static pages; contact details come from env vars | none | Public | Yes (disclaimer, content) | No | Privacy page does not mention deactivation, the 30-day deletion record, entitlement/audit records, or an email provider (F-22). |
| 2 | Sign-up, login, logout, password reset, email confirmation | `app/signup`, `app/login`, `app/reset-password`, `app/auth/confirmed`, `lib/auth.tsx`, `lib/authRedirect.ts` | Supabase Auth, validated redirect URLs | `auth.users`, `profiles` trigger | Public → Free | Yes (redirect and error helpers) | No | Supabase redirect-URL setup is manual and unverified. |
| 3 | Google sign-in | `lib/auth.tsx`, `NEXT_PUBLIC_ENABLE_GOOGLE_LOGIN` | Behind a build flag; provider configured in Supabase | `auth.users` | Public | Partial | No | **UNVERIFIED** whether the provider is enabled in the real project (`docs/QA_REPORT.md` records it was not). |
| 4 | Browser-only demo mode | `lib/demoAccounts.ts`, `lib/demoSeed.ts`, `components/DemoBanner.tsx` | Env-flag; localStorage only; no Supabase writes; no admin demo | none | Public (flag) | Yes | No | Deprecated `database/supabase_demo_accounts.sql` still shipped (F-17). |
| 5 | Business profiling wizard | `app/wizard/page.tsx`, `lib/ncr.ts`, `lib/barangays.ts` | Multi-step form; saves profile as JSON | `business_profiles` | Free | Yes (`wizard.test.js`) | No | **F-04:** a failed login-time load makes saves vanish silently. Legacy fields `businessType: "other"` and `businessStructure: "sole_proprietor"` are hard-coded. |
| 6 | Guest preview | `app/preview/page.tsx`, `db.saveGuestProfile` | Wizard answers kept in `sessionStorage`; adopted on first sign-in | none until sign-in | Public | Yes | No | None found. |
| 7 | Personalized checklist | `app/checklist/page.tsx`, `lib/ruleEngine.ts` | Rule engine filters 24 requirements by profile | `business_profiles`, `checklist_progress` | Free | Yes (strong: rules, engine, journey) | No | Dates use the browser's local clock, not Manila time (F-18). |
| 8 | Dashboard and agency progress | `app/dashboard/page.tsx`, `components/AgencyProgress.tsx` | Summary per agency | same | Free | Yes | No | Not inspected beyond gating and structure. |
| 9 | Requirement detail | `app/requirements/[id]/page.tsx` | Free: description, applicability, official link. Premium: documents, steps, forms, tutorial, penalty text | `checklist_progress`, `task_progress` | Free + Premium | Partial | No | Content is in the bundle; the gate is presentation only (F-05). |
| 10 | Checklist progress (requirement-level) | `db.markComplete` / `markIncomplete` | Upsert per requirement and cycle (year) | `checklist_progress` | Free | Yes | No | Optimistic cache; no rollback on failure. |
| 11 | Task-level progress | `db.setTaskDone`, requirement detail | One row per checked step | `task_progress` | **Effectively Premium** (steps sit inside `PremiumGate`) | Yes | No | Free users cannot track steps; the owner brief lists "basic progress tracking" as Free (F-05). |
| 12 | Deadlines and calendar | `app/deadlines/page.tsx`, `components/DeadlineCalendar.tsx` | Only 4 of 24 requirements have a fixed annual date | `checklist_progress` | Free | Yes | No | Thin coverage; undated items are listed separately (correct, no invented dates). |
| 13 | Reminder settings (7/3/1 days) | `app/deadlines/page.tsx`, `db.setReminderConfig` | Saves preferences | `reminder_configs` | Premium | Yes | No | Preferences are saved but nothing consumes them while the digest is off (F-03). |
| 14 | "Send test reminder" email | `lib/email.ts`, `app/api/send-email/route.ts`, `lib/mailer.ts` | Self-send, 5/hour; mock mode when no provider is configured | `sent_emails`, `entitlements` | Premium | Yes | No | **Live provider path (F-03).** Rate limit is not race-safe (F-11). |
| 15 | Daily digest cron | `app/api/cron/send-reminders/route.ts`, `lib/reminderDigest.ts` | Off by default; no schedule | `reminder_deliveries`, `profiles` | System | Yes | No | Wrong audience query (F-12); should be removed or hard-disabled for V1. |
| 16 | Unsubscribe link | `app/api/unsubscribe/route.ts`, `lib/unsubscribeToken.ts` | GET shows confirm page; POST unsubscribes; HMAC token | `profiles.reminders_unsubscribed_at` | Public (signed link) | Yes | No | No in-app way to resubscribe. |
| 17 | Penalties page | `app/penalties/page.tsx`, `lib/penalty.ts` | Rate table visible to all signed-in users; calculator is Premium | none | Free (rates) / Premium (calculator) | Yes (`simulator.test.js`) | No | Rate sources not cited in code (F-16). `/premium/penalty-simulator` redirects here (intentional). |
| 18 | Registration guide, renewal, BIR forms, resources, tutorials, business guide | `app/registration`, `app/renewal`, `app/bir-forms`, `app/resources`, `app/tutorials`, `app/guide` | Content pages from JSON | none | Free (signed in) | Content tests | No | Reviewed at structure and gating level only. 5 of 11 tutorials are placeholders; `FeatureGate` on Resources wraps a feature set to Free, so it does nothing. |
| 19 | Account page | `app/account/page.tsx` | Profile, avatar (browser only), plan, theme, deactivate, delete | `profiles` | Free | Partial | No | Avatar is not cleared on logout or deletion (F-21). Source is minified into long one-line blocks, which hurts maintainability. |
| 20 | Account deactivation / reactivation | migration 005, `components/DeactivatedNotice.tsx` | RPCs plus RESTRICTIVE RLS | `profiles`, 5 user tables | Free | Source-level tests only | No | Deactivated notice offers no delete option although the `AuthGuard` comment says a deactivated account may delete. |
| 21 | Account deletion | `app/api/delete-account/route.ts`, `lib/deleteAccountHandler.ts` | Service-role delete after checks | cascades from `auth.users` | Free | Yes (injected deps) | No | **F-07:** lookups fail open. |
| 22 | Premium entitlements | migration 006, `lib/entitlements.ts` | Admin grant/revoke, expiry, legacy handling | `entitlements` | Admin-managed | Yes (pure logic) | No | Migration never executed (F-02). |
| 23 | Admin dashboard | `app/admin/page.tsx`, `components/AccountSyncPanel.tsx` | Content health queue plus account overview | `admin_account_overview()` | Admin | Partial | No | **F-13:** Free/Premium counts use `profiles.role`, so entitlement-granted Premium users are counted as Free. |
| 24 | Admin user management | `app/admin/users/page.tsx`, `lib/adminUsers.ts` | Directory, grant/revoke, deactivate/reactivate, reason required | `admin_*` functions | Admin | Source-level tests | No | Help text still says "read-only". |
| 25 | Admin audit log | `app/admin/audit/page.tsx` | Reads `admin_list_audit_log()` | `admin_audit_log` | Admin | Source-level | No | None found. |
| 26 | Admin content editors (agencies, requirements, resources, tutorials) | `app/admin/*`, `lib/db.ts` | Edits stored in the admin's browser only | none | Admin | Yes | No | **F-09:** edits never reach users. |
| 27 | **Manual Premium reminder workflow** | none | **Not built** | `admin_premium_roster()` exists, no log table | Admin | n/a | n/a | **F-01.** |
| 28 | PWA (manifest, service worker, offline page, offline banner) | `public/manifest.json`, `public/sw.js`, `components/ServiceWorkerRegistration.tsx`, `OfflineBanner.tsx` | Precaches offline page and icons; network-first navigations | none | Public | Yes (`pwa.test.js`, source-level) | No | No install-prompt UI; offline behavior of signed-in pages unverified (F-19). |
| 29 | Admin-facing and developer documentation | `docs/*`, root `.md` files | Large and partly stale | n/a | n/a | n/a | n/a | F-15. |

---

## 4. Findings

Findings are numbered **F-nn** and referenced throughout. Each has severity, evidence, why it matters, and the recommended fix or decision. "WP" refers to the eight Version 1 work packages.

### 4.1 Critical

#### F-00 — Possible live self-upgrade to Premium (UNVERIFIED in production)
- **Severity:** Critical if present; unknown whether present.
- **Evidence (READ):** `supabase_setup.sql` and `docs/OPEN_ITEMS.md` / `docs/QA_REPORT.md` (v0.13 notes) record that earlier builds created `upgrade_to_premium_demo()`, which "lets any real user self-upgrade." Migration 006 ends with `drop function if exists public.upgrade_to_premium_demo()`. Per the handoff, 005/006 have not been confirmed as applied.
- **Impact:** If the function still exists in the production database, any signed-in user can call it through the Supabase API and become Premium with no admin involvement. Removing the button in the app does not remove the database function.
- **Action (owner, read-only):** In the Supabase SQL editor run `select proname from pg_proc where proname = 'upgrade_to_premium_demo';`. Zero rows = safe. One row = this is a live hole; schedule the drop (WP2) with owner approval. I did not and must not run SQL against production.

### 4.2 High

#### F-01 — Manual reminder workflow is not implemented
- **Evidence (READ):** `admin_premium_roster()` exists in 006; `grep` finds no caller. No `manual_reminder_log` table exists (`docs/INTEGRATION_AND_QA_v0.17.md` §5 recommends one, "not built").
- **Impact:** The owner's chosen Version 1 reminder process (show eligible Premium users, prepare reminder text, record that it was sent) has no UI at all.
- **Fix (WP5):** Admin screen that lists the roster, shows each person's upcoming deadlines, offers copy-to-clipboard reminder text, and records "sent by / when / note" in a small audited table. No sending. Note the design caveat already raised in the existing QA doc: computing a person's deadlines needs an admin-readable view of their business profile, which has a privacy implication to disclose.

#### F-02 — Migrations 005 and 006 have never been executed anywhere
- **Evidence (DOC + READ):** `docs/QA_REPORT.md` and `docs/INTEGRATION_AND_QA_v0.17.md` state they were syntax-parsed only. I also could not execute them (no database here).
- **Impact:** Every account-lifecycle, entitlement, admin-directory, and audit feature depends on them. Bugs in SQL that parsers do not catch (wrong column, permission error, logic) are still possible. Specific points to test are listed in WP2.
- **Fix (WP2):** Rehearse on a copy or test Supabase project, run each file's verification queries, then apply to the intended environment with approval.

#### F-03 — Live email path remains in the codebase and UI
- **Evidence (READ):** `/api/send-email` sends real mail when `EMAIL_PROVIDER` + credentials are set. `app/deadlines/page.tsx` shows "Send test reminder" to Premium users. `lib/mailer.ts` imports `nodemailer` and calls `api.resend.com`. `next.config.js` allows `https://api.resend.com` in the browser CSP `connect-src`. `.env.example` documents Gmail and Resend variables. The cron route is fully implemented.
- **Conflicts with:** Version 1 scope rules ("no email provider integration, no automated email, no cron").
- **Also advertised but not delivered:** the Premium feature list on `/premium/checkout`, the Account page, `PremiumGate`, and the Deadlines page promises "Email reminders for fixed deadlines (7, 3, or 1 day before)". With the digest off, users can only toggle a preference that nothing acts on.
- **Mitigating:** In mock mode (no provider variables) nothing is sent; it only logs a row.
- **Fix (WP5 + owner approval):** (a) Owner confirms the Vercel variables `EMAIL_PROVIDER`, `GMAIL_*`, `RESEND_API_KEY`, `EMAIL_FROM`, `REMINDERS_MODE`, `CRON_SECRET`, `REMINDER_SECRET`, `REMINDER_ALLOWLIST`, `NEXT_PUBLIC_REMINDERS_LIVE` are all unset. (b) Decide whether to remove the email code or hard-disable it. Removing it also eliminates the `nodemailer` advisory. (c) Reword the Premium list so it describes the manual reminder service, not automatic emails. This is a behavior change, so rule 15 requires explaining it first.

#### F-04 — A failed profile load silently drops the user's saves
- **Evidence (READ):** `lib/auth.tsx` `loadUser()` catches errors from `db.hydrate()` and only logs them. `db.hydrate()` sets `currentUserId` only on success. Every write in `lib/db.ts` begins with `if (!currentUserId) return;`, so it silently does nothing. `saveBusinessProfile` additionally requires `currentUserId` to match.
- **Result:** after a transient network or RLS error at login, the person can finish the wizard, see no error toast, and lose everything. The login redirect then sends them back to the wizard because `getBusinessProfile()` returns null. (Reasoned from code; not reproduced in a browser.)
- **Fix (WP4):** Treat hydrate failure as a visible error state with a retry; do not render guarded pages as if loaded. At minimum, report a failed write when there is no active user.

#### F-05 — Free/Premium matrix is unconfirmed, and Premium is presentation-only
- **Evidence (READ + DOC):** `lib/entitlements.ts` says Premium content "ships in the app's data files... not a content-protection boundary." `FEATURE_TIER` marks `deadline_status`, `progress_tracking`, and `resource_library` as Free while `PENDING_OWNER_TIERS` records the owner brief lists them as Premium. The handoff's baseline table lists expanded supporting documents and resources as Premium, but the Resource library is Free and `FeatureGate` on it is a no-op.
- **Detail:** task-level step tracking is inside `PremiumGate`, so Free users effectively cannot track steps although "basic progress tracking" is Free in the handoff baseline.
- **Impact:** What Free vs Premium users see is not a decided product position, and any user can read Premium content from the bundle.
- **Decision needed from owner:** (1) the final matrix; (2) confirm that a UI-level paywall is acceptable for a no-payments prototype, or move Premium content server-side later.

### 4.3 Medium

#### F-06 — Admin-deactivated users keep valid Supabase Auth sessions
- **Evidence (READ + DOC):** Deactivation only sets columns on `profiles`; no Auth-level ban. RESTRICTIVE RLS blocks the five data tables and the app shows only the reactivation screen, so data access is blocked as designed. But the person can still sign in, refresh tokens, change their password, and call `/api/delete-account`.
- **Impact:** Medium. Data access is blocked; the person is not fully locked out. An admin-deactivated user can delete their own account, removing the record an admin wanted to act on.
- **Decision (WP3):** Accept and document, or add a server route using the service-role key to set an Auth ban. Also decide whether admin-deactivated accounts may self-delete.

#### F-07 — Account deletion lookups fail open
- **Evidence (READ):** `app/api/delete-account/route.ts`: `getRole()` returns `null` and `isDemoAccount()` returns `false` when the query errors (the `error` field is never read). In `lib/deleteAccountHandler.ts` the admin check is `role === "admin"` and the demo check is `isDemoAccount?.()`. A lookup failure therefore skips both protections.
- **Impact:** An admin or demo-flagged account could be deleted if the profile lookup fails at that moment. The service-role client bypasses RLS, so the likely cause would be a transient database or network error. Probability is low; the action is irreversible.
- **Fix (WP3):** Treat an unreadable role or demo flag as "refuse and ask to retry." Add a test for the lookup-error path.

#### F-08 — `loadUser` and `resolveServerAccess` have broad fallbacks to the stored role
- **Evidence (READ):** `lib/auth.tsx` falls back to `entitlementFromRole()` when the RPC errors. `resolveServerAccess()` treats any error message matching `does not exist` as "migration 006 not installed" and falls back to role, which would also match an unrelated "relation ... does not exist" error.
- **Impact:** Low-to-Medium. Only users whose stored role is already `premium` benefit, and revocation/grant clear that role. But it contradicts the "fails closed" statement. After 006 is applied, the fallback should be removed rather than kept as a permanent escape hatch.

#### F-09 — Admin content editors save to the admin's browser only
- **Evidence (READ + DOC):** `lib/db.ts` header and `docs/SETUP.md` ("What is still local"). The admin dashboard eyebrow says "CONTENT IN THIS BROWSER", but the Admin Help text says "correct content."
- **Impact:** An admin can edit a requirement, see it change, and believe it is live. No other user ever sees it. Fixing content currently means editing `data/*.json` and redeploying.
- **Fix:** For Version 1, label the editors clearly as local previews (or hide them) and do not change client-facing content. A server-backed content store is out of scope for this release.

#### F-10 — Client-side plan check is advisory only
- Covered by F-05 and F-08. Listed separately so the release report states it plainly: the server-enforced parts of Premium are the entitlement records, the admin RPCs, and `/api/send-email`. Everything else is interface.

#### F-11 — `/api/send-email` rate limit is racy and under-counts
- **Evidence (READ):** The route counts recent rows, sends, then inserts the log row. Concurrent requests can all pass the count before any row is written. A failed provider call is not logged, so it does not count. The log insert result is ignored.
- **Related:** The `sent_emails` INSERT policy lets a user insert unlimited rows of any size with any subject, body, and recipient into their own log (no size cap).
- **Impact:** Low while the route is in mock mode; moot if the route is removed (F-03).

#### F-12 — Cron route audience still uses `profiles.role`
- **Evidence (READ):** `app/api/cron/send-reminders/route.ts` selects `.in("role", ["premium","admin"])`. Users granted Premium through entitlements keep `role = 'free'`, so they would be excluded; legacy or demo-adjacent rows and admins would be included. `docs/OPEN_ITEMS.md` already says to switch to `entitlement_for()` before enabling.
- **Fix:** Remove the route for Version 1 (preferred), or at minimum switch it to the computed plan before it can ever run.

#### F-13 — Admin account overview counts by role, not by plan
- **Evidence (READ):** `admin_account_overview()` (migration 003) counts `role = 'free'` / `'premium'`. `components/AccountSyncPanel.tsx` shows these as "Free" and "Premium."
- **Impact:** Admin-granted Premium users appear as Free on the dashboard, but correctly as Premium in the Users list. Two admin screens disagree.
- **Fix (WP2/WP5):** Recompute using `entitlement_for()` (as `admin_user_directory` already does).

#### F-14 — Test suite proves less than its count suggests
- **Evidence (READ + RAN):** Files such as `tests/v017.test.js` state that database and UI behavior is "covered by source-level assertions; those prove the guard is present, NOT that it ran." There are no database tests, no browser or end-to-end tests, and no CI configuration (no `.github`).
- **Impact:** 206 passing tests is a valid code-level result and nothing more. Per handoff rule 14, it must not be reported as evidence that RLS, entitlements, or the account lifecycle work.
- **Fix (WP2–WP8):** Add a repeatable database test script (run against a test project), and a documented manual or automated browser run for each user and admin journey.

#### F-15 — Documentation is large, duplicated, and partly stale
- `Architecture.md` and `docs/ARCHITECTURE.md` differ. `Design-System.md` / `docs/DESIGN.md` and `Product-Requirement-Document.md` / `docs/PRODUCT.md` are parallel copies.
- `AGENTS.md` says "Do not add per-release status files," yet `docs/V0.3_STATUS.md`, `V0.10_FIXES.md`, `V0.12_CHANGES.md`, `V0.13_CHANGES.md`, `OWNER_REVIEW_v0.16.4.md`, and `INTEGRATION_AND_QA_v0.17.md` exist.
- **Stale statements:** `docs/OPEN_ITEMS.md` asks "whether `upgrade_to_premium_demo()` stays" and says any signed-in user can self-upgrade; `docs/QA_REPORT.md` v0.13 repeats this. v0.17 removed it in 006. `AdminHelp` on the dashboard says the Users page "is read-only," but it now grants Premium and deactivates accounts.
- `docs/SUPABASE_SETUP.md` is 79 KB alongside `docs/SETUP.md` (14 KB), which makes the true setup order hard to follow.
- **Fix (WP8):** Consolidate, delete or archive superseded files (with approval), and keep one setup guide.

#### F-16 — Compliance data: gaps and traceability
All counts below come from reading the JSON in `data/` (RAN as a read-only script) unless marked DOC. Full review belongs to WP6; nothing was changed.
- 24 requirements: 18 BIR, 2 LGU, and **4 marked `prototype_placeholder`** (SSS ×2, PhilHealth ×1, Pag-IBIG ×1).
- **DTI is in scope in the handoff but is not a tracked agency in the checklist**; it exists only in the resource library and on the Renewal page.
- **Only 4 of 24 requirements have a fixed annual date**; 11 are `recurring_variable` and 9 `one_time`. Deadline and reminder features therefore cover few items.
- **19 of 24 requirements have `penaltyRule.type = "not_specified"`.** The agency-mode penalty calculator can only compute for 5.
- 5 of 11 tutorials are placeholders.
- DOC (`docs/OPEN_ITEMS.md`): LGU guidance is generic for all 17 NCR localities and none is verified; 15 requirements link only to an agency homepage; `taxTable.json` has no source citation; several BIR form PDFs carry 2018–2019 version dates; some resource "source checked" dates mean "added," not "verified."
- **Penalty simulator (READ):** `BIR_PENALTY_RATES` (micro 10% surcharge / 6% interest; general 25% / 12%) has no legal citation in code; the comment is garbled ("Gabay Negosyo's the penalties reference") and the penalties page uses the same "Gabay Negosyo's reference" wording the owner already flagged. The disclaimer text is Filipino-only. Agency-mode penalties approximate months as `ceil(days / 30)`, unlike the BIR mode, which accrues daily.
- None of these were corrected, per the "do not change client-facing content or datasets" rule.

#### F-17 — Misleading or obsolete database files
- `database/schema.sql` describes a different, unused schema (`users`, `businesses`, `sent_emails` without `user_id`, `subscriptions`) with RLS commented out. Its header says the prototype does not use it. Running it on a real project would create insecure tables.
- `database/supabase_demo_accounts.sql` is deprecated but still present; it creates `is_demo` admin/premium profiles by email. If the three demo Auth users were ever created with a public password, they should be deleted (UNVERIFIED).
- `database/supabase_setup.sql` is **not idempotent** (plain `create table`, `create policy`, `create trigger`), unlike 005/006. There is no baseline migration plus no migration-history table, so database drift cannot be detected.
- **Fix (WP2):** One authoritative baseline plus ordered migrations; archive `schema.sql` and the demo SQL with approval.

### 4.4 Low

#### F-18 — Dates use the browser's local clock
`lib/ruleEngine.ts` computes statuses with the device's local date, while the cron path deliberately uses Manila time. A user outside the Philippines can see "due today" on the wrong day. The wizard also hard-codes legacy `businessType` and `businessStructure` values that no requirement currently uses (verified: no requirement's rules use those dimensions).

#### F-19 — PWA behavior is unverified
- `sw.js` header says it never caches authenticated routes, but navigation responses (page HTML) are placed in the runtime cache and served offline. Pages are client-rendered shells with no embedded user data, so the practical risk is low; the comment is inaccurate. The cache is purged on logout, deactivation, and deletion but not when a session simply expires.
- There is no install-prompt UI (no `beforeinstallprompt` handler) and no iOS instruction; installation depends on the browser's native prompt.
- A signed-in page offline shows the shell but cannot load data because hydration needs Supabase. What "safe offline" means for those pages is undecided.
- Manifest and icons look correct (192, 512, maskable 512; theme color; standalone). Installation was never tested on a device.

#### F-20 — CSP and headers
`next.config.js` sets a CSP with `'unsafe-inline'` for scripts and styles (documented in the file). It also lists `https://api.resend.com` in browser `connect-src`, which is unnecessary because sending is server-side. Remove it if email is removed (F-03). Otherwise the header set (HSTS, nosniff, frame-ancestors none, referrer policy) is reasonable.

#### F-21 — Avatar data persists on the device
`gn-avatar-<userId>` (up to 500 KB, base64) is stored in `localStorage` and is not removed on logout or account deletion. On a shared device it outlives the session.

#### F-22 — Privacy notice does not cover newer data
The privacy page does not mention account deactivation, the hashed 30-day deletion record, entitlement and admin audit records, or which email provider (if any) processes mail. Review wording before release; this document does not assess legal sufficiency.

#### F-23 — Build and dependency hygiene
- `nodemailer` ^7 has one high-severity advisory group (fix is a breaking major). `@types/nodemailer` is ^8 while the package is ^7.
- React 18 is deprecated by Next 16 (build warning).
- The `supabase` CLI is a dev dependency but no script uses it.
- `npm run lint` is only `tsc --noEmit`; there is no ESLint configuration.
- `npm run contrast-check` modifies `docs/CONTRAST_REPORT.md`.
- Unused modules: `components/EmptyStateIllustration.tsx`, `components/StateBlocks.tsx`; and the role-based helpers `isPremiumRole`, `isAdminRole`, `assertPremium`, `assertAdmin` in `lib/authorization.ts` have no use in `app/` or `components/` (only `assertPremiumAccess` does).
- `PremiumGate` and `FeatureGate` are two gating components with overlapping jobs; `lib/authorization.ts` and `lib/entitlements.ts` are two helper layers.
- Route named `/premium/checkout` is an information page; there is no checkout.

#### F-24 — Loading and error states
There is no route-level `loading.tsx`; pages use inline "Loading…" text. Global and route error boundaries and a 404 page exist. The admin Users page has proper loading, empty, and error states. Reminder preference saves show a toast on failure. Unsubscribe has no resubscribe UI.

#### F-25 — Unbounded input sizes
No length limits on `profiles.name` or on the `business_profiles.data` JSON, and the log insert policy (F-11) has none either. Low risk for a prototype; add checks if the project grows.

---

## 5. Inconsistencies by category (requested in the prompt)

| Category | Where it appears |
|---|---|
| **Duplicate functionality** | Two gating components (`PremiumGate`, `FeatureGate`); two helper layers (`authorization.ts`, `entitlements.ts`); `/premium/penalty-simulator` redirect to `/penalties`; duplicated root vs `docs/` documents; `task_progress` DDL repeated in `schema.sql`, `supabase_setup.sql`, and migration 002; `admin_sync_profiles` defined in both 003 and 005 (005 supersedes). |
| **Dead code** | `EmptyStateIllustration`, `StateBlocks`, role-only helpers in `authorization.ts`, `db.resetAll()` in `lib/db.ts` (no callers found), the cron route while disabled, `FeatureGate` wrapping a Free feature. |
| **Broken navigation** | None found by reading. Not browser-tested. |
| **Missing loading states** | No `loading.tsx`; see F-24. |
| **Missing error handling** | F-04 (hydrate failure), F-07 (delete lookups), optimistic cache without rollback, `logSend` result ignored. |
| **Incorrect access restrictions** | Task steps behind Premium contradict the Free baseline (F-05); `FEATURE_TIER` pending owner decision; admin dashboard counts by role (F-13). |
| **Database inconsistencies** | F-13, F-17, non-idempotent baseline, no migration history, stale `schema.sql`. |
| **Security vulnerabilities** | F-00, F-06, F-07, F-08, F-11, F-23 (nodemailer). No hard-coded secrets found in source or in the ZIP; `.env.example` has placeholders only. No `dangerouslySetInnerHTML` except the theme-init script in `app/layout.tsx` (static string). |
| **Incomplete integrations** | Manual reminders (F-01), email (F-03), payments (none, by design), Google sign-in (unverified), content editing (F-09). |
| **Advertised but not implemented** | "Email reminders for fixed deadlines" (Premium list); "Upgrade" wording in `PremiumGate`; admin content "editors" that do not publish; the comment in `AuthGuard` saying a deactivated account may "reactivate, log out or delete" although `DeactivatedNotice` offers no delete action. |

---

## 6. Missing features (against the Version 1 handoff)

| Required by handoff | Status |
|---|---|
| Admin manual Premium reminder workflow | **Missing** (F-01) |
| Admin user and Premium management | Built; unexecuted (F-02) |
| Free/Premium matrix finalized and enforced | **Not finalized** (F-05) |
| Checklist- and task-level persistence | Built; Free users cannot track steps (F-05); load failure risk (F-04) |
| Basic deadline visibility "where verified" | Built; only 4 of 24 have dates (F-16) |
| LGU-specific requirements | Generic only; none verified (F-16) |
| DTI agency tracking | Resource library only (F-16) |
| PWA install and safe offline behavior | Partial; untested (F-19) |
| Documented rollback plan | Not found. Section 8 of this report lists what is needed. |
| Browser-tested user and admin journeys | **None recorded** |

---

## 7. Recommended implementation sequence

Aim: smallest safe steps, each leaving the project in a handoff-ready state.

**Step 0 — Owner read-only checks (no code, no changes).** These feed every later package.
1. Run the F-00 query and report the result.
2. Report whether migrations 001–006 are applied (list `pg_proc` names and check for the `entitlements` and `admin_audit_log` tables).
3. List the Vercel environment variable **names** that are set (not values). Confirm the email and cron variables in F-03 are unset.
4. Confirm whether the three old demo Auth users still exist.
5. Report which commit or ZIP the live site was deployed from.

**WP2 — Database integration and security (next).** Rehearse 005 then 006 on a test project; run their verification queries; resolve F-00, F-13, F-17, and the idempotence gap; produce `docs/DATABASE_SECURITY_REVIEW.md`. Do not run production SQL without approval.

**WP3 — Account lifecycle and premium.** Fix F-07; decide F-06 and F-08; test grant, expiry, revoke, deactivate, reactivate, and delete with real test accounts; produce `docs/ACCOUNT_LIFECYCLE_QA.md`.

**WP4 — Core user experience.** Fix F-04; test signup → wizard → checklist → requirement → task persistence in a browser; decide the Free/Premium matrix (F-05) before testing gating; produce `docs/USER_JOURNEY_QA.md`.

**WP5 — Admin and manual reminders.** Build F-01; resolve F-03 (remove or hard-disable email, correct Premium wording, remove or fix the cron route); fix F-13; produce `docs/ADMIN_AND_MANUAL_REMINDERS.md`.

**WP6 — Compliance data integrity.** Source-trace F-16 items without rewriting content; produce `docs/COMPLIANCE_DATA_AUDIT.md`.

**WP7 — Responsive, accessibility, PWA.** Device and screen-size testing; resolve F-19; produce `docs/UX_ACCESSIBILITY_PWA_QA.md`.

**WP8 — Final QA and release.** Full journeys in a browser; consolidate docs (F-15); dependency cleanup (F-23); rollback plan; produce `docs/GABAYNEGOSYO_v1_RELEASE_REPORT.md`.

---

## 8. Release blockers

A Version 1 release should not proceed until each item below is cleared. "Evidence needed" is what would let a reviewer accept it.

| # | Blocker | Evidence needed to clear |
|---|---|---|
| RB-1 | F-00: the self-upgrade function may exist in production | Query result showing it is absent, or a documented, approved drop with a re-check |
| RB-2 | F-02: migrations 005/006 unexecuted | Rehearsal log on a test project, then confirmed application to the intended environment with verification queries |
| RB-3 | F-03: live email path and unset-variable confirmation | Owner confirmation of unset variables, plus removal or hard-disable of the code; `nodemailer` advisory resolved or removed |
| RB-4 | F-01: manual reminder workflow | Working admin screen tested with a test admin and test Premium accounts |
| RB-5 | F-04: silent save loss | Fix plus a browser test that simulates a failed load |
| RB-6 | F-05: Free/Premium matrix and paywall acceptance | Written owner decision; gating tested with Free, Premium, expired, and admin accounts |
| RB-7 | F-06 / F-07: deactivation and deletion edge cases | Fix for F-07; written decision for F-06; both tested |
| RB-8 | No browser-tested journeys | Recorded browser run for the user journey and the admin journey |
| RB-9 | F-09: admin editors imply publishing | Relabel or hide, so no one believes content edits go live |
| RB-10 | Rollback plan | Documented procedure for the app (previous Vercel deployment) and the database (what each migration changes and how to revert) |
| RB-11 | F-16 placeholders and unverified LGU content | Either labeled clearly as unverified in the product, or verified by the owner. Existing labelling must be confirmed in WP6 |

F-14 (test depth) is not a standalone blocker but sets the standard: do not claim any of the above is cleared on the strength of the existing unit tests.

---

## 9. What I could not verify

- Whether migrations 001–006 are applied, and whether any SQL runs correctly in Postgres.
- Whether `upgrade_to_premium_demo()` exists in production.
- Any browser behavior: layout, keyboard, focus, screen reader, installation, offline.
- Whether Google sign-in is configured, and Supabase redirect URL settings.
- Which environment variables are set in Vercel, and whether the deployed site matches this ZIP.
- Whether legacy demo Auth users still exist.
- Pages inspected only at structure and gating level: dashboard, checklist, registration, renewal, BIR forms, resources, tutorials, guide, credits, and the home page. They were not read line by line.
- The accuracy of any requirement, deadline, fee, or penalty rate (WP6).
- Git history (no `.git` in the ZIP).

---

## 10. Owner decisions needed

1. Final Free/Premium feature matrix (F-05), and acceptance of a UI-level paywall for Version 1.
2. Remove the email code entirely, or keep it hard-disabled? (F-03)
3. Should admin-deactivated users be blocked at the Auth level, and may they self-delete? (F-06)
4. Content editors: relabel as local preview, or hide? (F-09)
5. Should DTI become a tracked agency for Version 1, or stay resource-only? (F-16)
6. Legacy `role = 'premium'` accounts: review list in `docs/ACCOUNT_AND_ACCESS.md` section 4.

---

## 11. Session report (handoff protocol)

**Starting version:** 0.17.1 (`package.json`), matching the handoff. No discrepancies other than the missing `.git` directory.

**Inspected:** repository structure; `package.json`, `next.config.js`, `vercel.json`, `.env.example`; all six migrations plus `supabase_setup.sql`, `schema.sql`, and the demo SQL; `lib/auth.tsx`, `db.ts`, `entitlements.ts`, `authorization.ts`, `ruleEngine.ts`, `penalty.ts`, `mailer.ts`, `email.ts`, `adminUsers.ts`, `adminActions.ts`, `adminAccounts.ts`, `demoAccounts.ts`, `deleteAccountHandler.ts`, `unsubscribeToken.ts`, `authRedirect.ts`; all four API routes; `AuthGuard`, `AdminGuard`, `PremiumGate`, `FeatureGate`, `DeactivatedNotice`, `PenaltyCalculator`; admin dashboard and Users pages; requirement detail, deadlines, penalties, premium checkout, account, wizard (save path); `sw.js`, manifest, service-worker registration; content statistics from `data/*.json`; test file headers and structure; `docs/OPEN_ITEMS.md`, `QA_REPORT.md`, `INTEGRATION_AND_QA_v0.17.md`, `PROGRESS.md`.

**Changed:** one file added, `docs/PROTOTYPE_AUDIT_v1.md`. Nothing else modified, deleted, or renamed. (`contrast-check` rewrote `docs/CONTRAST_REPORT.md` in my working copy; I restored the original from the ZIP.)

**Checks run:** `npm ci`, `npm test` (206/206), `tsc --noEmit` (pass), `npm run build` (pass, dummy variables), `contrast-check` (40/40), `npm audit --omit=dev` (1 high: nodemailer).

**Checks not run:** SQL of any kind, browser testing, dev-server smoke tests, deployed-site checks, Supabase or Vercel inspection, accessibility tools.

**Manual owner actions required:** the Step 0 checks in section 7, and the decisions in section 10.

**Next recommended task:** Work Package 2, Database Integration and Security, after the owner returns the Step 0 results.
