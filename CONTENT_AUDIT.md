# Content Migration Audit — Flowchart.FINAL.xlsx → GabayNegosyo

Migration date: 2026-09-20
Sources: `Flowchart.FINAL.xlsx` (26 sheets), `Actual Contents for Registration Wizard.txt`

## Summary

| Metric | Count |
|---|---|
| Requirements sourced from the workbook (`flowchart_final_workbook`) | 22 |
| Old MVP placeholder requirements kept as-is (`prototype_placeholder`) | 5 |
| New agencies added (DTI, SEC, CDA) | 3 |
| Barangay → RDO entries (Quezon City) | 160 |
| Real BIR form PDF links wired in | 13 |
| Tax table brackets (graduated individual income tax) | 6 |

## Sheet-by-sheet mapping

| Workbook sheet | Where it landed | Notes |
|---|---|---|
| Registration (barangay/RDO columns) | `data/barangayRdo.json` | Merged with the txt file's own barangay list; two name-variant pairs (e.g. "Sta. Teresita" RDO 38 vs "Santa Teresita" RDO 39) kept as separate entries — **needs review** by someone who can confirm whether these are the same barangay or genuinely distinct. |
| Tax Table | `data/taxTable.json` | Graduated individual income tax brackets, used as reference data only — not yet wired into an automatic tax-type calculator (see Known Gaps). |
| Business Registration | `requirement`s `dti-business-name-reg`, `sec-registration`, `cda-registration`, `lgu-barangay-mayors-clearance`, `bir-registration-filing`, `bir-books-of-accounts`, `bir-orus-registration`, `bir-1906-authority-to-print`, and the actualized `bir-cor` | Split into one card per compliance stage per the sheet's own grouping (Pre-Registration → BIR Registration → Books Registration → ORUS Registration → Receipt Compliance → BIR Compliance). |
| Individual Tax Payers | `bir-1700-compensation`, `bir-1701-self-employed`, `bir-1701q-quarterly`, `bir-1701a-8percent` | |
| Final Witholding Tax | `bir-0619f-monthly-final`, `bir-1601fq-quarterly-final` | Qualifying condition (which payments trigger final withholding) isn't spelled out precisely in the source — applicability is a **heuristic** (`purely_business` / `mixed_income_earner`), flagged for review. |
| Expanded Withholding Tax | `bir-1601eq-quarterly-expanded`, `bir-0619e-monthly-expanded`, `bir-2307-certificate` | Same heuristic-applicability caveat as above. |
| Compensation Withholding | `bir-1601c-monthly-compensation`, `bir-1604c-annual-compensation`, `bir-2316-certificate` | Applicability is unambiguous here (`hasEmployees: true`). |
| Sample Computation | Not migrated into a UI screen | Illustrates 8% vs. Itemized vs. OSD comparison math; no calculator was built this pass (see Known Gaps). |
| BIR Forms (list) + registration-wizard txt links | `data/birForms.json`, `data/resources.json` | All 13 links copied verbatim from source; two forms referenced elsewhere in the workbook (1700, 1701 without the -Q/-A suffix) have no direct PDF link in the source, so their `officialUrl` points to the general bir.gov.ph site instead of a fabricated PDF path. |
| 1901 / 1905 / 1900 / 1906 / 2000 / 0619-E / 1601-C / 1601-EQ / 2551Q / 1701Q / 1604C / 1604E / 1701A / 1700 (per-form sheets) | Not extracted | Each of these 14 sheets contains a single embedded flowchart image (17 images total across the workbook), not machine-readable text. They were **not** OCR'd or hand-transcribed this pass — see Known Gaps. |
| Compliance Contents, Dashboard, FlowCharts | Not extracted | Contain no cell values (only formatting/possible chart objects); nothing to migrate. |

## Known gaps / things I did not do

1. **The 17 embedded flowchart images were not transcribed.** Every per-form sheet (1901, 1905, 1900, 1906, 2000, 0619-E, 1601-C, 1601-EQ, 2551Q, 1701Q, 1604C, 1604E, 1701A) holds its process as a picture, not text. I did not OCR or manually re-key these into `instructions` arrays — doing that accurately for 14 diagrams needs either OCR tooling with a human accuracy pass, or you supplying the text directly. Right now those forms are represented by the *checklist-level* text that does exist in the other sheets (Individual Taxpayers / Withholding sheets), not by the specific flowchart decision-branches.
2. **2551Q (Percentage Tax) is not represented as its own requirement.** It's referenced in the BIR Forms list, but no sheet gave me checklist text for it (percentage tax logic only appears as a label in the Business Registration sheet — "Non-VAT (3%)"). Rather than invent its filing steps, I left it out; it exists only as a form-download resource.
3. **No automatic VAT/Non-VAT or 8%-vs-graduated determination logic.** The workbook shows a *manual* sample computation (8% vs Itemized vs OSD), not a stated sales threshold rule I could safely encode (the well-known ₱3M VAT threshold is not stated anywhere in the source, so I did not hardcode it even though it's publicly known — the "don't invent" instruction applied to more than just BIR text, so I erred conservative).
4. **Several deadline dates are approximations, not source-stated dates**, and are labeled as such in each requirement's `deadlineDescription` (e.g. "specific due date not specified in the current content source"). Where the workbook *did* give an explicit date (April 15 annual ITRs, the 10th of the following month for 0619-E, 5 days after month-close for DST) I used it verbatim.
5. **No numeric penalty rates were added for the 22 new requirements.** `penaltyRule.type` is `"not_specified"` throughout, which the penalty simulator now handles gracefully (shows "no estimate available" instead of a fabricated number) rather than defaulting to 0 silently.
6. **SSS / PhilHealth / Pag-IBIG / LGU-permit-renewal requirements are untouched MVP placeholders** — the workbook only covers BIR content, so I left these as they were, just tagged `prototype_placeholder` so the UI (and any future migration) can tell them apart from the real content at a glance.

## What changed in the codebase

- `lib/types.ts` — new `TaxpayerType`, extended `BusinessProfile` (real intake fields), new `ApplicabilityRule` fields (`taxpayerType`, `hasLease`, `isRegisteringNewBusiness`), new `ContentSource` + `complianceStage` on `Requirement`, new `PenaltyRuleType: "not_specified"`.
- `lib/ruleEngine.ts` — matchers extended for the new fields.
- `lib/penalty.ts` — handles `"not_specified"` penalties honestly; disclaimer text updated to the exact required Filipino wording.
- `app/wizard/page.tsx` — rewritten to ask the seven real questions in the source's order, with a live barangay→RDO lookup.
- `app/dashboard/page.tsx`, `app/account/page.tsx` — now display taxpayer type / barangay / RDO instead of the old placeholder business-type/structure chips.
- `app/requirements/[id]/page.tsx` — added a Source/Verification line (workbook vs. placeholder, last-verified date) and compliance-stage tag.
- `data/*.json` — see table above.
- `tests/ruleEngine.test.js` — updated for the new ids/fields; added a test that no `"not_specified"`-penalty requirement carries stray numeric fields.

Build: `npm run build` passes clean (17/17 routes). `node --test tests/ruleEngine.test.js`: 5/5 passing.
