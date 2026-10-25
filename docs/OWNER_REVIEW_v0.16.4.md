# Owner review: v0.16.4 changes and what is still needed

This note covers the nine items from the owner's review of the v0.16.2 package (delivered as `v0.16.5.zip`). Section 1 says what changed. Section 2 lists the files, links and decisions still needed. Section 3 says what was and was not verified.

---

## 1. What changed

| # | Item | What was done | Where |
|---|------|---------------|-------|
| 1 | Tax tables reference on registration | Graduated income tax table from `data/taxTable.json`, a worked example, and a note on the 8% option. Shown to every signed-in user. Display only; it computes nothing. | `components/TaxTableReference.tsx`, `app/registration/page.tsx` |
| 2 | Completed vs not-completed hierarchy | "To do" section first, then "Completed" (each grouped by compliance stage). Stage headings are now h3 under the section headings. | `app/checklist/page.tsx`, `styles/globals.css` |
| 3 | Fill the Learning Hub | Six owner-supplied YouTube walkthroughs are now tutorials, and four requirements link to them through `tutorialId`. Five placeholders remain where no verified video exists (see 2.1). The hub intro no longer claims a guide for every requirement. | `data/tutorials.json`, `data/requirements.json`, `app/tutorials/page.tsx` |
| 4 | Reminders and email digest | The in-app "Send test reminder" now uses the same provider as the daily digest (`EMAIL_PROVIDER` = `gmail` or `resend`). It says "sent" only when the provider accepted the email. Otherwise it says nothing was sent. The digest itself was reviewed and not changed. | `app/api/send-email/route.ts`, `lib/email.ts`, `app/deadlines/page.tsx` |
| 5 | Premium payment in a new tab; placeholders | Upgrade opens `/premium/checkout` in a new tab. It states that payments are not connected, collects no card or e-wallet details, and offers a demo upgrade that takes no payment. The "Price not set" style placeholder is gone; no price line shows until a price is configured. | `app/premium/checkout/`, `app/account/page.tsx` |
| 6 | Admin controls with instructions | Each admin editor now has numbered steps and warnings. Archive confirmations say whether the item is hidden (built-in) or deleted (added by an admin). The dashboard's "Recent reminder emails sent" is now "Recent emails (sent or logged)", because the log also holds emails that were not delivered. | `components/AdminHelp.tsx`, `app/admin/*` |
| 7 | Preview on BIR forms | "Preview form" opens official BIR PDFs in a dialog, as the Resource library does. Only `bir-cdn.bir.gov.ph` PDFs are previewed. | `components/PdfPreviewButton.tsx`, `lib/pdfPreview.ts`, `app/bir-forms/page.tsx` |
| 8 | YouTube ownership and CTTO note | A prominent notice at the top of the Filing Tutorial Videos section on the Renewal & Post-Registration page: GabayNegosyo does not own the videos; CTTO means credit to the owner. The Learning Hub also carries a short credit line. | `components/FilingTutorialVideos.tsx`, `app/tutorials/page.tsx` |
| 9 | Assess missing files and links | This document (section 2). | `docs/OWNER_REVIEW_v0.16.4.md` |

Supporting changes: `lib/money.ts` (peso formatting), `lib/pdfPreview.ts` (preview rule), `tests/v0164.test.js` (14 new tests), `PROGRESS.md` and `docs/REMINDERS_SETUP.md` updated.

---

## 2. Files, links and decisions still needed

### 2.1 YouTube videos

- **The eight filing videos (`data/filingVideos.json`) and the six Learning Hub videos were not checked live.** The check from this environment was blocked. Open each link once and confirm it is public, still online, and matches its title. Replace any that are not.
- **Five Learning Hub placeholders** link to YouTube search results, not to a verified video: `tut-bir-registration` (Form 2303), `tut-sss-registration` (R-1), `tut-sss-contribution`, `tut-philhealth-registration` (ER1), `tut-pagibig-registration` (Virtual Pag-IBIG). Each needs a verified video URL, or the tutorial should be removed.
- **DTI videos** (`dti-registration`, `dti-renewal`) appear only on the Renewal page. DTI is not an in-scope agency in `lib/db.ts`, so tutorials tagged `dti` are filtered out of the Learning Hub. **Decision needed:** add DTI as an agency (this touches `agencies.json`, the admin agency list, checklist filters and the "five agencies" wording), or keep DTI videos on the Renewal page only.

### 2.2 Official links

- **15 requirements link only to an agency homepage**, not to the page or form they describe: `bir-cor`, `sss-contribution`, `philhealth-employer-reg`, `pagibig-employer-reg`, `lgu-permit-renewal`, `lgu-barangay-mayors-clearance`, `bir-registration-filing`, `bir-books-of-accounts`, `bir-orus-registration`, `bir-1700-compensation`, `bir-1701-self-employed`, `bir-0619f-monthly-final`, `bir-1601fq-quarterly-final`, `bir-2307-certificate`, `bir-2316-certificate`. Each needs a specific official URL.
- **6 Business Guide entries have no official link:** `dti-new`, `dti-renew`, `barangay-new`, `barangay-renew`, `mayor-new`, `mayor-renew` (`data/businessGuide.json`). Each needs an official link (DTI, barangay, or city/municipal hall).

