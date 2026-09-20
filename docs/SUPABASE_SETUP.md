# GabayNegosyo — Supabase Backend Setup Guide

> **Developer-facing doc.** Keep this at `docs/SUPABASE_SETUP.md`. In the user-facing `README.md`, replace the long "Supabase setup / Google OAuth / Email configuration" sections with a one-line link to this file.

This guide takes the app from **demo mode** (fake accounts, everything in the browser's `localStorage`) to a **real backend** on Supabase with **email + password auth**, then deploys it to **Vercel**.

**Time:** about 60–90 minutes the first time.
**Cost:** Supabase Free plan + Vercel Hobby plan are enough to start.

---

## 0. What the Supabase backend is for

Right now every piece of state lives in each visitor's own browser. That means:

| Today (demo mode) | With Supabase |
|---|---|
| "Accounts" are 3 hard-coded demo users; signup accepts any email with no password | Real accounts: email + password, confirmation email, optional Google login |
| Data is stored in `localStorage` — lost if the browser is cleared, and not shared between phone and laptop | Data lives in a Postgres database, tied to the user, available on any device |
| Anyone can open DevTools and set themselves to `admin` or `premium` | Roles are stored server-side; users **cannot** change their own role (enforced by the database, not by the UI) |
| The admin dashboard only sees what's in *its own* browser | Admin can be granted read access to all users' rows (e.g., the sent-email log) |
| Nothing can run when nobody has the app open | A server exists for things like real reminder emails |

Supabase gives you four things, and this app uses the first three:

1. **Auth** — sign-up, login, sessions, confirmation emails, password reset, Google login.
2. **Postgres database** — the tables in section 3 (profiles, business profile, checklist progress, reminders, sent-email log).
3. **Row Level Security (RLS)** — rules *inside the database* such as "a user can only read/write rows where `user_id` is their own id". This is what makes it safe for the browser to talk to the database directly.
4. *(Not used yet)* Storage, Edge Functions, Realtime.

### How the pieces fit

```
Browser (Next.js app on Vercel)
  │  lib/auth.tsx ──► Supabase Auth      (who are you?)
  │  lib/db.ts    ──► Supabase Postgres  (your rows only — enforced by RLS)
  │
  └─ /api/send-email (Vercel server route) ──► Resend (email provider)
        secrets (API keys) live only here, never in the browser
```

The `NEXT_PUBLIC_SUPABASE_ANON_KEY` is **meant** to be public. Your data is protected by RLS, not by hiding that key. The **secret / service_role** key must never be put in this app's browser code or in any `NEXT_PUBLIC_*` variable.

---

## 1. Read this first — things I found in the project zip

I read through the project before writing this guide. These affect what you should do:

1. **The README says the `db.ts` function signatures "stay the same so no page needs to change." That isn't fully true.** Supabase calls are asynchronous; `lib/db.ts` is synchronous and pages call it like `useMemo(() => db.getRequirements(), [])`. Rewriting every page for `async` is a lot of churn, so this guide uses a different approach: load the user's data into an in-memory cache right after login (`db.hydrate`), keep reads synchronous, and make every write **write-through** to Supabase. Result: only `lib/` and the login/signup pages change. Trade-offs are listed in section 14.
2. **`database/schema.sql` is out of date and should NOT be run.** It has a standalone `users` table (not linked to Supabase Auth), no security rules, and its `businesses` / `requirements` tables don't match `lib/types.ts` (e.g. no `taxpayerType`, `barangay`, `rdoCode`, `instructions`, `contentSource`). This guide gives you a new SQL file instead. Keep the old file only as a reference for the later "content tables" stage.
3. **`public/` contains a full stale copy of the whole project** (`public/app`, `public/lib`, `public/README.md`, `public/package.json`, …). On Vercel, everything inside `public/` is served as a static file, so your source code and docs would be downloadable from your live site. **Delete the copies before you deploy** (step 2 below).
4. **`.gitignore` only contains `node_modules`.** As-is, `.env.local` and `.next` would be committed to GitHub. This guide replaces it (step 2).
5. **The README's email plan won't work as written.** `lib/email.ts` runs in the browser, and only `NEXT_PUBLIC_*` variables exist in the browser, so an `EMAIL_PROVIDER_API_KEY` there would either be missing or, if you "fixed" it by making it public, leak your key. Real sending has to happen on a server route (section 9).
6. **Reminder emails are not scheduled.** Today the app only has a "send test reminder" button. Automatic 7/3/1-day reminders need a scheduled job — that is a later stage (section 14).

---

## 2. Clean up the project (5 min)

Run from the project root (Git Bash / macOS / Linux). On Windows you can also just delete these in File Explorer.

```bash
# stale nested copy of the project inside public/
rm -rf public/app public/components public/data public/database public/lib \
       public/styles public/tests public/public
rm -f  public/README.md public/PROGRESS.md public/DESIGN.md public/.env.example \
       public/package.json public/package-lock.json public/next.config.js public/tsconfig.json

# build artifact that shouldn't be in the repo
rm -f tsconfig.tsbuildinfo
```

After this, `public/` should contain only: `favicon.ico`, `icons/`, `manifest.json`, `robots.txt`, `sw.js`.

Then replace **`.gitignore`** with the full file in section 6.7.

✅ Check: `ls public` shows only those five items.

---

## 3. Create the Supabase project (10 min)

1. Go to <https://supabase.com/dashboard> and sign in (GitHub login is fine).
2. **New project** → pick an organization.
3. Fill in:
   - **Name:** `gabaynegosyo`
   - **Database password:** generate one and **save it in a password manager** (you rarely need it, but you can't view it again).
   - **Region:** choose the closest to your users — for the Philippines, **Southeast Asia (Singapore)**.
4. Wait for provisioning (1–2 min).

Now grab the two values the app needs. Open the project and click **Connect** at the top (or **Project Settings → API Keys**):

- **Project URL** → looks like `https://<your-project-ref>.supabase.co`
- **Publishable key** → starts with `sb_publishable_...` (older projects call it the **anon** key — either one works in this app)

> ⚠️ Supabase also shows a **secret** key (`sb_secret_...`) / **service_role** key. Do **not** use these in this app's browser code. They bypass all security rules.

✅ Check: you have the URL and the publishable/anon key copied somewhere temporary.

---

## 4. Create the database tables + security rules (5 min)

1. In Supabase, open **SQL Editor → New query**.
2. Paste the **entire** SQL from section 6.1 (`database/supabase_setup.sql`) and click **Run**.
3. You should see "Success. No rows returned."
4. Open **Table Editor** — you should see 5 tables: `profiles`, `business_profiles`, `checklist_progress`, `reminder_configs`, `sent_emails`. Each should show an **RLS enabled** badge.

What this SQL does, in plain words:

- **`profiles`** — one row per user, linked to Supabase's built-in `auth.users`. Holds `name` and `role` (`free` / `premium` / `admin`).
- **A trigger** creates the profile row automatically on signup (email *or* Google). New users are always `free`.
- **RLS + column grants** — users can read their own profile and change **only their name**. Nobody can change their own `role` from the browser. That is the line that stops self-promotion to admin.
- **`business_profiles`, `checklist_progress`, `reminder_configs`** — each row belongs to one `user_id`; the policy is "you can only touch your own rows".
- **`sent_emails`** — the reminder log; users see their own, admins see all.
- **`upgrade_to_premium_demo()`** — a demo-only function so the "Upgrade now (demo)" button keeps working until you have real payments. Delete it when you add billing.

> I ran this SQL against a local Postgres with a stand-in for Supabase's `auth` schema and checked: signup trigger creates profiles; user A cannot read or write user B's rows; a user cannot set their own role to admin; an admin can read all profiles/emails; the anonymous role gets nothing. I have **not** run it on a live Supabase project — do the tests in section 8.

---

## 5. Configure Auth in the dashboard (10 min)

### 5.1 Email provider
**Authentication → Sign In / Providers → Email** (menu wording may differ slightly by dashboard version):

- **Enable Email provider:** on
- **Confirm email:** **on** (recommended for production — users must click a link before they can log in)
- **Minimum password length:** set to **8** (the signup page also enforces 8)

### 5.2 URLs
**Authentication → URL Configuration:**

- **Site URL:** `http://localhost:3000` for now (change to your Vercel URL in section 12)
- **Redirect URLs** — add:
  - `http://localhost:3000/**`

(Section 12 adds the Vercel URLs. If you skip this, confirmation links send people to the wrong place.)

### 5.3 The email limit you *will* hit
Supabase's built-in email sender is for testing only. As of the current docs it sends roughly **2 emails per hour** and **only to addresses on your Supabase organization's team** — anyone else gets an "Email address not authorized" error.

- **For your own testing:** sign up with the same email you used for Supabase, or add teammates under your org's **Team** settings. Or temporarily turn **Confirm email** off (turn it back on before launch).
- **For real users:** set up **custom SMTP** at **Authentication → Emails → SMTP Settings**. Resend is the simplest: create a Resend account, verify a domain, create SMTP credentials, and paste them in. Supabase then applies a default of 30 emails/hour, adjustable under **Authentication → Rate Limits**.

✅ Check: Email provider is enabled, and you know which of the two testing options above you'll use.

---

## 6. Add the code (20 min)

The package `@supabase/supabase-js` is already in your `package.json`, so there's nothing to install.

> **How these files were checked:** I applied them to a copy of your project (with the `public/` duplicates removed), ran the TypeScript check, and ran `npm run build` — it passes, with or without the Supabase env vars set. I could not run them against a live Supabase project, so section 8 is the real test.
>
> **Shortcut:** the same files are also provided as a drop-in zip (`gabaynegosyo-supabase-dropin.zip`) laid out in your project's folder structure. Unzip it over the project root and skip the copy-pasting; keep reading for the dashboard steps.

**Files to add or replace (full contents below — copy each one whole):**

| # | File | Action |
|---|---|---|
| 6.1 | `database/supabase_setup.sql` | new (you already ran it in section 4) |
| 6.2 | `lib/supabase.ts` | new |
| 6.2a | `lib/demoAccounts.ts` | new (demo logins, section 10) |
| 6.3 | `lib/auth.tsx` | replace |
| 6.4 | `lib/db.ts` | replace |
| 6.5 | `app/login/page.tsx` | replace |
| 6.6 | `app/signup/page.tsx` | replace |
| 6.7 | `.gitignore` | replace |
| 6.8 | `.env.example` | replace |

`lib/email.ts` and `app/api/send-email/route.ts` are in section 9 (optional). The demo-accounts SQL is in section 10 (optional). **Everything else stays as is** — including `AuthGuard`, `AdminGuard`, `PremiumGate`, `Navbar` and every other page.

### 6.1 `database/supabase_setup.sql`

```sql
-- GabayNegosyo — Supabase setup (Stage 1: auth + per-user data)
-- Paste this whole file into Supabase → SQL Editor → New query → Run.
-- Safe to run once on a fresh project. Do NOT also run the old database/schema.sql
-- (it creates a separate `users` table that is not linked to Supabase Auth and has no security rules).

-- ════════════════════════════════════════════════════════════════════════
-- 1. profiles — one row per signed-up user (linked 1:1 to Supabase's auth.users)
-- ════════════════════════════════════════════════════════════════════════
create table public.profiles (
  id         uuid primary key references auth.users (id) on delete cascade,
  email      text not null,
  name       text not null default '',
  role       text not null default 'free' check (role in ('free', 'premium', 'admin')),
  is_demo    boolean not null default false,  -- true only for the shared public demo accounts
  created_at timestamptz not null default now()
);

-- Helper used by security rules: "is the person making this request a REAL admin?"
-- The shared demo admin (is_demo = true) deliberately does NOT count: its password is public,
-- so it must never get "read everything" powers. It only sees its own rows like any other user.
-- SECURITY DEFINER lets it read profiles without triggering the profiles rules again (avoids recursion).
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.profiles
    where id = (select auth.uid()) and role = 'admin' and not is_demo
  );
$$;
revoke execute on function public.is_admin() from public, anon;
grant  execute on function public.is_admin() to authenticated;

-- Auto-create a profile whenever someone signs up (email OR Google).
-- Role is ALWAYS 'free' here — it is never read from anything the user sends.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, email, name)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'name', new.raw_user_meta_data ->> 'full_name', '')
  );
  return new;
end;
$$;
revoke execute on function public.handle_new_user() from public, anon, authenticated;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

alter table public.profiles enable row level security;

create policy "profiles: read own row, admins read all"
  on public.profiles for select to authenticated
  using (id = (select auth.uid()) or public.is_admin());

create policy "profiles: update own row"
  on public.profiles for update to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

-- Column-level lock: a signed-in user may change their NAME only.
-- Nobody can change their own role from the browser — that is what stops self-promotion to admin.
revoke all on public.profiles from anon, authenticated;
grant select on public.profiles to authenticated;
grant update (name) on public.profiles to authenticated;

-- DEMO ONLY: lets the "Upgrade now (demo)" button work until real payments exist.
-- Delete this function when you add billing.
create or replace function public.upgrade_to_premium_demo()
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.profiles
  set role = 'premium'
  where id = (select auth.uid()) and role = 'free';
end;
$$;
revoke execute on function public.upgrade_to_premium_demo() from public, anon;
grant  execute on function public.upgrade_to_premium_demo() to authenticated;

-- ════════════════════════════════════════════════════════════════════════
-- 2. business_profiles — the wizard result, one per user.
--    Stored as JSON (`data`) because the wizard questions are still evolving;
--    it matches the BusinessProfile type in lib/types.ts exactly.
-- ════════════════════════════════════════════════════════════════════════
create table public.business_profiles (
  user_id    uuid primary key references auth.users (id) on delete cascade,
  data       jsonb not null,
  updated_at timestamptz not null default now()
);

alter table public.business_profiles enable row level security;
create policy "business_profiles: owner only"
  on public.business_profiles for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

revoke all on public.business_profiles from anon, authenticated;
grant select, insert, update, delete on public.business_profiles to authenticated;

-- ════════════════════════════════════════════════════════════════════════
-- 3. checklist_progress — which requirements the user has completed
--    (requirement_id refers to ids in data/requirements.json for now)
-- ════════════════════════════════════════════════════════════════════════
create table public.checklist_progress (
  user_id        uuid not null references auth.users (id) on delete cascade,
  requirement_id text not null,
  business_id    text not null,
  status         text not null default 'upcoming'
                 check (status in ('upcoming', 'due_soon', 'overdue', 'completed')),
  due_date       timestamptz not null,
  completed_at   timestamptz,
  primary key (user_id, requirement_id)
);

alter table public.checklist_progress enable row level security;
create policy "checklist_progress: owner only"
  on public.checklist_progress for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

revoke all on public.checklist_progress from anon, authenticated;
grant select, insert, update, delete on public.checklist_progress to authenticated;

-- ════════════════════════════════════════════════════════════════════════
-- 4. reminder_configs — per-requirement reminder settings (Premium feature)
-- ════════════════════════════════════════════════════════════════════════
create table public.reminder_configs (
  user_id        uuid not null references auth.users (id) on delete cascade,
  requirement_id text not null,
  enabled        boolean not null default false,
  days_before    int not null default 7 check (days_before in (7, 3, 1)),
  primary key (user_id, requirement_id)
);

alter table public.reminder_configs enable row level security;
create policy "reminder_configs: owner only"
  on public.reminder_configs for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

revoke all on public.reminder_configs from anon, authenticated;
grant select, insert, update, delete on public.reminder_configs to authenticated;

-- ════════════════════════════════════════════════════════════════════════
-- 5. sent_emails — log shown in the admin dashboard ("Recent reminder emails sent")
-- ════════════════════════════════════════════════════════════════════════
create table public.sent_emails (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users (id) on delete cascade,
  to_email   text not null,
  subject    text not null,
  body       text not null,
  sent_at    timestamptz not null default now()
);
create index idx_sent_emails_user_id on public.sent_emails (user_id);

alter table public.sent_emails enable row level security;
create policy "sent_emails: read own, admins read all"
  on public.sent_emails for select to authenticated
  using (user_id = (select auth.uid()) or public.is_admin());
create policy "sent_emails: insert own"
  on public.sent_emails for insert to authenticated
  with check (user_id = (select auth.uid()));

revoke all on public.sent_emails from anon, authenticated;
grant select, insert on public.sent_emails to authenticated;
```

### 6.2 `lib/supabase.ts` (new)

```ts
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * Single Supabase browser client for the whole app.
 *
 * Created lazily (on first use, in the browser) instead of at import time,
 * so `next build` on Vercel can still prerender pages even before you have
 * added the environment variables — the error only appears if the app is
 * actually run without them.
 *
 * NEXT_PUBLIC_SUPABASE_ANON_KEY accepts either the legacy "anon" key or the
 * newer "publishable" key (sb_publishable_...). Both are safe to expose in
 * the browser; your data is protected by Row Level Security, not by hiding
 * this key.
 */
let client: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient {
  if (client) return client;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !key) {
    throw new Error(
      "Supabase is not configured. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY " +
        "in .env.local (local) or in Vercel → Settings → Environment Variables (deployed), then restart/redeploy."
    );
  }

  client = createClient(url, key);
  return client;
}
```

### 6.2a `lib/demoAccounts.ts` (new)

Powers the optional one-click demo logins. It does nothing unless you switch it on in section 10.

```ts
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
```

### 6.3 `lib/auth.tsx` (replace)

```tsx
"use client";

import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import type { Session } from "@supabase/supabase-js";
import { getSupabase } from "./supabase";
import { db } from "./db";
import type { Role, User } from "./types";

/**
 * AUTH SERVICE (Supabase)
 * ───────────────────────
 * Email + password auth (and optional Google) through Supabase Auth.
 *
 * - The Supabase session lives in the browser (localStorage, managed by
 *   supabase-js and auto-refreshed).
 * - The app-level user (name, role) comes from the `profiles` table, which
 *   a database trigger fills in when someone signs up.
 * - After sign-in we hydrate the in-memory user data cache in lib/db.ts
 *   BEFORE flipping `loading` to false, so pages behind AuthGuard can keep
 *   reading db.* synchronously.
 */

export interface AuthResult {
  ok: boolean;
  error?: string;
  /** signup only: email confirmation is ON, so no session exists until the user clicks the link */
  needsEmailConfirmation?: boolean;
  user?: User;
}

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<AuthResult>;
  signup: (name: string, email: string, password: string) => Promise<AuthResult>;
  loginWithGoogle: () => Promise<AuthResult>;
  logout: () => Promise<void>;
  upgradeToPremium: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

async function loadUser(session: Session): Promise<User> {
  const supabase = getSupabase();
  const { data: profile } = await supabase
    .from("profiles")
    .select("id, email, name, role, created_at")
    .eq("id", session.user.id)
    .maybeSingle();

  const meta = session.user.user_metadata ?? {};
  const user: User = {
    id: session.user.id,
    email: profile?.email ?? session.user.email ?? "",
    name: profile?.name || meta.name || meta.full_name || (session.user.email ?? "").split("@")[0],
    role: (profile?.role as Role) ?? "free",
    createdAt: profile?.created_at ?? session.user.created_at,
  };

  try {
    await db.hydrate(user.id);
  } catch (err) {
    console.error("[auth] could not load your saved data:", err);
  }
  return user;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const currentId = useRef<string | null>(null);

  async function apply(session: Session | null): Promise<User | null> {
    if (!session) {
      currentId.current = null;
      db.clearUserData();
      setUser(null);
      return null;
    }
    const u = await loadUser(session);
    currentId.current = u.id;
    setUser(u);
    return u;
  }

  useEffect(() => {
    const supabase = getSupabase();
    let active = true;

    // 1) Restore an existing session on page load / refresh.
    supabase.auth.getSession().then(async ({ data }) => {
      if (active) await apply(data.session);
      if (active) setLoading(false);
    });

    // 2) React to later sign-in / sign-out (including from another tab).
    //    Don't call Supabase inside this callback directly (it can deadlock),
    //    so the work is deferred with setTimeout.
    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_OUT") {
        setTimeout(() => active && apply(null), 0);
      } else if (event === "SIGNED_IN" && session && session.user.id !== currentId.current) {
        setTimeout(() => active && apply(session), 0);
      }
    });

    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function login(email: string, password: string): Promise<AuthResult> {
    const { data, error } = await getSupabase().auth.signInWithPassword({ email, password });
    if (error) return { ok: false, error: error.message };
    const u = await apply(data.session);
    return { ok: true, user: u ?? undefined };
  }

  async function signup(name: string, email: string, password: string): Promise<AuthResult> {
    const { data, error } = await getSupabase().auth.signUp({
      email,
      password,
      options: {
        data: { name }, // copied into profiles.name by the database trigger
        emailRedirectTo: `${window.location.origin}/wizard`, // where the confirmation link lands
      },
    });
    if (error) return { ok: false, error: error.message };

    // Supabase returns an "obfuscated" user with no identities when the email is already registered.
    if (data.user && data.user.identities && data.user.identities.length === 0) {
      return { ok: false, error: "An account with this email already exists. Try logging in instead." };
    }

    // Email confirmation ON → no session yet.
    if (!data.session) return { ok: true, needsEmailConfirmation: true };

    // Email confirmation OFF → signed in immediately.
    const u = await apply(data.session);
    return { ok: true, user: u ?? undefined };
  }

  async function loginWithGoogle(): Promise<AuthResult> {
    const { error } = await getSupabase().auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/dashboard` },
    });
    // On success the browser navigates away to Google, so there is nothing else to do here.
    return error ? { ok: false, error: error.message } : { ok: true };
  }

  async function logout() {
    await getSupabase().auth.signOut();
    await apply(null);
  }

  /**
   * DEMO ONLY. There is no payment system yet, so this calls a database
   * function that flips the caller's own role from free → premium.
   * Delete this (and the SQL function) when you add real billing.
   */
  async function upgradeToPremium() {
    if (!user) return;
    const supabase = getSupabase();
    const { error } = await supabase.rpc("upgrade_to_premium_demo");
    if (error) {
      console.error("[auth] upgrade failed:", error.message);
      return;
    }
    setUser({ ...user, role: "premium" });
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, signup, loginWithGoogle, logout, upgradeToPremium }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
```

### 6.4 `lib/db.ts` (replace)

The content half (agencies / requirements / resources / tutorials and the admin CRUD) is unchanged from your version. The user-data half is what's new.

```ts
import agenciesSeed from "../data/agencies.json";
import requirementsSeed from "../data/requirements.json";
import resourcesSeed from "../data/resources.json";
import tutorialsSeed from "../data/tutorials.json";
import { getSupabase } from "./supabase";
import type {
  Agency,
  Requirement,
  ResourceItem,
  Tutorial,
  BusinessProfile,
  ChecklistItem,
  ReminderConfig,
  SentEmail,
} from "./types";

