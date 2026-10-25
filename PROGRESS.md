# GabayNegosyo Development Progress

## Phase 0 — Project Setup

- [x] Initialize project
- [x] Configure TypeScript
- [x] Configure styling
- [x] Configure linting (via `next lint`, default Next.js config)
- [x] Configure environment variables (`.env.example`)
- [x] Configure PWA

## Phase 1 — Architecture

- [x] Database schema (`database/schema.sql`, target Postgres/Supabase structure)
- [x] Authentication (demo mode — `lib/auth.tsx`)
- [x] Authorization (`lib/authorization.ts`, service-layer role checks)
- [x] Rule engine (`lib/ruleEngine.ts`, data-driven, no UI hardcoding)
- [x] Service layer (`lib/db.ts`, swappable for Supabase later)
- [x] Demo mode (three seeded demo accounts + open sign-up)

## Phase 2 — Public Experience

- [x] Landing page
- [x] Navbar (public/user/admin variants, responsive)
- [x] Hero
- [x] Login
- [x] Sign up

## Phase 3 — Registration Wizard

- [x] Business type
- [x] Business structure
- [x] Tax information
- [x] Employees
- [x] Business information
- [x] Review
- [x] Requirement generation

## Phase 4 — User Dashboard

- [x] Dashboard
- [x] Progress
- [x] Checklist
- [x] Upcoming deadlines
- [x] Overdue requirements
- [x] Business profile

## Phase 5 — Requirements

- [x] Requirement detail
- [x] Required documents
- [x] Instructions
- [x] Official resource
- [x] Last verified
- [x] Completion

## Phase 6 — Learning Hub

- [x] Tutorial hub
- [x] Tutorial cards
- [x] Video links (clearly marked as placeholder search links)
- [x] Agency filters
- [x] Requirement linking

## Phase 7 — Resources

- [x] Resource library
- [x] Search
- [x] Filters (agency, type)
- [x] Sorting (A–Z, recently verified)

## Phase 8 — Deadlines

- [x] Deadline tracking
- [x] Reminder UI
- [x] Email service abstraction
- [x] Mock email mode (logged, visible in Admin dashboard)

## Phase 9 — Premium

- [x] Premium tier
- [x] Feature gating (UI + service layer)
- [x] Penalty simulator
- [x] Detailed requirements
- [x] Email reminders (Premium-gated configuration + test send)

## Phase 10 — Admin

- [x] Admin dashboard
- [x] User statistics (demo data, clearly labeled)
- [x] Agency management (CRUD)
- [x] Requirement management (CRUD, JSON editor for structured fields)
- [x] Resource management (CRUD)
- [x] Tutorial management (CRUD)
- [x] Analytics (demo metrics + live content counts + live email log)

## Phase 11 — PWA

- [x] Manifest
- [x] Service worker
- [x] Installability
- [x] Offline shell (previously visited pages cached, network-first)
- [x] Mobile optimization
- [x] Tablet/desktop optimization (responsive nav, layout)

## Phase 12 — Quality

- [x] Validation (required fields in wizard, sign-up, admin forms)
- [x] Error states (invalid JSON in admin requirement editor, missing profile empty states)
- [x] Loading states (dashboard, requirement detail)
- [~] Accessibility — semantic headings, labeled inputs, ARIA on progress bar; no full audit performed
- [~] Security — service-layer authorization checks exist; no penetration testing performed (prototype-appropriate)
- [~] Tests — data-integrity smoke tests only (`npm test`, 4 passing); no component/e2e test suite
- [x] Performance — production build verified clean, First Load JS ~88–105 kB per route

## Phase 13 — Final Demo

- [x] Fresh install works (`npm install && npm run dev` verified)
- [x] Demo mode works
- [x] User registration works
- [x] Wizard works
- [x] Checklist generation works
- [x] Dashboard works
- [x] Requirement details work
- [x] Resources work
- [x] Tutorials work
- [x] Premium gating works
- [x] Penalty simulator works
- [x] Reminder flow works
- [x] Admin dashboard works
- [x] PWA installation works (manifest + service worker + real icons)
- [x] README complete
- [x] PROGRESS complete

---

## Current Status

Overall:
`~95%` of V0 scope (Phases 0–11 complete; Phase 12 has three items intentionally
left at prototype-level depth rather than production-level — see `~` marks)

Current Phase:
`Phase 12 — Quality (partial) → ready for Phase 13 demo use`

Completed:
`74 / 77 checklist items`

