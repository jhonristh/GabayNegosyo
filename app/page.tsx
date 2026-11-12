import Link from "next/link";
import GrowthHero from "../components/GrowthHero";
import KitIcon from "../components/KitIcon";
import requirements from "../data/requirements.json";
import credits from "../data/credits.json";
import { siteConfig } from "../lib/siteConfig";


export const metadata = {
  title: "GabayNegosyo: Your guide to business compliance",
  description: "A clearer way to understand and track Philippine business compliance.",
};

// Counted by agency so the "BIR requirements" claim is literally true (v0.16.5: the old count also
// included the two LGU items). Placeholder SSS / PhilHealth / Pag-IBIG items are never counted.
const sourcedCount = requirements.filter((r) => r.agencyId === "bir" && r.contentSource !== "prototype_placeholder").length;

// Newest "last verified" date in the real dataset (shown in the trust section; never invented).
const lastVerified = (requirements as { lastVerified?: string }[])
  .map((r) => r.lastVerified)
  .filter((d): d is string => typeof d === "string" && d.length > 0)
  .sort()
  .pop();

// Credits stay in data/credits.json, but the homepage only shows them once real names replace the
// placeholders, so no "Researcher 1" / "to be confirmed" text reaches visitors.
const creditsConfirmed =
  credits.researchers.every((r) => !/^Researcher \d+$/.test(r.name)) && !/^Web developer$/i.test(credits.developer.name);

const PILLARS = [
  { n: "Know", t: "Know what applies", p: "Answer a few questions and see only the requirements that match your business profile." },
  { n: "Prepare", t: "Prepare each step", p: "See the agency, timing where available, and the official source for every item." },
  { n: "Progress", t: "Track your progress", p: "Mark items done and keep what comes next in view." },
];

