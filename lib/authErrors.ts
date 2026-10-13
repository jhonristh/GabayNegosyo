/**
 * Turns raw Supabase / Google sign-in errors into plain-language messages,
 * and reads errors that Supabase puts in the URL when a Google sign-in
 * round-trip fails (they arrive in the query string or the #hash).
 */
export function friendlyAuthError(raw: string | null | undefined): string {
  const msg = (raw ?? "").replace(/\+/g, " ").trim();
  const m = msg.toLowerCase();
  if (!msg) return "Google sign-in could not be completed. Please try again, or use email and password.";
  if (m.includes("provider is not enabled") || m.includes("unsupported provider"))
    return "Google sign-in is not switched on yet. Please sign up with your email and password for now.";
  if (m.includes("redirect") && (m.includes("not allowed") || m.includes("invalid") || m.includes("mismatch")))
    return "Google sign-in is not set up for this web address yet. Please sign up with your email and password for now.";
  if (m.includes("access_denied") || m.includes("denied"))
    return "Google sign-in was cancelled. You can try again whenever you are ready.";
  if (m.includes("database error saving new user"))
    return "We could not finish creating your account. Please try again in a moment, or sign up with email and password.";
  if (m.includes("email") && m.includes("already"))
    return "An account with this email already exists. Try logging in instead.";
  if (m.includes("network") || m.includes("failed to fetch"))
    return "We could not reach the sign-in service. Check your connection and try again.";
  return "Google sign-in did not complete. Please try again, or sign up with your email and password.";
}

/** Reads (and clears from the address bar) an OAuth error returned to this page, if any. */
export function takeOAuthCallbackError(): string | null {
  if (typeof window === "undefined") return null;
  const url = new URL(window.location.href);
  const hash = new URLSearchParams(url.hash.replace(/^#/, ""));
  const code = url.searchParams.get("error_description") ?? hash.get("error_description") ?? url.searchParams.get("error") ?? hash.get("error");
  if (!code) return null;
  ["error", "error_code", "error_description"].forEach((k) => url.searchParams.delete(k));
  window.history.replaceState(null, "", url.pathname + (url.searchParams.toString() ? `?${url.searchParams}` : ""));
  return code;
}

/** Plain-language messages for email/password sign-in and sign-up errors (never raw JSON). */
export function friendlyEmailAuthError(raw: string | null | undefined): string {
  const m = (raw ?? "").toLowerCase();
  if (m.includes("invalid login credentials")) return "That email and password do not match. Check them and try again.";
  if (m.includes("email not confirmed")) return "Please confirm your email first. Open the link we sent you, then log in.";
  if (m.includes("already registered") || m.includes("already exists")) return "An account with this email already exists. Try logging in instead.";
  if (m.includes("password") && (m.includes("least") || m.includes("weak") || m.includes("short")))
    return "Please choose a stronger password (at least 8 characters).";
  if (m.includes("rate limit") || m.includes("too many") || m.includes("security purposes"))
    return "Too many attempts. Please wait a minute and try again.";
  if (m.includes("redirect") && (m.includes("not allowed") || m.includes("invalid")))
    return "This web address is not allowed for sign-in links yet. Please contact the site owner.";
  if (m.includes("network") || m.includes("failed to fetch")) return "We could not reach the sign-in service. Check your connection and try again.";
  if (m.includes("error sending") && m.includes("email")) return "We could not send the confirmation email. Please try again later.";
  return "Something went wrong. Please try again.";
}

/** Reasons Supabase puts in the URL when an email confirmation link fails. */
export type ConfirmationProblem = "expired" | "invalid" | "denied" | null;
export function classifyConfirmationError(errorCode: string | null, description: string | null): ConfirmationProblem {
  const text = `${errorCode ?? ""} ${description ?? ""}`.toLowerCase().replace(/\+/g, " ");
  if (!text.trim()) return null;
  if (text.includes("otp_expired") || text.includes("expired")) return "expired";
  if (text.includes("access_denied") || text.includes("denied")) return "denied";
  return "invalid";
}
