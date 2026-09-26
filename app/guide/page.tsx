"use client";

import { useState } from "react";
import Link from "next/link";
import AuthGuard from "../../components/AuthGuard";
import { useAuth } from "../../lib/auth";
import { db } from "../../lib/db";
import guide from "../../data/clientGuide.json";

const stages = ["Start a business", "If you hire employees", "Renew an existing business", "Keep operating"];

function GuideContent() {
  const { user } = useAuth();
  const profile = user ? db.getBusinessProfile(user.id) : null;
  const [stage, setStage] = useState("all");
  const premium = user?.role === "premium" || user?.role === "admin";
  const visible = guide.filter((item) =>
    (stage === "all" || stage === item.stage) &&
    (item.audience !== "employees" || profile?.hasEmployees !== false) &&
    (profile?.isRegisteringNewBusiness !== true || item.stage !== "Renew an existing business") &&
    (profile?.isRegisteringNewBusiness !== false || item.stage !== "Start a business")
  );
  return <main className="screen client-guide">
    <header className="intro"><p className="v06-eyebrow">CLIENT CONTENT · SEPTEMBER 2026</p><h1>Your business guide</h1>
      <p>See which steps to take when starting, renewing, and running a sole proprietorship. Local rules and your registered tax types determine the final requirements.</p></header>
    <div className="guide-note"><strong>About dates and penalties</strong><p>Local due dates, monthly remittances, and event-based filings need individual confirmation. This guide does not turn an approximate date into a filing deadline. Check the issuing agency before filing or paying.</p></div>
    <div className="filter-row" aria-label="Guide stages">
      {["all", ...stages].map((s) => <button key={s} type="button" className={`filter-chip ${stage === s ? "selected" : ""}`} onClick={() => setStage(s)}>{s === "all" ? "All stages" : s}</button>)}
    </div>
    {stages.filter((s) => stage === "all" || s === stage).map((s) => {
      const items = visible.filter((item) => item.stage === s);
      return items.length ? <section className="guide-stage" key={s}><h2>{s}</h2><div className="guide-grid">
        {items.map((item) => <article className="guide-card" key={item.id}>
          <p className="v06-eyebrow">{item.agency}</p><h3>{item.title}</h3><p>{item.timing}</p>
          {premium ? <><h4>What to prepare</h4><ul>{item.documents.map((d) => <li key={d}>{d}</li>)}</ul><h4>Steps</h4><ol>{item.steps.map((step) => <li key={step}>{step}</li>)}</ol></> : <p className="guide-locked">Premium shows the document list and action steps. <Link href="/account">View your plan</Link></p>}
          {item.officialUrl && <a href={item.officialUrl} target="_blank" rel="noopener noreferrer">Visit agency ↗</a>}
          <small>Client reference: {item.source}</small>
        </article>)}
      </div></section> : null;
    })}
    <section className="guide-stage"><h2>Tax forms and special situations</h2><p>Form 1701, 1701A, 1701-MS and 1701Q depend on how income is earned and the taxpayer’s registered tax treatment. Form 2551Q concerns percentage tax; Form 2550Q concerns VAT. With employees, compensation withholding and employee certificates may also apply. Property sales and donations can trigger separate forms. Your certificate of registration and current BIR instructions take priority over a generic list.</p><p>The client’s BIR Forms PDF places the 8% income tax option under a VAT-registered branch and repeats Form 1701A across different tax regimes. Those combinations require correction before the site can select an exact return automatically.</p><a href="https://www.bir.gov.ph/bir-forms" target="_blank" rel="noopener noreferrer">Check current BIR forms ↗</a></section>
    <section className="guide-stage"><h2>Barangay Micro Business Enterprise (BMBE)</h2><p>The client checklist describes BMBE as an optional registration for qualifying microbusinesses, with a two-year certificate and an asset ceiling of ₱3 million excluding land. This is not automatic merely because a business is small. Check current DTI eligibility and the scope of any tax benefit before relying on it.</p><a href="https://bmbe.dti.gov.ph/" target="_blank" rel="noopener noreferrer">Check BMBE registration ↗</a></section>
    <section className="guide-stage"><h2>If a payment is late</h2><p>Consequences depend on the agency, taxpayer classification, unpaid amount, and actual dates. The client PDFs disagree about PhilHealth’s interest rate and give conflicting BIR microbusiness thresholds. The penalty simulator should be treated as an illustration until the specific rule is reviewed. Never use a displayed estimate as an official assessment.</p><Link href="/checklist">Go to your checklist →</Link></section>
  </main>;
}

export default function GuidePage() { return <AuthGuard><GuideContent /></AuthGuard>; }