/**
 * DATA / SERVICE LAYER  (Supabase-backed user data)
 * ─────────────────────────────────────────────────
 * The UI still talks to this one object and still reads synchronously.
 * What changed under the hood:
 *
 *  USER DATA  (business profile, checklist progress, reminders, sent emails)
 *    - Lives in Supabase (tables protected by Row Level Security).
 *    - db.hydrate(userId) loads it into an in-memory cache right after login
 *      (lib/auth.tsx calls this), so reads below stay synchronous.
 *    - Every write updates the cache immediately AND is sent to Supabase
 *      (write-through). Failures are logged to the console.
 *    - db.clearUserData() empties the cache on logout.
 *
 *  CONTENT  (agencies, requirements, resources, tutorials + admin edits)
 *    - Unchanged for now: seed JSON in /data plus admin overrides in this
 *      browser's localStorage. Moving this to Supabase tables is the next
 *      stage — see docs/SUPABASE_SETUP.md, "What is still local".
 */

const STORE_KEY = "gn_store_v1";

/** localStorage store — now ONLY holds admin content overrides. */
interface Store {
  adminOverrides: {
    agencies: Record<string, Partial<Agency>>;
    requirements: Record<string, Partial<Requirement>>;
    resources: Record<string, Partial<ResourceItem>>;
    tutorials: Record<string, Partial<Tutorial>>;
    createdRequirements: Requirement[];
    createdResources: ResourceItem[];
    createdTutorials: Tutorial[];
    createdAgencies: Agency[];
  };
}

