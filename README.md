# GabayNegosyo

**Your guide to business compliance.**

GabayNegosyo is a Progressive Web App that consolidates BIR, SSS, PhilHealth,
Pag-IBIG, and LGU compliance requirements into one personalized checklist for
Philippine micro-entrepreneurs — online sellers, freelancers, and small
business owners.

> GabayNegosyo is an independent informational and compliance guidance
> platform. It is **not** a government agency and does not replace official
> government services. This is a prototype/academic project — verify current
> requirements at official sources before acting on anything shown here.

> **Content source:** BIR-related content (registration wizard, requirement
> checklists, forms) is migrated from a client-provided reference workbook,
> `Flowchart.FINAL.xlsx`. See `docs/CONTENT_AUDIT.md` for exactly what was migrated,
> what's still a placeholder, and known gaps.

> **Design system:** See `docs/DESIGN.md` for the current visual language
> (Minimalism, brand-green accent, glass-shell/solid-data split) and why an
> earlier gradient-heavy draft was rejected.

---

## What was built

A complete, runnable V0 covering every item in the MVP priority list:

- Landing page, sign up, and demo login (no password required)
- 7-step Registration Wizard → rule engine → personalized checklist
- Compliance Dashboard (progress bar, pending/overdue/completed, quick actions)
- Requirement Detail pages (free vs. Premium content, mark-as-complete)
- Learning Hub (tutorials grouped by agency, filterable)
- Resource Library (search, agency/type filters, sorting)
- Deadline tracking with reminder configuration (Premium-gated)
- Penalty Simulator (Premium-gated, disclaimer included)
- Free / Premium / Admin role system with gating at both UI and service layers
- Admin Dashboard (aggregate metrics) + CRUD for Agencies, Requirements,
  Resources, and Tutorials
- Installable PWA: manifest, service worker, offline shell, real icons
- Mobile / tablet / desktop responsive layout throughout

## What is mocked (and why)

| Feature | Status | Why |
|---|---|---|
| Auth | Local demo accounts (`lib/auth.tsx`) | Runs with zero setup. Swap for Supabase Auth + Google OAuth later — see below. |
| Database | `localStorage` via `lib/db.ts` | Same reason. Schema is fully documented in `database/schema.sql` for the real migration. |
| Email reminders | Logged to a local "sent mail" list, visible on `/admin` | No paid email provider required to run the prototype. |
| Admin analytics (total users, growth, etc.) | Static demo numbers, clearly labeled on screen | This is a single-browser prototype with no real multi-user backend; content counts (agencies/requirements/resources/tutorials) and the email log ARE real and live. |
| Payments (Premium upgrade) | One-click demo toggle, no processor | Real payments are out of scope for V0 per the build brief. |
| Government URLs / tutorial videos | Real official domains where confirmed (bir.gov.ph, sss.gov.ph, etc.); tutorial video links are YouTube **search** URLs, clearly marked as placeholders | The brief requires never fabricating a specific official endpoint or video as verified when it hasn't been checked. |

## What requires external credentials (not needed to run the prototype)

- Supabase project URL + anon key (for real auth/database)
- Google OAuth client (configured inside Supabase, not this app)
- A transactional email provider (Resend, SendGrid, SES, etc.)

All of the above are optional. See `.env.example`.

## Known limitations

- Single-browser demo: checklist progress, business profile, and admin edits
  are stored in that browser's `localStorage`, not a shared database.
- Admin CRUD writes only persist in the browser that made them (no real
  backend to sync across devices/users).
- Penalty formulas use representative rates for the prototype (surcharge,
  monthly interest) — always confirm exact current rates with the relevant
  agency.
- No automated test suite beyond a rule-engine data-integrity smoke test
  (`npm test`) — see PROGRESS.md Phase 12 for what a fuller test pass would add.

---

## Getting started

### Requirements
- Node.js 18.18+ (Next.js 14 requirement)
- npm 9+

### Installation
```bash
npm install
npm run dev
```
Visit `http://localhost:3000`.

### Demo accounts (no password)
On `/login`, use any of:
- `free@demo.gabaynegosyo.ph` — Free tier
- `premium@demo.gabaynegosyo.ph` — Premium tier
- `admin@demo.gabaynegosyo.ph` — Admin

Or use "Sign up" to create your own free-tier demo account and go through the
Registration Wizard yourself.

