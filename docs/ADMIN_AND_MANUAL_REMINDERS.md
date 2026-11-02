# Work Package 5 — Admin dashboard and manual Premium reminder management

**Status:** Implemented in source, 324/324 local Node tests passing; **Supabase migration not applied, no live/browser/Vercel verification performed in this environment**. Do not mark WP5 production-verified until the owner completes the checklist below.

## Source baseline and scope

Started from `GabayNegosyo_v0_17_3_CLIENT_FEATURES_PRE_WP5_REVIEW.zip` (internal package version remains `0.17.1`; did not overwrite the deployed GitHub branch). This handoff respects `GN# PROMPT 5 — ADMIN DASHBOARD...md` and the Version 1 context. The consultant-approved tax, BMBE, compliance, fee and external-link content was not rewritten.

## Existing functions preserved

`/admin/users` already shows admin-gated user directory search, computed Premium Free/active/expired/revoked states, grant with optional expiry, revoke, activation/deactivation, demo labels, and links to `/admin/audit`. Migrations 005–008 implement the security-sensitive account operations. Admin preview stays synthetic and cannot access real data.

## New minimal workflow

1. **Admin → Manual reminders** (`/admin/manual-reminders`), available only behind `AdminGuard` and security-definer RPCs.
2. Supabase `admin_manual_reminder_queue()` returns only non-demo, non-admin, non-deactivated, non-unsubscribed accounts with **currently computed active Premium entitlement**, a saved business profile, and **an enabled per-requirement reminder preference**. It exposes a limited set of fields necessary for applicability checks; no raw full profile JSON.
3. The UI computes the next **45 days** of known annual/quarterly/monthly deadlines from shipped source-backed requirement data (`calendarOccurrences`) and `generateApplicableRequirements`. It never creates dates for event-based, unverifiable or undated items.
4. Admin expands or copies the prepared email text and **sends it externally by a person**, not by this app. The admin explicitly checks **I confirm this email was sent manually**, then records it.
5. `admin_record_manual_reminder` re-evaluates eligibility and consent at write-time. Its `(user_id, requirement_id, due_date, days_before)` database primary key and `ON CONFLICT DO NOTHING` prevent duplicate records. The UI reloads the real recorded state.
6. `admin_manual_reminder_history()` supports read-back of existing manual records. It is admin-only.

**No mail sending, SMTP/Resend integrations, scheduled jobs, or payment changes were added.** Existing email infrastructure was not activated or altered. `vercel.json` has an empty `crons` list in this archive. An existing unused cron route file remains in source; verify no Vercel cron or external scheduler calls it.

## Changed files

| File | Change |
|---|---|
| `database/migrations/009_manual_premium_reminders.sql` | New RLS table and three admin-only RPCs with computed entitlement and duplicate guards |
| `database/verification/wp5_post_migration_checks.sql` | Read-only Supabase verification SQL |
| `lib/manualReminders.ts` | Data loader, applicability/deadline selection, draft text, manual record RPC |
| `app/admin/manual-reminders/page.tsx` | Secure queue, preview-safe UI, copy and confirmed record workflow |
| `app/admin/page.tsx` | Manual reminder navigation and accurate admin guidance |
| `app/admin/users/page.tsx` | Do not offer account deactivation/reactivation buttons for demo accounts |
| `tests/wp5_manual_reminders.test.js` | Checks for authorization and RLS, eligibility guards, duplicates, no automated sends, deadline source adherence |
| `docs/ADMIN_AND_MANUAL_REMINDERS.md` | This report |

## Mandatory external check — Supabase

**Do not run the migration against production without the owner's explicit approval.** First back up the Supabase project and open **Dashboard → SQL Editor**. Confirm `004_reminder_digest`, `005_account_lifecycle`, `006_entitlements`, `007_admin_overview_computed_plan`, `008_audit_hardening` have been applied and are functioning. Context documents state some migrations were prepared, not necessarily applied.

