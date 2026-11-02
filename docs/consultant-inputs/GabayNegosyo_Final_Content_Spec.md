# GabayNegosyo — Final Content Spec (consultant-approved)

Prepared 2026-11-02. This file is the **single source of truth** for website content. It merges: the revised client PDF (with consultant comments applied), the consultant changelog, and the Universal Resource Checklist. Where this spec is silent, the revised PDF governs. Anything marked **OPEN** must not be invented — implement a safe placeholder and report it.

Companion file: `GabayNegosyo_Forms_Links_Database_v2.json` (all URLs; statuses; flags).

---

## 1. Free vs Premium (consultant's official table)

| Feature | Free | Premium |
|---|---|---|
| Wizard and tax-option estimate | ✅ | ✅ |
| Checklist (requirement, agency, deadline) | ✅ | ✅ |
| Tutorials (video links) | ✅ | ✅ |
| Deadline status (due soon / due today / overdue) | ❌ | ✅ |
| Progress tracking (mark complete, progress bar) | ❌ | ✅ |
| Resource library | ❌ | ✅ |
| Required documents | ❌ | ✅ |
| Step-by-step instructions | ❌ | ✅ |
| Penalty info and official source link | ❌ | ✅ |
| Penalty simulator | ❌ | ✅ |
| Email reminders | ❌ | ✅ |

Changes versus the earlier PDF/website: **Tutorials move to Free** (YouTube policy forbids placing videos behind a paywall); **Resource library moves to Premium**; deadline status and progress tracking are Premium. Enforce at UI **and** service/DB layer (RLS/API), not UI only.
**OPEN:** tier of fee tables and permit requirement lists → default Premium (with Required documents). **OPEN:** "last verified" date → recommend small text on every checklist item, free.

**Mandatory attribution** wherever any video appears: `Videos are from YouTube and belong to their creators.` Use YouTube's own embed or a plain link; never download, re-host, or copy thumbnails.

## 2. Wizard changes (screens reviewed by the consultant)

1. **Taxpayer Type** — options become only: *Self-Employment or Profession* and *Mixed Income Earner*. **Remove "Purely Compensation"** (not applicable) **and "Purely Business"** (redundant with Self-Employment or Profession).
2. **Lease step** ("Do you lease the space for your business?") — add a third option **"Not applicable"** (e.g., work-from-home, or the owner owns the space). Yes / No / Not applicable must all allow Continue.
3. **Projected Sales & Expenses step** — **sales only** here. Remove the expenses field from this step.
4. **New step after sales: "Tax type / Tax option"** — choices **8%** and **Graduated**.
   - **8%:** no expenses question; the ₱250,000 is deducted automatically. (**OPEN FL-16:** do not apply ₱250,000 to *Mixed Income Earners* until the consultant confirms.)
   - **Graduated:** show two sub-options **OSD** (optional standard deduction, 40%) and **Itemized**. Ask for annual expenses **only if Itemized**.
5. Under the sales field, show a note when sales ≥ ₱3,000,000: the 8% option is unavailable; the **graduated tax table applies automatically**, and the business must register as a VAT taxpayer. Disable/hide the 8% option at that level.
6. The graduated tax table comes from the consultant (**OPEN FL-17**). Store it in a data/config file; do not type it from memory.
7. The remaining steps (business type, structure, employees, business info, review, generate) stay.

Rationale (consultant): micro taxpayers are **not** automatically on 8% — they choose; 8% is on gross minus ₱250k so expenses do not apply; graduated gives OSD or itemized.

## 3. Rules and facts to implement

