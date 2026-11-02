"use client";

import Link from "next/link";
import { useAuth } from "../lib/auth";
import { hasPremiumAccess } from "../lib/entitlements";
import type { ReactNode } from "react";

/**
 * UI-level gate. Server-side enforcement lives in Supabase RLS and the API
 * routes; lib/authorization.ts (isPremiumRole / assertPremium) is the shared
 * client-side check that premium actions also run.
 */
export default function PremiumGate({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const isPremium = hasPremiumAccess(user);

  if (isPremium) return <>{children}</>;

  return (
    <div className="premium-lock">
      <p className="premium-lock-title">Available with Premium</p>
      <p className="premium-lock-body">
        Upgrade to unlock documents, progress tracking, deadline status, the resource library, the penalty simulator, and manual
        reminders.
      </p>
      <Link href="/premium/checkout" className="primary-btn premium-lock-btn">
        Upgrade to Premium
      </Link>
    </div>
  );
}
