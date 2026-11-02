# GabayNegosyo — Handoff after Work Package 2 (Database Integration and Security)

Attach with: `GN CONTEXT` (Version 1 Project handoff), the ZIP `GabayNegosyo_v0.17.1_AFTER_TASK_02.zip`, and the next task prompt.

**Code version:** 0.17.1 (unchanged; no app code was modified in WP2). **Migration 007 is added but NOT applied anywhere.**
**Done:** WP1 (audit), WP2 (this review). **Next:** WP3, Account Lifecycle and Premium, once the owner returns the pre-flight and approves.

## State of the database (what is known)
- Nothing has been executed on the real Supabase project in WP1 or WP2.
- Migrations 001–006 were rehearsed in a local throwaway PostgreSQL 16 with a Supabase *stand-in*: 153 checks passed (`database/rehearsal/run_rehearsal.sh`, log in `LAST_RUN.txt`). That is not proof about Supabase.
- Whether 005/006 are applied in production, and whether `upgrade_to_premium_demo()` still exists there, are **unknown** until the owner runs `database/verification/wp2_preflight_readonly.sql`.

## Rules learned in WP2 (do not forget)
1. **Database first, then app.** The v0.17.1 app reads `profiles.deactivated_at`; without migration 005 the profile query fails silently and everyone looks Free (DB-02).
2. **Never re-run migration 003** after 005/007 (it reverts two admin functions, DB-10).
3. **Never run** `database/schema.sql`, `database/supabase_demo_accounts.sql` or `supabase_setup.sql` again.
4. Apply order: 005 → 006 → 007 (optional), each only after owner approval, then `wp2_post_migration_checks.sql`.

## Open items for WP3 (see `docs/DATABASE_SECURITY_REVIEW.md` for detail)
- Fix F-07 (delete route lookups fail open) and F-08 (overbroad "does not exist" fallback). Three tests in `tests/wp2_database.test.js` are marked `todo`; remove `todo` when fixed.
- Decide DB-05: admin-deactivated users keep a login session and can self-delete.
- Make `loadUser` robust to a missing column (DB-02) and to a failed profile read (F-04, WP4).
- Test grant / expiry / revoke / deactivate / reactivate / delete with real **test** accounts (section 8 of the review).

## Checks run in WP2
Local DB rehearsal 153/153; `npm test` 232 tests (229 pass, 3 todo, 0 fail). **Not run:** `tsc`, `next build` (npm registry unreachable in that session), anything on Supabase, any browser.
