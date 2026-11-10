/**
 * SITE CONFIG (L15)
 * ──────────────────
 * Single source of truth for the personal/production values this project
 * cannot invent: domain, contact address, legal entity and team name.
 * Premium pricing below is the client-approved ₱199 monthly subscription.
 *
 * `scripts/check-env.mjs` reads the same env vars and fails production
 * builds (VERCEL_ENV=production) when the required ones are missing or
 * still literally the word "example" — see that script for the exact rule.
 */

/**
 * NOTE: Next.js only inlines NEXT_PUBLIC_* values into the browser bundle when
 * they are referenced statically (process.env.NEXT_PUBLIC_X). A dynamic lookup
 * like process.env[name] works on the server but is empty in the browser,
 * which caused hydration mismatches (e.g. the footer "Contact" link). So each
 * value is passed in explicitly below.
 */
function clean(value: string | undefined): string | null {
  if (!value || value.trim().length === 0) return null;
  return value.trim();
}

export interface SiteConfig {
  /** Production domain, no trailing slash. Falls back to a clearly-fake
   *  placeholder in non-production so `next build` and the dev server keep
   *  working before this is set — see scripts/check-env.mjs for why this is
   *  safe (it only ever allows the placeholder outside VERCEL_ENV=production). */
  siteUrl: string;
  /** True only when NEXT_PUBLIC_SITE_URL was actually provided. */
  siteUrlConfigured: boolean;
  contactEmail: string | null;
  legalEntityName: string | null;
  teamName: string | null;
  /** Client-approved monthly subscription price, advertised consistently. */
  premiumPriceLabel: string;
}

const PLACEHOLDER_SITE_URL = "https://gabaynegosyo.example";

export const siteConfig: SiteConfig = {
  siteUrl: clean(process.env.NEXT_PUBLIC_SITE_URL) ?? PLACEHOLDER_SITE_URL,
  siteUrlConfigured: clean(process.env.NEXT_PUBLIC_SITE_URL) !== null,
  contactEmail: clean(process.env.NEXT_PUBLIC_CONTACT_EMAIL),
  legalEntityName: clean(process.env.NEXT_PUBLIC_LEGAL_ENTITY_NAME),
  teamName: clean(process.env.NEXT_PUBLIC_TEAM_NAME),
  premiumPriceLabel: "₱199/month",
};
