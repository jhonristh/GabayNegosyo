import Link from "next/link";
import credits from "../../data/credits.json";

export const metadata = {
  title: "Credits",
  description: "The people and tools behind GabayNegosyo.",
};

const isPlaceholder = (name: string) => /^Researcher \d+$/.test(name) || /^Web developer$/i.test(name);
const initials = (name: string) =>
  isPlaceholder(name) ? (name.match(/\d+/)?.[0] ?? "W") : name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]?.toUpperCase()).join("");

function Person({ name, contribution }: { name: string; contribution: string }) {
  const pending = isPlaceholder(name);
  return (
    <li className={`credit-card${pending ? " credit-card--pending" : ""}`}>
      <span className="credit-avatar" aria-hidden="true">{initials(name)}</span>
      <div>
        <strong>{name}</strong>
        <span>{contribution}</span>
        {pending && <em>Name to be confirmed</em>}
      </div>
    </li>
  );
}

// What the project actually uses: read from package.json dependencies, not invented.
const BUILT_WITH = [
  ["Next.js and React", "App framework"],
  ["Supabase", "Accounts and saved progress"],
  ["Vercel Web Analytics", "Cookieless page statistics"],
  ["Inter and Space Grotesk", "Typefaces, self-hosted via Fontsource"],
];

export default function CreditsPage() {
  const allConfirmed = !credits.researchers.some((r) => isPlaceholder(r.name)) && !isPlaceholder(credits.developer.name);
  return (
    <main className="legal-shell credits-page">
      <header className="legal-hero">
        <div className="legal-hero-inner">
          <p className="legal-eyebrow">PROJECT · CREDITS</p>
          <h1>The people behind GabayNegosyo</h1>
          <p className="legal-lead">
            GabayNegosyo is based on a feasibility study by a team of {credits.researchers.length} researchers, with the website built by one web developer.
          </p>
          {!allConfirmed && <p className="legal-updated">Some names are still being confirmed by the team.</p>}
        </div>
      </header>

      <div className="credits-body">
        <section aria-labelledby="cr-research">
          <h2 id="cr-research">Research team <span>({credits.researchers.length})</span></h2>
          <ul className="credit-grid">
            {credits.researchers.map((r, i) => <Person key={i} name={r.name} contribution={r.contribution} />)}
          </ul>
        </section>

        <section aria-labelledby="cr-dev">
          <h2 id="cr-dev">Web developer <span>(1)</span></h2>
          <ul className="credit-grid credit-grid--single">
            <Person name={credits.developer.name} contribution={credits.developer.contribution} />
          </ul>
        </section>

        <section aria-labelledby="cr-built">
          <h2 id="cr-built">Built with</h2>
          <ul className="built-list">
            {BUILT_WITH.map(([t, d]) => <li key={t}><strong>{t}</strong><span>{d}</span></li>)}
          </ul>
        </section>

        <section className="legal-card" aria-labelledby="cr-sources">
          <h2 id="cr-sources">About our sources</h2>
          <div className="legal-prose">
            <p>
              Requirement details are drawn from official agency forms and pages, and each one shows its own Source and
              Last verified line. GabayNegosyo is independent and is not affiliated with those agencies. See the{" "}
              <Link href="/disclaimer">Disclaimer</Link> for exactly what is sourced today.
            </p>
          </div>
        </section>
      </div>

      <nav className="legal-related" aria-label="Related pages">
        <p>Also read</p>
        <ul>
          <li><Link href="/terms">Terms of Use →</Link></li>
          <li><Link href="/privacy">Privacy Policy →</Link></li>
          <li><Link href="/disclaimer">Disclaimer →</Link></li>
        </ul>
      </nav>
    </main>
  );
}
