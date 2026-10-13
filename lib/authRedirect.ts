/**
 * Auth redirect URL construction. Pure functions so they can be unit-tested.
 *
 * Rules:
 *  - The base is NEXT_PUBLIC_SITE_URL when it is a valid http(s) URL.
 *  - Otherwise the current browser origin is used, but never a localhost origin
 *    in a production build (that would put localhost into emailed links).
 *  - Only allow-listed in-app paths can be used as a redirect target, so a
 *    caller can never smuggle an arbitrary URL into `redirectTo`.
 */
export const ALLOWED_AUTH_PATHS = ["/auth/confirmed", "/login", "/wizard", "/dashboard", "/checklist"] as const;
export type AuthPath = (typeof ALLOWED_AUTH_PATHS)[number];

const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "[::1]", "::1", "0.0.0.0"]);

export function parseSiteUrl(raw: string | null | undefined): string | null {
  if (!raw || !raw.trim()) return null;
  try {
    const u = new URL(raw.trim());
    if (u.protocol !== "https:" && u.protocol !== "http:") return null;
    return u.origin;
  } catch {
    return null;
  }
}

export function isLocalHost(hostname: string): boolean {
  return LOCAL_HOSTS.has(hostname.toLowerCase());
}

export interface RedirectEnv {
  siteUrl?: string | null;
  browserOrigin?: string | null;
  production: boolean;
}

/** Returns the public base URL, or null when no safe one is available. */
export function resolveSiteBase(env: RedirectEnv): string | null {
  const configured = parseSiteUrl(env.siteUrl);
  if (configured) {
    if (env.production && isLocalHost(new URL(configured).hostname)) return null;
    return configured;
  }
  const origin = parseSiteUrl(env.browserOrigin);
  if (!origin) return null;
  if (env.production && isLocalHost(new URL(origin).hostname)) return null;
  return origin;
}

export function buildAuthRedirect(path: string, env: RedirectEnv): string | null {
  if (!(ALLOWED_AUTH_PATHS as readonly string[]).includes(path)) return null;
  const base = resolveSiteBase(env);
  return base ? `${base}${path}` : null;
}

/** Convenience wrapper for browser code. */
export function authRedirectUrl(path: AuthPath): string | null {
  return buildAuthRedirect(path, {
    siteUrl: process.env.NEXT_PUBLIC_SITE_URL,
    browserOrigin: typeof window !== "undefined" ? window.location.origin : null,
    production: process.env.NODE_ENV === "production",
  });
}
