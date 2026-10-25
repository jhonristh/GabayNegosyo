# Setup guide: Supabase, sign-in and deployment

Developer-facing. It takes the app from "public pages only" to a real backend on Supabase, hosted on Vercel. Allow about an hour the first time. The Supabase Free and Vercel Hobby plans are enough to start.

## 1. What Supabase provides

| Part | Use in this app |
|---|---|
| **Auth** | Email + password sign-up, confirmation emails, sessions, password reset, optional Google sign-in |
| **Postgres** | `profiles`, `business_profiles`, `checklist_progress`, `task_progress`, `reminder_configs`, `sent_emails` (and reminder tables from migration 004) |
| **Row Level Security** | Rules inside the database such as "a user can only read and write rows where `user_id` is their own id". This is what makes it safe for the browser to talk to the database directly |

`NEXT_PUBLIC_SUPABASE_ANON_KEY` is meant to be public; RLS protects the data. The **secret / service_role** key must never be put in browser code or in a `NEXT_PUBLIC_*` variable.

## 2. Create the project

1. [supabase.com/dashboard](https://supabase.com/dashboard) → **New project**. Name it `gabaynegosyo`, generate and save a database password, and pick the region closest to your users (for the Philippines, **Southeast Asia (Singapore)**).
2. Once provisioned, click **Connect** (or **Project Settings → API Keys**) and copy the **Project URL** and the **publishable key** (`sb_publishable_...`, or the older **anon** key; either works).
3. Put both in `.env.local` (copy `.env.example` first):

```bash
NEXT_PUBLIC_SUPABASE_URL=https://<your-project-ref>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<your-publishable-or-anon-key>
```

Restart `npm run dev` after editing `.env.local`.

## 3. Create the database

In **SQL Editor → New query**, run these files from the repository, in this order:

1. `database/supabase_setup.sql`: tables, RLS, column grants, the signup trigger and `upgrade_to_premium_demo()`. It already includes the `task_progress` table.
2. `database/migrations/001_sent_emails_sent_at_index.sql`, `003_sync_profiles.sql`, `004_reminder_digest.sql`.

Migrations `002`, `003` and `004` are safe to re-run. Existing projects that predate a migration only need to run the ones they are missing. If the app logs *"task_progress unavailable"*, run `002_task_progress.sql`.

Do **not** run `database/schema.sql` (an old target schema, not used) or `database/supabase_demo_accounts.sql` (deprecated; demo mode is browser-only now).

Check **Table Editor**: each table should show an **RLS enabled** badge.

Key points about the schema:

- `profiles` holds `name` and `role` (`free`, `premium`, `admin`). A trigger creates a `free` profile on every sign-up, email or Google. Users can change only their name, never their role.
- `upgrade_to_premium_demo()` lets any signed-in user upgrade themselves to Premium. It exists for the prototype only. **Remove it before charging anyone.**
- Admin functions `admin_account_overview()` and `admin_sync_profiles()` (migration 003) require `public.is_admin()`.

## 4. Auth settings

**Authentication → Sign In / Providers → Email**: enable it, turn **Confirm email** on for production, and set the minimum password length to 8 (the sign-up page also enforces 8).

### Redirect URLs

Confirmation emails link to Supabase's **Site URL** (a new project defaults to `http://localhost:3000`) unless the app passes an allowed redirect. On a phone, a localhost link cannot connect, so the service worker shows the offline page. The app builds redirects from `NEXT_PUBLIC_SITE_URL` (`lib/authRedirect.ts`; in production it refuses to emit localhost), but Supabase must also allow them.

**Authentication → URL Configuration:**

| Setting | Value |
|---|---|
| Site URL | `https://<your-production-domain>` |
| Redirect URLs | `https://<your-production-domain>/auth/confirmed` (email confirmation) |
| | `https://<your-production-domain>/login` (Google return) |
| | `https://<your-production-domain>/reset-password` (password reset) |
| | `http://localhost:3000/auth/confirmed`, `/login` and `/reset-password` (development only) |

Prefer exact URLs over wildcards. Add preview deployments only if you deliberately support them. In **Email Templates → Confirm signup**, keep the link as `{{ .ConfirmationURL }}` and do not hard-code `{{ .SiteURL }}`.

Flow: `signUp(emailRedirectTo=/auth/confirmed)` → email → Supabase verifies → `/auth/confirmed` → session stored → profile loaded → `/wizard` (new) or `/dashboard`. Expired or reused links show a page with log-in and sign-up-again options.

### The email limit you will hit

Supabase's built-in sender is for testing only: roughly 2 emails per hour, and only to addresses on your Supabase organization's team. For testing, sign up with your own team email or temporarily turn **Confirm email** off (turn it back on before launch). For real users, set up **custom SMTP** under **Authentication → Emails → SMTP Settings** (Resend is the simplest).

## 5. Google sign-in (optional)

The app uses **Supabase Auth's Google provider** (`signInWithOAuth`), not Google's standalone Identity Services button. The error `provider is not enabled` means the provider is switched off in the Supabase project the site talks to; no frontend change fixes that.

1. **Google Cloud → Google Auth Platform**: create or select a project, configure the OAuth consent screen, then create an **OAuth client ID → Web application**.
2. **Authorized JavaScript origins:** your production domain, plus `http://localhost:3000` for development.
3. **Authorized redirect URIs:** the Supabase callback shown in **Supabase → Authentication → Sign In / Providers → Google** (`https://<project-ref>.supabase.co/auth/v1/callback`). This is not your app's post-login URL.
4. In Supabase, enable the Google provider and enter the Google **Client ID** and **Client Secret** there only.
5. Set `NEXT_PUBLIC_ENABLE_GOOGLE_LOGIN=true` (and `NEXT_PUBLIC_SITE_URL`) in `.env.local` and Vercel, then redeploy.
6. Test: success, cancelling on Google's screen, a disabled provider (the button should show a friendly message, not JSON) and a redirect URL missing from the allow-list.

While the consent screen is in **Testing**, only listed test users can sign in; publish it at launch. After Google, the app returns to `/login`, which shows any error in plain language and routes signed-in users on. The client secret never appears in source or in any `NEXT_PUBLIC_*` variable.

If Google shows **Error 401: disabled_client**, the OAuth client was disabled or deleted in Google Cloud. Re-enable or recreate it under **APIs & Services → Credentials**, then paste the new Client ID and Secret into Supabase.

## 6. Make yourself the admin

Admins cannot be created from the app. After signing up once:

```sql
update public.profiles set role = 'admin' where email = '<your-email>';
```

Then log out and back in; you land on `/admin`. Use `role = 'premium'` the same way to grant Premium. To re-enable someone who unsubscribed from reminders: `update public.profiles set reminders_unsubscribed_at = null where lower(email) = 'person@example.com';`

Roles are never granted by account sync.

## 7. Account sync (migration 003)

`public.profiles` used to be filled only by the sign-up trigger, so accounts created before the trigger existed (or while it failed) had no profile and were invisible in Admin → Users, and an Auth user with no email could block a sign-up. Migration 003 hardens the trigger, backfills every missing profile as `free`, adds an update trigger so email and name changes reach `profiles`, and adds the two admin functions.

After running it, open **Admin → Dashboard**: the *Users and sync* panel should read "In sync". The panel refreshes every minute and when the tab becomes visible. If the migration has not been run, the panel says so instead of showing zeros. **Sync now** only creates missing rows and never changes a role. Admin → Users filters by role in the database, with matching counts and pagination.

## 8. Test it locally

1. **Sign up** at `/signup`. With Confirm email on you see "Check your email"; the link lands on `/wizard`. With it off you go straight to `/wizard`.
2. Table Editor → `profiles`: your row exists with `role = free`.
3. Finish the wizard → `business_profiles` has one row. Mark a requirement complete → `checklist_progress` has a row.
4. Log out and in again: the data is still there. Open a private window or your phone with the same account: same data (proof it is no longer `localStorage`).
5. **Account → Upgrade (demo)** changes `profiles.role` to `premium`.
6. Wrong password shows an error under the form.
7. Optional security check (replace `<user-uuid>`); the update must fail with a permission error:

```sql
begin;
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"<user-uuid>"}', true);
update public.profiles set role = 'admin' where id = '<user-uuid>';
rollback;
```

If a write seems to succeed but nothing appears in the tables, check the browser Console for `[db] … failed:`.

## 9. Browser-only demo previews (optional)

Set `NEXT_PUBLIC_ENABLE_DEMO_ACCOUNTS=true` to show Free / Premium / Admin previews on `/login`. They create no Supabase users, need no password, store sample data only in the visitor's browser, show a banner with **Reset** and **Exit**, and the admin preview has no real admin access. Turn it off (`false`) and redeploy for a real launch. `NEXT_PUBLIC_*` values are baked in at build time.

## 10. Account deletion

`/api/delete-account` needs the server-only `SUPABASE_SERVICE_ROLE_KEY` (Supabase → Settings → API Keys → secret key) in Vercel. Without it the Delete Account button reports "not available" and deletes nothing. Deletion is immediate and permanent and removes the auth user and linked rows; admins are blocked, and Google-only users must have signed in within the last 10 minutes.

## 11. Email reminders

See [REMINDERS_SETUP.md](REMINDERS_SETUP.md).

## 12. Deploy to Vercel

1. Push to GitHub. Confirm `.env.local` is not committed (`git status`). Keep `public/` free of stray copies of source or docs: everything in it is served publicly.
2. [vercel.com/new](https://vercel.com/new) → import the repo. Next.js is detected automatically.
3. Add environment variables (Production, and Preview if needed):

| Name | Value |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` | from step 2 |
| `NEXT_PUBLIC_SITE_URL` | your public https URL (required in production) |
| `NEXT_PUBLIC_CONTACT_EMAIL` | a real, monitored address (required in production) |
| `NEXT_PUBLIC_ENABLE_GOOGLE_LOGIN` | `true` or `false` |
| `NEXT_PUBLIC_ENABLE_DEMO_ACCOUNTS` | `true` only for demo or staging |
| `SUPABASE_SERVICE_ROLE_KEY` | server only (account deletion, reminders) |
| `NEXT_PUBLIC_LEGAL_ENTITY_NAME`, `NEXT_PUBLIC_TEAM_NAME`, `NEXT_PUBLIC_PREMIUM_PRICE_LABEL` | optional; unset values are simply not shown |
| Reminder variables | see [REMINDERS_SETUP.md](REMINDERS_SETUP.md) |

4. Deploy, then update Supabase **Site URL** and **Redirect URLs** (section 4) and, for Google, the Authorized JavaScript origins.
5. Repeat the section 8 tests on the live URL, including the confirmation link (it must open the live URL, not localhost).

Redeploy after changing any `NEXT_PUBLIC_*` value. Vercel Cron runs only on the Production deployment.

## 13. Troubleshooting

| Symptom | Likely cause and fix |
|---|---|
| "Supabase is not configured…" | `.env.local` missing or misnamed (restart dev), or Vercel variables missing (add and redeploy) |
| `Can't resolve 'nodemailer'` on build | Run `npm install`; the package is declared in `package.json` |
| Hydration mismatch in footer or 404 page | A `NEXT_PUBLIC_*` value read dynamically instead of statically (see ARCHITECTURE.md) |
| Sign-up: "Email address not authorized" or rate limit | Built-in email sender limits (section 4); use a team email, turn Confirm email off temporarily, or set up SMTP |
| "Email not confirmed" on login | The confirmation link has not been clicked |
| Confirmation link opens `localhost` | Supabase **Site URL** is still `http://localhost:3000` |
| Link says invalid or "redirect not allowed" | The URL is missing from **Redirect URLs** |
| `task_progress unavailable` warning | Run migration 002 |
| `permission denied for table …` | `database/supabase_setup.sql` did not fully run; re-run it on a fresh project |
| Role stays `free` after setting admin | Log out and in; check the email in your `update` matches the account |
| Google `redirect_uri_mismatch` | The redirect URI in Google Cloud must exactly equal the Supabase callback URL |
| Google `Error 401: disabled_client` | The OAuth client is disabled or deleted in Google Cloud (section 5) |
| Demo buttons missing | `NEXT_PUBLIC_ENABLE_DEMO_ACCOUNTS=true` is required; redeploy |
| Vercel build fails | Run `npm run build` locally first |
| App stops after a quiet week | Free-plan Supabase projects pause for inactivity; restore from the dashboard |

## 14. What is still local

- **Admin content edits** (agencies, requirements, resources, tutorials) are saved per browser. A shared admin CMS needs content tables seeded from `data/*.json`, columns matching `lib/types.ts`, and admin-only write policies using `public.is_admin()`.
- **Payments** are not connected. Remove `upgrade_to_premium_demo()` and the demo upgrade when adding billing.
- If Supabase cannot be reached at login, the app logs an error and shows empty data instead of blocking; saving the wizard again in that state could overwrite a saved profile.
- You store business details such as projected sales and expenses. Keep RLS enabled on every table you add, and keep the Privacy page accurate.