function emptyStore(): Store {
  return {
    adminOverrides: {
      agencies: {},
      requirements: {},
      resources: {},
      tutorials: {},
      createdRequirements: [],
      createdResources: [],
      createdTutorials: [],
      createdAgencies: [],
    },
  };
}

function readStore(): Store {
  if (typeof window === "undefined") return emptyStore();
  try {
    const raw = window.localStorage.getItem(STORE_KEY);
    if (!raw) return emptyStore();
    const parsed = JSON.parse(raw);
    return { adminOverrides: { ...emptyStore().adminOverrides, ...parsed.adminOverrides } };
  } catch {
    return emptyStore();
  }
}

function writeStore(store: Store) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORE_KEY, JSON.stringify(store));
}

/** In-memory copy of the signed-in user's rows from Supabase. */
interface UserData {
  businessProfile: BusinessProfile | null;
  checklistProgress: Record<string, ChecklistItem>;
  reminderConfigs: Record<string, ReminderConfig>;
  sentEmails: SentEmail[];
}

function emptyUserData(): UserData {
  return { businessProfile: null, checklistProgress: {}, reminderConfigs: {}, sentEmails: [] };
}

let currentUserId: string | null = null;
let userData: UserData = emptyUserData();

/** Fire-and-forget a Supabase write; log instead of crashing the UI if it fails. */
function persist(label: string, request: PromiseLike<{ error: { message: string } | null }>) {
  Promise.resolve(request)
    .then(({ error }) => {
      if (error) console.error(`[db] ${label} failed:`, error.message);
    })
    .catch((err) => console.error(`[db] ${label} failed:`, err));
}