After review/approval, run **only** `database/migrations/009_manual_premium_reminders.sql` once (it is idempotent). Do not re-run migrations 003/005/006 after 008, because they can overwrite the 008 hardened function bodies. Then run `database/verification/wp5_post_migration_checks.sql` (read-only). Expected: table and all 3 RPCs exist; RLS true; anon/authenticated have no direct table access; anon cannot call admin RPCs.

**Live authorization tests required:** sign in with a real admin, an ordinary Free account, an active Premium account, an expired/revoked Premium account, a demo account, and a deactivated account. Confirm the admin can read, but ordinary signed-in users receive an **Admins only** error for roster/history/recording. Confirm demo, deactivated, unsubscribed, admin and non-Premium users never appear. Confirm a record cannot be added twice; changing entitlement or unsubscribe after page load must prevent insertion. Record a test case only after a *real, explicitly authorized manual send*; no need to send a real email for a database-only test in a staging project if a separate staging dataset is available.

**Preferences:** the recipient must have a saved, enabled `reminder_configs` row (selected 1/3/7 days), otherwise they are deliberately absent. Test a real existing user with an appropriate known due date in the coming 45 days; an empty queue is expected when no suitable date/opt-in exists.

## Mandatory external check — Vercel

At **Vercel → Project → Settings → Environment Variables**, confirm `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` point at the intended Supabase environment and that `NEXT_PUBLIC_SITE_URL` and `NEXT_PUBLIC_CONTACT_EMAIL` are genuine. **Do not paste values into logs.** Ensure `NEXT_PUBLIC_REMINDERS_LIVE` is not `true`, and no mail provider settings, `REMINDERS_MODE=live`, `CRON_SECRET`, or external scheduled job are being used to activate automatic reminders. In **Settings → Cron Jobs**, confirm none are scheduled; `vercel.json` in this ZIP declares `"crons": []`.

After pushing the code and completing the database step, check Vercel **Deployments → latest deployment → build logs** and verify `/admin/manual-reminders` loads for a real admin with no browser-console or Supabase RPC errors. A deployment alone does not apply SQL migrations.

## Validation performed

- Baseline archive: **320/320** passing with `node --experimental-strip-types --test tests/*.test.js` (Node 22.16.0).
- After WP5 changes: **324/324** passing; 0 failed, 0 skipped (same local invocation).
- `lib/manualReminders.ts`, `/admin/manual-reminders/page.tsx`, `/admin/users/page.tsx`, `/admin/page.tsx`: no TypeScript parser syntax diagnostics.
- Production `npm ci`, `npm run lint`, `npm run build`, live Supabase RPCs, migrations, authenticated browser E2E: **not performed**, because npm project dependencies and a connected Supabase instance are unavailable here. A global `tsc` invocation errors on missing React/Next packages, so it is **not** a valid project typecheck result.

## Remaining limitations and risks

- The manual roster is bounded to 2,000 enabled preference rows; manual history to 5,000 records. A larger service needs paginated server-side data access; this prototype avoids unbounded PII exposure.
- The UI only shows deadlines in the next 45 days. Reminder date may already have passed; the admin must decide if a late reminder is appropriate. Nothing is sent or automatically dispatched on a schedule.
- Due dates are computed against versioned application content. Server verifies user eligibility, consent and due-date range, but **does not independently re-evaluate the legal requirement date** from a replicated content registry. Administrators must verify content before sending and before recording.
- The browser can prepare and copy a draft but cannot prove an external email was delivered; the confirmation is an admin attestation, not email-provider evidence.
- Database migration 009 is **required** for this page. Until applied, it shows a clear RPC load error rather than sample user data.
- All open compliance-content flags from the consultant specification remain open for Prompt 6; do not treat Prompt 5 as a legal-content verification.

## Rollback

If the UI must be rolled back, redeploy the last known-good GitHub commit or Vercel deployment. The new table and functions may safely remain unused; do **not** drop them in production without checking existing reminder records, backups and retention obligations. No destructive rollback SQL is provided.

## Recommended next step

After external Supabase/Vercel checks and Windows `npm ci && npm run lint && npm test && npm run build`, proceed to **Prompt 6 — Compliance Data and Content Integrity**. Do not mark Prompt 5 release-verified until the real admin workflow, RLS and duplicate cases have been checked in a browser.
