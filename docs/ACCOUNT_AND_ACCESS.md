# Accounts, Premium access and admin controls

How a person's account, plan and admin powers work, and exactly what you must do in Supabase. Applies to v0.17 and later.

## 1. Run order (Supabase → SQL Editor)

Migrations 001–004 are already applied. Add, in this order, one at a time:

1. `database/migrations/005_account_lifecycle.sql`: deactivation, admin audit log, minimal deletion record, restrictive "active account" policies.
2. `database/migrations/006_entitlements.sql`: entitlements table, server-side plan function, admin grant/revoke/directory/audit functions, and **removal of `upgrade_to_premium_demo()`**.

3. `database/migrations/008_audit_hardening.sql` (WP3, **prepared, not yet applied**): append-only audit log with reasons and before/after status. Apply after 005 and 006; never re-run 003/005/006 afterwards (see the file header).

Deploy the v0.17 app first (or at the same time). Until 005/006 are applied, the app still works: plan falls back to the stored role, the Users page falls back to its read-only list, and deactivation/Premium management show a clear "run the migration" message. Nothing is deleted or rewritten by either file.

Verification queries and rollback notes are at the bottom of each file. Run the verification on a **test** account first.

## 2. The model

| Concept | Where it lives | Who can change it |
|---|---|---|
| Account | `auth.users` + `public.profiles` | The user changes their name only. Roles change in the database. |
| Role | `profiles.role` = free / premium / admin | Database only (column grants allow `name` and nothing else). |
| Plan (entitlement) | `public.entitlements` | Only admin functions (`admin_grant_premium`, `admin_revoke_premium`), each audited. |
| Subscription, payment transaction | **Not created yet** | A future payment provider adds its own tables and inserts an entitlement with `source = 'subscription'`. |
| Demo access | Browser only (`lib/demoAccounts.ts`), source `demo` | Nobody: it never touches Supabase. |

The plan is computed by `public.entitlement_for()` and returned by `public.get_my_entitlement()`:
real admin → Premium; active entitlement (not revoked, started, not expired) → Premium; legacy `role = 'premium'` → Premium **only for accounts that have never had an entitlement** (granting moves them into the entitlement system so expiry works); otherwise expired / cancelled / free. **Expiry needs no job**: the comparison happens each time the plan is read.

The browser calls `hasPremiumAccess(user)` and `canUse(user, feature)` from `lib/entitlements.ts`. Moving a feature between plans is one line in `FEATURE_TIER`.

### Honest limit
Premium content (documents, steps, penalty text) is part of the app's data files. The interface hides it from Free users, but this is not a content-protection boundary. The server-enforced parts are the entitlement records and routes like `/api/send-email`.

## 3. Deactivation and deletion

| | Deactivate | Delete permanently |
|---|---|---|
| Reversible | Yes | No |
| Data | Kept | Removed |
| Who | The user (Account → Deactivate), or an admin (with a reason) | The user only (Account → Delete) |
| Admins / demo | Cannot be deactivated here | Admins cannot self-delete; demo has nothing to delete |
| Blocks app use | App shows a reactivation screen; restrictive RLS blocks the user's own data | Sign-in is removed |
| Undo | Log in → **Reactivate**. If an admin deactivated the account, only an admin can reactivate it (recorded in `deactivated_by_admin`, which survives the admin's own account being deleted). | None |

Reactivation requires a signed-in session, so it never bypasses authentication. Deactivation does not ban the sign-in at the Supabase Auth level; the database and the app block everything that matters.

**Permanent deletion** requires: a valid session issued in the last 10 minutes (email/password users re-enter their password; Google users log in again if asked), the typed word `DELETE` (checked again on the server), and no user id from the browser (the token decides whose account is removed). Deleting the auth user cascades to: `profiles`, `business_profiles`, `checklist_progress`, `task_progress`, `reminder_configs`, `reminder_deliveries`, `sent_emails`, `entitlements`. Shared content and other users' rows are untouched. There are no uploaded files in Supabase storage (the profile picture lives only in the browser).

**What is retained, and for how long:** one row in `account_deletion_log` holds a SHA-256 of the account id, the role at deletion, the method and the dates. No email, name, password, token or business data. The server alone writes it; no API role can read it. It is purged after 30 days by `select public.purge_expired_deletion_log();` (run it manually or schedule it with pg_cron yourself; this release schedules nothing). Admin audit rows keep the *admin's* actions; their links to a deleted person are set to null by the foreign keys.

## 4. Admin controls

Admin → **Users**: search, filter, see plan and status, **Grant Premium** (optional expiry date, reason required), **Revoke Premium**, **Deactivate / Reactivate**. Admin → **Audit log**: who did what, to whom, why and when.

Rules enforced in the database, not the screen: only a real admin (`is_admin()`, which excludes demo) can call these functions; a reason of 3–300 characters is required; admins cannot be targeted; you cannot change your own status; every change writes an audit row. The shared demo "admin preview" is sample data only.

**Review legacy Premium accounts.** Anyone who used the old demo upgrade has `role = 'premium'`. They keep access so nobody is surprised, but they have no expiry. Review them with:

```sql
select email, created_at from public.profiles where role = 'premium' and not is_demo;
```

Then revoke each from Admin → Users, or leave them if they should stay.

## 5. Not done in this release (on purpose)

Email reminder delivery, the cron digest, a payment gateway and final pricing remain deferred. The digest still selects users by `role` (`app/api/cron/send-reminders/route.ts`); **before** turning reminders on, change it to use `entitlement_for()` so admin-granted Premium users are included.


## 6. Review fixes in v0.17.1

The admin Premium/Free filter uses the computed plan; legacy Premium cannot outlive an expiring grant; demo accounts are refused by the database functions and the delete route; `/api/send-email` fails closed (503) when the plan cannot be verified; admin-imposed deactivation is a stored flag. Pre-release review and QA plan: [INTEGRATION_AND_QA_v0.17.md](INTEGRATION_AND_QA_v0.17.md).
