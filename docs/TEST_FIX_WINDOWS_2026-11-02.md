# GabayNegosyo — Windows test-failure correction handoff (November 2, 2026)

## Baseline and source
Started from `GabayNegosyo_v0_17_3_TEST_FIX_REVIEW.zip`, not the old WP4 archive. No application content, fees, links, database schema, or consultant decisions were changed in this test-fix pass.

## Corrections
1. `tests/wp4_user_journey.test.js`: resolve temporary JSON module imports through `pathToFileURL()` instead of raw absolute Windows paths. This prevents `ERR_UNSUPPORTED_ESM_URL_SCHEME` when the test executes the sandboxed copy of `lib/db.ts` on Windows.
2. `tests/tax_option.test.js` (new): seven portable regression tests cover the consultant's two visible taxpayer choices, saved-profile compatibility, 8% estimation, mixed-income assumption FL-16, VAT cutoff, pending graduated-table FL-17, itemized validation, and location of expense inputs.
3. `lib/types.ts`: comment-only clarification that old taxpayer identifiers remain in the data model solely to read saved profiles. New wizard choices are limited to two.

## Why the original 15 failures occurred
- 9 WP4 persistence tests: the older local test loader tried to import a `C:\` path as an ES module; the supplied ZIP contains the portable loader.
- 4 tax calculation / wizard tests: a local `tax_option.test.js` used a Windows path in `import()`.
- 2 tax tests: assertions treated historical saved-profile identifiers as new wizard options and demanded a specific JSX whitespace/parenthesis pattern. The new tests validate relevant behavior instead.

## Executed check
`NODE_OPTIONS=--experimental-strip-types node --test tests/*.test.js`
Node.js v22.16.0 on Linux: **316 passed, 0 failed, 0 skipped**.

This archive includes the corrected tests. The user's Windows installation had an extra `tax_option.test.js` not found in previous ZIPs; replacing the entire `tests/` directory avoids mixing the old file with corrected files. Do not merge source folders without confirming their versions.

## Not independently verified in this pass
`npm ci`, full `npm run build`, `npm run lint`, `npm run contrast-check`, Windows execution, real browser flows and Supabase behavior. The sandbox does not contain the complete `node_modules` install. Previously supplied Windows build/contrast outputs describe earlier code and should not be represented as fresh tests on this archive.

## Windows verification
Extract to a **new folder** (do not overlay an old directory), ensure Node.js >=22.18, then run:

```powershell
npm ci
npm run lint
npm test
npm run contrast-check
npm run build
node scripts/check-links.mjs
```

If a Windows ESM error persists, confirm the extracted version of `tests/wp4_user_journey.test.js` uses `pathToFileURL` and that no earlier `tests/tax_option.test.js` was left behind. An `HTTP_403` or network error from the link script does not mean the URL is fabricated: test manually and preserve the consultant's unverified entries.

## Release status
Test-fix review only, not approval for production. Prompt 5–8 and browser/DB validation remain outstanding.
