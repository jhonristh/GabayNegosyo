import Link from "next/link";

export default function LandingPage() {
  return (
    <main className="screen landing">
      <section className="hero">
        <p className="eyebrow-free">Gabay = guide · Negosyo = business</p>
        <h1>Know what your business needs. Know what to do next.</h1>
        <p className="hero-sub">
          GabayNegosyo turns scattered BIR, SSS, PhilHealth, Pag-IBIG, and business permit
          requirements into one personalized checklist — built for online sellers, freelancers,
          and small business owners.
        </p>
        <div className="hero-actions">
          <Link href="/signup" className="primary-btn">
            Get my compliance checklist
          </Link>
          <Link href="/login" className="secondary-btn">
            I already have an account
          </Link>
        </div>
        <p className="hero-disclaimer">
          GabayNegosyo is an independent informational and compliance guidance platform. It is
          not a government agency and does not replace official government services.
        </p>
      </section>

      <section className="how-it-works">
        <h2>How it works</h2>
        <ol className="steps-list">
          <li>
            <strong>Tell us about your business.</strong> A short wizard — taxpayer type,
            barangay, lease, employees, and projected sales.
          </li>
          <li>
            <strong>Get your personalized roadmap.</strong> Only the requirements that actually
            apply to you, from BIR, SSS, PhilHealth, Pag-IBIG, and your LGU.
          </li>
          <li>
            <strong>Learn how to complete each one.</strong> Plain-language explanations,
            required documents, and tutorial links.
          </li>
          <li>
            <strong>Track your progress.</strong> Mark items complete, see upcoming deadlines,
            and get reminders before they're due.
          </li>
        </ol>
      </section>

      <section className="agencies-strip">
        <h2>We cover</h2>
        <div className="agency-chips">
          <span>BIR</span>
          <span>SSS</span>
          <span>PhilHealth</span>
          <span>Pag-IBIG</span>
          <span>LGU / Business Permit</span>
        </div>
      </section>
    </main>
  );
}
