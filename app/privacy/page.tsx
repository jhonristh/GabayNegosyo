import { siteConfig } from "../../lib/siteConfig";

export const metadata = {
  title: "Privacy Policy",
  description: "What GabayNegosyo collects, why, where it's stored, and how to request removal.",
};

/**
 * L12. Describes what this app actually does — verified against the real
 * code, not a generic template:
 *   - auth: Supabase Auth, session kept in the browser's localStorage
 *     (createClient from @supabase/supabase-js, no cookie config anywhere
 *     in lib/supabase.ts — grepped for document.cookie/Set-Cookie/cookie
 *     across app/components/lib: none found) → no cookie banner needed,
 *     stated honestly below instead of assumed.
 *   - analytics: @vercel/analytics, cookieless by design (lib/webAnalytics.ts).
 *   - data stored: see database/supabase_setup.sql — profiles,
 *     business_profiles, checklist_progress, reminder_configs, sent_emails.
 *
 * Compliance note for developers, not asserted to users anywhere in the UI:
 * the Philippine Data Privacy Act (RA 10173) likely applies to this app
 * once it holds real users' data. This page is a draft and needs review by
 * a qualified person before relying on it — nothing on this page or
 * elsewhere in the product claims legal compliance.
 */
export default function PrivacyPage() {
  return (
    <main className="screen legal-page">
      <header className="intro">
        <h1>Privacy Policy</h1>
        <p className="hint">Last updated: see the date of this deployment.</p>
      </header>

      <section className="req-detail-section">
        <h2>What we collect</h2>
        <p>When you create an account and use GabayNegosyo, we store:</p>
        <ul className="doc-checklist">
          <li>Your account email and name.</li>
          <li>Your business profile answers from the registration wizard: taxpayer type, barangay and RDO code, whether you lease your space, whether you have employees and how many, projected annual gross sales and expenses, and your business name.</li>
          <li>Your checklist progress: which requirements you've marked complete, and when.</li>
          <li>Your reminder settings, if you turn reminders on.</li>
          <li>A log of reminder emails sent to you (subject, body, and timestamp), so you and we can see what was sent.</li>
        </ul>
      </section>

      <section className="req-detail-section">
        <h2>Where it's stored</h2>
        <p>
          In a Supabase project (hosted Postgres database with Row Level Security), which only
          you (and administrators, for support) can read your own data from. Your session is
          kept in your browser&apos;s local storage, not in a cookie.
        </p>
      </section>

      <section className="req-detail-section">
        <h2>Cookies</h2>
        <p>
          GabayNegosyo does not set cookies. Sign-in uses your browser&apos;s local storage
          instead, and the analytics we use (Vercel Web Analytics) is cookieless by design. That
          is why this site does not show a cookie consent banner.
        </p>
      </section>

      <section className="req-detail-section">
        <h2>Analytics</h2>
        <p>
          We use Vercel Web Analytics to understand which pages are used, without cookies or
          personal data in the events themselves. We also record a small number of named actions
          (for example, completing signup or the registration wizard) with no personal
          information attached.
        </p>
      </section>

      <section className="req-detail-section">
        <h2>Requesting removal</h2>
        <p>
          To request that your account and data be deleted, contact us at{" "}
          {siteConfig.contactEmail ? (
            <a href={`mailto:${siteConfig.contactEmail}`}>{siteConfig.contactEmail}</a>
          ) : (
            "the contact address below"
          )}
          . We will confirm the request and remove your account data from our systems.
        </p>
      </section>

      <section className="req-detail-section">
        <h2>Contact</h2>
        <p>
          {siteConfig.legalEntityName ? `${siteConfig.legalEntityName}. ` : ""}
          Questions about this policy:{" "}
          {siteConfig.contactEmail ? (
            <a href={`mailto:${siteConfig.contactEmail}`}>{siteConfig.contactEmail}</a>
          ) : (
            "contact address not yet configured"
          )}
          .
        </p>
      </section>
    </main>
  );
}