- **8% flat tax:** optional; for qualified self-employed individuals and professionals; only if annual gross sales/receipts ≤ ₱3,000,000; used **in lieu of** graduated income tax **and** the 3% percentage tax; legal basis RA 10963 (TRAIN). Shown as a note in post-registration compliance.
- **Percentage tax vs VAT:** gross below ₱3M → non-VAT, liable for percentage tax (Form **2551Q**, due 25th day after each quarter). Exceeds ₱3M → register as VAT taxpayer, Form **2550Q**, same 25th-day rule. 8% filers do not file 2551Q.
- **Employees:** withholding tax on compensation, Form **1601-C**, due the 10th of the following month (15th for eFPS filers); December's return due January 15. Also Form **2316**, by January 31.
- **EWT** (payments to suppliers for professional fees, rentals, contractors): **0619-E** monthly (10th of following month); **1601-EQ** quarterly (last day of month following quarter close).
- **Excise tax** (only for manufacturers/importers of alcohol, tobacco, petroleum, automobiles, etc.): forms 2200-A, -AN, -C, -M, -P, -T, -S with the filing rules in the database. For alcohol: quarterly Sworn Statement of Volume of Sales (due 25th day after quarter; table columns: Brand/Variant, Total Volume of Sales, Gross Peso Value of Sales, Cost of Manufacture/Importation, Gross Profit Realized, SRP, Computed Excise Tax Due/Paid); print, notarize, submit to RDO (Large Taxpayers Service only if classified large), filed as an attachment to the quarterly return.
- **Income tax returns (post-registration), both with/without employees:** 1701, 1701-Q, 1701-A, 1701-MS. Annual returns **April 15** (statutory). 1701-Q: **May 15, Aug 15, Nov 15**. Note: the 2025 annual return was extended once to **May 15, 2026** (RMC 30-2026); treat as one-off, not the standing deadline.
- **BIR registration:** online via **ORUS**; pay ₱30 loose DST to generate/print the **eCOR**; invoicing: BIR-printed invoices (BPI) or Authority to Print (ATP). Requirements: any government ID (PhilID/ePhilID, passport, driver's licence/eDriver's licence); extra proof of residence/business address if the ID lacks an address; final clear sample of own invoices or a BPI; DTI certificate if a registered business name; custom invoice layout flow (draft layout → choose BIR-accredited printer → generate sample layout → file Digital ATP via ORUS → download/print Digital ATP certificate and send to printer). Add links: ORUS, and the BIR complete checklist PDF. Add: if via a representative, a Special Power of Attorney naming the specific transactions, IDs of both parties and one original (wet) specimen signature.
- **EOPT:** no BIR annual registration fee (the old ₱500 is gone); no BIR registration fee at all (₱0); DST ₱30; BPI may be used in the first year or until consumed, whichever is first; from year two an ATP is generally required unless an exception applies. Books of accounts ₱200–₱300; BPI ₱50/booklet (50 pages); own invoices ₱200–₱400/booklet. **Remove** any instruction to pay a registration fee / Form 0605. No renewal of the BIR permit due to EOPT.
- **One-time registration** for SSS, PhilHealth, Pag-IBIG (no renewal). Sole proprietors with employees need employer **and** employee registration (SSS R-1 / R-1A; PhilHealth ER1 / ER2; Pag-IBIG EDF).
- **DTI:** show the **online application link** (`https://bnrs.dti.gov.ph/registration`) **and** keep the requirements list as reference. Name valid up to 5 years. Renewal windows: early — up to 180 days before expiry; regular — within 90 days after expiry; late — usually within 90 days after the regular window, with surcharges (the earlier PDF states +50% for late renewal).
- **Barangay clearance renewal:** valid until Dec 31; renew on or before **Jan 20** of the following year. **Mayor's/business permit renewal:** valid until Dec 31; renew between **Jan 1 and Jan 20**. (Residual conflict in the PDF's "with employees" column — adopt Jan 20; consultant to align.)
- **SSS / PhilHealth registration pages:** present the requirement lists **and** add an "apply online" link to `https://www.sss.gov.ph/employer-er/` and `https://www.philhealth.gov.ph/partners/employers/registration.php`. Pag-IBIG: requirements list plus EDF reference; prefer the official Pag-IBIG site over Scribd.
- **Mayor's permit — new business requirements (consultant list):** application form from the local Business Permits and Licensing Department; DTI certificate; barangay clearance; notarized contract of lease (if renting); Transfer Certificate of Title (TCT) or Tax Declaration (if owned); cedula; picture of establishment (front, right and left side view including the road); clearance and safety permits — locational/zoning clearance, Fire Safety Inspection Certificate (issued by the BFP), sanitary permit (local health office), certificate of occupancy, public liability insurance (high-traffic places, if applicable). Also show the DTI online-application link here as a reference.
- **Mayor's permit — renewal requirements:** latest barangay business permit and official receipt/proof of payment; completed renewal application form and other barangay requirements; cedula; latest income tax return and audited financial statements with proof of payment, when applicable; latest VAT or percentage tax returns, whichever applies; latest notarized lease contract, if renting; valid DTI, SEC or CDA registration; number of employees and their SSS, Pag-IBIG, PhilHealth registration details; Affidavit of No Operations if the business did not operate the previous year.
- **Pag-IBIG remittance schedule** (by first letter of employer name): A–D 10th–14th; E–L 15th–19th; M–Q 20th–24th; R–Z/numerals 25th–end of the month (following month). SSS and PhilHealth remittance dates are **not given** in any document — **OPEN**; do not invent.
- **BMBE:** optional; assets ≤ ₱3,000,000 excluding land; registration valid 2 years, renewable every 2 years; online steps (eligibility checker, business email, verification code, form, review, submit/download certificate); BMBE income-tax exemption does not cover VAT/percentage tax or late-filing penalties.

