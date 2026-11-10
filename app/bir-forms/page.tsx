"use client";
import { useMemo, useState } from "react";
import Link from "next/link";
import AuthGuard from "../../components/AuthGuard";
import FormPreviewCard from "../../components/FormPreviewCard";
import { JourneyHeader, JourneyNext } from "../../components/JourneyStepper";
import { useAuth } from "../../lib/auth";
import { db } from "../../lib/db";
import { generateApplicableRequirements } from "../../lib/ruleEngine";
import type { ResourceItem } from "../../lib/types";
import conditions from "../../data/birConditions.json";
import allForms from "../../data/birForms.json";

const REGISTRATION_IDS = new Set(["bir-cor", "bir-registration-filing", "bir-registration", "bir-books-of-accounts", "bir-orus-registration", "bir-1906-authority-to-print"]);
const formResource = (id: string, title: string, description: string, url: string, lastVerified = ""): ResourceItem =>
  ({id, title, description, url, lastVerified, agencyId: "bir", resourceType: "form"});

function BirFormsContent() {
  const { user } = useAuth();
  const requirements = useMemo(() => db.getRequirements(), []);
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const [other, setOther] = useState(false);
  const profile = user ? db.getBusinessProfile(user.id) : null;
  if (!profile) return <main className="screen"><JourneyHeader current="bir-forms" title="BIR Forms" intro="Find the BIR forms that apply to your situation." /><div className="empty-state"><h2>Tell us about your business first</h2><p>Your forms depend on your taxpayer type, employees, and lease.</p><Link href="/wizard" className="primary-btn">Start the checklist questions</Link></div></main>;
  const base = generateApplicableRequirements(profile, requirements).filter(r => r.agencyId === "bir" && !REGISTRATION_IDS.has(r.id));
  const grouped = base.reduce<Record<string, typeof base>>((acc, r) => {
    (acc[r.complianceStage ?? "Other BIR forms"] ||= []).push(r); return acc;
  }, {});
  const extra = conditions.filter(c => selected[c.id]);
  return <main className="screen v06-library">
    <JourneyHeader current="bir-forms" title="BIR Forms" intro="Tell us about your situation. We show the BIR forms that apply, then you can tick any special transactions." />
    <p className="guide-note" role="note">The form provided is a sample form of the prescribed BIR form for reference purposes only. Actual filing must be completed through the applicable BIR electronic filing system, such as eBIRForms or eFPS.</p>
    <section className="bir-conditions" aria-labelledby="cond-label">
      <h2 id="cond-label">Did any of these happen?</h2><p className="hint">Tick everything that applies. Each one adds a separate BIR form below.</p>
      <fieldset className="bir-checks"><legend className="sr-only">Special conditions</legend>
        {conditions.map(c => <label key={c.id} className={`bir-check ${selected[c.id] ? "checked" : ""}`}><input type="checkbox" checked={Boolean(selected[c.id])} onChange={e => setSelected({...selected, [c.id]: e.target.checked})}/><span><strong>{c.label}</strong><small>{c.hint}</small></span></label>)}
        <label className={`bir-check ${other ? "checked" : ""}`}><input type="checkbox" checked={other} onChange={e => setOther(e.target.checked)}/><span><strong>Another transaction not listed here</strong><small>We only list forms we can support with official sources.</small></span></label>
      </fieldset>
      {other && <p className="guide-note">Check the forms list below or <a href="https://www.bir.gov.ph/bir-forms" target="_blank" rel="noopener noreferrer">the BIR website ↗</a>, and ask your Revenue District Office{profile.rdoCode ? ` (${profile.rdoCode})` : ""} if unsure.</p>}
    </section>
    <section aria-live="polite" aria-label="Your applicable BIR forms">
      <h2>Your applicable BIR forms</h2>
      {extra.length > 0 && <section className="agency-group"><h3>Because of your special conditions</h3><div className="v06-media-grid">{extra.map(c => <FormPreviewCard key={c.id} resource={formResource(c.id, `BIR Form ${c.formCode}: ${c.formTitle}`, c.hint, c.url)} deadline={c.deadline}/>)}</div></section>}
      {Object.keys(grouped).length === 0 && <p className="hint">No periodic BIR filing forms matched your profile.</p>}
      {Object.entries(grouped).map(([stage, items]) => <section key={stage} className="agency-group"><h3>{stage}</h3><div className="v06-media-grid">{items.map(r => <FormPreviewCard key={r.id} resource={formResource(r.id, r.name, r.description, r.officialUrl, r.lastVerified)} deadline={r.deadlineDescription} requirementHref={`/requirements/${r.id}`}/>)}</div></section>)}
      <p className="hint">BIR registration forms are covered in <Link href="/registration">Business Registration</Link>. Your Certificate of Registration and current BIR instructions take priority over this list.</p>
    </section>
    <details className="guide-note gn-form-library"><summary><strong>All BIR forms in this guide</strong></summary>
      <div className="v06-media-grid">{allForms.map(f => <FormPreviewCard key={f.code} resource={formResource(f.code, `BIR Form ${f.code}`, f.title, f.url)}/>)}{conditions.map(c => <FormPreviewCard key={c.id} resource={formResource(c.id, `BIR Form ${c.formCode}`, c.formTitle, c.url)} deadline={c.deadline}/>)}</div>
    </details>
    <JourneyNext current="bir-forms"/>
  </main>;
}
export default function BirFormsPage() { return <AuthGuard requireData><BirFormsContent/></AuthGuard>; }
