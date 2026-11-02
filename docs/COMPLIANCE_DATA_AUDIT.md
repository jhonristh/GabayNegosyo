# GabayNegosyo — Prompt 6: Compliance Data and Content Integrity Audit

**Audit date:** 2026-11-03 (Asia/Manila)  
**Input archive:** `GabayNegosyo_v0_17_3_AFTER_PROMPT_05_REVIEW(1).zip`  
**Repository identity inside archive:** `GabayNegosyo-v0.17.1/`; `package.json` version `0.17.1`. **Do not assume the filename proves a v0.17.3 release.**  
**Scope:** Read-only audit of compliance catalogs, filtering, deadlines, penalty estimates, references, content gaps, NCR applicability, and their principal UI integrations.  
**Change policy:** No application source code or existing content datasets modified. This report is the only addition.

## Executive finding and release disposition

**Disposition: NEEDS FOLLOW-UP BEFORE CLAIMING VERIFIED COMPLIANCE ACCURACY.** Functional infrastructure and content exist for all requested agency groups. However, the existence of a record, a recorded `lastVerified` date, or a `gabay_guide` source label does **not** establish independent government verification. There are significant unresolved applicability, due-date, and local-government source issues. No production or browser/database claims are made.

### Reproducible data inventory

| Catalog | Observed |
|---|---:|
| `data/requirements.json` records | 52 |
| Active (not archived) requirements | 26 |
| Archived requirements | 26 |
| Active BIR / DTI / SSS / PhilHealth / Pag-IBIG / LGU / barangay | 10 / 3 / 3 / 3 / 3 / 2 / 2 |
| All requirements lacking `officialUrl` | 14 |
| Active requirements lacking `officialUrl` | 8 |
| Requirement rows with populated `lastVerified` | 52 (not independently re-verified) |
| Prototype-placeholder requirements | 4 |
| Requirement penalty rules designated `not_specified` | 45 |
| `data/resources.json` records / missing URL | 47 / 23 |
| Resources with populated `lastVerified` | 47 |
| `data/tutorials.json` records / placeholders | 12 / 5 |
| Catalogued NCR localities | 17 (16 cities plus Pateros) |

Data counts include archived records unless explicitly identified as active.

## 1. Agency implementation and status

| Agency | In dataset / active | Observed coverage | Integrity assessment |
|---|---:|---|---|
| BIR | 34 / 10 | Registration, annual/quarterly returns, withholding, VAT/percentage tax; specialized excise records largely archived | **Partially implemented / independently unverified:** several form conditions overlap; missing active form link; tax classifications need detailed review |
| DTI | 3 / 3 | Business name registration, renewal, BMBE | **Partial:** registration and BMBE linked; DTI renewal lacks a requirement-level official URL and an event-date input |
| SSS | 3 / 3 | Employer registration, employee registration, contributions | **Partial:** two records labeled `prototype_placeholder`; contributions have descriptive, not computed, schedules |
| PhilHealth | 3 / 3 | Employer registration, employee registration, contributions | **Partial:** employer registration is a placeholder; contribution remittance date explicitly open; contribution requirement lacks URL |
| Pag-IBIG | 3 / 3 | Employer registration, employee registration, contributions | **Partial:** employer registration is a placeholder; contribution requirement lacks URL and is not dated dynamically |
| LGU / barangay | 6 / 4 | Initial clearance/permit and renewals; one historic LGU renewal and another pre-registration item archived | **Client-dependent:** local variations require per-LGU official support; hard-coded January renewal-window statements are not universally verified |

Agency counts classify `barangay` separately in the data, but combine it with LGU functionally. `data/agencies.json` contains seven identifiers. UI text in `app/admin/agencies/page.tsx` still says “Five agencies” and omits DTI and the separate barangay category in that summary: a scope-consistency issue.

## 2. Applicability and profile rule audit

**Implementation:** `lib/ruleEngine.ts` interprets declarative `applicabilityRules`; `generateApplicableRequirements()` excludes `archived` items. The wizard saves profile answers in `app/wizard/page.tsx`; dashboard/checklist/deadlines/BIR forms call the shared engine. This is good structural separation, but several conditions are not conclusively correct:

