"use client";

import Link from "next/link";
import { useAuth } from "../lib/auth";
import { siteConfig } from "../lib/siteConfig";

/**
 * WP8: role-aware primary action (dashboard if signed in, home if not),
 * plus the real contact address. Split into its own client component so
 * app/not-found.tsx can stay a server component and export metadata.
 */
export default function NotFoundActions() {
  const { user, loading } = useAuth();

  return (
    <>
      <div className="hero-actions">
        {!loading && user ? (
          <Link href="/dashboard" className="primary-btn">
            Go to my dashboard
          </Link>
        ) : (
          <Link href="/" className="primary-btn">
            Back to homepage
          </Link>
        )}
        <Link href="/" className="secondary-btn">
          {!loading && user ? "Back to homepage" : "Log in"}
        </Link>
      </div>
      {siteConfig.contactEmail && (
        <p className="hint" style={{ marginTop: 16 }}>
          Still stuck? Reach us at{" "}
          <a href={`mailto:${siteConfig.contactEmail}`}>{siteConfig.contactEmail}</a>.
        </p>
      )}
    </>
  );
}
