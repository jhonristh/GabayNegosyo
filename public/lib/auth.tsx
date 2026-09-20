"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { Role, User } from "./types";

/**
 * AUTH SERVICE (demo mode)
 * ─────────────────────────
 * Local, credential-free auth so the app runs with zero external setup.
 * Session is stored in localStorage. To integrate Supabase Auth + Google
 * OAuth later, replace the three functions below (login/signup/logout)
 * with supabase.auth calls and keep the same AuthContext shape — no page
 * needs to change.
 */

const AUTH_KEY = "gn_auth_v1";

const DEMO_USERS: Record<string, User> = {
  "free@demo.gabaynegosyo.ph": {
    id: "user-demo-free",
    email: "free@demo.gabaynegosyo.ph",
    name: "Juana Dela Cruz",
    role: "free",
    createdAt: "2026-01-01T00:00:00.000Z",
  },
  "premium@demo.gabaynegosyo.ph": {
    id: "user-demo-premium",
    email: "premium@demo.gabaynegosyo.ph",
    name: "Marco Santos",
    role: "premium",
    createdAt: "2026-01-01T00:00:00.000Z",
  },
  "admin@demo.gabaynegosyo.ph": {
    id: "user-demo-admin",
    email: "admin@demo.gabaynegosyo.ph",
    name: "GabayNegosyo Admin",
    role: "admin",
    createdAt: "2026-01-01T00:00:00.000Z",
  },
};

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  loginDemo: (email: string) => void;
  signup: (name: string, email: string) => void;
  logout: () => void;
  upgradeToPremium: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const raw = window.localStorage.getItem(AUTH_KEY);
    if (raw) setUser(JSON.parse(raw));
    setLoading(false);
  }, []);

  function persist(u: User | null) {
    setUser(u);
    if (u) window.localStorage.setItem(AUTH_KEY, JSON.stringify(u));
    else window.localStorage.removeItem(AUTH_KEY);
  }

  function loginDemo(email: string) {
    const found = DEMO_USERS[email];
    if (found) persist(found);
  }

  function signup(name: string, email: string) {
    const newUser: User = {
      id: `user-${Date.now()}`,
      email,
      name,
      role: "free",
      createdAt: new Date().toISOString(),
    };
    persist(newUser);
  }

  function logout() {
    persist(null);
  }

  function upgradeToPremium() {
    if (!user) return;
    const upgraded: User = { ...user, role: "premium" as Role };
    persist(upgraded);
  }

  return (
    <AuthContext.Provider value={{ user, loading, loginDemo, signup, logout, upgradeToPremium }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}

export { DEMO_USERS };
