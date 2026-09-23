import Link from "next/link";
import requirements from "../data/requirements.json";

export const metadata = {
  title: "GabayNegosyo: Your guide to business compliance",
  description:
    "Turn scattered BIR compliance requirements into one personalized checklist, built for Philippine online sellers, freelancers and small business owners.",
};

// K9/C12: coverage claims must match contentSource reality, computed here
// rather than hand-typed so the count can't silently drift from the data.
const sourcedCount = requirements.filter((r) => r.contentSource !== "prototype_placeholder").length;
const outlineAgencies = Array.from(
  new Set(requirements.filter((r) => r.contentSource === "prototype_placeholder").map((r) => r.agencyId))
);

export default function LandingPage() {
  return (
    <main className="screen landing">
      <section className="hero">
        <p className="eyebrow-free">Gabay = guide · Negosyo = business</p>
        <h1>Know what your business needs. Know what to do next.</h1>
        <p className="hero-sub">
          GabayNegosyo turns {sourcedCount} real BIR compliance requirements into one
          personalized checklist, built for online sellers, freelancers, and small business
          owners.
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
            <strong>Tell us about your business.</strong> A short wizard: taxpayer type,
            barangay, lease, employees, and projected sales.
          </li>
          <li>
            <strong>Get your personalized roadmap.</strong> Only the BIR requirements that
            actually apply to you, sourced from official forms and the current registration
            process.
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
        <h2>What's covered today</h2>
        <div className="agency-chips">
          <span>BIR: {sourcedCount} requirements, sourced from official forms</span>
        </div>
        {outlineAgencies.length > 0 && (
          <p className="hint" style={{ marginTop: 12 }}>
            {outlineAgencies.map((a) => a.toUpperCase()).join(", ")} appear as outline content for
            now; full requirements for these agencies are on the way.
          </p>
        )}
      </section>
    </main>
  );
}
