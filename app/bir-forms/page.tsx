"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import AuthGuard from "../../components/AuthGuard";
import { JourneyHeader, JourneyNext } from "../../components/JourneyStepper";
import { useAuth } from "../../lib/auth";
import { db } from "../../lib/db";
import { generateApplicableRequirements } from "../../lib/ruleEngine";
import conditions from "../../data/birConditions.json";
import allForms from "../../data/birForms.json";

/** BIR requirements that belong to Business Registration (stage 2), not to periodic filing. */
const REGISTRATION_IDS = new Set(["bir-cor", "bir-registration-filing", "bir-books-of-accounts", "bir-orus-registration", "bir-1906-authority-to-print"]);

function BirFormsContent() {
  const { user } = useAuth();
  const requirements = useMemo(() => db.getRequirements(), []);
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const [other, setOther] = useState(false);

  const profile = user ? db.getBusinessProfile(user.id) : null;

  if (!profile) {
    return (
      <main className="screen">
        <JourneyHeader current="bir-forms" title="BIR Forms" intro="Find the BIR forms that apply to your situation." />
        <div className="empty-state">
          <h2>Tell us about your business first</h2>
          <p>Your forms depend on your taxpayer type, employees, and lease. Answer the checklist questions to see them.</p>
          <Link href="/wizard" className="primary-btn">Start the checklist questions</Link>
        </div>
      </main>
    );
  }

  const base = generateApplicableRequirements(profile, requirements).filter((r) => r.agencyId === "bir" && !REGISTRATION_IDS.has(r.id));
  const grouped = base.reduce<Record<string, typeof base>>((acc, r) => {
    const key = r.complianceStage ?? "Other BIR forms";
    (acc[key] ||= []).push(r);
    return acc;
  }, {});
  const extra = conditions.filter((c) => selected[c.id]);

  return (
    <main className="screen">
      <JourneyHeader
        current="bir-forms"
        title="BIR Forms"
        intro="Tell us about your situation. We show the BIR forms that apply, then you can tick any special transactions."
      />

      <section className="bir-conditions" aria-labelledby="cond-label">
        <h2 id="cond-label">Did any of these happen?</h2>
        <p className="hint">Tick everything that applies. Each one adds a separate BIR form to your list below.</p>
        <fieldset className="bir-checks">
          <legend className="sr-only">Special conditions</legend>
          {conditions.map((c) => (
            <label key={c.id} className={`bir-check ${selected[c.id] ? "checked" : ""}`}>
              <input type="checkbox" checked={Boolean(selected[c.id])} onChange={(e) => setSelected({ ...selected, [c.id]: e.target.checked })} />
              <span><strong>{c.label}</strong><small>{c.hint}</small></span>
            </label>
          ))}
          <label className={`bir-check ${other ? "checked" : ""}`}>
            <input type="checkbox" checked={other} onChange={(e) => setOther(e.target.checked)} />
            <span><strong>Another transaction not listed here</strong><small>We do not guess forms for situations outside the client’s guide.</small></span>
          </label>
        </fieldset>
        {other && (
          <p className="guide-note">
            For other transactions, check the complete BIR forms list below or <a href="https://www.bir.gov.ph/bir-forms" target="_blank" rel="noopener noreferrer">the BIR website ↗</a>, and ask your Revenue District Office{profile.rdoCode ? ` (${profile.rdoCode})` : ""} if unsure.
          </p>
        )}
      </section>

      <section aria-live="polite" aria-label="Your applicable BIR forms">
        <h2>Your applicable BIR forms</h2>

        {extra.length > 0 && (
          <div className="agency-group">
            <h3>Because of your special conditions</h3>
            {extra.map((c) => (
              <article key={c.id} className="checklist-card">
                <span className="req-agency-tag">BIR</span>
                <h3>BIR Form {c.formCode}: {c.formTitle}</h3>
                <p className="deadline">Deadline: {c.deadline}</p>
                <a href={c.url} target="_blank" rel="noopener noreferrer" className="tutorial-link">Open BIR Form {c.formCode} ↗</a>
                <p className="verified">Client reference: {c.source}</p>
              </article>
            ))}
          </div>
        )}

        {Object.keys(grouped).length === 0 && <p className="hint">No periodic BIR filing forms matched your profile.</p>}
        {Object.entries(grouped).map(([stage, items]) => (
          <div key={stage} className="agency-group">
            <h3>{stage}</h3>
            {items.map((r) => (
              <article key={r.id} className="checklist-card">
                <span className="req-agency-tag">BIR</span>
                <h3><Link href={`/requirements/${r.id}`}>{r.name}</Link></h3>
                <p className="deadline">{r.deadlineDescription}</p>
                {r.officialUrl && <a href={r.officialUrl} target="_blank" rel="noopener noreferrer" className="tutorial-link">Official source ↗</a>}
              </article>
            ))}
          </div>
        ))}
        <p className="hint">Forms for BIR registration itself (Form 1901/1903, books, receipts) are covered in <Link href="/registration">Business Registration</Link>. Your Certificate of Registration and current BIR instructions take priority over this list.</p>
      </section>

      <details className="guide-note">
        <summary><strong>All BIR forms in this guide (downloads)</strong></summary>
        <ul>
          {allForms.map((f) => <li key={f.code}><a href={f.url} target="_blank" rel="noopener noreferrer">BIR Form {f.code}</a> — {f.title}</li>)}
          {conditions.map((c) => <li key={c.id}><a href={c.url} target="_blank" rel="noopener noreferrer">BIR Form {c.formCode}</a> — {c.formTitle}</li>)}
        </ul>
      </details>

      <JourneyNext current="bir-forms" />
    </main>
  );
}

export default function BirFormsPage() {
  return <AuthGuard><BirFormsContent /></AuthGuard>;
}