export default function LandingPage() {
  return <main className="screen landing v05-landing kit-atlas gn-home">
    <section className="gn-hero" aria-labelledby="hero-title">
      <div className="gn-hero-copy">
        <p className="gn-kicker">A CLEARER PATH FOR YOUR BUSINESS</p>
        <h1 id="hero-title">Business compliance, <em>made easier to follow.</em></h1>
        <p className="hero-sub">Know what applies to your business, organize your requirements, and understand the next step, all in one place.</p>
        <div className="hero-actions"><Link href="/wizard" className="primary-btn">Create my checklist <KitIcon name="next" size={16} /></Link><a href="#how-it-works" className="secondary-btn">Explore the roadmap</a></div>
        <p className="v05-hero-note">Made for online sellers, freelancers, and small business owners across Metro Manila (NCR).</p>
      </div>
      <div className="gn-hero-art ew-hero-art" role="group" aria-label="Illustrative product preview"><GrowthHero /></div>
    </section>

    <section className="gn-pillars" aria-label="What GabayNegosyo helps you do">
      {PILLARS.map((x) => <article key={x.n}><span className="gn-kicker">{x.n.toUpperCase()}</span><h3>{x.t}</h3><p>{x.p}</p></article>)}
    </section>

    <section className="ew-audience" aria-labelledby="audience-title"><div><p className="gn-kicker">MADE FOR YOUR EVERYDAY AMBITION</p><h2 id="audience-title">However you do business.</h2></div><div className="ew-audience-grid"><article><span className="ew-audience-number">01</span><h3>Online sellers</h3><p>Make room for business requirements alongside orders, deliveries, and customers.</p></article><article><span className="ew-audience-number">02</span><h3>Freelancers</h3><p>Keep the business side of your independent work in one understandable place.</p></article><article><span className="ew-audience-number">03</span><h3>Small business owners</h3><p>Follow your next step while keeping the bigger picture in view.</p></article></div></section>

    <section id="how-it-works" className="v05-section gn-section"><div className="v05-section-heading"><p className="gn-kicker">HOW IT WORKS</p><h2>From questions to a clearer plan.</h2><p>A guided start, a tailored checklist, and one place to keep track.</p></div><div className="v05-step-grid">
      <article><span>01 · DISCOVER</span><h3>Find your requirements</h3><p>Answer a short set of questions about your business and taxpayer profile. Start with the steps that apply to you.</p></article>
      <article><span>02 · PREPARE</span><h3>Understand each step</h3><p>Review applicable items with their agency and available deadline information.</p></article>
      <article><span>03 · FOLLOW THROUGH</span><h3>Track your progress</h3><p>Mark items complete and keep upcoming requirements in view.</p></article>
    </div></section>

    <section id="features" className="v05-feature-band gn-feature-band"><div><p className="gn-kicker">WHAT YOU GET</p><h2>Less searching. More clarity.</h2><p>Explore {sourcedCount} sourced BIR requirements in the current dataset. SSS, PhilHealth, Pag-IBIG, and local business permit guidance is outline content for now, and coverage varies by your business profile; check official sources for current details.</p></div><div className="v05-feature-links"><Link href="/signup">Personalized checklist <span>↗</span></Link><Link href="/signup">Deadline overview <span>↗</span></Link><Link href="/signup">Learning resources <span>↗</span></Link></div></section>

    <section className="ew-tools gn-section" aria-labelledby="tools-title"><div className="v05-section-heading"><p className="gn-kicker">A WORKSPACE THAT MAKES SENSE</p><h2 id="tools-title">The details, in their place.</h2></div><div className="ew-tools-grid">
      <article><span className="ew-tool-icon" aria-hidden="true">01</span><h3>Your personalized checklist</h3><p>See requirements grouped into stages. Open an item to understand what comes next.</p><Link href="/checklist">Explore your checklist <span aria-hidden="true">→</span></Link></article>
      <article><span className="ew-tool-icon" aria-hidden="true">02</span><h3>A clearer deadline view</h3><p>Keep available dates in view. Premium adds deadline status and progress tracking.</p><Link href="/deadlines">View deadlines <span aria-hidden="true">→</span></Link></article>
      <article><span className="ew-tool-icon" aria-hidden="true">03</span><h3>Guidance within reach</h3><p>Learn through attributed tutorials, with supporting resources available in Premium.</p><Link href="/tutorials">Visit the learning hub <span aria-hidden="true">→</span></Link></article>
    </div></section>

    <section id="trust" className="v05-section gn-section" aria-labelledby="trust-title"><div className="v05-section-heading"><p className="gn-kicker">SOURCES, SCOPE &amp; TRANSPARENCY</p><h2 id="trust-title">Clear about what we know, and what we don&apos;t.</h2><p>Every requirement links to its official source. Check the issuing agency before you file or pay anything.</p></div>
      <div className="gn-trust-grid">
        <article><strong>{sourcedCount}</strong><span>BIR requirements with official sources</span></article>
        <article><strong>NCR</strong><span>Initial coverage area</span></article>
        <article><strong>{lastVerified ?? "Per item"}</strong><span>{lastVerified ? "Most recent verification date in the dataset" : "Each requirement shows its own verification date"}</span></article>
      </div>
      <p className="gn-trust-note">GabayNegosyo is an informational guide, not a government portal. It does not file forms or submit official transactions. <Link href="/disclaimer">Read the disclaimer ↗</Link></p>
    </section>

    <section id="plans" className="v07-plans v05-section gn-section">
      <div className="v05-section-heading"><p className="gn-kicker">CHOOSE YOUR PATH</p><h2>Start free. Get more guidance when you need it.</h2><p>Both plans start with the same business registration questions.</p></div>
      <div className="v07-plan-grid">
        <article><span className="gn-kicker">FREE</span><h3>Know what applies</h3><p className="gn-plan-price">₱0</p><p>No subscription required</p><ul><li>Registration wizard</li><li>Personalized basic checklist</li><li>Requirement name, agency, and deadline</li><li>Free YouTube tutorials (attributed to creators)</li></ul><Link href="/signup" className="secondary-btn">Start free ↗</Link></article>
        <article className="featured"><span className="gn-kicker">PREMIUM</span><h3>Understand the next steps</h3><p className="gn-plan-price">{siteConfig.premiumPriceLabel}</p><p>Monthly subscription</p><ul><li>Everything in Free</li><li>Required documents and detailed guidance</li><li>Progress tracking, deadline status and resource library</li><li>Penalty simulator and manual reminder service</li></ul><Link href="/premium/checkout" className="primary-btn">View Premium ↗</Link><p>No payment is processed on this website yet. Contact the team about Premium access.</p></article>
      </div>
    </section>

    {creditsConfirmed && <section id="credits" className="v07-credits v05-section gn-section" aria-labelledby="credits-title"><p className="gn-kicker">PROJECT CREDITS</p><h2 id="credits-title">The research and the website</h2><p>GabayNegosyo is based on a feasibility study by a team of {credits.researchers.length} researchers, with the website built by one web developer.</p><h3 className="credits-heading">Research team ({credits.researchers.length})</h3><ul className="credits-grid">{credits.researchers.map((r, i) => <li className="credit-person" key={i}><strong>{r.name}</strong><span>{r.contribution}</span></li>)}</ul><h3 className="credits-heading">Web developer (1)</h3><ul className="credits-grid credits-grid--single"><li className="credit-person"><strong>{credits.developer.name}</strong><span>{credits.developer.contribution}</span></li></ul><div><Link href="/disclaimer">Read the disclaimer ↗</Link><Link href="/privacy">Privacy &amp; data ↗</Link></div></section>}

    <section className="v05-final-cta gn-final"><p className="gn-kicker">GET STARTED</p><h2>Take the next step with confidence.</h2><Link href="/wizard" className="primary-btn">Create your checklist ↗</Link><p>Independent informational guidance. GabayNegosyo is not a government agency.</p></section>
  </main>;
}
