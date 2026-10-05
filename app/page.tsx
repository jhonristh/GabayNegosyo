import Link from "next/link";
import Image from "next/image";
import requirements from "../data/requirements.json";

export const metadata = {
  title: "GabayNegosyo: Your guide to business compliance",
  description: "A clearer way to understand and track Philippine business compliance.",
};

const sourcedCount = requirements.filter((r) => r.contentSource !== "prototype_placeholder").length;

export default function LandingPage() {
  return <main className="screen landing v05-landing kit-atlas">
    <section className="v05-hero" aria-labelledby="hero-title">
      <div className="v05-hero-copy">
        <div className="client-brand-intro"><Image src="/icons/icon-192.png" width={48} height={48} alt="" priority/><span>GabayNegosyo <small>GUIDE · SUPPORT · GROW</small></span></div>
        <p className="v05-kicker">A CLEARER PATH FOR YOUR BUSINESS</p>
        <h1 id="hero-title">Business compliance, <em>made easier to follow.</em></h1>
        <p className="hero-sub">Understand what applies to your business, see what comes next, and keep your requirements in one place.</p>
        <div className="hero-actions"><Link href="/wizard" className="primary-btn">Build my checklist <span aria-hidden="true">↗</span></Link><a href="#how-it-works" className="secondary-btn">See how it works</a></div>
        <p className="v05-hero-note">Made for Philippine online sellers, freelancers, and small business owners.</p>
      </div>
      <div className="kit-mosaic" role="group" aria-label="Illustrative preview of the checklist interface">
        <article>
          <span className="gn-small">YOUR ROADMAP</span>
          <h3>A clearer next step</h3>
          <p>Checklist tailored to your business profile</p>
          <div className="kit-strip" aria-hidden="true"><i /></div>
        </article>
        <article>
          <span className="gn-small">REQUIREMENT</span>
          <h3>BIR registration</h3>
          <p>What it is · who needs it · official source</p>
        </article>
        <article>
          <span className="gn-small">STAY ON TRACK</span>
          <h3>Deadlines in context</h3>
          <p>Verify dates with the issuing agency</p>
        </article>
        <p className="kit-mosaic-note">Illustrative product preview · Your actual checklist depends on your profile.</p>
      </div>
    </section>
    <section className="v05-trust"><span>BUILT AROUND YOUR NEXT STEP</span><p>Tell us about your business <b>→</b> Get a checklist <b>→</b> Track your progress</p></section>
    <section id="how-it-works" className="v05-section"><div className="v05-section-heading"><p className="v05-kicker">HOW IT WORKS</p><h2>From questions to a clearer plan.</h2><p>A guided start, a tailored checklist, and one place to keep track.</p></div><div className="v05-step-grid">
      <article><span>01 · DISCOVER</span><h3>Find your requirements</h3><p>Answer a short set of questions about your business and taxpayer profile. Start with the steps that apply to you.</p></article>
      <article><span>02 · PREPARE</span><h3>Understand each step</h3><p>Review applicable items with their agency and available deadline information.</p></article>
      <article><span>03 · FOLLOW THROUGH</span><h3>Track your progress</h3><p>Mark items complete and keep upcoming requirements in view.</p></article>
    </div></section>
    <section id="features" className="v05-feature-band"><div><p className="v05-kicker">WHAT YOU GET</p><h2>Less searching. More clarity.</h2><p>Explore {sourcedCount} sourced BIR requirements in the current dataset. Coverage across BIR, SSS, PhilHealth, Pag-IBIG, and local business permits varies by your business profile; check official sources for current details.</p></div><div className="v05-feature-links"><Link href="/signup">Personalized checklist <span>↗</span></Link><Link href="/signup">Deadline overview <span>↗</span></Link><Link href="/signup">Learning resources <span>↗</span></Link></div></section>
    <section id="plans" className="v07-plans v05-section"><div className="v05-section-heading"><p className="v05-kicker">CHOOSE YOUR PATH</p><h2>Start free. Get more guidance when you need it.</h2><p>Both plans start with the same business registration questions.</p></div><div className="v07-plan-grid"><article><span className="v05-kicker">FREE</span><h3>Know what applies</h3><ul><li>Registration wizard</li><li>Personalized basic checklist</li><li>Requirement name, agency, and deadline</li><li>Track completion and browse resources</li></ul><Link href="/signup" className="secondary-btn">Start free ↗</Link></article><article className="featured"><span className="v05-kicker">PREMIUM · DEMO ACCESS</span><h3>Understand the next steps</h3><ul><li>Everything in Free</li><li>Required documents and detailed guidance</li><li>Curated tutorials when verified</li><li>Penalty simulator and email reminders</li></ul><Link href="/signup" className="primary-btn">Explore Premium ↗</Link><p>No payment is processed in this prototype.</p></article></div></section>
    <section id="credits" className="v07-credits v05-section"><p className="v05-kicker">PROJECT CREDITS</p><h2>The research and the website</h2><p>GabayNegosyo is based on a feasibility study by fourth-year BS Management Accounting researchers. Researcher names, portraits, school, and website contributor credits will be added after the team confirms them.</p><div className="credits-grid">{[1,2,3,4].map((n) => <article className="credit-person" key={n}><div className="credit-portrait" aria-hidden="true">Photo</div><strong>Researcher {n}</strong><span>Name and role to be confirmed</span></article>)}</div><p>Website team: names and responsibilities to be confirmed. This independent informational platform is not a government service.</p><div><Link href="/disclaimer">Read the disclaimer ↗</Link><Link href="/privacy">Privacy &amp; data ↗</Link></div></section>
    <section className="v05-final-cta"><p className="v05-kicker">GET STARTED</p><h2>Take the next step with confidence.</h2><Link href="/wizard" className="primary-btn">Create your checklist ↗</Link><p>Independent informational guidance. GabayNegosyo is not a government agency.</p></section>
  </main>;
}
