"use client";

import { useState } from "react";
import Link from "next/link";
import AuthGuard from "../../../components/AuthGuard";
import { useAuth } from "../../../lib/auth";
import { siteConfig } from "../../../lib/siteConfig";
import { trackConversion } from "../../../lib/webAnalytics";

/**
 * Premium upgrade page. Opened in a NEW TAB from Account (and any other upgrade link).
 *
 * Honest state of payments: no payment provider is connected to this build. This page
 * does not collect card, bank, or e-wallet details. Its button applies a demo upgrade
 * that takes no payment, so the Premium features can be tested.
 */
const INCLUDED = [
  "Required documents and step-by-step guidance for every requirement",
  "Full requirement details, forms, and tutorials (when a verified video is available)",
  "Penalty simulator",
  "Email reminders for fixed deadlines (7, 3, or 1 day before)",
];

function CheckoutInner() {
  const { user, upgradeToPremium } = useAuth();
  const [working, setWorking] = useState(false);
  const [result, setResult] = useState<"idle" | "done" | "failed">("idle");

  if (!user) return null;
  const isPremium = user.role === "premium" || user.role === "admin";
  const price = siteConfig.premiumPriceLabel;

  async function applyDemoUpgrade() {
    setWorking(true);
    const ok = await upgradeToPremium();
    setWorking(false);
    if (ok) trackConversion("premium_upgrade_simulated");
    setResult(ok ? "done" : "failed");
  }

  return (
    <main className="screen v07-account">
      <header className="intro">
        <p className="v05-kicker">PREMIUM</p>
        <h1>Upgrade to Premium</h1>
        <p>Review what is included, then apply the upgrade for this account.</p>
      </header>

      <section className="guide-note" role="note" aria-labelledby="pay-status-h">
        <strong id="pay-status-h">Payments are not connected yet</strong>
        <p>
          This version does not take payment and does not collect card or e-wallet details.{" "}
          {price ? <>Price: <strong>{price}</strong>.</> : "No price is shown until payments are connected."}{" "}
          The button below applies a demo upgrade so you can test Premium features. Nothing is charged.
        </p>
      </section>

      <section className="checklist-card" aria-labelledby="included-h">
        <h2 id="included-h">What Premium includes</h2>
        <ul>
          {INCLUDED.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </section>

      <section className="checklist-card" aria-labelledby="apply-h">
        <h2 id="apply-h">Your account</h2>
        <p>
          Current plan: <strong>{isPremium ? "Premium" : "Free"}</strong>
        </p>

        {isPremium ? (
          <p>Your account already has Premium access.</p>
        ) : (
          <button type="button" className="primary-btn" onClick={applyDemoUpgrade} disabled={working}>
            {working ? "Applying demo upgrade…" : "Apply demo upgrade (no payment)"}
          </button>
        )}

        {result === "done" && (
          <p role="status">
            Demo Premium applied. You can close this tab. Refresh your Account page to see the new plan.
          </p>
        )}
        {result === "failed" && (
          <p role="alert">We could not apply the demo upgrade. Check your connection and try again.</p>
        )}

        <p className="hint">
          <Link href="/account" className="tutorial-link">Back to Account</Link>
        </p>
      </section>
    </main>
  );
}

export default function PremiumCheckoutPage() {
  return (
    <AuthGuard>
      <CheckoutInner />
    </AuthGuard>
  );
}
