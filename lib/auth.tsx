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
