import Link from "next/link";
import Image from "next/image";
import requirements from "../data/requirements.json";
import credits from "../data/credits.json";
import { WaveDivider } from "../components/WaveDivider";

export const metadata = {
  title: "GabayNegosyo: Your guide to business compliance",
  description: "A clearer way to understand and track Philippine business compliance.",
};

const sourcedCount = requirements.filter((r) => r.contentSource !== "prototype_placeholder").length;

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
        <div className="hero-actions"><Link href="/wizard" className="primary-btn">Build my checklist <span aria-hidden="true">↗</span></Link><a href="#how-it-works" className="secondary-btn">Explore the roadmap</a></div>
        <p className="v05-hero-note">Made for online sellers, freelancers, and small business owners across Metro Manila (NCR).</p>
      </div>
      <div className="gn-hero-art">
        {/* Decorative arrow lives INSIDE the art column so it can never sit under the headline, copy or CTAs. */}
        <picture className="hero-growth-arrow-wrap">
          <source srcSet="/images/gabaynegosyo-growth-arrow.webp" type="image/webp" />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/images/gabaynegosyo-growth-arrow.png" alt="" aria-hidden="true" className="hero-growth-arrow" width={1400} height={836} fetchPriority="high" decoding="async" />
        </picture>
        <div className="gn-roadmap" role="group" aria-label="Illustrative preview of the checklist interface">
          <div className="gn-roadmap-head"><Image src="/icons/icon-192.png" width={28} height={28} alt="" /><span>YOUR ROADMAP</span></div>
          <h2>A clearer next step</h2>
          <ul>
            <li><span className="gn-tick" aria-hidden="true">✓</span><div><b>Know</b><small>Checklist tailored to your profile</small></div></li>
            <li><span className="gn-tick" aria-hidden="true">✓</span><div><b>Prepare</b><small>Agency, timing and official source</small></div></li>
            <li><span className="gn-tick gn-tick--next" aria-hidden="true">→</span><div><b>Progress</b><small>Mark items done as you go</small></div></li>
          </ul>
          <p>Illustrative product preview · Your actual checklist depends on your profile.</p>
        </div>
      </div>
    </section>

    <section className="gn-pillars" aria-label="What GabayNegosyo helps you do">
      {PILLARS.map((x) => <article key={x.n}><span className="gn-kicker">{x.n.toUpperCase()}</span><h3>{x.t}</h3><p>{x.p}</p></article>)}
    </section>

    <WaveDivider className="gn-wave--section" />

    <section id="how-it-works" className="v05-section gn-section"><div className="v05-section-heading"><p className="gn-kicker">HOW IT WORKS</p><h2>From questions to a clearer plan.</h2><p>A guided start, a tailored checklist, and one place to keep track.</p></div><div className="v05-step-grid">
      <article><span>01 · DISCOVER</span><h3>Find your requirements</h3><p>Answer a short set of questions about your business and taxpayer profile. Start with the steps that apply to you.</p></article>
      <article><span>02 · PREPARE</span><h3>Understand each step</h3><p>Review applicable items with their agency and available deadline information.</p></article>
      <article><span>03 · FOLLOW THROUGH</span><h3>Track your progress</h3><p>Mark items complete and keep upcoming requirements in view.</p></article>
    </div></section>

    <section id="features" className="v05-feature-band gn-feature-band"><div><p className="gn-kicker">WHAT YOU GET</p><h2>Less searching. More clarity.</h2><p>Explore {sourcedCount} sourced BIR requirements in the current dataset. Coverage across BIR, SSS, PhilHealth, Pag-IBIG, and local business permits varies by your business profile; check official sources for current details.</p></div><div className="v05-feature-links"><Link href="/signup">Personalized checklist <span>↗</span></Link><Link href="/signup">Deadline overview <span>↗</span></Link><Link href="/signup">Learning resources <span>↗</span></Link></div></section>

    <section id="trust" className="v05-section gn-section" aria-labelledby="trust-title"><div className="v05-section-heading"><p className="gn-kicker">TRUSTED. TRANSPARENT. FOR YOU.</p><h2 id="trust-title">Clear about what we know, and what we don&apos;t.</h2><p>Every requirement links to its official source. Check the issuing agency before you file or pay anything.</p></div>
      <div className="gn-trust-grid">
        <article><strong>{sourcedCount}</strong><span>BIR requirements with official sources</span></article>
        <article><strong>NCR</strong><span>Initial coverage area</span></article>
        <article><strong>{lastVerified ?? "Per item"}</strong><span>{lastVerified ? "Most recent verification date in the dataset" : "Each requirement shows its own verification date"}</span></article>
      </div>
      <p className="gn-trust-note">GabayNegosyo is an informational guide, not a government portal. It does not file forms or submit official transactions. <Link href="/disclaimer">Read the disclaimer ↗</Link></p>
    </section>

    <section id="plans" className="v07-plans v05-section gn-section"><div className="v05-section-heading"><p className="gn-kicker">CHOOSE YOUR PATH</p><h2>Start free. Get more guidance when you need it.</h2><p>Both plans start with the same business registration questions.</p></div><div className="v07-plan-grid"><article><span className="gn-kicker">FREE</span><h3>Know what applies</h3><ul><li>Registration wizard</li><li>Personalized basic checklist</li><li>Requirement name, agency, and deadline</li><li>Track completion and browse resources</li></ul><Link href="/signup" className="secondary-btn">Start free ↗</Link></article><article className="featured"><span className="gn-kicker">PREMIUM · DEMO ACCESS</span><h3>Understand the next steps</h3><ul><li>Everything in Free</li><li>Required documents and detailed guidance</li><li>Curated tutorials when verified</li><li>Penalty simulator and email reminders</li></ul><Link href="/signup" className="primary-btn">Explore Premium ↗</Link><p>No payment is processed in this prototype.</p></article></div></section>

    {creditsConfirmed && <section id="credits" className="v07-credits v05-section gn-section" aria-labelledby="credits-title"><p className="gn-kicker">PROJECT CREDITS</p><h2 id="credits-title">The research and the website</h2><p>GabayNegosyo is based on a feasibility study by a team of {credits.researchers.length} researchers, with the website built by one web developer.</p><h3 className="credits-heading">Research team ({credits.researchers.length})</h3><ul className="credits-grid">{credits.researchers.map((r, i) => <li className="credit-person" key={i}><strong>{r.name}</strong><span>{r.contribution}</span></li>)}</ul><h3 className="credits-heading">Web developer (1)</h3><ul className="credits-grid credits-grid--single"><li className="credit-person"><strong>{credits.developer.name}</strong><span>{credits.developer.contribution}</span></li></ul><div><Link href="/disclaimer">Read the disclaimer ↗</Link><Link href="/privacy">Privacy &amp; data ↗</Link></div></section>}

    <section className="v05-final-cta gn-final"><p className="gn-kicker">GET STARTED</p><h2>Take the next step with confidence.</h2><Link href="/wizard" className="primary-btn">Create your checklist ↗</Link><p>Independent informational guidance. GabayNegosyo is not a government agency.</p></section>
  </main>;
}
