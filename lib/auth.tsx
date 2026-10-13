"use client";

import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import type { Session } from "@supabase/supabase-js";
import { getSupabase } from "./supabase";
import { db } from "./db";
import { friendlyAuthError, friendlyEmailAuthError } from "./authErrors";
import { authRedirectUrl } from "./authRedirect";
import {
  DEMO_ACCOUNTS,
  DEMO_ENABLED,
  demoUserId,
  getActiveDemoRole,
  setActiveDemoRole,
  wipeDemoStorage,
  type DemoRole,
} from "./demoAccounts";
import { demoSeedProfile } from "./demoSeed";
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
  /** Resolves true when the role change was saved; false when it was not. */
  upgradeToPremium: () => Promise<boolean>;
  /** Browser-only demo session. No Supabase user, profile or password is involved. */
  startDemo: (role: DemoRole) => void;
  /** Resets this browser's demo data to the sample records. */
  resetDemo: () => void;
  /** Permanently deletes the signed-in real account through the server route. */
  deleteAccount: (password?: string) => Promise<{ ok: boolean; error?: string }>;
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

  function applyDemo(role: DemoRole): User {
    const account = DEMO_ACCOUNTS.find((a) => a.role === role)!;
    const id = demoUserId(role);
    db.enterDemo(id, demoSeedProfile(id));
    const demoUser: User = { id, email: account.email, name: account.name, role, createdAt: new Date(0).toISOString(), isDemo: true };
    currentId.current = id;
    setUser(demoUser);
    return demoUser;
  }

  async function apply(session: Session | null): Promise<User | null> {
    if (!session) {
      currentId.current = null;
      db.clearUserData();
      setUser(null);
      return null;
    }
    // A real sign-in always replaces any demo session: demo data never carries over.
    if (getActiveDemoRole()) {
      setActiveDemoRole(null);
      db.clearUserData();
    }
    const u = await loadUser(session);
    currentId.current = u.id;
    setUser(u);
    return u;
  }

  useEffect(() => {
    let supabase: ReturnType<typeof getSupabase>;
    try {
      supabase = getSupabase();
    } catch (err) {
      // Supabase env vars missing/invalid: the public pages (landing, legal,
      // login form) must still render. Nobody can be signed in, so behave as
      // signed-out instead of throwing out of the root provider.
      console.error("[auth]", err instanceof Error ? err.message : err);
      const demoRole = DEMO_ENABLED ? getActiveDemoRole() : null;
      if (demoRole) applyDemo(demoRole);
      setLoading(false);
      return;
    }
    let active = true;

    // 1) Restore an existing session on page load / refresh.
    supabase.auth
      .getSession()
      .then(async ({ data }) => {
        if (!active) return;
        if (data.session) {
          await apply(data.session);
        } else if (DEMO_ENABLED && getActiveDemoRole()) {
          applyDemo(getActiveDemoRole()!); // only when no real session exists
        } else {
          setActiveDemoRole(null);
          await apply(null);
        }
      })
      .catch((err) => console.error("[auth] could not restore your session:", err))
      .finally(() => {
        if (active) setLoading(false); // never leave the app stuck on "Loading…"
      });

    // 2) React to later sign-in / sign-out (including from another tab).
    //    Don't call Supabase inside this callback directly (it can deadlock),
    //    so the work is deferred with setTimeout.
    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_OUT") {
        // Signing out of a real account must not tear down an unrelated demo session.
        setTimeout(() => active && !currentId.current?.startsWith("demo-") && apply(null), 0);
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
    if (error) return { ok: false, error: friendlyEmailAuthError(error.message) };
    const u = await apply(data.session);
    return { ok: true, user: u ?? undefined };
  }

  async function signup(name: string, email: string, password: string): Promise<AuthResult> {
    const redirectTo = authRedirectUrl("/auth/confirmed");
    if (!redirectTo) {
      return { ok: false, error: "This site's public web address is not configured, so we cannot send a safe confirmation link. Please contact the site owner." };
    }
    const { data, error } = await getSupabase().auth.signUp({
      email,
      password,
      options: {
        data: { name }, // copied into profiles.name by the database trigger
        emailRedirectTo: redirectTo, // validated public site URL + allow-listed route; must also be allowed in Supabase
      },
    });
    if (error) return { ok: false, error: friendlyEmailAuthError(error.message) };

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
    try {
      const redirectTo = authRedirectUrl("/login");
      if (!redirectTo) return { ok: false, error: friendlyAuthError("redirect invalid") };
      const { error } = await getSupabase().auth.signInWithOAuth({
        provider: "google",
        // Come back to /login: it shows any error from the round-trip and routes
        // signed-in users onward (new users to the wizard, returning users to the dashboard).
        options: { redirectTo, queryParams: { prompt: "select_account" } },
      });
      // On success the browser navigates away to Google, so there is nothing else to do here.
      return error ? { ok: false, error: friendlyAuthError(error.message) } : { ok: true };
    } catch (err) {
      return { ok: false, error: friendlyAuthError(err instanceof Error ? err.message : String(err)) };
    }
  }

  async function logout() {
    if (user?.isDemo) {
      // Exit demo: clear only the demo session. A real Supabase session (if any) is untouched.
      setActiveDemoRole(null);
      wipeDemoStorage();
      db.clearUserData();
      currentId.current = null;
      setUser(null);
      return;
    }
    await getSupabase().auth.signOut();
    await apply(null);
    // K3/L13: purge the service worker's runtime cache so nothing from
    // this session can be served to whoever uses this device next.
    if (typeof navigator !== "undefined" && navigator.serviceWorker?.controller) {
      navigator.serviceWorker.controller.postMessage("purge-runtime-cache");
    }
  }

  /**
   * DEMO ONLY. There is no payment system yet, so this calls a database
   * function that flips the caller's own role from free → premium.
   * Delete this (and the SQL function) when you add real billing.
   */
  async function upgradeToPremium(): Promise<boolean> {
    if (!user) return false;
    if (user.isDemo) {
      // Local preview only: no RPC, no Supabase call.
      setUser({ ...user, role: "premium" });
      setActiveDemoRole("premium");
      return true;
    }
    const supabase = getSupabase();
    const { error } = await supabase.rpc("upgrade_to_premium_demo");
    if (error) {
      console.error("[auth] upgrade failed:", error.message);
      return false;
    }
    setUser({ ...user, role: "premium" });
    return true;
  }

  function startDemo(role: DemoRole) {
    if (!DEMO_ENABLED || currentId.current) return; // never replace a signed-in real user
    wipeDemoStorage();
    setActiveDemoRole(role);
    applyDemo(role);
  }

  function resetDemo() {
    const role = getActiveDemoRole();
    if (!user?.isDemo || !role) return; // never resets (or deletes) a real account
    wipeDemoStorage();
    applyDemo(role);
  }

  async function deleteAccount(password?: string): Promise<{ ok: boolean; error?: string }> {
    // Demo mode must never reach the real deletion endpoint.
    if (!user || user.isDemo) return { ok: false, error: "Demo accounts are not real. Use Reset demo data instead." };
    const supabase = getSupabase();
    // Re-authenticate (email/password accounts) so a stolen open tab cannot delete the account.
    if (password !== undefined) {
      const { error } = await supabase.auth.signInWithPassword({ email: user.email, password });
      if (error) return { ok: false, error: "That password is not correct." };
    }
    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;
    if (!token) return { ok: false, error: "Your session has expired. Please log in again, then retry." };
    let res: Response;
    try {
      res = await fetch("/api/delete-account", { method: "POST", headers: { Authorization: `Bearer ${token}` } });
    } catch {
      return { ok: false, error: "We could not reach the server. Your account was not deleted." };
    }
    const payload = await res.json().catch(() => ({}));
    if (!res.ok) return { ok: false, error: payload.error ?? "We could not delete your account. Nothing was deleted." };
    await supabase.auth.signOut().catch(() => undefined);
    await apply(null);
    if (typeof navigator !== "undefined" && navigator.serviceWorker?.controller) {
      navigator.serviceWorker.controller.postMessage("purge-runtime-cache");
    }
    return { ok: true };
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, signup, loginWithGoogle, logout, upgradeToPremium, startDemo, resetDemo, deleteAccount }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
