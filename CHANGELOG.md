# Changelog

Newest first. Earlier entries were merged from the former `PROGRESS.md`, `docs/V0.3_STATUS.md`, `V0.10_FIXES.md`, `V0.12_CHANGES.md`, `V0.13_CHANGES.md`, `QA_REPORT.md` and `OWNER_REVIEW_v0.16.4.md`. "Not verified" means the environment used could not check it (no browser, no live Supabase, no email send, often no `next build`).

## v0.17.1

### Work Package 4 additions (unreleased; version label unchanged)

Core user journey (sign-up to checklist completion). Not verified in a browser, real database or `next build`. See `docs/USER_JOURNEY_QA.md`.

- A failed load of saved data now shows a retry message (dashboard, checklist, deadlines, requirement detail, wizard) instead of an empty account; the wizard no longer reports a save that did not happen (`db.saveBusinessProfile` returns true/false).
- Sign-up no longer sends a guest-turned-member back into the wizard; it asks the account for the saved profile.
- Sign-up, log-in and the wizard say what is wrong instead of leaving a button silently disabled (`lib/validation.ts`).
- Unknown requirement ids show a message; marking progress shows a confirmation; checklist cards flag placeholder content.
- The wizard remembers the deduction method and the "Not applicable" lease answer (optional fields in the existing JSON profile; no migration). Dashboard shows stage, employees and tax arrangement.
- Signed-out visitors return to the page they wanted after logging in (same-site paths only).
- 31 new tests; 299 of 299 pass. No data file, SQL or dependency changed.

### Work Package 3 additions (unreleased; version label unchanged)

Account lifecycle and Premium completion. Not verified in a browser, database or `next build`. See `docs/ACCOUNT_LIFECYCLE_QA.md`.

- Delete-account route fails closed on any failed lookup, refuses admin-deactivated accounts, writes its record after success; picture removed on delete.
- New `/api/admin/account-status` route blocks/restores Supabase sign-in for admin-deactivated accounts.
- Browser plan check fails closed; "function missing" detection narrowed (F-08); profile load tolerates missing migration-005 columns.
- Migration 008 (not applied): append-only audit log, reason and target_ref columns, before/after status, DB-12.
- 36 new tests; the 3 `todo` tests are now real guards.

Review fixes on v0.17.0. Client-facing content is unchanged. Migrations 005 and 006 were edited in place and remain safe to re-run if an earlier copy was applied.

- Admin Premium/Free filter now uses the computed plan, so newly granted Premium accounts appear under Premium (they keep `role = 'free'`).
- Legacy `role = 'premium'` can no longer outlive an expiring grant; granting Premium moves a legacy account into the entitlement system and records that in the audit log.
- Demo accounts are refused by `deactivate_my_account()` and `admin_set_account_status()`, and by `/api/delete-account` when the database profile is flagged `is_demo`. The app now loads `is_demo` and hides the lifecycle actions.
- `/api/send-email` fails closed: if the plan cannot be verified it returns 503; the profile's own `deactivated_at` is read independently. The role fallback remains only for "function not installed".
- Admin-imposed deactivation is stored in `deactivated_by_admin`, so deleting the admin's account can no longer let the user reactivate themselves.
- Deactivated accounts can no longer edit their profile row.
- New read-only `admin_premium_roster()` lists current Premium users from the entitlement system for the manual reminder workflow.
- `vercel.json` no longer schedules the reminder cron (Premium reminders are manual in the first release). The route and code remain, disabled.
- New `docs/INTEGRATION_AND_QA_v0.17.md`: migration review, safe sequence, verification SQL, lifecycle and entitlement review, QA checklist, release blockers.
- 206 of 206 tests pass (`npm test`). Not verified: migrations on a database, browser or device behaviour.

## v0.17.0

Production functionality pass on v0.16.5. Client-facing content (all files in `data/`) is unchanged.

**Account lifecycle**
- Temporary deactivation and reactivation (Account → Deactivate). Data is kept; a deactivated account sees only a reactivation screen, and restrictive RLS blocks its own data. Admins can deactivate with a reason; only an admin can lift that.
- Permanent deletion now re-checks the typed `DELETE` on the server, writes a minimal 30-day deletion record (hashed id, role, date; no email or name) before deleting, and keeps the 10-minute fresh-login rule. Dialog focus returns to its button.
- New migration `005_account_lifecycle.sql`.

