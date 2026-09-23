"use client";

import { track as vercelTrack } from "@vercel/analytics";

/**
 * C10/L12: thin wrapper around @vercel/analytics (cookieless page
 * analytics — no consent banner needed, see docs/DESIGN.md privacy notes).
 * A no-op outside production so local/dev work never sends events.
 *
 * Deliberately separate from lib/analytics.ts, which is a different,
 * pre-existing feature: an in-app, localStorage-only event log the admin
 * dashboard aggregates for product-usage insight. That system stays as it
 * is; this one is real Vercel Web Analytics for actual traffic/conversion
 * measurement, which is what "analytics actually installed" (client rule)
 * requires and lib/analytics.ts alone does not provide.
 *
 * Note for the report: the <Analytics /> component and these events are
 * wired in; Vercel Web Analytics must ALSO be turned on in the Vercel
 * project dashboard (Project → Analytics → Enable) for data to appear —
 * that flag lives outside this codebase.
 */

export type ConversionEvent =
  | "signup_completed"
  | "wizard_completed"
  | "requirement_completed"
  | "premium_upgrade_simulated"
  | "install_prompt_accepted";

export function trackConversion(event: ConversionEvent) {
  if (process.env.NODE_ENV !== "production") return;
  // No personal data: these five event names carry no properties at all.
  vercelTrack(event);
}