Remaining:
`3` — full accessibility audit, security/pen-testing pass, and a component/e2e
test suite beyond the current data-integrity smoke tests. None of these block
running or demonstrating the prototype.

### Verified this session
- `npm test` → 4/4 passing
- `npm run build` → compiled successfully, 18/18 routes, zero TypeScript errors

---

## Phase 13 — Real Content Migration (the Gabay Negosyo reference content)

- [x] Audited all 26 sheets of the internal reference workbook and the
      registration-wizard txt content source 
- [x] Replaced the Registration Wizard with the real 7-question flow (new
      business? / taxpayer type / barangay+RDO / lease? / employees? /
      projected sales & expenses)
- [x] Barangay → RDO lookup wired in for Quezon City (160 entries)
- [x] 22 requirements re-written with real workbook content (BIR registration,
      books, ORUS, receipts, DST, individual taxpayer forms, final/expanded/
      compensation withholding) — each tagged with `contentSource` so
      workbook-sourced content is never confused with placeholder content
- [x] 13 real BIR form PDFs linked as resources
- [x] DTI / SEC / CDA added as agencies for the pre-registration stage
- [x] Penalty simulator no longer fabricates numbers for content the source
      doesn't specify — new `"not_specified"` penalty type, honest UI message
- [x] Required Filipino penalty-simulator disclaimer wording applied verbatim
- [ ] Flowchart images (17 embedded PNGs across the per-form sheets) not yet
      transcribed
- [ ] No automatic VAT/8%-vs-graduated tax-type calculator (source shows a
      manual sample computation only, no stated threshold rule to encode)
- [ ] SSS / PhilHealth / Pag-IBIG / LGU-renewal requirements are still MVP
      placeholders — out of scope for this workbook (BIR-only)

Verified this session: `npm run build` clean (17/17 routes), `node --test
tests/ruleEngine.test.js` 5/5 passing.

---

## Phase 14 — Design System v3 (frontend constraints compliance)

- [x] Audited a proposed "hybrid glass" redesign against the client's
      `Before writing any UI For C.txt` hard rules; found and rejected a
      blue→violet gradient system used on primary buttons, the brand mark,
      filter chips, and the page background — an explicit §1 violation
- [x] Rebuilt the color system on the product's own established brand
      (deep green / clay orange / warm sand) instead of a generic
      blue-violet-teal SaaS palette; verified WCAG contrast on every
      text/background pair in use (see `docs/DESIGN.md` §2) rather than eyeballing
- [x] Added real button states — hover, press, focus-visible, disabled,
      loading — replacing the "hover fade only" pattern §1 rules out
- [x] Kept the sound structural ideas from the rejected draft: glass
      scoped to shell surfaces only, solid cards on dense data, shape+color
      status badges, Space Grotesk/Inter/Georgia typography (not the banned
      Space Grotesk + Instrument Serif pairing)
- [x] Added a 4px spacing scale as CSS custom properties
- [x] Production-readiness pass: custom 404 page, per-page metadata + OG
      image + favicon set, `robots.txt` + dynamic `sitemap.ts`
- [x] Landing-page copy corrected to describe the actual (post-migration)
      wizard questions instead of the old MVP field set
- [ ] Backend/infra items from §2 of the constraints doc (analytics, rate
      limiting, DB scale planning, monitoring, backups) are explicitly out
      of scope — this prototype has no real backend or deployment yet; see
      `docs/DESIGN.md` §9 for the full list rather than faking any of it

Verified this session: `npm run build` clean (18/18 routes incl. sitemap +
custom 404), `node --test tests/ruleEngine.test.js` 5/5 passing, TypeScript
strict check clean.

## v0.6 visual experience update
- Added reusable visual resource cards and a native dialog PDF preview for BIR PDF URLs already present in the approved local resource dataset. Generic agency home pages remain external links; no preview or Drive link is invented.
- Added reusable tutorial cards. Existing tutorial data contains only YouTube search placeholders, so these display an honest unavailable state rather than a misleading video thumbnail or watch action. Verified direct video URLs can display a thumbnail automatically.
- Expanded resource library to a responsive card grid with existing search, agency/type filters, and sort preserved; requirement details surface related forms and tutorials inside the existing Premium gate.
- Introduced shared surface elevation, interaction feedback, focus styling, reduced-motion handling and mobile document viewer layout. Supabase, API, domain data, rule engine, and authentication code remain unchanged.
- Browser QA with an authenticated Supabase project and live official PDF responses remains outstanding; external PDF embedding depends on source headers/browser support and has an explicit official-source fallback.

