import Link from "next/link";
import requirements from "../data/requirements.json";

export const metadata = {
  title: "GabayNegosyo: Your guide to business compliance",
  description: "A clearer way to understand and track Philippine business compliance.",
};

const sourcedCount = requirements.filter((r) => r.contentSource !== "prototype_placeholder").length;
const outlineAgencies = Array.from(new Set(requirements.filter((r) => r.contentSource === "prototype_placeholder").map((r) => r.agencyId)));

export default function LandingPage() {
  return <main className="screen landing v05-landing">
    <section className="v05-hero" aria-labelledby="hero-title">
      <div className="v05-hero-copy">
        <p className="v05-kicker">A CLEARER PATH FOR YOUR BUSINESS</p>
        <h1 id="hero-title">Business compliance, <em>made easier to follow.</em></h1>
        <p className="hero-sub">Understand what applies to your business, see what comes next, and keep your requirements in one place.</p>
        <div className="hero-actions"><Link href="/signup" className="primary-btn">Build my checklist <span aria-hidden="true">↗</span></Link><a href="#how-it-works" className="secondary-btn">See how it works</a></div>
        <p className="v05-hero-note">Made for Philippine online sellers, freelancers, and small business owners.</p>
      </div>
      <div className="v05-preview" aria-label="Illustrative preview of the checklist interface">
        <div className="v05-preview-bar"><span className="v05-preview-mark">G</span><span>YOUR ROADMAP</span><span className="v05-preview-dots">•••</span></div>
        <div className="v05-preview-body"><p className="v05-kicker">A BETTER VIEW OF WHAT'S NEXT</p><h2>One step at a time.</h2><p>Your requirements, organized in one clear view.</p>
          <div className="v05-preview-progress"><span>Checklist overview</span><strong>In progress</strong></div><div className="v05-preview-track"><i /></div>
          <div className="v05-preview-item"><span>01</span><div><strong>Know your requirements</strong><small>Start with the essentials</small></div><b>✓</b></div>
          <div className="v05-preview-item"><span>02</span><div><strong>Prepare what you need</strong><small>Keep your next steps in view</small></div><b>→</b></div>
          <div className="v05-preview-item"><span>03</span><div><strong>Track your deadlines</strong><small>Stay on top of important dates</small></div><b>→</b></div>
        </div>
        <div className="v05-preview-foot">Illustrative product preview · Your actual checklist depends on your profile.</div>
      </div>
    </section>
    <section className="v05-trust"><span>BUILT AROUND YOUR NEXT STEP</span><p>Tell us about your business <b>→</b> Get a checklist <b>→</b> Track your progress</p></section>
    <section id="how-it-works" className="v05-section"><div className="v05-section-heading"><p className="v05-kicker">HOW IT WORKS</p><h2>From questions to a clearer plan.</h2><p>A guided start, a tailored checklist, and one place to keep track.</p></div><div className="v05-step-grid">
      <article><span>01 / START</span><h3>Tell us about your business</h3><p>Answer a short set of questions about your business and taxpayer profile.</p></article>
      <article><span>02 / UNDERSTAND</span><h3>See your checklist</h3><p>Review applicable items with their agency and available deadline information.</p></article>
      <article><span>03 / STAY ON TRACK</span><h3>Follow your progress</h3><p>Mark items complete and keep upcoming requirements in view.</p></article>
    </div></section>
    <section id="features" className="v05-feature-band"><div><p className="v05-kicker">WHAT YOU GET</p><h2>Less searching. More clarity.</h2><p>Explore {sourcedCount} sourced BIR requirements in the current dataset. Coverage for {outlineAgencies.map(a => a.toUpperCase()).join(", ")} is still being developed.</p></div><div className="v05-feature-links"><Link href="/signup">Personalized checklist <span>↗</span></Link><Link href="/signup">Deadline overview <span>↗</span></Link><Link href="/signup">Learning resources <span>↗</span></Link></div></section>
    <section className="v05-final-cta"><p className="v05-kicker">GET STARTED</p><h2>Take the next step with confidence.</h2><Link href="/signup" className="primary-btn">Create your checklist ↗</Link><p>Independent informational guidance. GabayNegosyo is not a government agency.</p></section>
  </main>;
}
