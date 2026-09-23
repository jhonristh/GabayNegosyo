/** @type {import('next').NextConfig} */

// B2/B5: baseline security headers + a Content-Security-Policy.
//
// Honest limitation, not hidden: this is a same-origin-first CSP with
// 'unsafe-inline' on style-src (Next.js's App Router injects some inline
// styles itself) and a small, explicit connect-src allowlist for Supabase
// and Vercel Web Analytics — not a nonce-based strict-dynamic policy. A
// nonce-based CSP needs per-request middleware threading a nonce into
// every script tag, which is a bigger, separate change; this is the
// pragmatic version that still blocks the two things that matter most for
// this app (arbitrary inline event-handler injection via script-src, and
// data exfiltration to an attacker-controlled origin via connect-src),
// documented here rather than left unstated.
//
// Supabase project ref isn't known at build time in this repo (it's an
// env var, not hardcoded — see K4), so connect-src allows https://*.supabase.co
// rather than one specific project host.

const cspDirectives = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' https://va.vercel-scripts.com",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data:",
  "font-src 'self' data:",
  "connect-src 'self' https://*.supabase.co https://va.vercel-scripts.com https://vitals.vercel-insights.com https://api.resend.com",
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
];

const securityHeaders = [
  { key: "Content-Security-Policy", value: cspDirectives.join("; ") },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
];

const nextConfig = {
  reactStrictMode: true,
  headers: async () => [
    {
      source: "/(.*)",
      headers: securityHeaders,
    },
    {
      source: "/sw.js",
      headers: [
        { key: "Content-Type", value: "application/javascript; charset=utf-8" },
        { key: "Cache-Control", value: "no-cache, no-store, must-revalidate" },
        { key: "Service-Worker-Allowed", value: "/" },
      ],
    },
  ],
};

module.exports = nextConfig;