function mergeWithOverrides<T extends { id: string; archived?: boolean }>(
  seed: T[],
  overrides: Record<string, Partial<T>>,
  created: T[]
): T[] {
  const seedMerged = seed.map((item) => ({ ...item, ...(overrides[item.id] ?? {}) }));
  return [...seedMerged, ...created].filter((item) => !item.archived);
}

export const db = {
  // ---- Content reads (agencies/requirements/resources/tutorials) ----
  getAgencies(): Agency[] {
    const s = readStore();
    return mergeWithOverrides(agenciesSeed as Agency[], s.adminOverrides.agencies, s.adminOverrides.createdAgencies);
  },
  getRequirements(): Requirement[] {
    const s = readStore();
    return mergeWithOverrides(
      requirementsSeed as unknown as Requirement[],
      s.adminOverrides.requirements,
      s.adminOverrides.createdRequirements
    );
  },
  getResources(): ResourceItem[] {
    const s = readStore();
    return mergeWithOverrides(resourcesSeed as ResourceItem[], s.adminOverrides.resources, s.adminOverrides.createdResources);
  },
  getTutorials(): Tutorial[] {
    const s = readStore();
    return mergeWithOverrides(tutorialsSeed as Tutorial[], s.adminOverrides.tutorials, s.adminOverrides.createdTutorials);
  },

  // ---- Admin CRUD ----
  upsertRequirement(req: Requirement) {
    const s = readStore();
    const isSeeded = (requirementsSeed as unknown as Requirement[]).some((r) => r.id === req.id);
    if (isSeeded) {
      s.adminOverrides.requirements[req.id] = req;
    } else {
      const idx = s.adminOverrides.createdRequirements.findIndex((r) => r.id === req.id);
      if (idx >= 0) s.adminOverrides.createdRequirements[idx] = req;
      else s.adminOverrides.createdRequirements.push(req);
    }
    writeStore(s);
  },
  archiveRequirement(id: string) {
    const s = readStore();
    const isSeeded = (requirementsSeed as unknown as Requirement[]).some((r) => r.id === id);
    if (isSeeded) s.adminOverrides.requirements[id] = { ...(s.adminOverrides.requirements[id] ?? {}), archived: true };
    else s.adminOverrides.createdRequirements = s.adminOverrides.createdRequirements.filter((r) => r.id !== id);
    writeStore(s);
  },
  upsertResource(res: ResourceItem) {
    const s = readStore();
    const isSeeded = (resourcesSeed as ResourceItem[]).some((r) => r.id === res.id);
    if (isSeeded) s.adminOverrides.resources[res.id] = res;
    else {
      const idx = s.adminOverrides.createdResources.findIndex((r) => r.id === res.id);
      if (idx >= 0) s.adminOverrides.createdResources[idx] = res;
      else s.adminOverrides.createdResources.push(res);
    }
    writeStore(s);
  },
  archiveResource(id: string) {
    const s = readStore();
    const isSeeded = (resourcesSeed as ResourceItem[]).some((r) => r.id === id);
    if (isSeeded) s.adminOverrides.resources[id] = { ...(s.adminOverrides.resources[id] ?? {}), archived: true };
    else s.adminOverrides.createdResources = s.adminOverrides.createdResources.filter((r) => r.id !== id);
    writeStore(s);
  },
  upsertTutorial(tut: Tutorial) {
    const s = readStore();
    const isSeeded = (tutorialsSeed as Tutorial[]).some((t) => t.id === tut.id);
    if (isSeeded) s.adminOverrides.tutorials[tut.id] = tut;
    else {
      const idx = s.adminOverrides.createdTutorials.findIndex((t) => t.id === tut.id);
      if (idx >= 0) s.adminOverrides.createdTutorials[idx] = tut;
      else s.adminOverrides.createdTutorials.push(tut);
    }
    writeStore(s);
  },
  archiveTutorial(id: string) {
    const s = readStore();
    const isSeeded = (tutorialsSeed as Tutorial[]).some((t) => t.id === id);
    if (isSeeded) s.adminOverrides.tutorials[id] = { ...(s.adminOverrides.tutorials[id] ?? {}), archived: true };
    else s.adminOverrides.createdTutorials = s.adminOverrides.createdTutorials.filter((t) => t.id !== id);
    writeStore(s);
  },
  upsertAgency(agency: Agency) {
    const s = readStore();
    const isSeeded = (agenciesSeed as Agency[]).some((a) => a.id === agency.id);
    if (isSeeded) s.adminOverrides.agencies[agency.id] = agency;
    else {
      const idx = s.adminOverrides.createdAgencies.findIndex((a) => a.id === agency.id);
      if (idx >= 0) s.adminOverrides.createdAgencies[idx] = agency;
      else s.adminOverrides.createdAgencies.push(agency);
    }
    writeStore(s);
  },
  archiveAgency(id: string) {
    const s = readStore();
    const isSeeded = (agenciesSeed as Agency[]).some((a) => a.id === id);
    if (isSeeded) s.adminOverrides.agencies[id] = { ...(s.adminOverrides.agencies[id] ?? {}), archived: true };
    else s.adminOverrides.createdAgencies = s.adminOverrides.createdAgencies.filter((a) => a.id !== id);
    writeStore(s);
  },

  // ---- Session lifecycle (called by lib/auth.tsx) ----
  async hydrate(userId: string): Promise<void> {
    const supabase = getSupabase();
    const [profileRes, progressRes, remindersRes, emailsRes] = await Promise.all([
      supabase.from("business_profiles").select("data").eq("user_id", userId).maybeSingle(),
      supabase.from("checklist_progress").select("*").eq("user_id", userId),
      supabase.from("reminder_configs").select("*").eq("user_id", userId),
      // RLS decides what comes back: a normal user gets their own rows, an admin gets everyone's.
      supabase.from("sent_emails").select("*").order("sent_at", { ascending: false }).limit(50),
    ]);

    const firstError = [profileRes, progressRes, remindersRes, emailsRes].find((r) => r.error)?.error;
    if (firstError) throw new Error(firstError.message);

    const next = emptyUserData();
    next.businessProfile = (profileRes.data?.data as BusinessProfile | undefined) ?? null;

    for (const row of progressRes.data ?? []) {
      next.checklistProgress[row.requirement_id] = {
        requirementId: row.requirement_id,
        businessId: row.business_id,
        status: row.status,
        dueDate: row.due_date,
        completedAt: row.completed_at ?? undefined,
      };
    }
    for (const row of remindersRes.data ?? []) {
      next.reminderConfigs[row.requirement_id] = {
        requirementId: row.requirement_id,
        enabled: row.enabled,
        daysBefore: row.days_before,
      };
    }
    next.sentEmails = (emailsRes.data ?? []).map((row) => ({
      id: row.id,
      to: row.to_email,
      subject: row.subject,
      body: row.body,
      sentAt: row.sent_at,
    }));

    currentUserId = userId;
    userData = next;
  },
  clearUserData() {
    currentUserId = null;
    userData = emptyUserData();
  },

  // ---- Business profile (one per user) ----
  getBusinessProfile(userId: string): BusinessProfile | null {
    return userId === currentUserId ? userData.businessProfile : null;
  },
  saveBusinessProfile(profile: BusinessProfile) {
    userData.businessProfile = profile;
    persist(
      "saveBusinessProfile",
      getSupabase()
        .from("business_profiles")
        .upsert({ user_id: profile.userId, data: profile, updated_at: new Date().toISOString() }, { onConflict: "user_id" })
    );
  },

  // ---- Checklist progress ----
  getProgress(): Record<string, ChecklistItem> {
    return userData.checklistProgress;
  },
  markComplete(requirementId: string, businessId: string, dueDate: string) {
    if (!currentUserId) return;
    const completedAt = new Date().toISOString();
    userData.checklistProgress[requirementId] = {
      requirementId,
      businessId,
      status: "completed",
      dueDate,
      completedAt,
    };
    persist(
      "markComplete",
      getSupabase().from("checklist_progress").upsert(
        {
          user_id: currentUserId,
          requirement_id: requirementId,
          business_id: businessId,
          status: "completed",
          due_date: dueDate,
          completed_at: completedAt,
        },
        { onConflict: "user_id,requirement_id" }
      )
    );
  },
  markIncomplete(requirementId: string) {
    if (!currentUserId) return;
    const item = userData.checklistProgress[requirementId];
    if (!item) return;
    delete item.completedAt;
    item.status = "upcoming";
    persist(
      "markIncomplete",
      getSupabase()
        .from("checklist_progress")
        .update({ status: "upcoming", completed_at: null })
        .eq("user_id", currentUserId)
        .eq("requirement_id", requirementId)
    );
  },

  // ---- Reminders ----
  getReminderConfig(requirementId: string): ReminderConfig {
    return userData.reminderConfigs[requirementId] ?? { requirementId, enabled: false, daysBefore: 7 };
  },
  setReminderConfig(config: ReminderConfig) {
    if (!currentUserId) return;
    userData.reminderConfigs[config.requirementId] = config;
    persist(
      "setReminderConfig",
      getSupabase().from("reminder_configs").upsert(
        {
          user_id: currentUserId,
          requirement_id: config.requirementId,
          enabled: config.enabled,
          days_before: config.daysBefore,
        },
        { onConflict: "user_id,requirement_id" }
      )
    );
  },
  getAllReminderConfigs(): ReminderConfig[] {
    return Object.values(userData.reminderConfigs);
  },

  // ---- Email log ----
  appendSentEmail(email: SentEmail) {
    userData.sentEmails.unshift(email);
    if (!currentUserId) return;
    persist(
      "appendSentEmail",
      getSupabase().from("sent_emails").insert({
        user_id: currentUserId,
        to_email: email.to,
        subject: email.subject,
        body: email.body,
        sent_at: email.sentAt,
      })
    );
  },
  getSentEmails(): SentEmail[] {
    return userData.sentEmails;
  },

  // ---- Reset (local only: clears admin content edits + the in-memory cache; does NOT delete Supabase rows) ----
  resetAll() {
    writeStore(emptyStore());
    userData = emptyUserData();
  },
};
```

### 6.5 `app/login/page.tsx` (replace)

```tsx
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "../../lib/auth";
import { DEMO_ACCOUNTS, DEMO_ENABLED, DEMO_PASSWORD } from "../../lib/demoAccounts";

