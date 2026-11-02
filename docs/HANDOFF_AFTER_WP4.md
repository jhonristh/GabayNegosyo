# GabayNegosyo — Handoff after Work Package 4 (Core User Experience)

Attach with: `GN CONTEXT`, the ZIP `GabayNegosyo_v0_17_3_AFTER_TASK_04.zip`, and the next task prompt.
**Code version label:** still 0.17.1 in `package.json` (nothing validated in browser/DB/build). **Done:** WP1 to WP4. **Next:** WP5 (Admin and Manual Reminders).

## State
- `npm test`: 299 pass, 0 fail. Not run: project `tsc`, `next build`, any SQL, any browser. No migration was added in WP4; 005 to 008 are still unapplied as far as is known (order in `HANDOFF_AFTER_WP3.md`).
- Full results, fixes and the browser script: `docs/USER_JOURNEY_QA.md`.

## New behaviour to know
- `User.dataLoadFailed` and `useAuth().reloadData()`; `<AuthGuard requireData>` shows a retry screen when saved data did not load.
- `db.saveBusinessProfile` returns a boolean. Never ignore a `false`.
- `lib/validation.ts` holds the sign-up, log-in, wizard-step and `next`-path rules; `lib/profileSummary.ts` holds the dashboard labels.
- `tests/wp4_user_journey.test.js` runs the real `lib/db.ts` against an in-memory fake Supabase (it writes a rewritten copy to the OS temp folder; nothing in the repo is changed).

## Open items
Owner decisions: tax arrangement rules; taxpayer types offered; Free access to steps; whether "complete" ticks steps. Details: `docs/USER_JOURNEY_QA.md` section 5 and `docs/OPEN_ITEMS.md`.
