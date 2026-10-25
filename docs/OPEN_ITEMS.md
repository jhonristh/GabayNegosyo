# Open items: what the owner still needs to supply or decide

Nothing here blocks running the app. Everything here blocks calling it production-ready. Items are grouped by what is needed.

## Decisions

| Item | Why it matters | Proposed default |
|---|---|---|
| Verified source for each LGU's business-permit requirements (17 NCR localities) | Permit steps differ per LGU; none are verified, so all are labelled generic | Keep "generic, not verified"; add per-LGU entries only with an official URL |
| Barangay-to-RDO data beyond what is verified | Auto-RDO is partial (see `data/ncr-barangays/README_REPORT.md`); users confirm their RDO with the BIR | Keep suggestions labelled as suggestions |
| Locality required in the wizard, or only for LGU permits? | Affects drop-off | Required (current behaviour) |
| Approved wording about geographic coverage | Avoid over-claiming | "Metro Manila (NCR). Local permit guidance is general." |
| Account deletion and data-retention policy | Deletion is permanent and cascades | Delete the auth user and linked rows immediately; no backup-restore promise |
| Whether `upgrade_to_premium_demo()` stays | Any signed-in user can self-upgrade (no payments) | Keep for the prototype; **remove before real billing** |
| Add DTI as a tracked agency? | DTI is Resource-library-only today; tracking it touches `agencies.json`, admin lists, checklist filters and the "five agencies" wording | Keep DTI in the library and on Renewal only |
| Tax-type and business-stage questions in the wizard | Tax type is now asked; whether withholding returns (1601-EQ, 0619-E, 1601-FQ) apply to every purely-business user is a domain question | Confirm with the team |
| "Gabay Negosyo's reference" wording on `/penalties`, and the demo seed deadline (Jan 20, 2026, now past) | Honesty and freshness of demo content | Owner to confirm |
| Payment provider and price | The checkout page takes no payment; no price shows until `NEXT_PUBLIC_PREMIUM_PRICE_LABEL` is set | Decide provider, price and updated Terms |

## Information

- **Credits:** names and contribution labels for 9 researchers and 1 web developer in `data/credits.json`. Credits must not invent names.
- **Contact and identity:** `NEXT_PUBLIC_SITE_URL` and `NEXT_PUBLIC_CONTACT_EMAIL` are required for production builds; `NEXT_PUBLIC_LEGAL_ENTITY_NAME` and `NEXT_PUBLIC_TEAM_NAME` are optional and not shown while unset.
- **Brand files:** keep the existing `public/icons/*` unless a client vector or transparent master is supplied.
- **Tax table:** `data/taxTable.json` has no source citation. Add the legal reference and a "last checked" date, and confirm the rates still apply.

## Links to verify or supply

- **YouTube videos:** the eight filing videos (`data/filingVideos.json`) and six Learning Hub videos have never been checked live. Open each once and confirm it is public, online and matches its title.
- **Five Learning Hub placeholders** point to YouTube searches, not verified videos: `tut-bir-registration`, `tut-sss-registration`, `tut-sss-contribution`, `tut-philhealth-registration`, `tut-pagibig-registration`. Each needs a verified URL, or removal. DTI videos (`dti-registration`, `dti-renewal`) appear only on the Renewal page.
- **15 requirements link only to an agency homepage:** `bir-cor`, `sss-contribution`, `philhealth-employer-reg`, `pagibig-employer-reg`, `lgu-permit-renewal`, `lgu-barangay-mayors-clearance`, `bir-registration-filing`, `bir-books-of-accounts`, `bir-orus-registration`, `bir-1700-compensation`, `bir-1701-self-employed`, `bir-0619f-monthly-final`, `bir-1601fq-quarterly-final`, `bir-2307-certificate`, `bir-2316-certificate`.
- **6 Business Guide entries have no official link** (`data/businessGuide.json`): `dti-new`, `dti-renew`, `barangay-new`, `barangay-renew`, `mayor-new`, `mayor-renew`.
- **BIR form PDFs** (`data/birForms.json`, `birConditions.json`, `resources.json`): most file names carry a January 2018 version date (1701A, 1701Q, 1601-C, 0619-E, 1604-C, 1604-E, 2551Q, 2000, 1706, 1800), 1601-EQ January 2019; only 1901, 1905, 1900 and 1906 carry October 2025. Confirm each is current on bir.gov.ph. Test the preview in a browser on at least one form.
- **Resource library additions:** the DTI, BMBE and ORUS links (`bnrs.dti.gov.ph`, `bmbe.dti.gov.ph`, `orus.bir.gov.ph`) were added from knowledge, not checked. The BMBE tutorial video was left out (the library accepts only government links). Resources without a published URL point to agency home pages. Their "source checked" date means "added", not "verified".

## Content

- Four requirements are still `prototype_placeholder`: `sss-employer-reg`, `sss-contribution`, `philhealth-employer-reg`, `pagibig-employer-reg`.
- 17 flowchart images in the source workbook are not transcribed.
- Penalty rates and Business Guide steps should be confirmed against current agency issuances.
- Filipino copy (for example the 404 line) is flagged for native-speaker review.
- Tutorials remain partly placeholders; credit lines for third-party videos stay in place.

## Setup the owner must do

- Run the SQL in [SETUP.md](SETUP.md) (including migrations 003 and 004) and set the Vercel variables.
- Add `https://<your-site>/reset-password` to Supabase Redirect URLs.
- Reminders: complete the staged rollout in [REMINDERS_SETUP.md](REMINDERS_SETUP.md). Nothing is sent while `REMINDERS_MODE=off`.