**Premium entitlements**
- Plan is decided on the server (`get_my_entitlement()`), with grant, expiry, revocation, source and reason. Expired or revoked Premium falls back to Free automatically. Demo Premium is a separate, browser-only source.
- `upgrade_to_premium_demo()` and the self-service upgrade button are removed; the Premium page now explains that an administrator turns Premium on.
- Central module `lib/entitlements.ts` (`hasPremiumAccess`, `canUse`, `FEATURE_TIER`); scattered role checks replaced. `/api/send-email` uses the server entitlement and refuses deactivated accounts.
- New migration `006_entitlements.sql`.

**Admin**
- Users page: search, plan and status, Grant/Revoke Premium (optional expiry, reason required), Deactivate/Reactivate. New Audit log page. Profile sync is now audited.

**PWA / UX**
- Manifest gains `id`, `scope`, `lang`, categories and no longer locks orientation to portrait. Offline/online banner.

**Security**
- Next.js raised from 16.3.5 to 16.4.3 (`npm audit` reported advisories against 16.0.0–16.4.0, one critical) along with `sharp` and `source-map-js` patch releases. Typecheck, tests and the production build pass on it. One advisory remains: `nodemailer` 7.x (high); its fix is a breaking major upgrade (10.x), so it was not forced. Nodemailer is used only by the deferred reminder email code. Upgrade and test it before turning reminders on.

**Tests and verification**
- 197 of 197 tests (162 before, one merged, 36 new). Five older assertions were updated on purpose (self-upgrade removed; delete now needs the confirmation word). Not verified: running the migrations on a database, browser/device behaviour, screen readers.
- Deferred, unchanged: reminder delivery and cron, payments and pricing, content verification. Three features the brief marks Premium (deadline status, progress tracking, resource library) are left Free pending owner confirmation.

## v0.16.5

Assessment-driven fixes on v0.16.4. No feature, route, auth, data or SQL changes.

- Landing page: the "BIR requirements with official sources" figure is now counted by agency (18). It previously also counted the two LGU items and showed 20.
- Landing page: the coverage sentence now says SSS, PhilHealth, Pag-IBIG and local permit guidance is outline content, matching the site metadata.
- Version metadata brought in line: `package.json` and `package-lock.json` now say 0.16.5 (the credits builds still said 0.16.0).
- Footer "Contact" stays a real `mailto:` link only when `NEXT_PUBLIC_CONTACT_EMAIL` is set; it is never shown as plain text. Production builds already fail without it (`scripts/check-env.mjs`), so set it in Vercel.
- `tests/v0165.test.js`: 8 tests covering version consistency, the BIR count, landing wording, footer contact rule, credits not being placeholders and the changelog heading.
- Docs: `docs/OPEN_ITEMS.md` now lists the dataset refresh (latest verification 2026-09-20, none re-verified in this release) and the contact variable.
- Not verified: browser behaviour, live Supabase, real email, YouTube links, and the live Vercel deployment. Verification dates were not changed because nothing was re-checked against agency sources.

## v0.16.4

**Owner-review items**
- Registration page: graduated tax-table reference from `data/taxTable.json`, a worked example and a note on the 8% option. Display only; it computes nothing.
- Checklist: **To do** first, then **Completed**, each grouped by stage (stage headings are h3).
- Learning Hub: six owner-supplied YouTube walkthroughs wired in and linked to four requirements through `tutorialId`; five placeholders remain.
- Reminders: the in-app "Send test reminder" uses the same provider as the daily digest (`EMAIL_PROVIDER`) and says "sent" only when the provider accepted the email.
- Premium: upgrade opens `/premium/checkout` in a new tab, states that payments are not connected, collects nothing, and offers a no-payment demo upgrade. The "Price not set" placeholder is gone.
- Admin: numbered steps and warnings on every editor; archive confirmations say whether an item is hidden or deleted; "Recent emails (sent or logged)".
- BIR forms: "Preview form" for official `bir-cdn.bir.gov.ph` PDFs.
- Renewal and Learning Hub: ownership notice for YouTube videos with CTTO (credit to the owner).
- New helpers `lib/money.ts`, `lib/pdfPreview.ts`; 14 tests in `tests/v0164.test.js`.

