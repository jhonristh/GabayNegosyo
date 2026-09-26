# Client content integration and review — September 2026

Client source PDFs are preserved in `docs/client-sources/`. The new `/guide` route structures their registration, renewal, and post-registration content by business stage and employee status. The source documents are not served as government authority. Detailed steps and preparation lists remain Premium-only. Existing Supabase configuration, persistence, and authentication files are unchanged.

## Before relying on automatic compliance calculations

- `BIR Forms.pdf` offers the 8% option within a VAT-registered branch, which conflicts with BIR guidance; it repeats 1701A across tax regimes. Do not automatically select income tax forms from that matrix.
- `PENALTIES.pdf` gives a micro taxpayer bracket beginning at ₱3 million; BIR material defines micro below ₱3 million. `CHECKLIST.pdf` states a PhilHealth minimum 3% monthly charge, while `PENALTIES.pdf` gives 2–3%. Validate by scenario before updating calculator rates.
- Local clearance dates, permit renewal rules, DTI validity-based renewals, contribution deadlines, and event-based tax filings cannot safely be represented by the legacy `deadlineMonth` + `deadlineDay` model. The existing checklist/calendar uses annual anchors for some of these items; it needs a deadline-rule migration before release as a deadline service.
- Some official links and client-supplied tutorial URLs have not been individually checked. New guide links point to agency homepages or agency application pages rather than implying approval of a third-party tutorial.
- BMBE qualification and benefits need a current agency check. Do not enroll users automatically based on business size.
- Existing admin content overrides are browser-local and may mask updated seed JSON until cleared in that browser.

## Content files and presentation

- `data/clientGuide.json`: client guide stages, employee condition, premium steps, document list, source filenames, agency links.
- `app/guide/page.tsx`: personalized stage display and guidance, guarded by authentication.
- `components/Navbar.tsx`: desktop and mobile entry point.
- `app/checklist/page.tsx`: entry into the new guide and explicit legacy date qualification.

## Review gate

Have the client and a qualified compliance reviewer approve every disputed form combination, percentage, deadline rule, and local fee before those become automatic decisions or penalty calculations. Confirm links and tutorial ownership before exposing tutorial embeds.
