/**
 * SITE CONFIG (L15)
 * ──────────────────
 * Single source of truth for the personal/production values this project
 * cannot invent: domain, contact address, legal entity, team name, and an
 * optional Premium price label. Everything here is typed with an explicit
 * `null` default rather than a fabricated placeholder value baked into
 * code, so a missing value is a visible gap, not a silent lie.
 *
 * `scripts/check-env.mjs` reads the same env vars and fails production
 * builds (VERCEL_ENV=production) when the required ones are missing or
 * still literally the word "example" — see that script for the exact rule.
 */

function readEnv(name: string): string | null {
  const value = process.env[name];
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
  /** e.g. "₱99–₱199/month". Null means: don't show a price, say upgrading is simulated. */
  premiumPriceLabel: string | null;
}

const PLACEHOLDER_SITE_URL = "https://gabaynegosyo.example";

export const siteConfig: SiteConfig = {
  siteUrl: readEnv("NEXT_PUBLIC_SITE_URL") ?? PLACEHOLDER_SITE_URL,
  siteUrlConfigured: readEnv("NEXT_PUBLIC_SITE_URL") !== null,
  contactEmail: readEnv("NEXT_PUBLIC_CONTACT_EMAIL"),
  legalEntityName: readEnv("NEXT_PUBLIC_LEGAL_ENTITY_NAME"),
  teamName: readEnv("NEXT_PUBLIC_TEAM_NAME"),
  premiumPriceLabel: readEnv("NEXT_PUBLIC_PREMIUM_PRICE_LABEL"),
};
