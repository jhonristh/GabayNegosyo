# Keeping accounts in sync with Supabase (v0.15)

Developer-facing. Users never see this file.

## What it fixes
`public.profiles` was filled only by the `on_auth_user_created` trigger, so:
- accounts created before that trigger existed (or while it failed) had **no profile** and were invisible in Admin → Users;
- an Auth user with no email made the trigger insert `NULL` into a `NOT NULL` column, which could **block that signup**;
- email or name changes in Auth never reached `profiles`.

## One-time setup
1. Supabase → SQL Editor → New query.
2. Paste and run `database/migrations/003_sync_profiles.sql` (safe to re-run).
   It hardens the signup trigger, backfills every missing profile as role `free`, adds an update trigger, and adds two admin-only functions.
3. Open **Admin → Dashboard**. The *Users and sync* panel should read "In sync".

Fresh installs: `database/supabase_setup.sql` already contains the hardened trigger; still run migration 003 for the admin functions and the update trigger.

## What the admin panel does
- `admin_account_overview()` returns counts (total, free, premium, admin, demo, new in 7 days) and compares `auth.users` with `public.profiles`.
- `admin_sync_profiles()` creates any missing profile rows. It never changes anyone's role.
- Both require `public.is_admin()`; the shared demo admin does not qualify. The client only displays the result.
- The panel refreshes every minute and when the tab becomes visible again.
- If the migration has not been run, the panel says so instead of showing zeros.

## Admin → Users
The role filter now runs in the database (`.eq("role", …)`) with matching counts and pagination, instead of filtering only the 20 rows on screen.

## Not changed
Roles are never granted by sync. Promote an admin manually: `update public.profiles set role = 'admin' where email = '<your-email>';`