const GOOGLE_ENABLED = process.env.NEXT_PUBLIC_ENABLE_GOOGLE_LOGIN === "true";

export default function LoginPage() {
  const { login, loginWithGoogle, user, loading } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Already signed in (or just finished signing in) → go to the right home screen.
  useEffect(() => {
    if (!loading && user) {
      router.replace(user.role === "admin" ? "/admin" : "/dashboard");
    }
  }, [user, loading, router]);

  async function handleSubmit() {
    setError(null);
    setSubmitting(true);
    const result = await login(email.trim(), password);
    setSubmitting(false);
    if (!result.ok) {
      setError(result.error ?? "Could not log in. Please try again.");
    }
    // On success, the effect above redirects once `user` is set.
  }

  async function handleDemo(demoEmail: string) {
    setError(null);
    setSubmitting(true);
    const result = await login(demoEmail, DEMO_PASSWORD);
    setSubmitting(false);
    if (!result.ok) {
      setError(
        `${result.error ?? "Could not log in."} If this is a fresh setup, the demo accounts may not be created in Supabase yet.`
      );
    }
  }

  async function handleGoogle() {
    setError(null);
    const result = await loginWithGoogle();
    if (!result.ok) setError(result.error ?? "Could not start Google sign-in.");
  }

  return (
    <main className="screen">
      <header className="intro">
        <h1>Log in</h1>
        <p>Welcome back. Log in to see your checklist and deadlines.</p>
      </header>

      <section className="question">
        <label className="question-label" htmlFor="email">
          Email
        </label>
        <input
          id="email"
          type="email"
          autoComplete="email"
          className="text-input"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@email.com"
        />
      </section>

      <section className="question">
        <label className="question-label" htmlFor="password">
          Password
        </label>
        <input
          id="password"
          type="password"
          autoComplete="current-password"
          className="text-input"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && email.trim() && password && !submitting) handleSubmit();
          }}
        />
      </section>

      {error && (
        <p role="alert" className="hint" style={{ color: "var(--red-text)" }}>
          {error}
        </p>
      )}

      <button
        type="button"
        className="primary-btn"
        style={{ marginTop: 10 }}
        disabled={!email.trim() || !password || submitting}
        onClick={handleSubmit}
      >
        {submitting ? "Logging in…" : "Log in"}
      </button>

      {GOOGLE_ENABLED && (
        <button type="button" className="secondary-btn" style={{ marginTop: 10 }} onClick={handleGoogle}>
          Continue with Google
        </button>
      )}

      {DEMO_ENABLED && (
        <section className="demo-account-list">
          <p className="hint">Just looking around? Try a demo account:</p>
          {DEMO_ACCOUNTS.map((a) => (
            <button
              key={a.email}
              type="button"
              className="option-btn demo-account-btn"
              disabled={submitting}
              onClick={() => handleDemo(a.email)}
            >
              <strong>{a.role.toUpperCase()}</strong> — {a.name}
              <br />
              <span className="hint">{a.blurb}</span>
            </button>
          ))}
        </section>
      )}

      <p className="hint" style={{ marginTop: 20 }}>
        New here? <Link href="/signup">Create a free account</Link>
      </p>
    </main>
  );
}
```

### 6.6 `app/signup/page.tsx` (replace)

```tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "../../lib/auth";

const MIN_PASSWORD_LENGTH = 8;
const GOOGLE_ENABLED = process.env.NEXT_PUBLIC_ENABLE_GOOGLE_LOGIN === "true";