## 4. Penalty rules (replace all existing penalty data)

| Agency | Rule to implement | Notes |
|---|---|---|
| BIR — micro (< ₱3M) and small (₱3M to < ₱20M) | 10% penalty on the amount due for late filing/payment; interest at 50% of the regular rate = **6% per annum** on unpaid tax; fraud/willful neglect **50%**; failure to submit required information/records ₱500 per violation, max ₱12,500 per calendar year (informational); 50% compromise-penalty reduction for specified non-fraud violations (informational). Reference: RR 6-2024. | Interest method **OPEN FL-22** — assume daily pro-rata (days/365) and show it in the breakdown. |
| SSS | 2% per month on unpaid contributions until fully paid (simple). | EC contribution employer share is included. |
| PhilHealth | Interest of at least 3% per month, **compounded monthly**. | |
| Pag-IBIG | **0.1% per day** of the amount due. | Not "2% per month". |
| LGU Mayor's permit / Barangay | 25% surcharge on unpaid taxes/fees + interest up to 2% per month on the unpaid amount incl. surcharge; total interest capped at 36 months (Sec. 168, LGU Code); continued nonpayment may lead to closure, cancellation/suspension of the permit or seizure of assets, subject to law and local ordinance. | |
| DTI business-name renewal | +50% for late filing. | |

Remove the old BIR "25% + 12% p.a." as the default, the ₱1,000 "compromise penalty" for COR, and any unsourced rate. Criminal-exposure notes (non-remittance of deducted contributions) may be kept as informational text from the earlier PDF.

**Penalty Simulator (Premium)** — user picks:
- **Option A:** types the known tax due → penalty = tax due × rate (plus interest where applicable).
- **Option B:** does not know the tax due → system estimates **for the 8% option only**: `tax due = max(0, (gross sales − 250,000) × 8%)` (subject to FL-16), then computes the penalty on it.
- Always show the disclaimer, verbatim (Filipino): **"Estimate lang ito para sa awareness. Hindi ito kapalit ng aktwal na computation ng isang accountant o ng BIR para sa opisyal na pag-file."** The result must not render without it.

## 5. Revised notes — use this wording (adapt only for tone/language)

- **Mayor's permit fee note:** "The estimated amounts listed above distinguish the Mayor's Permit fee from the Local Business Tax (LBT), as these are separate charges imposed by the local government unit (LGU). The Mayor's Permit fee is a regulatory charge for the issuance of a permit to operate, while the Local Business Tax is generally based on the business's gross sales or receipts for existing businesses, or capitalization for newly established businesses, subject to the applicable local revenue code. Other fees, such as zoning clearance, sanitary permit, health certificate, and Fire Safety Inspection Certificate (FSIC) fee, may also apply. The actual amounts vary depending on the city or municipality, the nature and size of the business, and the applicable local ordinances, which may be updated or amended over time."
- **Barangay clearance fee note:** "The amounts presented are approximate estimates for a small sari-sari store and are intended for budgeting and comparison purposes only … should not be considered fixed or official rates for all cities … should be confirmed with the concerned LGU before application." (Use the full wording in the revised PDF.)
- **BIR registration fee note:** "No registration fee is required under the Ease of Paying Taxes (EOPT) Act. The cost of the books of accounts may vary depending on the type and number of books required. BIR-Printed Invoices (BPI) may be used by new business registrants during their first year of operation or until the invoices are fully consumed, whichever comes first. Beginning in the second year, taxpayers are generally required to secure an Authority to Print (ATP) for their own principal invoices, unless they qualify for the applicable exception allowing continued use of BIR-printed invoices. The cost of privately printed invoices depends on the rates charged by BIR-accredited printers."
- **BIR penalties row:** "For micro and small taxpayers covered by the applicable rules: generally 10% surcharge for late filing/payment, plus applicable interest and compromise penalties. Fraudulent/false returns may carry higher penalties."
- **Resource-use caution** (from the resource checklist): confirm current requirements with the responsible agency or LGU; amounts transcribed from the PDF are not independently verified quotations; Scribd is third-party — prefer the official Pag-IBIG site; do not replace missing official links with guessed links.

