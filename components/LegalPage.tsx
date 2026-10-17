import Link from "next/link";
import type { ReactNode } from "react";

export interface LegalSection {
  id: string;
  title: string;
  /** "key" marks the one section a reader must not miss; it gets a stronger frame. */
  tone?: "default" | "key";
  children: ReactNode;
}

interface Props {
  current: "terms" | "privacy" | "disclaimer";
  eyebrow: string;
  title: string;
  lead: string;
  updated?: string;
  facts: { label: string; text: string }[];
  sections: LegalSection[];
}

const RELATED = [
  { key: "terms", href: "/terms", label: "Terms of Use" },
  { key: "privacy", href: "/privacy", label: "Privacy Policy" },
  { key: "disclaimer", href: "/disclaimer", label: "Disclaimer" },
  { key: "credits", href: "/credits", label: "Credits" },
] as const;

/** Shared layout for the legal pages. It only presents the text each page passes in; it adds no claims of its own. */
export default function LegalPage({ current, eyebrow, title, lead, updated, facts, sections }: Props) {
  return (
    <main className="legal-shell">
      <header className="legal-hero">
        <div className="legal-hero-inner">
          <p className="legal-eyebrow">{eyebrow}</p>
          <h1>{title}</h1>
          <p className="legal-lead">{lead}</p>
          {updated && <p className="legal-updated">{updated}</p>}
          <ul className="legal-facts" aria-label="Key points">
            {facts.map((f) => (
              <li key={f.label}>
                <span aria-hidden="true" className="legal-fact-tick">✓</span>
                <strong>{f.label}</strong>
                <span>{f.text}</span>
              </li>
            ))}
          </ul>
        </div>
      </header>

      <div className="legal-body">
        <nav className="legal-toc" aria-label="On this page">
          <p>On this page</p>
          <ol>
            {sections.map((s, i) => (
              <li key={s.id}>
                <a href={`#${s.id}`}><span>{String(i + 1).padStart(2, "0")}</span>{s.title}</a>
              </li>
            ))}
          </ol>
        </nav>

        <div className="legal-sections">
          {sections.map((s, i) => (
            <section key={s.id} id={s.id} className={`legal-card${s.tone === "key" ? " legal-card--key" : ""}`} aria-labelledby={`${s.id}-h`}>
              <span className="legal-num" aria-hidden="true">{String(i + 1).padStart(2, "0")}</span>
              <h2 id={`${s.id}-h`}>{s.title}</h2>
              <div className="legal-prose">{s.children}</div>
            </section>
          ))}
        </div>
      </div>

      <nav className="legal-related" aria-label="Related pages">
        <p>Also read</p>
        <ul>
          {RELATED.filter((r) => r.key !== current).map((r) => (
            <li key={r.key}><Link href={r.href}>{r.label} →</Link></li>
          ))}
        </ul>
      </nav>
    </main>
  );
}
