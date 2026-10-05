# GabayNegosyo — Architecture (v0.5)

## Runtime
Next.js App Router, React and TypeScript. `app/` contains routes and layouts; `components/` shared interface; `styles/globals.css` the design system; `data/` seed/reference content; `lib/` authentication, data access, eligibility and supporting logic; `database/` SQL setup and migrations; `public/` PWA assets.

## Data and journey
Supabase Auth manages sessions through `lib/auth.tsx` and `lib/supabase.ts`. `lib/db.ts` hydrates profile, checklist progress, reminders and related records from Supabase, while static requirement content and limited browser-side admin overrides remain in the existing implementation. The wizard records the profile; `lib/ruleEngine.ts` selects applicable requirements; checklist, deadlines and dashboard render those results. Premium and admin UI use the existing role and guard model. See source code for exact persistence and authorization behavior.

## v0.5 change boundary
This release edits presentational components (`app/page.tsx`, `app/dashboard/page.tsx`, `components/Navbar.tsx`, `components/Footer.tsx`) and CSS. Backend routes, `lib/`, SQL, requirement data, service worker, environment contract and lockfile are carried forward unchanged. Supabase URL and key are supplied via environment variables; never include secrets in the ZIP.

## Verification
Run `npm ci`, `npm run lint`, `npm test`, `npm run contrast-check`, and `npm run build` with valid environment settings. Production prebuild requires a real site URL and contact address. Manually inspect desktop/mobile landing, signup navigation, wizard, dashboard with and without a profile, checklist and admin access against a configured Supabase project.

## v0.7 frontend additions
The checklist progress component receives counts and filter callbacks from the checklist route. The deadline calendar receives the existing computed due dates and links to requirement detail; it does not write data. Account pictures are stored as small data URLs in this browser's localStorage under a user-specific key and are never uploaded. The admin role filter applies to the current paginated results only. No database tables, RLS policies, API handlers, auth service, or billing integrations changed.

## v0.11 design-kit layer
Presentation only. `styles/kits.css` loads after `globals.css`; `components/ClientProviders.tsx` picks a shell (public, ledger, command) from the signed-in role, while `AuthGuard`, `AdminGuard` and Supabase policies still control access. The Night Shift preference lives in `localStorage["gn-theme"]` and `<html data-theme>`, set before first paint by an inline script from `lib/theme.ts`. New components: `KitIcon`, `ThemeControls`, `AgencyProgress`. No database tables, RLS policies, API handlers, auth service, content data or rule logic changed. See `docs/DESIGN_KITS.md`.
