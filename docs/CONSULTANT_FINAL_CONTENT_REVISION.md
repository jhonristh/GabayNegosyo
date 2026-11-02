# GabayNegosyo — Consultant Content Revision Handoff

**Date:** 2026-11-02. **Starting archive:** GabayNegosyo_v0_17_3_AFTER_TASK_04.zip, internally labelled 0.17.1. **Output:** content-revision review build, NOT a validated production release.

## Source priority
1. Consultant-approved `GabayNegosyo_Final_Content_Spec.md`.
2. Final forms/portals/video XLSX + matching JSON (XLSX sheets checked: README, Forms & Portals, Video Tutorials, Flags & Decisions).
3. Revised feasibility study PDF, including fee tables on pages 8–13.
4. `GNChangesByConsultant.pdf` for conflicts.

The unmodified source documents are copied under `docs/consultant-inputs/`. No external facts, links, fee quotations or tax brackets were fabricated. Source data is **not** proof that a URL works today.

## Scope and structural changes
- The zip has one canonical Next.js app tree; no duplicated app/lib tree under `public/` was found. No git metadata: the requested git branch could not be created from this archive.
- Backups of original main datasets are retained in `docs/consultant-baseline/` for comparison. The legacy records whose applicability was unverified remain archived rather than silently deleted.
- Added final source URL database at `data/finalLinksDatabase.json`; copied full workbook and source PDFs to `docs/consultant-inputs/`.
- Expanded `data/requirements.json` to include data-driven DTI, barangay, mayor permit, BIR, employer/employee, renewals, contributions, conditional events and excise reference entries. Event-specific BIR forms and BMBE remain archived from automatic checklists because the wizard does not ask the triggering questions. Added DTI and barangay to agency list.
- Added consultant fee tables (`data/consultantFees.json`) and `/fees` Premium reference page, with city estimates and notes. No individual LGU quote was live-verified; do not describe these as official tariffs.
- Added selected schedule models (fixed annual, list of annual dates, monthly day, quarterly offset, window, one-time, event-offset placeholder). Dates that require unknown events remain undated.
- Kept two taxpayer types visible; lease Not Applicable works. Sales and tax decision are separate. OSD only reveals expenses for Itemized. Sales >= ₱3M disables 8% and flags VAT; 8% estimates no deduction for mixed-income earners pending FL-16.
- Changed frontend feature gates (tutorials Free; progress, deadline statuses, resource library Premium), removed copied YouTube thumbnail URLs, and removed the email sending button. **Server/database premium authorization for downloaded content has NOT been independently verified and must be completed before pilot.**
- New pure penalty rule modes for Pag-IBIG daily %, PhilHealth monthly compound %, LGU surcharge plus capped-month interest, SSS simple monthly %, and DTI late-renewal surcharge. BIR micro and small default now 10% and 6% APR under consultant RR6-2024 guidance. Formulas remain estimates, with a mandatory Filipino disclaimer rendered on results.
- Preserved PWA, authentication, Supabase services, database schema and existing routes; NO production SQL run; NO live deployment.

## Fact changes — before vs after

| Before | After | Basis |
|---|---|---|
| Only five agency IDs | Added DTI and Barangay; kept BIR/SSS/PhilHealth/Pag-IBIG/LGU | Spec §§3,8 |
| 24 requirement objects including prototype placeholders | Expanded catalog, archives retained for safe review | Spec §8 |
| Tax treatment mostly informational to rules | 8% / graduated / VAT condition now distinguishes 2551Q vs 2550Q and annual return treatment | Spec §§2–3 |
| Limited annual-only date model | Added multi-date, quarter-offset, monthly and window types | Spec §3 |
| 1701-Q no fixed dates | May 15 / Aug 15 / Nov 15 | FL-01, spec §3 |
| Annual ITR date April 15 only in some entries | April 15 remains the statutory annual date, with one-time 2026 extension noted | FL-15 |
| SSS 2–3% generality | 2% simple monthly for contribution arrears | Spec §4 |
| PhilHealth 2–3% generality | At least 3% compounded monthly | Spec §4 |
| Pag-IBIG recurring penalty unspecific | 0.1% per day | Spec §4 |
| LGU variable unspecific | 25% surcharge + up to 2% monthly capped at 36 months | Spec §4 |
| BIR generic 25% + 12% | Micro/small 10% + 6% APR (daily pro-rata estimate, pending FL-22) | RR 6-2024, FL-02, spec §4 |
| Free progress/status/library | Premium progress/status/library | Consultant tier table, spec §1 |
| Tutorial placement partially Premium | Tutorials Free, with attribution | Spec §1, FL-19 |
| Video search links and thumbnail image links | Missing video links are omitted; YouTube-owned embed only with attribution | Spec §1 |
| Unverified form links/agency homepages | Only catalogued URL values retained; missing/truncated links withheld | Final link database v2 |
| Fees not integrated in app | Premium `/fees` shows DTI, barangay, Mayor's and BIR estimates | PDF pp. 8–13, spec §6 |
| Old BIR registration/0605 costs in legacy content | New ORUS/eCOR content and ₱0 registration, ₱30 DST, BPI/ATP guidance | Spec §3, PDF p. 13 |