**Build-fix pass**
- `lib/siteConfig.ts` reads `NEXT_PUBLIC_*` values statically so server and browser agree (fixes the footer and 404 hydration mismatches).
- Wizard `leaseApplicability` type now allows the empty initial value.
- Auth: added `resetPassword(email)` and `updatePassword(newPassword)`, a `/reset-password` page and a "Forgot password?" link; `/reset-password` added to the allowed redirect paths.
- Resource library: 23 resources added from the "Universal Resource and Document Checklist" (DTI/BNRS/BMBE, barangay and BPLO permits, BIR, SSS, PhilHealth, Pag-IBIG, fees, penalty trackers). DTI appears in the library only (`RESOURCE_AGENCIES` in `lib/db.ts`).
- Documentation consolidated into the current set (see README).
- Verified: 154 of 154 tests (140 in the original package). Not verified: browser behaviour, live Supabase, real email, YouTube links.

## v0.16.3 (consultant changelog, partial)

- Wizard taxpayer choices reduced to Self-Employed or Professional and Mixed Income Earner (legacy saved values still supported).
- New Tax Type and Deductions step: 8% option or graduated (with OSD or itemized and projected expenses), plus a non-advisory ₱3,000,000 threshold reminder.
- "Not applicable" lease answer for remote or home-based users.
- Expanded Mayor's Permit renewal documents and instructions, with separate permit and Local Business Tax costs and a note that LGUs vary.
- YouTube creator attribution on tutorial and filing video cards; EOPT annual registration fee and invoice guidance on invoice-related BIR requirements.
- Open then: official BIR deadline and penalty verification, agency-specific links, DTI renewal content, plan content and pricing, browser QA.

## v0.16 (reminder digest)

- Daily digest at 08:00 Asia/Manila through Vercel Cron for Premium and Admin users who enabled reminders (7, 3 or 1 days before a fixed due date). Migration 004, signed unsubscribe links, `REMINDERS_MODE` of `off`, `dry_run` or `live`, and an allowlist for testing. See [docs/REMINDERS_SETUP.md](docs/REMINDERS_SETUP.md).

## v0.15 (fixes on the Emerald Growth redesign)

- Hero arrow moved into the art column; signed-in sidebar and theme toggle visible at first paint; Night Shift stepper, BIR checks and current-step label use theme tokens; penalty simulator two-column on desktop.
- Login redesign with show/hide password (also on Sign up); proper `<form>`; Terms, Privacy and Disclaimer on a shared `LegalPage`; new `/credits` page; footer rebuilt.
- Account sync: migration 003, admin overview and **Sync now**, hardened sign-up trigger, server-side role filter in Admin → Users.
- Verified then: 132/132 tests, `lint`, contrast 40/40, build. Not verified: real Supabase login, admin dashboard against a real admin session.

## v0.13

- NCR scope: 16 cities plus Pateros (`lib/ncr.ts`), city-then-barangay wizard flow, Quezon-City-only copy removed. National rules are independent of locality; LGU guidance is generic and labelled unverified. Barangay dataset: [data/ncr-barangays/README_REPORT.md](data/ncr-barangays/README_REPORT.md).
- Auth: validated redirects (`lib/authRedirect.ts`), `/auth/confirmed`, friendly errors, no double-click on Google. Root causes found: Google provider disabled in Supabase (not fixable in code) and confirmation links pointing at the default localhost Site URL.
- Demo mode became browser-only (no Supabase users, no password, no real admin access), with a banner and Reset/Exit.
- Delete Account: confirmation dialog, re-authentication and the server route `/api/delete-account`.
- Credits: 9 researchers plus 1 developer from `data/credits.json`.
- Verified then: 132/132 tests, contrast 40/40, build, route smoke tests. Blocked: real sign-up, Google OAuth, real deletion.

## v0.12 (feature-validation fixes)

