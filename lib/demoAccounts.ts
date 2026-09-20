/**
 * DEMO ACCOUNTS
 * ─────────────
 * Three ordinary Supabase users (free / premium / admin) that let anyone try the
 * app in one click on the login page. They are real accounts, created once in the
 * Supabase dashboard (see docs/SUPABASE_SETUP.md, "Demo accounts").
 *
 * Switched on only when BOTH env vars are set:
 *   NEXT_PUBLIC_ENABLE_DEMO_ACCOUNTS=true
 *   NEXT_PUBLIC_DEMO_PASSWORD=<a throwaway password>
 *
 * ⚠️  NEXT_PUBLIC_* values are visible to anyone who opens the site's JavaScript.
 *     So the demo password is effectively PUBLIC. Use a password you use nowhere
 *     else, and switch the flag off for a real launch. The database limits what
 *     the demo admin can see (see `is_demo` in database/supabase_setup.sql).
 *
 * Keep the emails below in sync with database/supabase_demo_accounts.sql.
 */
export interface DemoAccount {
  role: "free" | "premium" | "admin";
  name: string;
  email: string;
  blurb: string;
}

export const DEMO_ACCOUNTS: DemoAccount[] = [
  {
    role: "free",
    name: "Juana Dela Cruz",
    email: "free@demo.gabaynegosyo.ph",
    blurb: "Basic checklist and deadlines",
  },
  {
    role: "premium",
    name: "Marco Santos",
    email: "premium@demo.gabaynegosyo.ph",
    blurb: "Full details, tutorials, penalty simulator, reminders",
  },
  {
    role: "admin",
    name: "GabayNegosyo Admin",
    email: "admin@demo.gabaynegosyo.ph",
    blurb: "Admin dashboard (sandboxed: sees only its own data)",
  },
];

export const DEMO_PASSWORD = process.env.NEXT_PUBLIC_DEMO_PASSWORD ?? "";
export const DEMO_ENABLED = process.env.NEXT_PUBLIC_ENABLE_DEMO_ACCOUNTS === "true" && DEMO_PASSWORD.length > 0;
