/**
 * Pure helpers for admin actions (no Supabase import, so they can be unit-tested directly).
 * Errors are translated to plain language; raw database messages never reach the screen.
 */
export class AdminActionError extends Error {
  missingMigration: boolean;
  constructor(message: string, missingMigration = false) {
    super(message);
    this.missingMigration = missingMigration;
  }
}

const MIGRATION_HINT = "Run database/migrations/005_account_lifecycle.sql and 006_entitlements.sql in the Supabase SQL editor, then refresh.";

export function friendlyAdminError(message: string | undefined, code?: string): AdminActionError {
  const m = message ?? "";
  if (code === "PGRST202" || /could not find the function|does not exist/i.test(m)) return new AdminActionError(MIGRATION_HINT, true);
  if (code === "42501" || /admins only/i.test(m)) return new AdminActionError("Only a real admin account can do this.");
  if (/reason of 3/i.test(m)) return new AdminActionError("Enter a reason of 3 to 300 characters.");
  if (/expiry must be in the future/i.test(m)) return new AdminActionError("Choose an expiry date in the future, or leave it empty for no expiry.");
  if (/no premium access to revoke/i.test(m)) return new AdminActionError("This account has no Premium access to revoke.");
  if (/admin accounts|already have full access|changed in the database/i.test(m)) return new AdminActionError("Admin accounts cannot be changed from this screen.");
  if (/own account/i.test(m)) return new AdminActionError("You cannot change your own account status here.");
  if (/demo accounts/i.test(m)) return new AdminActionError("Demo accounts do not use Premium entitlements.");
  if (/not found/i.test(m)) return new AdminActionError("That account no longer exists. Refresh the list.");
  return new AdminActionError("The change was not saved. Please try again.");
}

/** `expiresOn` is a yyyy-mm-dd date (end of that day, Manila time) or empty for "no expiry". */
export function expiryFromDate(expiresOn: string): string | null {
  if (!expiresOn) return null;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(expiresOn)) throw new AdminActionError("Choose a valid expiry date.");
  const d = new Date(`${expiresOn}T23:59:59+08:00`);
  if (Number.isNaN(d.getTime())) throw new AdminActionError("Choose a valid expiry date.");
  return d.toISOString();
}

