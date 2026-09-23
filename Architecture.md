# GabayNegosyo — Architecture (v0.5)

## Runtime
Next.js App Router, React and TypeScript. `app/` contains routes and layouts; `components/` shared interface; `styles/globals.css` the design system; `data/` seed/reference content; `lib/` authentication, data access, eligibility and supporting logic; `database/` SQL setup and migrations; `public/` PWA assets.

## Data and journey
Supabase Auth manages sessions through `lib/auth.tsx` and `lib/supabase.ts`. `lib/db.ts` hydrates profile, checklist progress, reminders and related records from Supabase, while static requirement content and limited browser-side admin overrides remain in the existing implementation. The wizard records the profile; `lib/ruleEngine.ts` selects applicable requirements; checklist, deadlines and dashboard render those results. Premium and admin UI use the existing role and guard model. See source code for exact persistence and authorization behavior.

## v0.5 change boundary
This release edits presentational components (`app/page.tsx`, `app/dashboard/page.tsx`, `components/Navbar.tsx`, `components/Footer.tsx`) and CSS. Backend routes, `lib/`, SQL, requirement data, service worker, environment contract and lockfile are carried forward unchanged. Supabase URL and key are supplied via environment variables; never include secrets in the ZIP.

## Verification
Run `npm ci`, `npm run lint`, `npm test`, `npm run contrast-check`, and `npm run build` with valid environment settings. Production prebuild requires a real site URL and contact address. Manually inspect desktop/mobile landing, signup navigation, wizard, dashboard with and without a profile, checklist and admin access against a configured Supabase project.
