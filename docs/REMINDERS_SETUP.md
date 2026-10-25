# Automatic reminder digest (v0.16) — setup

What it does: once a day at **8:00 AM Philippine time**, Vercel Cron calls `/api/cron/send-reminders`.
For every **Premium/Admin** person who turned reminders on, it sends **one digest email** listing every
requirement whose **fixed due date** is exactly the number of days away they chose (**7, 3 or 1**).
Requirements with "No fixed date" never get reminders. Demo accounts and unsubscribed people are skipped.

Nothing is sent until you complete the steps below. The default is `REMINDERS_MODE=off`.

## 1. Run the migration (once)
Supabase → SQL Editor → paste `database/migrations/004_reminder_digest.sql` → Run.

## 2. Pick the sender (no domain needed: Gmail)
1. On the sending Google account (e.g. gabaynegosyo@gmail.com) turn on **2-Step Verification**.
2. Google Account → Security → **App passwords** → create one named "GabayNegosyo". Copy the 16 characters.
3. In Vercel (Project → Settings → Environment Variables) add, for **Production**:

| Name | Value |
|---|---|
| `EMAIL_PROVIDER` | `gmail` |
| `GMAIL_USER` | the Gmail address |
| `GMAIL_APP_PASSWORD` | the app password (never put it in the repo or in chat) |
| `CRON_SECRET` | a long random string (e.g. 40+ characters) |
| `SUPABASE_SERVICE_ROLE_KEY` | already set if account deletion works |
| `NEXT_PUBLIC_SITE_URL` | your https Vercel URL |
| `REMINDERS_MODE` | start with `dry_run` |
| `REMINDER_ALLOWLIST` | `gabaynegosyo@gmail.com` while testing |

Gmail limits daily sends (roughly 500/day for a normal account), which is plenty for a prototype.
Later, with a domain, switch to `EMAIL_PROVIDER=resend` (needs `RESEND_API_KEY` and `EMAIL_FROM`).

## 3. Roll out in stages
1. **Dry run:** redeploy, then run (replace values):
   `curl -H "Authorization: Bearer <CRON_SECRET>" "https://<your-site>/api/cron/send-reminders?dry=1"`
   The reply shows counts only (`users`, `withItems`, `sent`, `skipped`, `failed`). Nothing is emailed.
2. **Live, allowlist only:** set `REMINDERS_MODE=live`, keep `REMINDER_ALLOWLIST` to your own address, redeploy.
   Make a Premium test profile with a requirement due in 7/3/1 days, then call the URL above without `?dry=1`.
3. **Open to all Premium users:** clear `REMINDER_ALLOWLIST`, set `NEXT_PUBLIC_REMINDERS_LIVE=true`
   (this only changes the wording in the app), redeploy.

Vercel Cron only runs on the **Production** deployment, and on the Hobby plan runs once a day at roughly
the scheduled hour. A same-day re-run sends nothing new (`reminder_deliveries` prevents duplicates).

## Safety summary
- Route requires `CRON_SECRET`; unauthenticated calls get 401.
- Emails go only to the account's own verified address, never to addresses typed by a user.
- Every email has an unsubscribe link (signed; confirm page, then POST) and a not-a-government-notice line.
- The run summary never contains email addresses.

## Re-enable someone after they unsubscribed
`update public.profiles set reminders_unsubscribed_at = null where lower(email) = 'person@example.com';`

## Test send from the app (v0.16.4)
"Send test reminder" on Deadlines uses the same `EMAIL_PROVIDER` as the daily digest. It says "sent" only when the provider accepted the email. If no provider is configured, it logs the attempt and tells the user that nothing was sent.
