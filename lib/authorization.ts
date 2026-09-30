import type { Role } from "./types";

/**
 * Client-side authorization helpers. UI components use PremiumGate/
 * AdminGuard for presentation, and premium actions also call these
 * functions as a second check. They are NOT a security boundary by
 * themselves (they run in the browser). The real enforcement is server-side:
 * Supabase Row Level Security (database/supabase_setup.sql) and the role
 * check in app/api/send-email/route.ts.
 */
export function isPremiumRole(role: Role | undefined): boolean {
  return role === "premium" || role === "admin";
}

export function isAdminRole(role: Role | undefined): boolean {
  return role === "admin";
}

export function assertPremium(role: Role | undefined) {
  if (!isPremiumRole(role)) {
    throw new Error("PREMIUM_REQUIRED: this action requires a Premium subscription.");
  }
}

export function assertAdmin(role: Role | undefined) {
  if (!isAdminRole(role)) {
    throw new Error("ADMIN_REQUIRED: this action requires admin privileges.");
  }
}
