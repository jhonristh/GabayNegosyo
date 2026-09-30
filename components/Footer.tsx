import Link from "next/link";
import Image from "next/image";
import { siteConfig } from "../lib/siteConfig";

/**
 * K8/WP1: footer was missing entirely, so the legal pages built for L12
 * (/privacy, /terms, /disclaimer) had no link pointing at them anywhere in
 * the product. Deliberately minimal — real links only, no invented social
 * icons or company links that don't exist.
 */
export default function Footer() {
  return (
    <footer className="site-footer">
      <div className="site-footer-inner">
        <Link href="/" className="site-footer-brand footer-logo" aria-label="GabayNegosyo home"><Image src="/icons/gabaynegosyo-client-logo.jpg" width={184} height={184} alt="GabayNegosyo — Guide, Support, Grow" /></Link>
        <nav className="site-footer-links" aria-label="Footer">
          <Link href="/">Home</Link>
          <Link href="/#how-it-works">How it works</Link>
          <Link href="/#features">Features</Link>
          <Link href="/#plans">Plans</Link>
          <Link href="/#credits">Credits</Link>
          <Link href="/login">Log in</Link>
          <Link href="/privacy">Privacy</Link>
          <Link href="/terms">Terms</Link>
          <Link href="/disclaimer">Disclaimer</Link>
          {siteConfig.contactEmail && <a href={`mailto:${siteConfig.contactEmail}`}>Contact</a>}
        </nav>
        <p className="site-footer-disclaimer">
          GabayNegosyo is an independent informational platform, not a government agency.
        </p>
      </div>
    </footer>
  );
}
