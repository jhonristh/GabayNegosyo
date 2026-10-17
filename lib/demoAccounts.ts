/**
 * BROWSER-ONLY DEMO MODE
 * ──────────────────────
 * Demo mode is NOT a Supabase session. It creates no auth user, no `profiles`
 * row and uses no password. State lives under its own localStorage keys and
 * lib/db.ts routes every write to that store while demo mode is active, so a
 * demo action can never reach a Supabase mutation or touch a real account.
 * There is no public admin demo: admin access is kept internal and uses real accounts only.
 *
 * Enabled with NEXT_PUBLIC_ENABLE_DEMO_ACCOUNTS=true. No password is needed any more.
 */
export type DemoRole = "free" | "premium" | "admin";

export interface DemoAccount {
  role: DemoRole;
  name: string;
  email: string;
  blurb: string;
}

export const DEMO_ACCOUNTS: DemoAccount[] = [
  { role: "free", name: "Sample Free User", email: "free@demo.invalid", blurb: "Basic checklist and deadlines" },
  { role: "premium", name: "Sample Premium User", email: "premium@demo.invalid", blurb: "Full details, tutorials, penalty simulator (local preview)" },
];

export const DEMO_ENABLED = process.env.NEXT_PUBLIC_ENABLE_DEMO_ACCOUNTS === "true";

export const DEMO_SESSION_KEY = "gn_demo_session_v1";
export const DEMO_DATA_KEY = "gn_demo_data_v1";
export const DEMO_CONTENT_KEY = "gn_demo_content_v1";
export const DEMO_ID_PREFIX = "demo-";

export function demoUserId(role: DemoRole): string {
  return `${DEMO_ID_PREFIX}${role}`;
}

export function isDemoUserId(id: string | null | undefined): boolean {
  return typeof id === "string" && id.startsWith(DEMO_ID_PREFIX);
}

export function getActiveDemoRole(): DemoRole | null {
  if (typeof window === "undefined") return null;
  try {
    const v = window.localStorage.getItem(DEMO_SESSION_KEY);
    return v === "free" || v === "premium" ? v : null; // a stale "admin" demo session is ignored
  } catch {
    return null;
  }
}

export function setActiveDemoRole(role: DemoRole | null) {
  if (typeof window === "undefined") return;
  try {
    if (role) window.localStorage.setItem(DEMO_SESSION_KEY, role);
    else window.localStorage.removeItem(DEMO_SESSION_KEY);
  } catch {
    /* storage blocked */
  }
}

/** Wipes every demo key. Never touches real-account keys or the Supabase session. */
export function wipeDemoStorage() {
  if (typeof window === "undefined") return;
  try {
    [DEMO_DATA_KEY, DEMO_CONTENT_KEY].forEach((k) => window.localStorage.removeItem(k));
  } catch {
    /* ignore */
  }
}
