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
import { demoEntitlement, entitlementFromRole, parseEntitlementRow } from "./entitlements";
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
  /** Emails a password-reset link to the address (always reports success for unknown emails to avoid account enumeration). */
  resetPassword: (email: string) => Promise<AuthResult>;
  /** Sets a new password for the user who arrived from a reset link (recovery session). */
  updatePassword: (newPassword: string) => Promise<AuthResult>;
  /** Browser-only demo session. No Supabase user, profile or password is involved. */
  startDemo: (role: DemoRole) => void;
  /** Resets this browser's demo data to the sample records. */
  resetDemo: () => void;
  /** Permanently deletes the signed-in real account through the server route. `confirm` must be the word DELETE. */
  deleteAccount: (confirm: string, password?: string) => Promise<{ ok: boolean; error?: string }>;
  /** Temporarily deactivates the signed-in real account (data is kept) and signs the person out. */
  deactivateAccount: () => Promise<{ ok: boolean; error?: string }>;
  /** Lifts a self-imposed deactivation for the signed-in person (they must already be logged in). */
  reactivateAccount: () => Promise<{ ok: boolean; error?: string }>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

async function loadUser(session: Session): Promise<User> {
  const supabase = getSupabase();
  const { data: profile } = await supabase
    .from("profiles")
    .select("id, email, name, role, created_at, deactivated_at")
    .eq("id", session.user.id)
    .maybeSingle();

  const meta = session.user.user_metadata ?? {};
  const user: User = {
    id: session.user.id,
    email: profile?.email ?? session.user.email ?? "",
    name: profile?.name || meta.name || meta.full_name || (session.user.email ?? "").split("@")[0],
    role: (profile?.role as Role) ?? "free",
    createdAt: profile?.created_at ?? session.user.created_at,
    deactivatedAt: (profile as { deactivated_at?: string | null } | null)?.deactivated_at ?? null,
  };

  // The plan is decided by the server (migration 006). If that function is not installed yet, fall back to the
  // stored role so nobody loses access during rollout. Failure never grants more than the stored role would.
  try {
    const { data: entRow, error: entError } = await supabase.rpc("get_my_entitlement");
    const parsed = entError ? null : parseEntitlementRow(entRow);
    if (parsed) {
      user.entitlement = parsed.entitlement;
      user.deactivatedAt = parsed.deactivatedAt ?? user.deactivatedAt ?? null;
    }
  } catch {
    /* fall through to the role-based fallback below */
  }
  if (!user.entitlement) user.entitlement = entitlementFromRole(user.role);

  try {
    // A deactivated account is blocked by the database for its own data, so there is nothing to load until it is reactivated.
    if (!user.deactivatedAt) await db.hydrate(user.id);
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
    const demoUser: User = { id, email: account.email, name: account.name, role, createdAt: new Date(0).toISOString(), isDemo: true, entitlement: demoEntitlement(role) };
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

  async function resetPassword(email: string): Promise<AuthResult> {
    try {
      const redirectTo = authRedirectUrl("/reset-password");
      if (!redirectTo) return { ok: false, error: friendlyAuthError("redirect invalid") };
      const { error } = await getSupabase().auth.resetPasswordForEmail(email.trim(), { redirectTo });
      return error ? { ok: false, error: friendlyEmailAuthError(error.message) } : { ok: true };
    } catch (err) {
      return { ok: false, error: friendlyEmailAuthError(err instanceof Error ? err.message : String(err)) };
    }
  }

  async function updatePassword(newPassword: string): Promise<AuthResult> {
    try {
      const { error } = await getSupabase().auth.updateUser({ password: newPassword });
      return error ? { ok: false, error: friendlyEmailAuthError(error.message) } : { ok: true };
    } catch (err) {
      return { ok: false, error: friendlyEmailAuthError(err instanceof Error ? err.message : String(err)) };
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

  function startDemo(role: DemoRole) {
    if (!DEMO_ENABLED || currentId.current) return; // never replace a signed-in real user
    if (role === "admin") return; // there is no public admin demo
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

  async function deleteAccount(confirm: string, password?: string): Promise<{ ok: boolean; error?: string }> {
    // Demo mode must never reach the real deletion endpoint.
    if (!user || user.isDemo) return { ok: false, error: "Demo accounts are not real. Use Reset demo data instead." };
    if (confirm.trim() !== "DELETE") return { ok: false, error: "Type DELETE to confirm." };
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
      res = await fetch("/api/delete-account", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ confirm: confirm.trim() }), // the server re-checks this; it never accepts a user id
      });
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

  function lifecycleError(message: string | undefined): string {
    if (message && /administrator/i.test(message)) return "An administrator deactivated this account, so only an administrator can reactivate it.";
    if (message && /admin accounts/i.test(message)) return "Admin accounts cannot be deactivated here.";
    if (message && /could not find the function|does not exist/i.test(message)) return "Account deactivation is not set up on this site yet. Nothing was changed.";
    return "We could not complete that. Nothing was changed. Please try again.";
  }

  async function deactivateAccount(): Promise<{ ok: boolean; error?: string }> {
    if (!user || user.isDemo) return { ok: false, error: "Demo accounts are not real. Use Reset demo data instead." };
    const supabase = getSupabase();
    const { error } = await supabase.rpc("deactivate_my_account");
    if (error) return { ok: false, error: lifecycleError(error.message) };
    await supabase.auth.signOut().catch(() => undefined);
    await apply(null);
    if (typeof navigator !== "undefined" && navigator.serviceWorker?.controller) {
      navigator.serviceWorker.controller.postMessage("purge-runtime-cache");
    }
    return { ok: true };
  }

  async function reactivateAccount(): Promise<{ ok: boolean; error?: string }> {
    if (!user || user.isDemo) return { ok: false, error: "Demo accounts are not real." };
    const supabase = getSupabase();
    const { error } = await supabase.rpc("reactivate_my_account");
    if (error) return { ok: false, error: lifecycleError(error.message) };
    const { data } = await supabase.auth.getSession();
    if (data.session) await apply(data.session); // reloads the profile, plan and saved data
    return { ok: true };
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, signup, loginWithGoogle, logout, resetPassword, updatePassword, startDemo, resetDemo, deleteAccount, deactivateAccount, reactivateAccount }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