1. **High — VAT auto-assignment vs. actual registration:** `ruleEngine.ts` overrides the effective tax type to `vat_registered` whenever projected annual gross sales are at least PHP 3,000,000. `app/wizard/page.tsx` also saves `vat_registered` at that threshold while warning VAT should be verified. Projected turnover is not proof of actual VAT registration, and applying VAT-only requirements without confirmed registration is a material classification risk. Verify applicable statutory thresholds/exemptions with BIR and obtain a distinct registration-status field before classifying the user as registered.
2. **High — 1701A eligibility rule:** active `bir-1701a-8percent` accepts `taxType` either `8_percent` **or** `graduated` with OSD, with a self-employed taxpayer. That may offer an inappropriate form under some graduated cases. Reconcile with official BIR filing instructions and the consultant's approved decision tree.
3. **Medium — income tax form coverage:** active `bir-1701-self-employed` is restricted to `mixed_income_earner`, while `bir-1701-itemized-vat` and `bir-1701-vat-osd` overlap with multiple tax options. Test a full matrix of self-employed/mixed income, VAT/percentage tax/8%, and itemized/OSD to ensure exactly the correct set is presented; no authoritative complete matrix is provided in the repository.
4. **Medium — BMBE missing-value check:** `bmbeMaxAssetsExcludingLand` matcher returns true when the user's assets are undefined; users expressing BMBE interest but not specifying assets may receive a requirement without a confirmed eligibility assessment. UI should not equate interest with qualifying registration.
5. **Medium — employees:** employer requirements check `hasEmployees` (some also check `minEmployeeCount`), while wizard stores both boolean and count. Audit contradictory/legacy persisted profiles (`hasEmployees=true`, `employeeCount=0`) and employment-specific compliance.
6. **Medium — historical defaults:** `businessType`, `businessStructure`, `status`, and `taxType` are retained as legacy/prototype properties with default wizard values. Some rules depend on these dimensions; verify persisted-profile backward compatibility rather than treating defaults as verified user answers.
7. **Client-dependent — local requirements:** locality selection exists, but requirement applicability does not include an LGU selector; general `lgu`/`barangay` requirements may appear to apply identically across all 17 NCR localities.

**Suggested non-destructive test matrix:** newly registering vs operating; freelancer vs online seller; no employee vs 1 vs 9; self-employed vs mixed-income; 8% vs graduated+OSD vs graduated+itemized vs VAT confirmed/unconfirmed; with vs without lease; BMBE interested with missing/excess assets; each NCR locality. Confirm exact expected requirements with the researchers before changing rules.

## 3. Deadline and overdue integrity

**Code inspected:** `lib/ruleEngine.ts` (`computeNextDueDate`, `resolveObligation`, `computeStatus`), `lib/calendarOccurrences.ts`, `components/DeadlineCalendar.tsx`, `app/deadlines/page.tsx`.

| Model | Implementation | Finding |
|---|---|---|
| One-time / variable / event offset | Typically display `no_deadline` without an invented date | Appropriate conservative fallback where event dates aren't collected, but not a complete tracking implementation |
| Fixed annual | Assigns month/day and rolls forward or retains overdue depending on `profileCreatedAt` | Has per-year cycle support; needs tests for status and year transition |
| Fixed dates | Generates this-year and next-year due dates | **High:** if any earlier date is past and profile existed at that time, it can keep selecting the most recent missed instance even if there are later dates in the same year; a completed earlier installment may prevent appropriate next-date display |
| Monthly day | Generates current month's nominal due date and sometimes next month | **High:** `monthly_day` uses one month/day but no prior-period ledger. Can continually show the same missed instance; cannot accurately represent filing periods and special December/eFPS deadlines |
| Quarter offset | Enumerates quarterly due dates | **High:** `resolveObligation` selects the next date and does not retain a missed quarter as overdue; cycle-completion behavior needs verification |
| Annual window | Uses only the end date | **Medium:** January 1–20 presented as general requirement; profile creation, renewal validity and local exceptions are not represented |
| Time zone | `new Date()` and local date getters, date keys derived locally | **Medium:** browser timezone governs displayed cycles; no explicit `Asia/Manila` normalization. Test outside-PH clients and midnight transitions |
| Leap day / invalid dates | Date construction can normalize invalid month/day | **Medium:** `resolveObligation` needs date validity checks comparable to `calendarOccurrences.ts` |

**Concrete records requiring follow-up:** `bir-1701q-quarterly` (three fixed dates); `bir-2550q` and `bir-2551q` (quarter offsets); `bir-0619e-monthly-expanded` (archived, fixed monthly day); `barangay-renewal` and `mayor-permit-renewal` (assumed January windows); `dti-renewal` (five-year validity but no actual expiry input); `sss-contribution`, `pagibig-contribution`, `philhealth-contribution` (recurring-variable, undated); `bir-1601c-monthly-compensation` (described variations but no computed dates).

