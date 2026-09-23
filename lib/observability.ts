/**
 * B4: thin observability adapter. Logs structured errors — never personal
 * data or tokens — and forwards to an error-tracking service only when its
 * DSN is configured. No third-party account has been created or connected
 * in this pass (see docs/V0.3_STATUS.md: "adapter ready, no account
 * connected"). Wiring a real service later is a small, documented step:
 * set NEXT_PUBLIC_ERROR_TRACKING_DSN and fill in `forward()` below.
 *
 * Where to actually look for errors right now, with no extra setup:
 *   - Vercel → your project → Runtime Logs (server errors, API route
 *     failures, build failures).
 *   - Supabase → your project → Logs (auth errors, database errors,
 *     RLS denials) and → Advisors → Security Advisor (misconfiguration
 *     warnings, e.g. a table with RLS off).
 * Alerts worth configuring once you have traffic: Vercel → Settings →
 * Notifications (deployment failures); Supabase → Settings → Alerts
 * (database CPU/storage thresholds, if on a paid plan).
 */

export interface ErrorReport {
  message: string;
  digest?: string;
  context: string; // e.g. "error-boundary", "global-error-boundary"
  url?: string;
}

function forward(report: ErrorReport) {
  const dsn = process.env.NEXT_PUBLIC_ERROR_TRACKING_DSN;
  if (!dsn) return; // no account connected — see file header
  // Intentionally left as a documented stub: wiring a real provider
  // (Sentry, etc.) here is the "small step" this adapter is designed for.
}

export function reportError(report: ErrorReport) {
  // Structured, no personal data: message + digest + which boundary caught
  // it + the path, never a user id, email, token, or request body.
  console.error("[observability]", {
    context: report.context,
    message: report.message,
    digest: report.digest,
    url: report.url,
  });
  forward(report);
}