export default function SignupPage() {
  const { signup, loginWithGoogle } = useAuth();
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [checkEmailFor, setCheckEmailFor] = useState<string | null>(null);

  const canSubmit = name.trim() && email.trim() && password.length >= MIN_PASSWORD_LENGTH && !submitting;

  async function handleSubmit() {
    if (!canSubmit) return;
    setError(null);
    setSubmitting(true);
    const result = await signup(name.trim(), email.trim(), password);
    setSubmitting(false);

    if (!result.ok) {
      setError(result.error ?? "Could not create your account. Please try again.");
      return;
    }
    if (result.needsEmailConfirmation) {
      setCheckEmailFor(email.trim());
      return;
    }
    router.push("/wizard");
  }

  async function handleGoogle() {
    setError(null);
    const result = await loginWithGoogle();
    if (!result.ok) setError(result.error ?? "Could not start Google sign-in.");
  }

  if (checkEmailFor) {
    return (
      <main className="screen">
        <header className="intro">
          <h1>Check your email</h1>
          <p>
            We sent a confirmation link to <strong>{checkEmailFor}</strong>. Open it on this device to finish creating
            your account — you&apos;ll land on the setup wizard.
          </p>
        </header>
        <p className="hint">
          Nothing after a few minutes? Check your spam folder, or <Link href="/login">go to log in</Link> once
          you&apos;ve confirmed.
        </p>
      </main>
    );
  }

  return (
    <main className="screen">
      <header className="intro">
        <h1>Create your account</h1>
        <p>Free forever — upgrade later if you want the full detail.</p>
      </header>

      <section className="question">
        <label className="question-label" htmlFor="name">
          Your name
        </label>
        <input
          id="name"
          autoComplete="name"
          className="text-input"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Juana Dela Cruz"
        />
      </section>

      <section className="question">
        <label className="question-label" htmlFor="email">
          Email
        </label>
        <input
          id="email"
          type="email"
          autoComplete="email"
          className="text-input"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@email.com"
        />
      </section>

      <section className="question">
        <label className="question-label" htmlFor="password">
          Password
        </label>
        <input
          id="password"
          type="password"
          autoComplete="new-password"
          className="text-input"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <p className="hint">At least {MIN_PASSWORD_LENGTH} characters.</p>
      </section>

      {error && (
        <p role="alert" className="hint" style={{ color: "var(--red-text)" }}>
          {error}
        </p>
      )}

      <button type="button" className="primary-btn" disabled={!canSubmit} onClick={handleSubmit}>
        {submitting ? "Creating account…" : "Create account & start wizard"}
      </button>

      {GOOGLE_ENABLED && (
        <button type="button" className="secondary-btn" style={{ marginTop: 10 }} onClick={handleGoogle}>
          Sign up with Google
        </button>
      )}

      <p className="hint" style={{ marginTop: 20 }}>
        Already have an account? <Link href="/login">Log in</Link>
      </p>
    </main>
  );
}
```

### 6.7 `.gitignore` (replace)

```gitignore
# dependencies
node_modules

# next.js build output
.next
out
next-env.d.ts
*.tsbuildinfo

# secrets — never commit these
.env
.env.local
.env.*.local

# vercel
.vercel

# os / editor
.DS_Store
Thumbs.db
```

### 6.8 `.env.example` (replace)

```bash
# GabayNegosyo — environment variables
# Copy this file to .env.local (local dev) and fill in the values.
# On Vercel, add the same names under Project → Settings → Environment Variables.
# NEVER commit .env.local, and never put secrets in a variable that starts with NEXT_PUBLIC_
# (those are bundled into the browser).

# ── Supabase (required) ─────────────────────────────────────────────────
# Supabase dashboard → your project → Connect (or Settings → API Keys).
# The key below is the PUBLISHABLE key (sb_publishable_...) or the legacy "anon" key.
# Both are safe in the browser; Row Level Security protects the data.
# DO NOT use the secret / service_role key here.
NEXT_PUBLIC_SUPABASE_URL=https://<your-project-ref>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<your-publishable-or-anon-key>

# ── Google sign-in (optional) ───────────────────────────────────────────
# Set to "true" only AFTER the Google provider is enabled in Supabase.
# The Google client ID/secret go inside the Supabase dashboard, not here.
NEXT_PUBLIC_ENABLE_GOOGLE_LOGIN=false

# ── Demo accounts (optional) ────────────────────────────────────────────
# One-click FREE / PREMIUM / ADMIN demo logins on the login page.
# ⚠️ The password below ends up in the browser bundle, i.e. it is PUBLIC.
#    Use a throwaway password you use nowhere else, and turn this off for a real launch.
#    It must match the password you set when creating the 3 demo users in Supabase.
NEXT_PUBLIC_ENABLE_DEMO_ACCOUNTS=false
NEXT_PUBLIC_DEMO_PASSWORD=

# ── Reminder emails (optional, server-side only) ────────────────────────
# Leave both empty to stay in mock mode (emails are logged, not delivered).
RESEND_API_KEY=
EMAIL_FROM=GabayNegosyo <reminders@your-verified-domain>
```

### 6.9 Create your local env file

```bash
cp .env.example .env.local
```

Edit `.env.local` and fill in the two Supabase values from section 3 (leave the rest as-is for now):

```bash
NEXT_PUBLIC_SUPABASE_URL=https://<your-project-ref>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<your-publishable-or-anon-key>
```

Then:

```bash
npm install
npm run dev
```

✅ Check: <http://localhost:3000/login> shows an email + password form (no more demo-account buttons), and `npm run build` finishes without errors.

---

## 7. Make yourself the admin

Admins can't be created from the app (by design). After you sign up once through the app:

1. Supabase → **SQL Editor** → run:

```sql
update public.profiles
set role = 'admin'
where email = '<your-email>';
```

2. In the app, **log out and log in again**. You should land on `/admin`.

To grant Premium the same way: `set role = 'premium'`.

---

## 8. Test it locally (10 min)

Work through this list in order:

1. **Sign up** at `/signup` with a new email + password.
   - Confirm email **on** → you see "Check your email". Click the link in the email; you land on `/wizard`.
   - Confirm email **off** → you go straight to `/wizard`.
2. Supabase → **Table Editor → `profiles`**: your row exists with `role = free` and the name you typed.
3. **Finish the wizard.** Table Editor → `business_profiles`: one row with your answers in `data`.
4. Open a requirement and **mark it complete**. Table Editor → `checklist_progress`: a row appears.
5. **Log out, then log in again** — your dashboard and checklist are still there.
6. Open the app in a **private window or on your phone**, log in with the same account — same data. (This is the proof it's no longer `localStorage`.)
7. **Account → Upgrade now (demo)** → your `profiles.role` becomes `premium`.
8. **Wrong password** shows an error message under the form.
9. *(Optional security check)* In **SQL Editor**, replace `<user-uuid>` with your row's `id` from `profiles`:

```sql
begin;
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"<user-uuid>"}', true);
update public.profiles set role = 'admin' where id = '<user-uuid>';  -- should FAIL with a permission error
rollback;
```

If something writes silently but nothing shows up in the tables, open the browser DevTools **Console** — failed writes are logged there as `[db] … failed: …`.

---

## 9. Email for reminders (optional — do after auth works)

This replaces the README's "Email configuration" step. Sending happens on a **server route**, so the provider key never reaches the browser.

**Behaviour:**
- No provider key set → **mock mode** (works exactly like today: the email is logged, nothing is delivered).
- Provider key set → the email is really sent, but **only** to the logged-in user's own address, and **only** if they're Premium/Admin. (These checks are what stop the route from becoming an open mail relay — don't remove them.)

### 9.1 Get a Resend key
1. Create an account at <https://resend.com>.
2. Add and verify a **domain** you own (DNS records). Until a domain is verified, Resend limits you to sending to your own account email using its test sender (`onboarding@resend.dev`) — fine for a first test; check Resend's docs for the current rules.
3. Create an **API key**.

### 9.2 Add to `.env.local` (and later Vercel)
```bash
RESEND_API_KEY=<your-resend-api-key>
EMAIL_FROM=GabayNegosyo <reminders@your-verified-domain>
```
These are **not** `NEXT_PUBLIC_` on purpose.

### 9.3 `lib/email.ts` (replace)

```ts
import type { SentEmail } from "./types";
import { db } from "./db";
import { getSupabase } from "./supabase";

/**
 * Email service layer (reminders).
 *
 * The browser never talks to the email provider directly — that would expose
 * the provider's API key. Instead it calls our own server route
 * (app/api/send-email/route.ts), which:
 *   1. verifies the caller's Supabase login,
 *   2. checks they are Premium/Admin,
 *   3. sends to the caller's OWN email address only,
 *   4. falls back to "mock" (nothing actually sent) if no provider key is set.
 *
 * The `to` argument is kept so existing callers don't change, but the server
 * ignores it and always uses the signed-in user's verified email.
 */
export async function sendEmail(to: string, subject: string, body: string): Promise<SentEmail> {
  const { data } = await getSupabase().auth.getSession();
  const token = data.session?.access_token;
  if (!token) throw new Error("You need to be logged in to send email.");

  const res = await fetch("/api/send-email", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify({ subject, body }),
  });

  if (!res.ok) {
    const payload = await res.json().catch(() => ({}));
    throw new Error(payload.error ?? `Email request failed (${res.status})`);
  }

  const record: SentEmail = {
    id: `email-${Date.now()}`,
    to,
    subject,
    body,
    sentAt: new Date().toISOString(),
  };
  db.appendSentEmail(record); // logged to Supabase so the admin dashboard can show it
  return record;
}

