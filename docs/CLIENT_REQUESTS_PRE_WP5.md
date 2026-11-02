# GabayNegosyo — Client additions before Work Package 5

**Base archive:** `GabayNegosyo_v0_17_3_TEST_15_FAILURES_PATCHED.zip`.
**Status:** Code changes prepared; locally executed tests pass, but browser/production testing remains outstanding.

## Client request 1 — Estimated tax calculator, excluding penalties
- New `/tax-calculator` route, linked in signed-in sidebar.
- Free 8% estimate based on the consultant's current formula and qualified taxpayer type.
- Does **not** apply ₱250,000 deduction to mixed-income business receipts pending FL-16.
- No graduated income-tax calculation while the consultant's bracket table is missing (FL-17); explicitly shows “pending”, not a fabricated total.
- No penalty/interest is added. BMBE registration or interest is not silently treated as a tax exemption.
- Warning that estimates exclude other applicable taxes, credits and eligibility determinations.

## Client request 2 — Optional BMBE at wizard end
- Inserted `Optional BMBE` after Business Name and before Review.
- Choices: interested, already registered, not interested, unsure; optional assets excluding land.
- Answers survive in existing `business_profiles.data` JSON without a new table column or database migration.
- Unarchived the source-backed `bmbe` checklist item, matched when users opt in and declared assets are not over ₱3 million.
- Status is **self-reported**, never certificate verification or entitlement to exemption. The calculator does not zero tax automatically.
- For unknown assets, allow the optional application item with explicit need for DTI eligibility confirmation.

## Client request 3 — Calendar dates independent of reminder controls
- `calendarOccurrences()` enumerates known annual, fixed-date, monthly, quarter-offset, and window-end due dates for the displayed year.
- Calendar uses all **applicable source-backed schedulable obligations**; it no longer depends on a reminder preference, and includes completed requirements' scheduled dates.
- Optional reminder toggles remain separate and Premium-only; due-date calendar is accessible without enabling reminders.
- Non-computable dates (e.g. business anniversary without actual date, event-relative dates without event date, SSS/PhilHealth unverified schedules, and a monthly deadline whose eFPS status is unknown) remain in the undated list. Do not invent calendar events for them.
- Free tier sees the schedule but not Premium-only deadline status labels.

## Files changed
- `app/tax-calculator/page.tsx` (new)
- `app/wizard/page.tsx`
- `app/deadlines/page.tsx`
- `components/Navbar.tsx`
- `components/DeadlineCalendar.tsx`
- `lib/calendarOccurrences.ts` (new)
- `lib/types.ts`
- `lib/ruleEngine.ts`
- `data/requirements.json`
- `tests/wizard.test.js`
- `tests/client_features.test.js` (new)

## Local verification
- `NODE_OPTIONS='--experimental-strip-types --disable-warning=ExperimentalWarning' npm test`: **320 passed, 0 failed, 0 skipped** on Linux Node 22.16.0.
- `ts.transpileModule` syntactic check on seven edited TypeScript/TSX files: no syntax errors.
- Full `tsc --noEmit` / production build **could not be validated** because Next.js, React and project dependencies are not installed in the available sandbox. The expected module-not-found errors are not a product-level validation result.
- No live Supabase or browser end-to-end tests performed.

## Outstanding client/consultant decisions
1. FL-16: mixed-income 8% deduction treatment.
2. FL-17: graduated income-tax table, required to provide a graduated tax estimate.
3. BMBE exemption-specific BIR treatment and documentary validation; avoid applying an automatic exemption.
4. Conditional deadlines without the required date or profile fields, including DTI renewal's actual expiration date and SSS/PhilHealth remittance scheduling.
5. Existing project Manual Premium reminder workflow remains for WP5; no automatic sending was added.

Do not deploy before `npm ci`, `npm run lint`, `npm test`, `npm run contrast-check`, `npm run build`, and user-journey validation on Windows, and review by client/consultant.