### 2.3 BIR form PDFs

- BIR form PDFs are linked in `data/birForms.json` (13 forms), `data/birConditions.json` (1706, 1800) and `data/resources.json`. Most file names carry a **January 2018** version date (1701A, 1701Q, 1601-C, 0619-E, 1604-C, 1604-E, 2551Q, 2000, 1706, 1800). 1601-EQ carries January 2019. Only 1901, 1905, 1900 and 1906 carry an October 2025 date. **Confirm each is the current version on bir.gov.ph** and replace any that have been superseded.
- Preview depends on the PDF being served from `bir-cdn.bir.gov.ph` with normal headers. Test the preview on at least one form in a browser.

### 2.4 Tax table

- `data/taxTable.json` has no source citation in the file. Add the legal reference used for the graduated rates and a "last checked" date. Confirm the rates still apply before release.

### 2.5 Premium and payments

- **No payment provider is connected.** The checkout page says so and does not take payment. Real payments need a provider decision, a price (`NEXT_PUBLIC_PREMIUM_PRICE_LABEL`, currently unset), and updated terms.
- **Security note before any real payment:** `upgrade_to_premium_demo` (`database/supabase_setup.sql`) lets any signed-in user upgrade their own account from Free to Premium with no payment. Restrict or remove it before charging anyone.

### 2.6 Email reminders (setup in Vercel and Supabase)

1. Run `database/migrations/004_reminder_digest.sql` in Supabase (and confirm 003 has been run).
2. In Vercel (Production), set: `EMAIL_PROVIDER` (`gmail` or `resend`), `GMAIL_USER` and `GMAIL_APP_PASSWORD` (or `RESEND_API_KEY` and `EMAIL_FROM`), `CRON_SECRET`, `SUPABASE_SERVICE_ROLE_KEY`, `NEXT_PUBLIC_SITE_URL`, `REMINDERS_MODE` (start with `dry_run`), and `REMINDER_ALLOWLIST` (your own address while testing).
3. Follow the stages in `docs/REMINDERS_SETUP.md`: dry run, then live with the allowlist, then open to all Premium users.
4. Gmail caps daily sends. Fine for a prototype; use a domain with Resend for real volume.

### 2.7 Site identity (production build)

- `NEXT_PUBLIC_SITE_URL` and `NEXT_PUBLIC_CONTACT_EMAIL` are required in production (`scripts/check-env.mjs` fails the build without them).
- `NEXT_PUBLIC_LEGAL_ENTITY_NAME` and `NEXT_PUBLIC_TEAM_NAME` are not required but are unset. The footer and legal pages will not show them.

### 2.8 Content still to confirm

- Four requirements are still marked `prototype_placeholder`: `sss-employer-reg`, `sss-contribution`, `philhealth-employer-reg`, `pagibig-employer-reg`.
- Flowchart images in the source workbook (17 PNGs) are not transcribed (PROGRESS.md, Phase 13).
- Owner to confirm the "Gabay Negosyo's reference" wording on `/penalties` (PROGRESS.md, v0.15).
- Penalty rates and the Business Guide steps should be confirmed against current agency issuances before release.

### 2.9 Admin limitations to know about

- Admin content edits (agencies, requirements, resources, tutorials) are saved only in the browser that made them. They are not shared with other users. A real backend is needed for shared editing.
- Archive hides built-in items, but an item an admin added is deleted permanently. There is no restore button.
- The Users page is read-only. Plan changes are made in the Supabase SQL editor (the instructions on the page show the statement).

---

## 3. Verification

**Run in this session:**

- `npm test` equivalent (`node --test tests/*.test.js`): 154 of 154 pass. The original package passes 140 of 140. The 14 new tests are in `tests/v0164.test.js`.
- Syntax check of all 21 changed TypeScript and TSX files: all parse.
- Full TypeScript compile, compared against the original: no new errors other than those caused by the sandbox not having React and Next type packages installed.
- Every `tutorialId` in `data/requirements.json` resolves to an entry in `data/tutorials.json`. All JSON files validate.

**Not verified (no network access to npm, YouTube, or the agencies from this environment):**

- `npm install`, `next build` and `next lint`.
- Browser behaviour: the checklist layout, the PDF preview dialog, the new-tab checkout, and the tax table at phone width.
- Supabase: migrations, RLS, and the `upgrade_to_premium_demo` path.
- Real email delivery through Gmail or Resend, and the Vercel cron run.
- Every YouTube link and official link listed above.
