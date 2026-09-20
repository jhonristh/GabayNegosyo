"use client";

import Link from "next/link";
import { useAuth } from "../lib/auth";
import type { ReactNode } from "react";

/**
 * UI-level gate. Real authorization also happens at the service layer —
 * see lib/authorization.ts (isPremiumFeature) which every premium action
 * checks independently of what the UI hides or shows.
 */
export default function PremiumGate({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const isPremium = user?.role === "premium" || user?.role === "admin";

  if (isPremium) return <>{children}</>;

  return (
    <div className="premium-lock">
      <p className="premium-lock-title">Available with Premium</p>
      <p className="premium-lock-body">
        Upgrade to unlock full requirement details, tutorials, the penalty simulator, and email
        reminders.
      </p>
      <Link href="/account" className="primary-btn premium-lock-btn">
        Upgrade to Premium
      </Link>
    </div>
  );
}