export function buildReminderEmail(requirementName: string, dueDateLabel: string, daysBefore: number) {
  return {
    subject: `Reminder: ${requirementName} due ${dueDateLabel}`,
    body: `This is a reminder that "${requirementName}" is due on ${dueDateLabel} (${daysBefore} day(s) from now). Log in to GabayNegosyo to review the requirement.`,
  };
}
```

### 9.4 `app/api/send-email/route.ts` (new — create the folders)

```ts
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

/**
 * POST /api/send-email   body: { subject: string, body: string }
 * Header: Authorization: Bearer <Supabase access token>
 *
 * Server-side only. Uses RESEND_API_KEY / EMAIL_FROM (NOT prefixed with
 * NEXT_PUBLIC_, so they never reach the browser).
 *
 * Demo accounts (profiles.is_demo) always get mock mode: their addresses are fake,
 * and real sends to fake addresses would bounce and hurt your sender reputation.
 *
 * Safety rules baked in — do not remove them, or this becomes an open mail relay:
 *   - caller must be logged in (token verified with Supabase)
 *   - caller must be premium or admin
 *   - the recipient is ALWAYS the caller's own verified email
 */
export async function POST(req: Request) {
  const token = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!token) return NextResponse.json({ error: "Not logged in." }, { status: 401 });

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) {
    return NextResponse.json({ error: "Server is missing Supabase configuration." }, { status: 500 });
  }

  const supabase = createClient(url, anonKey, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: auth, error: authError } = await supabase.auth.getUser(token);
  if (authError || !auth.user?.email) {
    return NextResponse.json({ error: "Invalid or expired session." }, { status: 401 });
  }

  // Read the role through RLS, using the caller's own token.
  const { data: profile } = await supabase.from("profiles").select("role, is_demo").eq("id", auth.user.id).maybeSingle();
  if (!profile || (profile.role !== "premium" && profile.role !== "admin")) {
    return NextResponse.json({ error: "Email reminders are a Premium feature." }, { status: 403 });
  }

  let payload: { subject?: unknown; body?: unknown };
  try {
    payload = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }
  const { subject, body } = payload;
  if (typeof subject !== "string" || typeof body !== "string" || !subject.trim() || !body.trim()) {
    return NextResponse.json({ error: "subject and body are required." }, { status: 400 });
  }
  if (subject.length > 200 || body.length > 5000) {
    return NextResponse.json({ error: "subject or body too long." }, { status: 400 });
  }

  if (profile.is_demo) {
    return NextResponse.json({ ok: true, mode: "mock" });
  }

  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM;
  if (!apiKey || !from) {
    // Mock mode: nothing is sent, the app still logs the email like before.
    return NextResponse.json({ ok: true, mode: "mock" });
  }

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from, to: [auth.user.email], subject, text: body }),
  });

  if (!res.ok) {
    console.error("[send-email] provider error", res.status, await res.text());
    return NextResponse.json({ error: "The email provider rejected the request." }, { status: 502 });
  }
  return NextResponse.json({ ok: true, mode: "sent" });
}
```

✅ Check: log in as a Premium user → **Deadlines** → send a test reminder. Mock mode: it appears in the admin "Recent reminder emails" panel. Resend configured: it arrives in your inbox.

---

## 10. Demo accounts alongside real login and Google (optional)

Goal: on the login page, visitors can **(a)** log in with their own email + password, **(b)** continue with Google, **or (c)** click a ready-made **FREE / PREMIUM / ADMIN** demo account. All three live side by side.

The demo accounts are **real Supabase users** created once by you — not a separate fake login system — so they go through the same auth, database and security rules as everyone else.

> ⚠️ **Read before enabling.** The demo password is exposed to anyone who opens your site's JavaScript (it has to be, so the buttons can log in). So treat these accounts as **public**:
> - use a **throwaway password** you use nowhere else;
> - the **demo admin is sandboxed by the database**: profiles carry an `is_demo` flag and `is_admin()` ignores demo accounts, so the demo admin sees only its own data — never other users' profiles or the sent-email log, and later it can't write shared content;
> - reminder emails for demo accounts are **always mock** (their addresses are fake);
> - switch the whole thing **off** for a real launch (last step below).

### 10.1 Choose the demo password
Pick something like `Demo-<random words>-2026`. You'll use it twice: when creating the users, and in `NEXT_PUBLIC_DEMO_PASSWORD`. Do not reuse a real password.

### 10.2 Create the three users in Supabase
**Authentication → Users → Add user → Create new user** (wording may vary slightly). For each row below, enter the email and your demo password and **tick "Auto Confirm User"** (so no confirmation email is needed):

| Email | Will become |
|---|---|
| `free@demo.gabaynegosyo.ph` | FREE |
| `premium@demo.gabaynegosyo.ph` | PREMIUM |
| `admin@demo.gabaynegosyo.ph` | ADMIN |

The signup trigger creates a `free` profile for each one automatically.

### 10.3 Mark them as demo accounts and set their roles
Run this in **SQL Editor → New query** (safe to run more than once; it also adds the `is_demo` column and updates `is_admin()` if you ran an older version of `supabase_setup.sql`):

```sql
-- GabayNegosyo — demo accounts (free / premium / admin)
-- Run in Supabase → SQL Editor AFTER you have created the 3 users in
-- Authentication → Users (see docs/SUPABASE_SETUP.md, "Demo accounts").
-- Idempotent: safe to run again. Also safe if you ran an older supabase_setup.sql
-- that did not have the is_demo column yet.

-- ── Part A: make sure the sandbox pieces exist ──────────────────────────
alter table public.profiles add column if not exists is_demo boolean not null default false;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.profiles
    where id = (select auth.uid()) and role = 'admin' and not is_demo
  );
$$;

-- ── Part B: mark the three users as demo accounts ───────────────────────
-- (the emails must match lib/demoAccounts.ts)
update public.profiles set role = 'free',    is_demo = true, name = 'Juana Dela Cruz'
  where email = 'free@demo.gabaynegosyo.ph';
update public.profiles set role = 'premium', is_demo = true, name = 'Marco Santos'
  where email = 'premium@demo.gabaynegosyo.ph';
update public.profiles set role = 'admin',   is_demo = true, name = 'GabayNegosyo Admin'
  where email = 'admin@demo.gabaynegosyo.ph';

-- Should return exactly 3 rows: free / premium / admin, all is_demo = true.
select email, name, role, is_demo from public.profiles where is_demo order by role;