### Free vs. Premium
| | Free | Premium |
|---|---|---|
| Business profile & wizard | ✅ | ✅ |
| Basic checklist (form names, deadlines) | ✅ | ✅ |
| Mark requirements complete | ✅ | ✅ |
| Resource library | ✅ | ✅ |
| Full requirement details (docs, instructions, tutorial, official source) | ❌ | ✅ |
| Penalty Simulator | ❌ | ✅ |
| Email reminders | ❌ | ✅ |

Upgrade from `/account` (demo toggle, no real payment).

### Testing
```bash
npm test
```
Runs data-integrity smoke tests against the rule engine's seed data
(every requirement references a real agency, employer-only rules require
`hasEmployees`, etc.) using Node's built-in test runner — no extra
dependencies required.

### Production build
```bash
npm run build
npm run start
```
Verified locally: builds clean with zero TypeScript errors across all 18
routes (see PROGRESS.md).

### Deployment to Vercel
1. Push this project to a GitHub repo.
2. Import the repo in Vercel.
3. (Optional) Add environment variables from `.env.example` if you're
   connecting real Supabase/email infrastructure.
4. Deploy — no build configuration changes needed.

### Supabase setup (for a real backend, optional)
1. Create a Supabase project.
2. Run `database/schema.sql` in the SQL editor.
3. Set `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` in
   `.env.local`.
4. Reimplement the functions in `lib/db.ts` and `lib/auth.tsx` to call
   `supabase.from(...)` / `supabase.auth` instead of `localStorage` — the
   function signatures are designed to stay the same so no page needs to
   change.

### Google OAuth setup
Configured inside your Supabase project (Authentication → Providers →
Google), not in this codebase directly.

### Email configuration
Set `NEXT_PUBLIC_EMAIL_PROVIDER` and related vars in `.env.example` to move
`lib/email.ts` off mock mode. The function signature (`sendEmail(to, subject,
body)`) doesn't change — only its internal implementation would.

### Troubleshooting
- **`npm run build` fails on Node version** — Next.js 14 requires Node
  18.18+. Check with `node -v`.
- **Blank checklist after the wizard** — the rule engine only shows
  requirements whose `applicabilityRules` match your profile; try toggling
  "Do you have employees?" to Yes to see employer-specific requirements.
- **Admin edits disappear** — they're stored in that browser's
  `localStorage` under `gn_store_v1`; clearing site data resets them.
- **Service worker not updating** — hard-refresh or unregister it via
  DevTools → Application → Service Workers during development.

---

## Project structure

```
GabayNegosyo/
├── app/                    # Next.js App Router pages
│   ├── admin/               # Admin dashboard + CRUD (agencies/requirements/resources/tutorials)
│   ├── premium/penalty-simulator/
│   ├── requirements/[id]/
│   ├── dashboard/, deadlines/, resources/, tutorials/, account/
│   ├── login/, signup/, wizard/
│   └── page.tsx             # Landing page
├── components/              # Navbar, guards, cards, badges, gates
├── lib/                     # Types, rule engine, penalty calc, auth, db, email, authorization
├── data/                    # Seed content — agencies/requirements/resources/tutorials
├── database/schema.sql      # Target Postgres schema for a real backend
├── public/                  # manifest.json, service worker, icons
├── styles/globals.css       # Global styles (mobile-first)
├── tests/                   # Data-integrity smoke tests
├── .env.example
└── PROGRESS.md
```

## Important notes

- The compliance rules live entirely in `data/*.json` + `lib/ruleEngine.ts` —
  never hardcoded into UI components. Admins can edit content without
  touching source code (persisted per-browser in this prototype; a real
  deployment would persist to Postgres per `database/schema.sql`).
- Feature gating is enforced at both the UI (`PremiumGate`, `AdminGuard`)
  and service layer (`lib/authorization.ts`) — clicking around the UI is
  not sufficient to reach a gated action.

## Disclaimer

GabayNegosyo is a prototype built for a feasibility study and academic
demonstration. It does not replace official government services. Always
verify current forms, deadlines, and penalty rates directly with BIR, SSS,
PhilHealth, Pag-IBIG, and your local government unit before filing or paying
anything.

## v0.7 interface update
The checklist has a progress ring with status filters; Deadlines offers a monthly view. Account picture upload is a **browser-only personalization** (PNG/JPEG/WebP under 500 KB), not a synced Supabase avatar. Free/Premium plan boundaries and academic-project context appear on the landing page. Contributor names must be added after the study and web team confirm their preferred attribution. Admin Users role filters operate on the currently loaded page and do not alter Supabase roles.
