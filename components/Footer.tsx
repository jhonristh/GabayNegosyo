import Link from "next/link";
import Image from "next/image";
import { siteConfig } from "../lib/siteConfig";

/**
 * Site footer. Real links only: no invented social icons or company pages.
 * Credits now points at the dedicated /credits page, which states honestly when names are still pending.
 */
export default function Footer() {
  return (
    <footer className="site-footer">
      <div className="site-footer-inner">
        <div className="site-footer-top">
          <div className="site-footer-about">
            <Link href="/" className="site-footer-brand footer-logo" aria-label="GabayNegosyo home">
              <Image src="/icons/gabaynegosyo-logo.jpg" width={184} height={184} alt="GabayNegosyo — Guide, Support, Grow" />
            </Link>
            <p className="site-footer-tagline"><b>Real guidance for real entrepreneurs.</b> Stay informed. Stay compliant. Keep growing.</p>
          </div>

          <nav className="site-footer-col" aria-label="Explore">
            <h2>Explore</h2>
            <Link href="/">Home</Link>
            <Link href="/#how-it-works">How it works</Link>
            <Link href="/#features">Features</Link>
            <Link href="/#plans">Plans</Link>
            <Link href="/login">Log in</Link>
          </nav>

          <nav className="site-footer-col" aria-label="Legal and credits">
            <h2>Legal</h2>
            <Link href="/privacy">Privacy</Link>
            <Link href="/terms">Terms</Link>
            <Link href="/disclaimer">Disclaimer</Link>
            <Link href="/credits">Credits</Link>
            {siteConfig.contactEmail && <a href={`mailto:${siteConfig.contactEmail}`}>Contact</a>}
          </nav>
        </div>

        <p className="site-footer-disclaimer">
          GabayNegosyo is an independent informational platform, not a government agency, and is not affiliated with or an official portal of any government agency. It does not file documents, submit official transactions, or produce official computations.
        </p>
      </div>
    </footer>
  );
}
