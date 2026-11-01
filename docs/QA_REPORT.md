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

## v0.17 additions

Automated (observed, `npm test`): 197 of 197, including 36 new tests in `tests/v017.test.js`. SQL migrations 005 and 006 and `supabase_setup.sql` were syntax-checked with the PostgreSQL parser; **they were not executed against a database**.

Manual checks still required (need Supabase and a browser):

1. Apply 005 then 006 on a copy or test project. Run each file's verification queries.
2. Sign up a test account. Deactivate it from Account: it is signed out. Log in: the reactivation screen appears and no data loads. Reactivate: data returns.
3. As admin, deactivate that account with a reason; confirm the user cannot reactivate; reactivate it as admin.
4. As admin, grant Premium with a short expiry; confirm Premium features unlock after a refresh and the audit log shows the entry. Revoke; confirm Free. Let a grant expire (or set it a day out and edit `expires_at` in SQL on the test project) and confirm Free without any other action.
5. As a normal user, in the browser console call `supabase.rpc("admin_grant_premium", …)`: expect "Admins only". Try `supabase.from("entitlements").insert(…)`: expect permission denied.
6. Delete the test account (email and Google). Confirm: wrong word refused, stale login asks to log in again, success signs out, `account_deletion_log` has one hashed row, and the user's rows are gone from every table.
7. PWA: install on Android Chrome and desktop Chrome/Edge, launch standalone, switch to airplane mode (offline banner and /offline page), reconnect (banner says back online). Check on Samsung Internet and Safari.
8. Responsive and keyboard passes at 320, 360, 375, 390, 414, 768, 1024, 1366 px on the pages listed in the brief; Tab through dialogs (focus stays inside, Esc closes, focus returns to the button).

Not checked by anyone yet: items 1–8 above, real screen-reader testing, and low-end Android performance.
