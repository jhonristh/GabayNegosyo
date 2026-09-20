import type { Role } from "./types";

/**
 * Service-layer authorization checks. UI components use PremiumGate/
 * AdminGuard for presentation, but any action that mutates data or reveals
 * gated content should also call these functions — this is the "backend"
 * enforcement point referenced in the architecture, even though the
 * prototype's service layer runs client-side against local storage.
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
