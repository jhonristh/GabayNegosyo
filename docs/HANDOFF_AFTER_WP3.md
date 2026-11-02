# GabayNegosyo — Handoff after Work Package 3 (Account Lifecycle and Premium)

Attach with: `GN CONTEXT`, the ZIP `GabayNegosyo_v0_17_2_AFTER_TASK_03.zip`, and the next task prompt.
**Code version label:** still 0.17.1 in `package.json` (nothing validated in browser/DB/build). **Done:** WP1, WP2, WP3. **Next:** WP4.

## State
- Nothing was run against Supabase. Migrations 005–007 are still unapplied as far as is known; **008 is new and unapplied**. Order: 005 → 006 → (007) → 008. Never re-run 003/005/006 after 008 (re-run 008 if you do). Database first, then the app.
- `npm test`: 268 pass, 0 fail, 0 todo. Not run: project `tsc`, `next build`, any SQL, any browser. Rehearsal section 15 (008 checks) is written but never executed.

## New behaviour to know
- `/api/admin/account-status` (service key) bans/unbans the Auth user around the audited database call. UI uses it via `lib/adminUsers.ts setAccountStatus`.
- Delete route fails closed, blocks admin-deactivated accounts, writes its record after success.
- Browser plan resolver is `resolveClientEntitlement` (fail closed).

## Open items
Owner decisions: admin-deactivated self-delete (QA §3); pending Free/Premium tiers. Gaps: role changes by SQL unaudited; reminder cron audience ignores entitlements (WP5); deletion-log purge manual; no name-edit screen. Details: `docs/ACCOUNT_LIFECYCLE_QA.md` §8.