## Validation actually performed
- XLSX imported and checked against equivalent JSON entries. ✅
- All updated JSON files parse. ✅
- TypeScript parser inspected 147 TS/TSX source files with **0 parse errors**. ✅ (Not a semantic typecheck.)
- Added consultant data-integrity suite `tests/consultant_content.test.js`: **7 / 7 pass**. ✅
- Existing old suite: **279 pass, 20 fail** when run with `node --experimental-strip-types --test tests/*.test.js`; failures primarily reflect previous agency and source-data assumptions and changes to Free/Premium tiers, tax rules, and deadline behavior. **Tests are NOT fully green.**
- Full `npm ci` dependency installation: **timed out** in the isolated environment. `npm run lint`, production typecheck and `next build`: **not verified** because the dependencies were not fully installed. Node version in container is 22.16.0; project requires >=22.18.0.
- HTTP link test: attempted official DTI BNRS check, **no HTTP response (status 000)** due to restricted network. `scripts/check-links.mjs` included, but a working link-check table is not available. **All current final-database URLs remain unverified live.**
- Browser journeys, Supabase RLS/entitlement enforcement, Google OAuth, PWA, mobile layout, Vercel deployment: **not run**.

## HIGH-PRIORITY release blockers
1. Complete real dependency installation, semantic TypeScript check, build, and migration checks; update outdated source-specific tests after reviewing each changed behavior.
2. Database content/admin overrides may supersede new source seeds. Confirm with Supabase: the existing admin content editor persists per browser. Do not run migration/seed/rewrite against production without backup and owner approval.
3. Free/Premium entitlements in UI have changed, but data imported in browser bundles or cached by client cannot be considered protected by UI controls. Implement and verify server-side/RLS enforcement where appropriate.
4. The original source files include additional content on legacy routes; these require complete manual page-by-page reconciliation before declaring every fact corrected.
5. Verify actual forms/videos, official sites, live tax rules and fees against responsible agencies and consultant approval.
6. Review overdue cycle handling across monthly/quarterly dates using real device time zones and event dates; this pass adds types but is not proven for all cycles.
7. Do not enable automated reminder email; manual reminder admin workflow is scheduled for WP5.

## OPEN: consultant/client decisions (unchanged)
- FL-08: BIR 1701-A official form URL missing/truncated.
- FL-09: DTI renewal video incomplete (10-character ID).
- FL-10: Barangay and Mayor's video link duplication.
- FL-11: missing official URLs for named forms and services.
- FL-12: third-party BMBE and Pag-IBIG forms (withheld pending official source).
- FL-13: all live link checks not performed.
- FL-16: ₱250k deduction for mixed-income 8% filers; currently **not applied**.
- FL-17: graduated tax table; intentionally not calculated; empty marked config.
- FL-18: fee/permit required-document tier; **Premium provisional**.
- FL-20: last-verified presentation; app shows source review date, not a claim of live official review.
- FL-21: 1701 vs 1701-A for itemized filers; conditional placeholder.
- FL-22: BIR interest method; simple daily pro-rata used as an estimate pending confirmation.
- Official SSS/PhilHealth remittance calendar not supplied; no deadlines invented.

## Post-handoff steps on owner's Windows machine
```powershell
npm ci
npm run lint
npm test
npm run contrast-check
npm run build
node scripts/check-links.mjs
```
**Do not deploy this revision or apply SQL until all release blockers are cleared and the result is browser-tested with real test accounts.** Keep original ZIP as a rollback checkpoint.
