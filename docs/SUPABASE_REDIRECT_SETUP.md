# Supabase redirect / email-confirmation setup

## Root cause of the "offline page after confirming email" bug
Confirmation emails link to Supabase's **Site URL** (a new project defaults to `http://localhost:3000`) unless the app passes an allowed `emailRedirectTo`. Opening a localhost link on a phone cannot connect, so the service worker showed `/offline`. The code now sets `emailRedirectTo` from a validated public URL, but **Supabase must also allow it**.

## Dashboard values (Authentication → URL Configuration)
| Setting | Value |
|---|---|
| Site URL | `https://<your-production-domain>` |
| Redirect URLs | `https://<your-production-domain>/auth/confirmed` |
| | `https://<your-production-domain>/login` (Google return) |
| | `http://localhost:3000/auth/confirmed` and `http://localhost:3000/login` (development only) |
| | Preview deployments only if deliberately supported, using exact URLs |

Prefer exact URLs over wildcards. Project-specific values (`<project-ref>`, domain) are placeholders: use your own.

## Environment
`NEXT_PUBLIC_SITE_URL=https://<your-production-domain>` in Vercel (Production). `lib/authRedirect.ts` uses it for `emailRedirectTo` and Google's `redirectTo`; in production builds it refuses to emit a localhost URL.

## Email template
Authentication → Email Templates → *Confirm signup*: keep the link as `{{ .ConfirmationURL }}`. That link honors the allowed `emailRedirectTo`. Avoid hard-coding `{{ .SiteURL }}`.

## Flow
`signUp(emailRedirectTo=/auth/confirmed)` → email → link → Supabase verifies → redirects to `/auth/confirmed#access_token=…` → supabase-js (implicit flow, `detectSessionInUrl`) stores the session → `AuthProvider` loads the profile and hydrates data → page routes to `/wizard` (new) or `/dashboard`. The session persists across refresh. Expired/invalid/reused links show an actionable page with log-in and sign-up-again options. The `profiles` row is created by the existing `on_auth_user_created` trigger; the app does not insert profiles.
