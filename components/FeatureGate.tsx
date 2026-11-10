"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { useAuth } from "../lib/auth";
import { canUse, type Feature } from "../lib/entitlements";
import { siteConfig } from "../lib/siteConfig";

/**
 * Wraps a page or section in the central feature map (lib/entitlements.ts FEATURE_TIER).
 * Moving a feature between plans is a one-line change there; no page needs to compare roles itself.
 */
export default function FeatureGate({ feature, children }: { feature: Feature; children: ReactNode }) {
  const { user } = useAuth();
  if (canUse(user, feature)) return <>{children}</>;
  return (
    <main className="screen">
      <div className="premium-lock">
        <p className="premium-lock-title">Available with Premium</p>
        <p className="gn-plan-price">{siteConfig.premiumPriceLabel}</p>
        <p className="premium-lock-body">This part of GabayNegosyo is included with Premium.</p>
        <Link href="/premium/checkout" className="primary-btn premium-lock-btn">About Premium</Link>
      </div>
    </main>
  );
}
