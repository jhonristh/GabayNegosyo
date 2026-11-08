# GabayNegosyo

**Your guide to business compliance.**

This ZIP includes the **Entrepreneur's Workspace** visual refinement: an interactive landing preview, cream-and-emerald styling, progress-based storefront artwork, refined dashboard/checklist, and reduced-motion support. See `docs/DESIGN.md` for changes and `docs/TESTING.md` for validation limits. Extract, run `npm ci`, copy `.env.example` to `.env.local`, configure your own values, then run `npm run dev`. The ZIP contains source code rather than installed dependencies or a deployed site.

GabayNegosyo is a Progressive Web App that puts BIR, SSS, PhilHealth, Pag-IBIG and LGU (business permit) requirements for Philippine micro-entrepreneurs into one personalized checklist. It is built for online sellers, freelancers and small business owners, with Metro Manila (NCR) as the current coverage area.

> GabayNegosyo is an independent informational platform. It is **not** a government agency, does not file documents, and does not replace official services. It began as a feasibility study and academic project. Always verify current forms, deadlines, fees and penalties with the issuing agency before acting.

## New in v0.18.0

The green arrow is restored and the growing shop stays. Try the shop illustration with a click or Enter/Space to turn on its little window light. This does not change your real progress.

- Open **Renewal & Post-Registration** (or the dashboard's **Renewal workspace** shortcut). With a business profile, the overview lists matching renewal requirements. Premium users can choose **Start renewal**, **Continue renewal**, or **Review renewal**.
- In focus view, select a step, check it when done, undo it, or expand all instructions. Next/Previous only navigate. Completion uses existing checklist records and cycles; it does not submit an application or establish agency approval.
- Switch **Interface sounds** on in the footer or focus toolbar. The preference is remembered in this browser; it starts off. Sounds are brief confirmation cues, not confirmation that a server write succeeded.
- Use **Pause decorative motion** under the landing preview, or your device's reduced-motion setting.
- For a browser-only test, set `NEXT_PUBLIC_ENABLE_DEMO_ACCOUNTS=true` in your local environment and choose the Premium demo from Log in. Keep it disabled on your public deployment unless you intentionally want demos available.

## What it does

- **Registration wizard** (guest-friendly): a short questionnaire (new or existing business, taxpayer type, city and barangay, lease, employees, projected sales, tax type) that feeds the rule engine.
- **Personalized checklist, dashboard and deadlines:** requirements that apply to you, grouped by stage, with per-cycle completion, a monthly deadline calendar, and "No fixed date" shown honestly where the source gives none.
- **Business guide:** `/registration` and `/renewal` walk through registering, renewing and staying compliant, with BIR form previews (`/bir-forms`), a penalty simulator (`/penalties`), filing tutorial videos and a graduated tax-table reference.
- **Learning Hub and Resource library:** tutorials, official forms, document checklists and links, searchable and filterable by agency and type. DTI and BMBE resources appear in the library only.
- **Plans:** Free and Premium (see below). Premium upgrade is a demo: no payment provider is connected.
- **Reminders:** manual Premium reminder workflow only; no automatic emails in Version 1.
- **Admin area:** content editors for agencies, requirements, resources and tutorials, plus user and account-sync views. Content edits are saved **per browser only** (see [docs/ADMIN_GUIDE.md](docs/ADMIN_GUIDE.md)).
- **PWA:** installable, offline shell, Night Shift (dark) theme.

### Free vs. Premium — consultant-approved, Nov 2, 2026

| Capability | Free | Premium |
|---|---|---|
| Wizard, basic tax-option estimate, personalized checklist (requirement/agency/deadline) | Yes | Yes |
| Verified YouTube tutorials, with attribution | Yes | Yes |
| Deadline **status** (overdue / due soon / due today) and completion/progress | No | Yes |
| Resource library, supporting documents, detailed steps | No | Yes |
| Penalty details, official penalty reference links, penalty simulator | No | Yes |
| Manual reminder service | No | Yes |

The client-facing fee reference is available with Premium while the fee-tier decision FL-18 remains OPEN. Payment integration and automated emails are out of scope for Version 1. Do not treat UI gating as a database authorization boundary: server-side validation and RLS are release blockers until independently verified.

## Tech stack

Next.js (App Router, Turbopack), React 18, TypeScript, Supabase (Auth, Postgres with Row Level Security), Vercel (hosting, Analytics); automated email/cron delivery remains disabled for Version 1. Compliance rules live in `data/*.json` and `lib/ruleEngine.ts`, not in UI components.

## Quick start

Requires Node.js 22.18 or newer.

```bash
npm install
cp .env.example .env.local   # then fill in the values
npm run dev                  # http://localhost:3000
```

The public pages work without Supabase. Sign-in, saved data and admin need a Supabase project: follow **[docs/SETUP.md](docs/SETUP.md)**.

### Scripts

| Command | What it does |
|---|---|
| `npm run dev` | Development server |
| `npm run build` | Production build (runs `scripts/check-env.mjs` first) |
| `npm run start` | Serve the production build |
| `npm run lint` | Type check (`tsc --noEmit`) |
| `npm test` | Node's built-in test runner over `tests/*.test.js` |
| `npm run contrast-check` | WCAG contrast check; rewrites `docs/CONTRAST_REPORT.md` |

Before shipping, run `npm run lint && npm test && npm run contrast-check && npm run build`. A production build (`VERCEL_ENV=production`) **fails** if `NEXT_PUBLIC_SITE_URL` or `NEXT_PUBLIC_CONTACT_EMAIL` is missing; elsewhere it only warns.

### Demo previews

With `NEXT_PUBLIC_ENABLE_DEMO_ACCOUNTS=true`, `/login` offers Free / Premium / Admin **previews**. They run only in the visitor's browser with sample data: no Supabase user, no password, no real admin access.

## Project structure

```
app/            Routes (App Router), API routes (/api/send-email, /api/delete-account,
                /api/cron/send-reminders, /api/unsubscribe)
components/     Navbar, guards, cards, badges, gates, legal layout
lib/            Auth, data access (db.ts), rule engine, penalty maths, email, site config
data/           Requirements, resources, tutorials, forms, tax table, NCR barangays
database/       supabase_setup.sql (fresh install) and migrations/
docs/           Project documentation (index below)
public/         Manifest, service worker, icons, images
scripts/        check-env.mjs, contrast-check.mjs
styles/         globals.css, kits.css, emerald.css (loaded in that order)
tests/          Node test suite
```

## Documentation

| File | Contents |
|---|---|
| [docs/SETUP.md](docs/SETUP.md) | Supabase, auth redirects, Google sign-in, admin, account sync, deploy to Vercel, troubleshooting |
| [docs/INTEGRATION_AND_QA_v0.17.md](docs/INTEGRATION_AND_QA_v0.17.md) | Migration review, safe rollout order, verification SQL, QA checklist, release blockers |
| [docs/USER_JOURNEY_QA.md](docs/USER_JOURNEY_QA.md) | Sign-up to checklist completion: results, fixes, owner decisions, browser test script |
| [docs/ACCOUNT_AND_ACCESS.md](docs/ACCOUNT_AND_ACCESS.md) | Account lifecycle, Premium entitlements, admin controls, migrations 005 and 006 |
| [docs/REMINDERS_SETUP.md](docs/REMINDERS_SETUP.md) | Daily reminder digest: migration, email provider, staged rollout |
| [docs/ADMIN_GUIDE.md](docs/ADMIN_GUIDE.md) | Scope, admin workflow, media previews, current limits |
| [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) | Runtime, data flow, design-layer boundaries |
| [docs/PRODUCT.md](docs/PRODUCT.md) | Purpose, scope, plan boundaries, content integrity |
| [docs/DESIGN.md](docs/DESIGN.md) | Tokens, components, themes, branding, accessibility |
| [docs/TESTING.md](docs/TESTING.md) | Verification gates and the manual regression checklist |
| [docs/OPEN_ITEMS.md](docs/OPEN_ITEMS.md) | Decisions, links and content the owner still needs to supply |
| [docs/CONTRAST_REPORT.md](docs/CONTRAST_REPORT.md) | Generated by `npm run contrast-check` |
| [data/ncr-barangays/README_REPORT.md](data/ncr-barangays/README_REPORT.md) | NCR barangay and RDO dataset report |
| [CHANGELOG.md](CHANGELOG.md) | Release history |
| [AGENTS.md](AGENTS.md) | Working agreement for contributors |

## Known limitations

- Admin content edits live in the browser's `localStorage`; they are not shared with other visitors.
- Premium upgrade is a demo (`upgrade_to_premium_demo()`); any signed-in user can self-upgrade. Remove it before real billing.
- LGU permit guidance is generic for all NCR localities and not verified per LGU. Barangay-to-RDO lookup is partial (see the dataset report).
- Penalty rates are representative and must be confirmed against current agency issuances.
- Many requirement links point to agency home pages; see [docs/OPEN_ITEMS.md](docs/OPEN_ITEMS.md).
