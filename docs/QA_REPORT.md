# QA report, v0.13

## 1. Defects found and root causes
| Defect | Root cause |
|---|---|
| Google: "provider is not enabled" | Google provider disabled in the Supabase project. Not fixable in code. The raw error is now mapped to a friendly message; setup in `GOOGLE_OAUTH_SETUP.md`. |
| Confirmation link opens an offline page | Link pointed at Supabase's Site URL (default localhost). Code used `window.location.origin` and nothing validated it. Now `emailRedirectTo` is a validated public URL; the dashboard must also allow it (`SUPABASE_REDIRECT_SETUP.md`). |
| Demo = three real Supabase users with a public password | `lib/demoAccounts.ts` + `NEXT_PUBLIC_DEMO_PASSWORD`. Replaced by browser-only demo. |
| Quezon City hard-coded | Wizard, account, dashboard, types comments. Replaced by `lib/ncr.ts`. |
| No Delete Account | Missing feature; added with a server route. |
| Credits showed 4 placeholder researchers | Now 9 + 1 from `data/credits.json`. |

## 2. Files changed
New: `lib/ncr.ts`, `lib/authRedirect.ts`, `lib/demoSeed.ts`, `lib/deleteAccountHandler.ts`, `app/api/delete-account/route.ts`, `app/auth/confirmed/page.tsx`, `app/account/deleted/page.tsx`, `components/DemoBanner.tsx`, `components/DeleteAccountSection.tsx`, `data/credits.json`, `tests/v013.test.js`, docs.
Edited: `lib/auth.tsx`, `lib/authErrors.ts`, `lib/db.ts`, `lib/demoAccounts.ts`, `lib/email.ts`, `lib/types.ts`, `app/wizard`, `app/login`, `app/signup`, `app/account`, `app/dashboard`, `app/page.tsx`, `app/admin/users`, `components/ClientProviders.tsx`, `styles/kits.css`, `.env.example`, `README.md`, `database/supabase_demo_accounts.sql` (deprecation header only).

## 3. Commands (run in this environment)
| Command | Result |
|---|---|
| `npm run lint` (tsc --noEmit) | PASS |
| `npm test` | PASS, 132/132 (111 existing + 21 new) |
| `npm run contrast-check` | PASS, 40/40 pairs |
| `npm run build` | PASS (with dummy Supabase env) |
| `next start` smoke: `/`, `/login`, `/signup`, `/wizard`, `/auth/confirmed`, `/account/deleted`, `/offline` → 200; unknown route → 404; `POST /api/delete-account` with no/invalid token → 401 | PASS |
| Real Supabase sign-up/confirmation/login, Google OAuth, real account deletion | **BLOCKED**: no project credentials |
| Browser interaction (dialog, demo banner, mobile widths, keyboard), screen-reader audit | **NOT RUN**: no browser here |

## 4. Manual configuration still required
Supabase Site URL + Redirect URLs, Google provider, `NEXT_PUBLIC_ENABLE_GOOGLE_LOGIN=true`, `NEXT_PUBLIC_SITE_URL`, `SUPABASE_SERVICE_ROLE_KEY` (server only) in Vercel, then redeploy.

## 5. Known limitations
- LGU guidance is generic for all 17 NCR localities; none verified. Barangay→RDO auto-lookup is QC only.
- `upgrade_to_premium_demo()` still lets any real user self-upgrade (prototype; no billing).
- Admin content edits remain per-browser localStorage (unchanged).
- Delete Account: admins are blocked; deletion is immediate and irreversible; Google-only users must have signed in within 10 minutes.
- Existing data: guest/QC profiles without `locality` are treated as Quezon City.

## 6. Migrations
None. Existing demo users in Supabase are left untouched; delete them manually if wished.

## 7. Manual regression checklist
Sign up → confirm email on phone → lands in wizard · refresh stays logged in · expired link page · Google success/cancel/disabled · wizard for Manila, Makati, Pateros, QC · demo Free/Premium/Admin: banner, reset, exit, nothing appears in Supabase · real login after demo is clean · delete account (wrong password, success, then login fails) · mobile 360px landing/credits · keyboard through nav and dialog · reduced-motion.
