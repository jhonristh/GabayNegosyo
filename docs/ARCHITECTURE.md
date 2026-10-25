# Architecture

## Runtime

Next.js App Router, React and TypeScript.

| Path | Role |
|---|---|
| `app/` | Routes, layouts and API routes |
| `components/` | Shared interface |
| `styles/` | `globals.css` (base system), `kits.css` (design-kit layer), `emerald.css` (v0.15 tokens, loaded last) |
| `data/` | Seed and reference content (requirements, resources, tutorials, forms, tax table, NCR barangays) |
| `lib/` | Auth, data access, rule engine, penalty maths, email, site config |
| `database/` | `supabase_setup.sql` for fresh installs and numbered `migrations/` |
| `public/` | PWA assets (manifest, service worker, icons, images) |

## Data and journey

- **Auth:** Supabase Auth through `lib/auth.tsx` and `lib/supabase.ts`. The app-level user (name, role) comes from `public.profiles`, filled by a database trigger on sign-up.
- **Data:** `lib/db.ts` loads the signed-in user's rows into an in-memory cache right after login (`db.hydrate`), keeps reads synchronous, and writes through to Supabase. Row Level Security keeps each user to their own rows. A failed write raises an error toast; data loads at login or refresh.
- **Content:** static requirement, resource and tutorial content comes from `data/*.json`. Admin edits are browser-local overrides (see [ADMIN_GUIDE.md](ADMIN_GUIDE.md)).
- **Journey:** the wizard records a business profile (guests keep answers in `sessionStorage` and they are adopted into the account on first sign-in). `lib/ruleEngine.ts` selects applicable requirements and resolves deadlines per cycle; the checklist, deadlines and dashboard render those results.
- **Roles:** `free`, `premium`, `admin` are stored in `profiles.role`. Users cannot change their own role from the browser. UI gating (`PremiumGate`, `AuthGuard`, `AdminGuard`) is backed by `lib/authorization.ts` and database policies.
- **Agencies:** five tracked agencies (BIR, SSS, PhilHealth, Pag-IBIG, LGU). DTI exists for the Resource library only (`RESOURCE_AGENCIES` in `lib/db.ts`) so dashboards and checklists stay at five.

## Server routes

| Route | Purpose |
|---|---|
| `/api/send-email` | Test reminder from the Deadlines page; same provider as the digest |
| `/api/cron/send-reminders` | Daily digest, protected by `CRON_SECRET` |
| `/api/unsubscribe` | Signed unsubscribe links |
| `/api/delete-account` | Permanent account deletion; uses `SUPABASE_SERVICE_ROLE_KEY` (server only) |

Secrets live only in server routes and Vercel environment variables, never in `NEXT_PUBLIC_*` values.

## Environment values

`lib/siteConfig.ts` reads the `NEXT_PUBLIC_*` site values. Each must be referenced **statically** (`process.env.NEXT_PUBLIC_X`); a dynamic lookup such as `process.env[name]` works on the server but is empty in the browser and causes hydration mismatches.

## Security headers

`next.config.js` sets a Content-Security-Policy and `X-Content-Type-Options`, `X-Frame-Options: DENY`, `Referrer-Policy`, `Permissions-Policy` and `Strict-Transport-Security`. The CSP is same-origin-first with `'unsafe-inline'` on `style-src` and an explicit `connect-src` allowlist (Supabase, Vercel Analytics, Resend); it is not a nonce-based policy. `'unsafe-eval'` is added in development only.

## Presentation layers

The design-kit layer (`styles/kits.css`) and the v0.15 Emerald Growth tokens (`styles/emerald.css`) are presentation only. `components/ClientProviders.tsx` chooses a shell (public, ledger, command) from the signed-in role; access control is still decided by the guards and Supabase policies. See [DESIGN.md](DESIGN.md).

## Verification

See [TESTING.md](TESTING.md).