-- ── Part C: RESET the demo accounts (run whenever you want a clean demo) ─
-- Wipes everything visitors did on the demo accounts and restores their roles.
-- Uncomment the block below and run it; leave it commented for the first setup.
--
-- do $$
-- declare demo_ids uuid[];
-- begin
--   select array_agg(id) into demo_ids from public.profiles where is_demo;
--   delete from public.business_profiles  where user_id = any(demo_ids);
--   delete from public.checklist_progress where user_id = any(demo_ids);
--   delete from public.reminder_configs   where user_id = any(demo_ids);
--   delete from public.sent_emails        where user_id = any(demo_ids);
--   update public.profiles set role = 'free'    where email = 'free@demo.gabaynegosyo.ph';
--   update public.profiles set role = 'premium' where email = 'premium@demo.gabaynegosyo.ph';
--   update public.profiles set role = 'admin'   where email = 'admin@demo.gabaynegosyo.ph';
-- end $$;
```

✅ Check: the final `select` shows exactly 3 rows — `free`, `premium`, `admin` — all with `is_demo = true`. If it shows 0 rows, the users weren't created yet (10.2) or the emails don't match.

### 10.4 Turn the buttons on
Add to `.env.local`:

```bash
NEXT_PUBLIC_ENABLE_DEMO_ACCOUNTS=true
NEXT_PUBLIC_DEMO_PASSWORD=<your-demo-password>
```

Restart `npm run dev`. Both variables are required; if the password is empty the demo list stays hidden. (For Google login to also show, `NEXT_PUBLIC_ENABLE_GOOGLE_LOGIN=true` from section 11.)

### 10.5 Test each account
1. `/login` now shows the normal form, the Google button (if enabled), and a **"Try a demo account"** list.
2. **FREE** → `/dashboard`; locked features show the Premium gate, and Account has "Upgrade now (demo)".
3. **PREMIUM** → Deadlines reminders, tutorials and the penalty simulator are unlocked.
4. **ADMIN** → `/admin`. You'll see the admin dashboard, but the sent-email panel only shows this account's own entries — that's the sandbox working.
5. Your own real account (sections 7–8) still works and is still separate.

### 10.6 Things to expect
- **Demo accounts are shared.** Two visitors on the FREE demo see and overwrite each other's wizard answers and checklist. That's normal for a demo.
- **"Upgrade now (demo)" on the FREE account turns it into premium** until you reset it.
- **Reset** whenever you want a clean demo: in `supabase_demo_accounts.sql`, uncomment **Part C** and run it. It wipes demo users' data and restores their roles.
- The demo admin's content edits (agencies/requirements) are still browser-local, like every admin's until the content-tables stage (section 14).

### 10.7 Before a real public launch
Set `NEXT_PUBLIC_ENABLE_DEMO_ACCOUNTS=false` (or remove it) and **redeploy** — it's baked in at build time. To be thorough, also delete the three users under **Authentication → Users** so the public password can't be used at all.

---

## 11. Google login (optional)

Replaces the README's "Google OAuth setup". The code is already in `auth.tsx` and the login/signup pages; you only need to configure things and flip a switch.

1. **Google Cloud Console** → create/select a project → **APIs & Services → OAuth consent screen** → configure it (External, app name, support email).
2. **Credentials → Create credentials → OAuth client ID → Web application.**
3. In Supabase go to **Authentication → Sign In / Providers → Google**, switch it on, and **copy the callback URL** it shows (it looks like `https://<your-project-ref>.supabase.co/auth/v1/callback`).
4. Back in Google Cloud, add:
   - **Authorized JavaScript origins:** `http://localhost:3000` and (later) `https://<your-app>.vercel.app`
   - **Authorized redirect URIs:** the Supabase callback URL from step 3
5. Copy the Google **Client ID** and **Client secret** into the Supabase Google provider and save.
6. Set `NEXT_PUBLIC_ENABLE_GOOGLE_LOGIN=true` in `.env.local` (and on Vercel), restart `npm run dev`.

The "Continue with Google" buttons then appear. New Google users get a `profiles` row automatically (the trigger reads their Google name).

> While the Google consent screen is in **Testing** status only listed test users can sign in. Publish it when you launch.

---

## 12. Deploy to Vercel

1. **Push to GitHub** (make sure `.env.local` is *not* committed — `git status` shouldn't list it):
   ```bash
   git init
   git add .
   git commit -m "GabayNegosyo with Supabase backend"
   # create an empty repo on GitHub, then:
   git remote add origin https://github.com/<your-username>/<your-repo>.git
   git push -u origin main
   ```
2. <https://vercel.com/new> → **Import** the repo. Framework is auto-detected as **Next.js**; leave build settings alone.
3. Before clicking Deploy, open **Environment Variables** and add (for Production, Preview and Development):

   | Name | Value |
   |---|---|
   | `NEXT_PUBLIC_SUPABASE_URL` | `https://<your-project-ref>.supabase.co` |
   | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `<your-publishable-or-anon-key>` |
   | `NEXT_PUBLIC_ENABLE_GOOGLE_LOGIN` | `true` or `false` |
   | `NEXT_PUBLIC_ENABLE_DEMO_ACCOUNTS` *(optional)* | `true` for a demo/staging site, `false` for a real launch |
   | `NEXT_PUBLIC_DEMO_PASSWORD` *(optional)* | `<your-demo-password>` (public — see section 10) |
   | `RESEND_API_KEY` *(optional)* | `<your-resend-api-key>` |
   | `EMAIL_FROM` *(optional)* | `GabayNegosyo <reminders@your-verified-domain>` |

   `NEXT_PUBLIC_*` values are baked in **at build time**, so if you change them later you must **redeploy**.
4. Click **Deploy**. Note your URL: `https://<your-app>.vercel.app`.
5. **Go back to Supabase → Authentication → URL Configuration** and set:
   - **Site URL:** `https://<your-app>.vercel.app`
   - **Redirect URLs** (add all):
     - `https://<your-app>.vercel.app/**`
     - `http://localhost:3000/**`
     - `https://*-<your-vercel-team-slug>.vercel.app/**` ← lets Vercel preview deployments work
6. If you use Google login, add `https://<your-app>.vercel.app` to the **Authorized JavaScript origins** in Google Cloud.
7. Repeat the section 8 tests on the live URL, including the confirmation email link (it must open the *Vercel* URL, not localhost).

---

## 13. Troubleshooting

| Symptom | Likely cause / fix |
|---|---|
| "Supabase is not configured…" | `.env.local` missing/misnamed (restart `npm run dev`), or Vercel env vars missing — add them and **redeploy**. |
| Signup: "Email address not authorized" or rate-limit error | You're on Supabase's built-in email sender (section 5.3). Use a team email, turn Confirm email off temporarily, or set up custom SMTP. |
| Login: "Email not confirmed" | The user hasn't clicked the confirmation link yet. |
| Confirmation link opens `localhost` on the live site | **Site URL** in Supabase is still `http://localhost:3000` (section 12 step 5). |
| Confirmation link says invalid/redirect not allowed | The URL isn't in **Redirect URLs**. Add it (with `/**`). |
| `permission denied for table …` in the console | Section 4's SQL didn't fully run. Re-run it on a fresh project, or check the `grant` lines. |
| Role stays `free` after you set admin in SQL | Log out and back in; also confirm the `email` in your `update` matches the account. |
| Google: `redirect_uri_mismatch` | The redirect URI in Google Cloud must exactly equal the callback URL shown in Supabase's Google provider panel. |
| Demo buttons don't appear | Both `NEXT_PUBLIC_ENABLE_DEMO_ACCOUNTS=true` **and** a non-empty `NEXT_PUBLIC_DEMO_PASSWORD` are required; restart dev / **redeploy** on Vercel. |
| Demo button says "Invalid login credentials" | The 3 users weren't created (10.2), or their password differs from `NEXT_PUBLIC_DEMO_PASSWORD`. |
| Demo admin lands on `/admin` but sees almost nothing | Expected — the sandbox hides other users' data from the demo admin. Use your own real admin account to see everything. |
| Vercel build fails | Run `npm run build` locally first and fix errors there. |
| App stops working after a quiet week | Free-plan Supabase projects can be paused for inactivity; restore it from the dashboard (Pro plan avoids pausing). |

---

## 14. What is still local — and the next stages

This guide moves **users and per-user data** to Supabase. Deliberately **not** moved yet:

- **Admin content edits** (agencies, requirements, resources, tutorials). Content still comes from `data/*.json`, and admin edits are still saved in *that admin's browser*. Other users won't see them. Next stage: create content tables (start from the old `database/schema.sql`, but add the missing columns — `instructions`, `compliance_stage`, `content_source`, `tutorial_id`, and the wizard-related fields — to match `lib/types.ts`), seed them from `data/*.json`, and add admin-only write policies using `public.is_admin()`.
- **Automatic reminders (7 / 3 / 1 days before).** Needs a scheduled job (for example Vercel Cron calling a server route, or Supabase scheduled Edge Functions) that reads `reminder_configs`, works out due dates, and sends through the same provider. Check your Vercel plan's cron limits first.
- **Real payments** for Premium. Remove `upgrade_to_premium_demo()` and the demo button when you add billing.
- **Forgot-password flow.** Supabase supports it (`auth.resetPasswordForEmail`); it needs one small page at `/reset-password`.

### Known limits of the cache + write-through approach

- If the page can't reach Supabase at login, the app logs an error and shows empty data instead of blocking. Saving the wizard again in that state could overwrite your saved profile. If this bothers you, make `loadUser` in `auth.tsx` fail closed (show an error screen) instead.
- A failed write is only logged to the console; the UI still shows the change until the next reload.
- Data loads at login/refresh. If the same account changes data on two devices, the other device sees it after its next reload.

### Before you open it to the public

You're storing business details such as projected sales and expenses. Keep RLS enabled on every table you add (a table without it is readable by anyone with the public key), and consider adding a short privacy notice.
