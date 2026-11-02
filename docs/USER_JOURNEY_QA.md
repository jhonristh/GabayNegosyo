# GabayNegosyo — Core User Journey QA (Work Package 4)

| | |
|---|---|
| Starting build | `GabayNegosyo_v0_17_2_AFTER_TASK_03.zip`. The folder inside it and `package.json` still say **0.17.1** (WP3 left the label unchanged). No newer work was present |
| Date | 2026-11-02 |
| `package.json` version | **Unchanged (0.17.1).** Nothing here has been run in a browser, against Supabase, or through `next build`, so no new version is claimed |
| Browser test of the journey | **Not run** (no browser in this environment). A step-by-step script for you is in section 8 |
| Real Supabase | **Not touched.** No SQL was run and no migration was added |
| `npm test` | **299 of 299 pass** (268 existing + 31 new in `tests/wp4_user_journey.test.js`) |
| `tsc` / `next build` | **Not run for real.** There is no `node_modules` and no network here. A bare `tsc` pass found **no new type errors** compared with the original files (it cannot see React's types, so it is only a partial check). `next build` must still be run on your machine |
| Contrast check | `node scripts/contrast-check.mjs`: all 40 pairs pass (the report file did not change) |

## 0. Plain-language summary

**What works well (read from the code and confirmed by tests that ran the real logic):** the wizard asks the right questions in order, the checklist is built by one rule engine from your answers, dates are shown only for the four requirements that have a fixed annual deadline (three of them reachable from the wizard), progress is saved per account, and every screen already had loading, empty and error handling in most places.

**What I fixed (all small, nothing redesigned):**
1. **A network failure at login no longer looks like an empty account.** Before, if your saved data failed to load, the app quietly showed "Let's set up your business profile". Going through the wizard then *appeared* to work but saved nothing. Now the dashboard, checklist, deadlines and requirement pages say "We could not load your saved information" with a **Try again** button, and the wizard refuses to continue (it never claims to have saved).
2. **New sign-ups who already tried the wizard as a guest were sent back into the wizard.** Their answers had already been moved into the new account, but the sign-up page checked the (now empty) guest store. They now go to their checklist.
3. **Buttons that were silently disabled now say why.** Sign-up and log-in tell you exactly what is wrong (empty name, an email that looks mistyped, a password under 8 characters). Each wizard step shows a one-line reason next to a greyed-out Continue.
4. **An unknown requirement link no longer bounces you to the dashboard with no explanation.** It now says it could not find that requirement and links to your checklist.
5. **Marking things done now confirms it** (a short announced message) on the checklist and requirement page.
6. **The wizard remembers more of what you chose.** "Optional Standard Deduction vs Itemized" and "Not applicable" for lease were collected but lost when you came back to review. They are now kept (inside the existing JSON profile; no database change).
7. **The dashboard's business information is fuller:** stage (new or already registered), employees, and tax arrangement, each only restating your own answers.
8. **Signed-out visitors return to where they were going** after logging in (same-site paths only).
9. Checklist cards now flag the four requirements that are still placeholder content.

**What I did *not* change, and you need to decide** (details in section 5): the tax arrangement you pick does not change any requirement; the wizard offers only 2 of the 4 taxpayer types, so one requirement can never appear; and on the free plan the step-by-step instructions, documents and forms are hidden, so a free user cannot tick individual steps.

## 1. How to read this report

| Tag | Meaning |
|---|---|
| **EXECUTED** | A test in this session ran the real TypeScript code and passed. `lib/db.ts` ran for real against an **in-memory stand-in for Supabase**. This is neither a browser test nor a test of your real database |
| **TEXT** | A test checks that a source file contains a guard. It proves the code is written, not that React draws it correctly |
| **READ** | I read the code and reasoned about it. Not executed |
| **UNVERIFIED** | Needs a browser, your Supabase project, or Vercel |

## 2. Prompt 4 checklist, section by section

### 2.1 Registration and onboarding

| Required | Result | Evidence and notes |
|---|---|---|
| Create an account | **Pass in code; browser UNVERIFIED** | Name, email, password. Field messages are new (EXECUTED: `validateSignup`). Duplicate email detected without leaking details (READ). With "Confirm email" on, the person must open the link **on the same device** (existing note on the page); the guest answers live in that tab's session storage |
| Log in | **Pass in code; browser UNVERIFIED** | Wrong password, unconfirmed email, rate limit and admin-deactivated messages already existed (EXECUTED in WP3). New: per-field messages and a service-unreachable message if the sign-in call throws |
| Create a business profile | **Pass** | Wizard saves one profile per account (EXECUTED: save, refresh, reload) |
| Select the appropriate business type | **Not a wizard question** | The wizard has no "business type" question. It asks **taxpayer type** (Self-Employed or Professional, Mixed Income Earner). Legacy `businessType`/`businessStructure` are saved as `other`/`sole_proprietor` and **no requirement uses them** (checked in the data). I did not add a question: it would not change any result and would invent a product decision |
| Indicate employee status | **Pass** | Yes/No plus a count. Count must be a whole number of 1 or more (EXECUTED). Drives exactly 7 employer requirements across all 72 reachable profiles (EXECUTED) |
| Select the tax arrangement | **Collected, but has no effect** | 8% vs Graduated (and OSD vs Itemized) are asked and now remembered, but **no requirement has a tax-type rule**, so the checklist is identical either way (EXECUTED, recorded as a KNOWN GAP test). See 5.1 |
| Complete the profiling wizard | **Pass in code** | 10 steps; Continue explains why it is blocked; review step lists the answers; Back works |
| Generate a personalized checklist | **Pass** | Every one of the 72 profiles the wizard can produce gets a non-empty checklist of only BIR, SSS, PhilHealth, Pag-IBIG and LGU items (EXECUTED) |
| Validation and error messages | **Improved** | See 2.5 |

Checklist size by answers (EXECUTED; "existing" = already registered):

| Registering new? | Taxpayer type | Employees | Leases space | Requirements |
|---|---|---|---|---|
| New | Self-employed | 0 | No | 9 |
| New | Self-employed | 3 | Yes | 17 |
| New | Mixed income | 0 | No | 13 |
| New | Mixed income | 3 | Yes | 21 |
| Existing | Self-employed | 0 | No | 4 |
| Existing | Self-employed | 3 | Yes | 12 |
| Existing | Mixed income | 0 | No | 8 |
| Existing | Mixed income | 3 | Yes | 16 |

### 2.2 Business dashboard

| Required | Result | Notes |
|---|---|---|
| Business information | **Pass (improved)** | Name, taxpayer type, barangay/city, RDO if known; **new:** stage, employees, tax arrangement, and a link to review answers |
| Compliance overview | **Pass** | Progress by agency (printed `done/total`, not colour only) and a status count list |
| Upcoming deadlines | **Pass** | "Up next" card plus the pending list, soonest first, with due dates; full list on `/deadlines` |
| Completed / pending / overdue | **Pass** | Completed section; "N pending" in the progress card; overdue and due-today banners with counts. The pending list shows 5 items (overdue first); the rest are on the checklist |
| Overall progress | **Pass** | Percentage = completed ÷ applicable requirements, with the counts printed |
| No misleading statistics | **Pass** | Everything is computed from the person's own applicable requirements. A requirement with no fixed date is never labelled overdue (EXECUTED). A cycle that fell due before the profile existed is rolled forward instead of being flagged overdue (existing, tested in `v012`) |

### 2.3 Personalized checklist

| Required | Result | Evidence |
|---|---|---|
| Requirements match the profile | **Pass** | Employees, lease, new vs existing all drive exactly the expected requirements across 72 profiles (EXECUTED). Tax type does not (5.1) |
| Agencies identified correctly | **Pass** | Each card shows its agency; filter chips for the five agencies; every requirement's agency exists in `agencies.json` (EXECUTED) |
| Forms and requirements clear | **Pass with a note** | Name, agency, stage grouping, due line. Placeholder items are now flagged (4 of 24). Forms appear only for 3 requirements on the detail page; the BIR Forms page covers the rest |
| Deadlines understandable | **Pass** | A date only when the source gives a fixed annual date (4 requirements: LGU permit renewal Jan 20; BIR 1701 and 1701A Apr 15; BIR 1700 Apr 15, which the wizard cannot reach, see 5.2). Everything else shows its timing rule under "No fixed date". The page explains this |
| Open requirement details | **Pass** | Title links to `/requirements/<id>` |
| Mark a requirement complete | **Pass** | Both from the checklist and the detail page; new confirmation message |
| Mark individual tasks complete | **Pass for Premium; not available on Free** | Steps are a Premium feature today (`step_instructions: premium`). See 5.3 |
| Progress persists after refresh and login | **Pass against the stand-in database (EXECUTED); real Supabase UNVERIFIED** | Profile, completion, un-completion, step ticks and un-ticks all return after a simulated refresh and re-login. A fixed-annual completion counts only for its own year. Demo mode persists in the browser and makes zero Supabase calls |

### 2.4 Requirement detail pages

| Content | Free | Premium | Notes |
|---|---|---|---|
| Description ("What is this?") | Yes | Yes | All 24 have one (EXECUTED) |
| Governing agency | Yes | Yes | |
| Who needs it, and why it is on *your* checklist | Yes | Yes | Reasons are generated only from answers the person gave (EXECUTED) |
| Deadline / status | Yes | Yes | |
| Official link and last-verified date | Yes | Yes | 15 of 24 link only to an agency home page (known, `OPEN_ITEMS.md`); nothing was invented |
| Content-source label | Yes | Yes | "Placeholder content, not yet reviewed" for the 4 placeholders |
| Required documents | **Locked** | Yes | All 24 have at least one |
| Step-by-step instructions (tickable) | **Locked** | Yes | All 24 have at least 3 |
| Applicable forms, tutorial, penalty | **Locked** | Yes | Forms exist for only 3 requirements; tutorial for 10 |

Missing content is not made up: a requirement with no related form or tutorial simply does not show that section. An unknown id now shows "We could not find that requirement".

### 2.5 State handling on the core pages

| Page | Loading | Empty | Network failure | Unauthorized | Success | Invalid input |
|---|---|---|---|---|---|---|
| Sign up | Button "Creating account…" | n/a | **New:** unreachable-service message; existing Supabase error mapping | n/a | Check-email screen, or straight to checklist/wizard | **New:** per-field messages |
| Log in | Button "Logging in…" | n/a | **New:** same | Already-signed-in visitors are redirected | Redirect (honours a safe `next` path) | **New:** per-field messages |
| Wizard | "Loading…" until the session is known | n/a | **New:** retry screen if saved data failed to load; **new:** save refusal message | Open to guests by design (answers stay in the tab) | Goes to checklist (signed in) or preview (guest) | **New:** reason shown under Continue |
| Dashboard | Loading text | "Let's set up your business profile" | **New:** retry screen | Redirects to log in, remembering the page | n/a | n/a |
| Checklist | Loading | "No checklist yet" / "No matches" with clear filters | **New:** retry screen | Same | **New:** confirmation message | Search is free text |
| Requirement detail | Loading | Sections with no content are omitted | **New:** retry screen | Same; locked sections show an upgrade panel | **New:** confirmation message | **New:** unknown id message |
| Deadlines | Loading | "No business profile yet" | **New:** retry screen | Same | Reminder messages (existing) | n/a |
| Preview (guest) | Loading | "No answers to preview yet" | n/a (nothing is fetched) | Signed-in visitors are sent to the checklist | n/a | n/a |

A failed *save* (as opposed to a failed *load*) was already reported to the person by `DbErrorToasts` (EXECUTED: the failure reaches subscribers).

## 3. Files changed

**Added:** `lib/validation.ts`, `lib/profileSummary.ts`, `tests/wp4_user_journey.test.js`, `docs/USER_JOURNEY_QA.md`, `docs/HANDOFF_AFTER_WP4.md`.

**Modified:**
- `lib/auth.tsx`: records `dataLoadFailed`; new `reloadData()`.
- `lib/db.ts`: `saveBusinessProfile` now returns `true`/`false` (callers that ignored the old `void` are unaffected).
- `lib/types.ts`: `User.dataLoadFailed`; optional `BusinessProfile.deductionMethod` and `leaseApplicability` (stored in the existing JSON column; **no migration**, older profiles still load).
- `components/AuthGuard.tsx`: `requireData`, `?next=` return path, shared loading and error blocks.
- `app/signup/page.tsx`, `app/login/page.tsx`, `app/wizard/page.tsx`, `app/dashboard/page.tsx`, `app/checklist/page.tsx`, `app/requirements/[id]/page.tsx`, `app/deadlines/page.tsx`.
- `CHANGELOG.md`, `README.md` (docs index), `docs/OPEN_ITEMS.md`.

**Deleted:** none. **No file in `data/` was touched.** No SQL, no migration, no environment variable, no dependency changed.

## 4. Test results

| Check | Result |
|---|---|
| `npm test` | **299 pass, 0 fail** (31 new) |
| New tests mutation-checked | Run against the original `lib/db.ts` and `app/signup/page.tsx`, 4 of the new tests fail, so they do detect the old behaviour |
| Contrast check | 40 of 40 pairs pass |
| `tsc` (partial, no dependencies installed) | No new errors versus the original files |
| `next build`, project `tsc`, browser, real Supabase, device testing | **Not run** |

## 5. Findings that need your decision (not changed)

**5.1 Tax arrangement has no effect (domain decision).** 8% vs graduated, and OSD vs itemized, never change the checklist: no requirement has a tax-type rule. For example a graduated-rate user is still shown the "1701A (8%/OSD)" item. This is the open question already in `OPEN_ITEMS.md` ("confirm with the team"). I did not invent rules. Until decided, the wizard's tax question is informational only.

**5.2 Two of four taxpayer types are not offered.** The wizard offers Self-Employed and Mixed Income only. `purely_compensation` is never selectable, so `bir-1700-compensation` can never appear (EXECUTED). `purely_business` is also not offered. Confirm that is intended for a micro-business product (a purely-compensation employee is arguably out of scope).

**5.3 Free users cannot tick steps.** Documents, steps, forms, tutorial and penalty are Premium (`FEATURE_TIER`); the context file lists "basic progress tracking" as Free and "expanded supporting documents" as Premium, which is consistent for requirement-level progress but means Prompt 4's "mark individual tasks complete" works only on Premium. Per the rules I did not change feature access. This is a UI gate only: the content ships in the app's JavaScript bundle, so it is not a security boundary.

**5.4 Completing a requirement does not tick its steps** (and ticking the last step does complete the requirement). Un-ticking a step on a completed requirement reopens it. Works, but a requirement can read "Completed" with "0 of N steps done". Decide whether "Mark as completed" should tick all steps.

**5.5 Business type.** If your study needs a business-type question (online seller, freelancer, food), say so; it would need verified rules first.

## 6. Known limits and risks

- **A failed save is only reported, not rolled back.** The screen keeps the change until refresh; the toast says it may not be saved. By design in `lib/db.ts` ("write-through").
- **Admin content edits are per-browser** (localStorage), so a user and an admin can see different requirement text. Out of scope here (WP5/6).
- **Email-confirmation on another device** loses the guest answers (session storage is per tab).
- **Google sign-in** and **email confirmation** depend on your Supabase settings (see `docs/GOOGLE_OAUTH_SETUP.md`); not verifiable here.
- **Date logic uses the browser's clock and time zone.** Tested at day boundaries (existing tests) but not across real devices.
- Four requirements are still `prototype_placeholder`; 15 link only to agency home pages; the demo seed deadline is past. See `OPEN_ITEMS.md`.

## 7. Not tested

Real browser rendering and keyboard use of any new message; mobile layouts (WP7); real Supabase read/write and RLS for these screens; the email-confirmation round trip; Google sign-in; any admin screen (WP5); the PWA offline behaviour (WP7); the production site.

## 8. Final journey test — script for your browser

Run on `npm run dev` (or the Vercel preview) with a **new** test email. Tick each line only if you actually saw it.

| # | Do this | Expect |
|---|---|---|
| 1 | Open `/wizard` signed out. Answer **New: Yes**, Self-Employed, pick a city and barangay, Lease **No**, Employees **Yes, 0** | Continue stays grey; a line explains why; entering **1** enables it |
| 2 | Finish; Generate | `/preview` shows the checklist read-only |
| 3 | Click create account; leave everything empty; press Create | Three messages (name, email, password) |
| 4 | Type `ana@` as email and a 5-letter password | Email and password messages; nothing is sent |
| 5 | Sign up correctly | "Check your email" (or straight to your checklist if confirmation is off) |
| 6 | Open the link **in the same browser**, log in | You land on **your checklist** (not the wizard) with your guest answers |
| 7 | Open the dashboard | Business name, stage, employees, tax arrangement; progress 0% |
| 8 | On the checklist, mark one requirement completed | A short "Marked as completed." message; it moves to Completed; counts update |
| 9 | Refresh the page, then log out and log in again | Still completed |
| 10 | Open a requirement (free account) | Description, who needs it, why it applies, official link, last verified; a locked panel for steps |
| 11 | As a Premium test account, tick two steps, refresh | Still ticked; ticking the last step completes the requirement |
| 12 | Visit `/requirements/not-a-real-id` | "We could not find that requirement" |
| 13 | Signed out, visit `/checklist` | Sent to log in; after login you return to `/checklist` |
| 14 | Turn off the network in dev tools, then log in | A clear message, not a stuck button |
| 15 | With the network off after logging in, press "Try again" on a load error | Retry text; works once the network is back |

Record the result of each row in your own copy before treating the journey as tested. Steps 6 and 13 are the two behaviours this work package changed that tests cannot fully prove.

## 9. Next recommended task

Work Package 5: Admin and Manual Reminders. Apply migrations in the order in `docs/HANDOFF_AFTER_WP3.md` before browser-testing anything that depends on entitlements.