## v0.7 workspace release
- Checklist progress donut reports completion as text and offers controls that filter completed, overdue and all items. It uses the existing progress records and applicability rules.
- Deadlines displays a navigable monthly calendar of computed, incomplete deadlines. A selected day lists linked requirements. Reminder settings retain existing premium gating.
- Account adds a local-only profile picture (PNG/JPEG/WebP, 500 KB cap) scoped to the signed-in user ID, plus grouped business, plan, preference and legal destinations. No Supabase Storage or profile schema changes were made.
- Admin dashboard surfaces its actual management routes and content health; Users adds a page-local role filter and a working retry action, preserving read-only Supabase RLS behavior.
- Landing adds explicit Free/Premium comparison and a transparent study/website attribution section. Names were absent from provided project material and are not asserted.
- Backend, Supabase auth/data access, SQL, eligibility, content records and payments remain untouched. Browser QA with configured credentials remains necessary for auth-specific flows.


## v0.10 bug-fix pass

See `docs/V0.10_FIXES.md`. tsc clean, 69/69 tests, contrast 13/13, build OK. Behaviour in a browser / live Supabase not verified.


## v0.11 contrast fix

Badge tints and hero progress track adjusted; contrast checker now reads the real CSS (38 pairs). See `docs/DESIGN_KITS.md` "V0.11 fixes".

## v0.11 lifecycle restructure
- Journey: Checklist → Business Registration → BIR Forms → Penalties → Renewal & Post-Registration (`lib/journey.ts`, `components/JourneyStepper.tsx`). Stages stay individually linkable.
- New routes: `/registration`, `/bir-forms`, `/penalties`, `/renewal`. `/guide` and `/premium/penalty-simulator` redirect into them. Wizard now lands on `/checklist`.
- BIR penalty rates (approved): micro 10%, micro interest 6% p.a., general interest 12% p.a. (+25% general surcharge from the penalties reference). Single source: `BIR_PENALTY_RATES` in `lib/penalty.ts`.
- BIR Forms: checkbox conditions from `data/birConditions.json` (Forms 1706, 1800 from the BIR forms reference).
- Filing tutorial videos: placeholder; add entries to `data/filingVideos.json`.

## v0.12 feature-validation fixes

- [x] Deadline model: `deadlineKind`, no invented dates, per-cycle completion, reachable Overdue, "No fixed date" status
- [x] Existing businesses no longer see one-time new-registration items
- [x] Requirement detail: free/premium boundary re-cut, "why it is on your checklist"
- [x] Task-level steps with persistence (`task_progress`, migration 002)
- [x] Guest-first wizard + read-only preview + profile adoption on sign-in
- [ ] Open: tax-type / stage questions (team decision), verified sources and tutorials, server-side admin content, credits

Details: `docs/V0.12_CHANGES.md`.

## v0.12 Final = v0.12 + updated content (the content update)
- BIR Forms, Business Registration and Penalties PDFs were unchanged. Checklist and Renewal PDFs changed: DTI registration/renewal guide entries added, document lists expanded, barangay renewal steps updated.
- Filing tutorial videos: 8 YouTube links in `data/filingVideos.json`, embedded on `/renewal` (placeholder shows only if the list is empty).

## v0.15 (fixes on the v0.14 Emerald Growth redesign)
- [x] Hero: arrow moved into the art column (it was a hero grid item that displaced the copy and ran under the text); own band on small screens
- [x] Signed-in sidebar: theme toggle and full nav visible at first paint on laptop heights
- [x] Night Shift: stepper, BIR checks and current-step label/number use theme tokens (were white boxes / dark-on-dark / white-on-mint)
- [x] Penalty simulator: two-column on desktop; breakdown typography fixed; calculation and disclaimer untouched
- [x] Verified: `npm test` 132/132, `npm run lint`, `npm run contrast-check` (40/40), `npm run build`
- [ ] Not reviewed: Learning Hub layout vs reference, admin pages in Night Shift, real Supabase login (placeholder credentials only)
- [ ] Owner to confirm: "Gabay Negosyo's reference" wording on /penalties; demo seed deadline dated Jan 20, 2026 is now in the past

