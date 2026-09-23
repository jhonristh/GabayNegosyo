#!/usr/bin/env node
/**
 * PRE-BUILD ENV CHECK (L15)
 * ─────────────────────────
 * Run via `npm run build` (prebuild hook). Warns locally; fails the build
 * only in production (VERCEL_ENV=production), so nobody accidentally
 * ships the placeholder domain or a missing contact address to real users.
 *
 * "Missing" includes: unset, empty, or still literally the placeholder
 * value this repo ships in .env.example / lib/siteConfig.ts.
 */

const isProduction = process.env.VERCEL_ENV === "production";

const PLACEHOLDER_SITE_URL = "https://gabaynegosyo.example";

const required = [
  {
    name: "NEXT_PUBLIC_SITE_URL",
    value: process.env.NEXT_PUBLIC_SITE_URL,
    isPlaceholder: (v) => !v || v === PLACEHOLDER_SITE_URL,
    reason: "used in metadata, Open Graph tags, robots.txt and sitemap.xml — a missing/placeholder value means search engines and shared links point at a domain that doesn't belong to this deployment.",
  },
  {
    name: "NEXT_PUBLIC_CONTACT_EMAIL",
    value: process.env.NEXT_PUBLIC_CONTACT_EMAIL,
    isPlaceholder: (v) => !v,
    reason: "shown on the footer, Privacy, Terms and Disclaimer pages as the real contact address (client rule L12 — no invented contact details).",
  },
];

const problems = required.filter((r) => r.isPlaceholder(r.value));

if (problems.length === 0) {
  console.log("[check-env] OK — all required site config values are set.");
  process.exit(0);
}

const lines = problems.map((p) => `  - ${p.name}: ${p.reason}`);
const message = [
  "[check-env] Missing or placeholder values:",
  ...lines,
  "",
  "Set these in .env.local (dev) or Vercel → Settings → Environment Variables (production).",
].join("\n");

if (isProduction) {
  console.error(message);
  console.error("[check-env] FAILING the build: VERCEL_ENV=production requires real values for the above.");
  process.exit(1);
} else {
  console.warn(message);
  console.warn("[check-env] Not failing this build (VERCEL_ENV is not \"production\").");
  process.exit(0);
}