## 6. Fees (transcribe exactly from the revised PDF tables)

DTI by territorial scope (₱230 / ₱530 / ₱1,030 / ₱2,030 incl. ₱30 DST); barangay clearance estimates by Metro Manila city; Mayor's permit, zoning, sanitary, health clearance and FSIC estimates by city (Caloocan, Las Piñas, Makati, Malabon, Mandaluyong, Manila, Marikina, Muntinlupa, Navotas, Parañaque, Pasay, Pasig, Quezon City, San Juan, Taguig, Valenzuela); BIR registration fees (₱0 registration, ₱30 DST, books ₱200–₱300, BPI ₱50/booklet, own invoice ₱200–₱400). Source of truth: the revised PDF — copy numbers verbatim, show the notes above, label all as estimates.

## 7. Resource library (Premium) — structure from the Universal Resource Checklist

Sections and items: **A. Business registration** (DTI portal, DTI certificate/renewal, barangay clearance checklist and fees, Mayor's permit/BPLO checklist, lease/occupancy/zoning docs) · **B. BIR and taxes** (ORUS, documentary requirements PDF, COR/eCOR guidance, invoice/ATP guidance, forms directory, 8%/graduated/OSD/itemized guides, VAT/percentage tax, books/calendar/receipts, EOPT guidance) · **C. Employees and social contributions** (SSS employer/employee, PhilHealth ER1/ER2 and PMRF, Pag-IBIG EDF, membership numbers and remittance receipts) · **D. Renewals and local compliance** (barangay renewal, Mayor's permit renewal, LGU fee schedule/LBT rules, zoning/sanitary/health/fire, late-renewal penalties) · **E. Optional/supporting** (BMBE, circulars/regulations, tutorial videos with attribution, address/residency requirements, templates and receipts). The original page has a "collected" tracker (0/30) — keep that interaction if present. Add resources for RR 6-2024 and the BIR checklist PDF.

## 8. Requirement catalog (what must exist)

| Key | Applies when | Deadline model |
|---|---|---|
| dti-registration | all, new | before operations (one-time) |
| barangay-clearance | all, new | one-time; then renewal |
| mayor-permit | all, new | before operations |
| bir-registration | all, new | before operations |
| sss/philhealth/pagibig employer + employee registration (6 items) | has employees | before first hire (one-time) |
| dti-renewal | operating | 5-year; windows early/regular/late |
| barangay-renewal | operating | by Jan 20 yearly |
| mayor-permit-renewal | operating | Jan 1–20 yearly |
| bir-1701 | mixed income earner | Apr 15 yearly |
| bir-1701a | purely business, 8% or OSD | Apr 15 yearly |
| bir-1701q | all self-employed (8% and graduated) | May 15 / Aug 15 / Nov 15 |
| bir-1701ms | micro/small individuals | Apr 15 yearly |
| bir-2551q | non-VAT graduated (< ₱3M) | 25th day after each quarter |
| bir-2550q | VAT-registered (> ₱3M) | 25th day after each quarter |
| bir-1601c, bir-2316 | has employees | 10th monthly (Dec: Jan 15); Jan 31 |
| bir-0619e, bir-1601eq | pays EWT-subject payees | 10th monthly; end of month after quarter |
| bir-1706, bir-1800 | event: sold real property / donation > ₱250,000 | 30 days from event |
| bir-excise-* | manufacturers/importers of excisable goods | before removal from plant (alcohol also quarterly statement) |
| sss/philhealth/pagibig contribution | has employees | monthly (Pag-IBIG letter schedule; SSS/PhilHealth OPEN) |
| bmbe | optional, assets ≤ ₱3M | every 2 years |

Requirements are **data, not code** (rule engine reads the data). Deadline model must support: fixed yearly date, list of fixed dates, monthly day-of-month, N days after quarter end, window (start–end), event-based offset, one-time.

## 9. Open items to send back to the consultant/client

FL-08 (1701-A URL), FL-09 (DTI renewal video), FL-10 (duplicate video), FL-11 (missing form URLs), FL-12 (third-party links), FL-16 (₱250k for mixed income), FL-17 (graduated tax table), FL-18 (tier of fee tables), FL-20 ("last verified"), FL-21 (1701-A vs 1701 for itemized), FL-22 (interest method), and SSS/PhilHealth remittance dates.
