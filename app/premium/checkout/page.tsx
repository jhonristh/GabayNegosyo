"use client";

import Link from "next/link";
import AuthGuard from "../../../components/AuthGuard";
import { useAuth } from "../../../lib/auth";
import { siteConfig } from "../../../lib/siteConfig";
import { hasPremiumAccess, planLabel } from "../../../lib/entitlements";

/**
 * Premium information page. Opened in a NEW TAB from Account (and any other upgrade link).
 *
 * Honest state of payments: no payment provider is connected to this build, so there is no self-service upgrade.
 * Premium is turned on (and, if the owner chooses, given an end date) by an administrator, recorded and audited in
 * the database (migration 006). This page collects no card, bank or e-wallet details and changes nothing by itself.
 */
const INCLUDED = [
  "Required documents and step-by-step guidance for every requirement",
  "Progress tracking, deadline status and Premium resource library",
  "Penalty simulator",
  "Manual Premium reminder management (no automated email delivery)",
];

function CheckoutInner() {
  const { user } = useAuth();

  if (!user) return null;
  const isPremium = hasPremiumAccess(user);
  const price = siteConfig.premiumPriceLabel;
  const expires = user.entitlement?.expiresAt
    ? new Date(user.entitlement.expiresAt).toLocaleDateString("en-PH", { year: "numeric", month: "long", day: "numeric" })
    : null;

  return (
    <main className="screen v07-account">
      <header className="intro">
        <p className="v05-kicker">PREMIUM</p>
        <h1>About Premium</h1>
        <p>Review what is included and how access is turned on for this account.</p>
      </header>

      <section className="guide-note" role="note" aria-labelledby="pay-status-h">
        <strong id="pay-status-h">Payments are not connected yet</strong>
        <p>
          This version does not take payment and does not collect card or e-wallet details.{" "}
          {price ? <>Price: <strong>{price}</strong>.</> : "No price is shown until payments are connected."}{" "}
          For now, Premium is turned on for an account by an administrator. Nothing is charged.
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
          Current plan: <strong>{planLabel(user)}</strong>
        </p>

        {isPremium ? (
          <p>Your account has Premium access{expires ? <> until <strong>{expires}</strong></> : null}.</p>
        ) : (
          <p>
            Your account is on the Free plan. To ask for Premium access,{" "}
            {siteConfig.contactEmail ? (
              <a className="tutorial-link" href={`mailto:${siteConfig.contactEmail}?subject=Premium%20access%20request`}>email the site owner</a>
            ) : (
              "contact the site owner"
            )}
            {" "}from the address on this account. Access is granted by an administrator.
          </p>
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