**External source spot checks (not exhaustive):** DTI BN registration validity is five years, consistent with the dataset's DTI renewal narrative ([DTI registration law](https://bnrs.dti.gov.ph/pdf/registration/business_law.pdf)). BIR's official eFPS FAQ lists different deadlines by form and filer ([BIR eFPS FAQ](https://efps.bir.gov.ph/eFPSFAQ.html)); broad generic recurrence cannot replace form-specific verification. These spot checks do not validate all records or calendar holidays/agency extensions.

## 4. Penalty simulator and assumptions

**Code:** `lib/penalty.ts`, `components/PenaltyCalculator.tsx`, `app/penalties/page.tsx`, `app/premium/penalty-simulator/page.tsx` (redirects to `/penalties`).

- Pure functions validate finite nonnegative amounts and nonnegative integer late days. The BIR calculator applies 10% one-time surcharge and 6% yearly interest pro-rated by days / 365, with separate totals and a required educational disclaimer. The UI explicitly excludes compromise penalties. The rate table and calculator share constants: positive consistency control.
- **Verified limited external cross-check:** BIR RR 6-2024 supports reduced penalties for qualifying micro and small taxpayers ([official regulation](https://bir-cdn.bir.gov.ph/BIR/pdf/RR%206-2024%20%28final%29.pdf)); BIR 1701-MS instructions also describe a 10% surcharge under specified circumstances ([official BIR instructions](https://bir-cdn.bir.gov.ph/BIR/pdf/RMC%20No.%2034-2025%20Annex%20A.pdf)). **This is not proof that all late filings qualify for the same treatment.** Separate fraudulent/willful cases, compromise amounts, qualifying taxpayer classification, applicable year and other exceptions need confirmation.
- **High:** `BirTaxpayerTier` offers `micro` and `small`, but the calculator cannot evaluate user qualifications based on supplied tax history/facts. A selectable tier is not an entitlement to a rate. Tier criteria, effective dates and source metadata should accompany examples.
- **Medium:** the generic `estimatePenalty` supports monthly/compound/capped formulas, but `45/52` records intentionally use `not_specified`; therefore it must not silently fill in missing penalty bases or rates. The seven remaining generic rule types/records must be compared one-by-one against official documentation before use.
- **Medium:** displayed roundings and educational 365-day pro-ration are implementation choices; confirm exact statutory computation conventions, inclusive/exclusive day handling, and when penalties accrue. Do not generalize the calculator to SSS/PhilHealth/Pag-IBIG/LGU.
- **Medium:** mandatory disclaimer says the estimate does not replace an accountant or BIR assessment; confirm analogous limitations for non-BIR cases and visibly show citation/last-review date adjacent to estimates. The input's `daysLate` is manual, not proof of a correct statutory due date.
- **Client-dependent:** the code's comment calls rates “approved by the Gabay Negosyo team”; documented team approval is not an independent agency assessment or proof of applicability.

## 5. Source, link and learning-resource integrity

| Classification | Findings | Action / owner |
|---|---|---|
| **Verified, limited** | Official DTI BN 5-year validity and BIR RR 6-2024 reduced-rate framework independently spot-checked via official government publications | Researchers to map each applicable claim to exact sections and effective dates |
| **Internally documented; externally unverified** | All 52 requirement `lastVerified` fields populated; `gabay_guide` on 48, `prototype_placeholder` on 4; 47 resources have last-verified fields | Existing dates attest source review at most, not fresh official revalidation; retain and explain source provenance |
| **Missing** | Active requirement official URLs: `bir-1701a-8percent`, `barangay-clearance`, `mayor-permit`, `dti-renewal`, `barangay-renewal`, `mayor-permit-renewal`, `pagibig-contribution`, `philhealth-contribution` | Research team to supply direct official document URLs |
| **Missing** | 23 resource records have empty `url`; 5 tutorial records have `isPlaceholder=true` and no video URL | Content team to source actual official/copyright-cleared content or keep transparently unavailable |
| **Unverified** | Remaining non-empty official URLs are **not** universally validated for status, relevance, canonical destination, or PDF currency by this audit | Run future allowlisted link checker + manual citation review; avoid representing all URLs as link-verified |
| **Client-dependent** | NCR LGU-specific permit/clearance steps, requirements, fees, renewals, exemptions and local source links | Obtain per-LGU current official sources, distinguish national baseline from locality-specific instructions |
| **Conditional** | BIR form and tax choices, remittance dates, qualifying business thresholds, BMBE status | Require official/form-specific references and consultant sign-off |

`lib/contentHealth.ts` labels many entries `workbook_verified` based on metadata/absence of approximation markers. **Important semantic gap:** that label does not mean independently validated against official agencies. Consider changing presentation wording only with owner approval; this audit does not modify code. `app/page.tsx` derives the headline “most recent verification date” from existing fields; this can overstate independent checking.

## 6. NCR geographic scope

`data/ncrBarangays.json` contains all 17 NCR local government units (16 cities and Pateros). The product's stated target is NCR-wide, not just Quezon City. Locality-specific source traceability has not been established for every permit/renewal requirement. The `barangayRdo.json` mapping and `data/ncr-barangays/` source inventory merit a separate validation with official RDO/local LGU references; association to an RDO cannot be assumed from barangay name alone. A generic permit guide is informational, not a city-verified checklist. Don't imply all LGUs have identical deadlines.

## 7. Prioritized corrective backlog (proposals only; nothing changed)

| Priority | Action | Verification / acceptance |
|---|---|---|
| P0 | Reconcile auto-VAT assignment and applicable tax forms with BIR instructions | Matrix tests of actual vs projected VAT status; no VAT-only obligation shown solely from projection without documented legal basis |
| P0 | Fix recurring occurrence / overdue selection for monthly, quarterly and fixed multi-date items | Tests for missed prior cycle, completed prior cycle, current due, year boundary, profile created after prior deadline |
| P0 | Resolve misleading locality-level claims and renewal date generalization | City-specific source or explicit “not verified for your LGU” state |
| P1 | Obtain and map 8 active requirement links + 23 missing resource URLs | Direct official sources reviewed; no fabricated URL |
| P1 | Source 5 tutorial placeholders or preserve honest unavailable state | Each published tutorial has a usable and appropriate link |
| P1 | Distinguish content-provenance labels from independent verification | Admin and public wording accurately reflects evidence |
| P1 | Confirm penalty tier qualification, edge cases, and source dates | Form-specific BIR primary reference, expert signoff, reproducible examples |
| P2 | Explicit Manila-local date treatment; invalid calendar input tests | Simulated foreign timezones, midnight, February, year crossover |
| P2 | Align admin agency header and geographic marketing with six-group scope | UI consistently says BIR, DTI, SSS, PhilHealth, Pag-IBIG, LGUs |

**Approval required before action:** Any content correction, government-rate/filing-date adjustment, or code change must be separately authorized. Government filings, fees, penalty rules, and local requirements must not be silently invented.

## 8. Validation and limitations

- **Performed:** ZIP extraction and source inspection; JSON inventory/counts; rule, deadline, penalty, wizard, and relevant UI source review; limited BIR/DTI primary-source web spot checks. No existing datasets rewritten.
- **Automated tests attempted:** `npm test` on the extracted archive using Node **v22.16.0** returned **193 passed, 125 failed, 6 skipped** from 324 cases. The first observed failures are environment/test-loader errors (`ERR_UNKNOWN_FILE_EXTENSION` importing `.ts` modules), not demonstrated compliance logic failures. This ZIP contains **no `node_modules`** and package requires Node >=22.18.0; therefore results cannot be interpreted as functional regression proof. Full dependency install and supported runtime are needed before rerun.
- **Not performed:** production/staging database access, Supabase data comparison, full official URL HTTP/link validation, all 52 primary-source claim verification, browser end-to-end checks, Vercel deployment equivalence, production builds, pen-test, government/consultant sign-off.
- **Version discrepancy:** ZIP outer name references v0.17.3 / Prompt 05 while internal folder and package metadata remain v0.17.1. This report is an audit of *these exact bytes*, not a release provenance assertion.
- **Integrity:** Only this `docs/COMPLIANCE_DATA_AUDIT.md` report added to the extracted project; all pre-existing files retained. The original uploaded ZIP remains unchanged.

**Next recommended workflow:** Prompt 7 responsive/accessibility/PWA review may proceed independently, but P0 compliance findings should be tracked before claiming Version 1 production readiness. Ask client researchers for missing source URLs and per-city verification rather than guessing.