- Deadline model: `deadlineKind` (`fixed_annual`, `one_time`, `recurring_variable`). Only four requirements keep a calendar date (1700, 1701, 1701A = Apr 15; LGU renewal = Jan 20); the rest show "No fixed date" with their timing rule. `resolveObligation()` tracks annual items per cycle and adds the `no_deadline` status.
- Existing businesses no longer see one-time new-registration items.
- Free/Premium boundary re-cut: Free sees what it is, who needs it, why it is on your list, official source and content status.
- Task-level steps with persistence (`task_progress`, migration 002); checking the last step completes the requirement.
- Guest-first wizard: `/wizard` needs no login; guests see a read-only `/preview` and their answers are adopted into the account on first sign-in.
- Not done: BUG-002 (tax type) was later addressed in v0.16.3; BUG-008 (tutorial placeholders and homepage-only links), BUG-009 (admin edits in `localStorage`) and BUG-010 (credits) remain open.

## v0.11

- Lifecycle restructure: Checklist → Business Registration → BIR Forms → Penalties → Renewal & Post-Registration (`lib/journey.ts`). `/guide` and `/premium/penalty-simulator` redirect into it.
- Approved BIR penalty rates: micro 10%, micro interest 6% p.a., general interest 12% p.a. plus 25% general surcharge (`BIR_PENALTY_RATES` in `lib/penalty.ts`).
- Design kits applied as a layer (see [docs/DESIGN.md](docs/DESIGN.md)); Night Shift theme.
- Contrast fix: badge tints and the hero progress track adjusted; the checker now reads the real CSS (38 pairs).
- Content update shipped with v0.12: DTI registration and renewal guide entries, expanded document lists, eight filing tutorial videos on `/renewal`.

## v0.10 (bug-fix pass; no content, rule, SQL or API changes)

- Deadline day: a midnight due date was already "past" by 00:01, so "Due today" was unreachable; comparison is now by calendar day.
- Dashboard sorted by urgency; due-today items shown. Penalty simulator validates input and 0 days late no longer charges a month. Wizard requires an employee count of at least 1, prefills from the saved profile and preserves `createdAt`.
- Failed Supabase writes raise an announced error toast; the test reminder handles rate-limit and provider errors; auth degrades to signed-out when Supabase variables are missing and `loading` always clears.
- Service worker caches only complete `200` same-origin responses (cache `gn-v4`); `app/error.tsx` and `app/global-error.tsx` added; `engines.node >= 22.18`.
- Branding: the client logo is canonical; favicon, install icons, social preview and footer updated.

## v0.7 and v0.6

- v0.7: checklist progress ring with filters, monthly deadline calendar, local-only profile picture (PNG/JPEG/WebP under 500 KB), admin content health, Free/Premium comparison on the landing page.
- v0.6: reusable resource cards, native-dialog PDF preview for BIR PDFs, tutorial cards that show an honest unavailable state for placeholder videos, shared elevation and focus styling.

## v0.3 hardening pass

- Fixed: the service worker's privacy leak (K3), the sitemap advertising auth-gated routes (K5), a double-highlighted checklist nav item (K10), `/api/send-email` with no rate limit (B2), no security headers at all (B2/B5), 16 tests asserting a disconnected spec, and a landing page and manifest that claimed equal coverage across five agencies.
- Added security headers and a CSP (verified against a running production server); `ContentStatus` computed in `lib/contentHealth.ts` rather than hand-set; `tsc --noEmit` as the lint script; legal pages and a route for the checklist.
- Departures from the brief, kept on purpose: `lint` is a type check, not full ESLint; `ContentStatus` is derived from `contentSource` and the text, not editorial labels; `--solid-border` raised uniformly for contrast.

## Initial build and content migration (before version numbering)

- V0 scope complete: landing, auth, 7-step wizard → rule engine → checklist, dashboard, requirement detail, Learning Hub, Resource library, deadlines and reminders, penalty simulator, Free/Premium/Admin roles, admin CRUD, installable PWA.
- Content migration from the reference workbook (26 sheets): real wizard flow, Quezon City barangay-to-RDO lookup, 22 BIR requirements tagged by `contentSource`, 13 BIR form PDFs, and a `not_specified` penalty type so the simulator never invents numbers.
- Design system v3 replaced a rejected gradient draft; production-readiness pass added a custom 404, metadata, Open Graph image, `robots.txt` and a dynamic sitemap.