## v0.15 round 2
- [x] Login redesign with show/hide password (also on Sign up); proper `<form>` so password managers and Enter work
- [x] Terms, Privacy, Disclaimer on a shared `LegalPage` layout (wording unchanged); new `/credits` page; footer rebuilt
- [x] Supabase account sync: `database/migrations/003_sync_profiles.sql`, admin overview + Sync now, hardened signup trigger; Admin → Users role filter now server-side
- [ ] Owner: run migration 003 in Supabase; put real names in `data/credits.json`
- [ ] Not verified: the admin dashboard against a real admin session and real Supabase (SQL syntax-checked and the panel tested against mocked responses only)


## v0.16.3 — Consultant changelog implementation (partial)

- Updated registration wizard taxpayer choices to remove the redundant Purely Compensation and Purely Business options; retained Self-Employed or Professional and Mixed Income Earner. Existing legacy values remain supported by the domain type for saved profiles.
- Added a Tax Type & Deductions step after projected annual sales: 8% Option or Graduated Tax; Graduated Tax reveals OSD / Itemized Deductions and projected expenses. Added a non-advisory ₱3,000,000 threshold reminder.
- Added a Not Applicable lease response for remote/home-based users and included the choice in review.
- Expanded Mayor’s Permit renewal documents and instructions from the supplied consultant changelog, including separate Mayor’s Permit/LBT costs and LGU-specific variation.
- Added the requested YouTube creator attribution note to tutorial cards and filing video cards.
- Added EOPT annual registration fee and invoice guidance where invoice-related BIR requirements are present.
- Validation note: dependencies are not installed in this workspace, so TypeScript/build validation could not run. Existing `npm test` has environment-related `.ts` import failures in several tests; the wizard expectation tests were updated for the intentional new step and options.
- Still needing a deeper pass: official BIR deadline/penalty verification, agency-specific registration links and details, DTI renewal content, premium/free plan content and pricing confirmation, and comprehensive browser QA.

## v0.16.4 — owner review fixes

- [x] Registration: Tax tables reference (graduated individual rates from `data/taxTable.json`, worked example, 8% option note). Display only; it does not compute tax.
- [x] Checklist hierarchy: **To do** section first, **Completed** section below (each split by compliance stage). Stage headings are h3 under the section h2s.
- [x] Learning hub: six owner-supplied YouTube walkthroughs wired into `data/tutorials.json` and linked from the matching requirements (`tutorialId`). Five placeholders remain where no verified video exists. DTI videos stay on Renewal, because DTI is not an in-scope agency in `lib/db.ts`.
- [x] Reminders: the in-app "Send test reminder" now uses the same provider as the daily digest (`EMAIL_PROVIDER` gmail or resend). It reports "sent" only when the provider accepted the email; otherwise it says nothing was sent.
- [x] Premium: upgrade opens `/premium/checkout` in a new tab. It states that payments are not connected, collects no payment details, and offers a demo upgrade that takes no payment.
- [x] Admin: numbered steps and warnings on Agencies, Requirements, Resources, Tutorials, Users and the dashboard. Archive confirmations say that items you added are deleted permanently.
- [x] BIR forms: "Preview form" for official BIR-hosted PDFs (same rule as the Resource library).
- [x] Renewal & Post-Registration: prominent notice that the YouTube videos are not owned by GabayNegosyo, with CTTO (credit to the owner).

Verification in this session: `tests/v0164.test.js` (14 new tests); full suite 154/154 on the modified copy versus 140/140 on the original; no new TypeScript errors (checked against the original copy; without installed React/Next types, the compiler reports many missing-type errors on both copies). Not verified: browser behaviour, live Supabase, a real email send, and `next build`. The YouTube links were not checked live.

## v0.16.4 build-fix pass
- lib/siteConfig.ts: NEXT_PUBLIC_* env vars now read statically so server and client agree (fixes footer/404 hydration mismatches).
- nodemailer is declared in package.json/package-lock.json; run `npm install` to resolve "Can't resolve 'nodemailer'".
- task_progress warning: apply database/migrations/002_task_progress.sql in Supabase.
- data/resources.json: +23 resources transcribed from the "Universal Resource and Document Checklist" (DTI/BNRS/BMBE, barangay and BPLO permits, BIR, SSS, PhilHealth, Pag-IBIG, fees, penalty trackers). DTI is resource-library-only (lib/db.ts RESOURCE_AGENCIES). Links to confirm before launch: bnrs.dti.gov.ph, bmbe.dti.gov.ph, orus.bir.gov.ph; other items point to agency home pages because the source gave no URLs.
- v0.16.4 TS fixes: wizard leaseApplicability type; auth resetPassword/updatePassword + app/reset-password page; '/reset-password' allowed redirect (add it to Supabase Auth → URL Configuration → Redirect URLs).
