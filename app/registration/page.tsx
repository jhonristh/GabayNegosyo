"use client";

import { useState } from "react";
import Link from "next/link";
import AuthGuard from "../../components/AuthGuard";
import { JourneyHeader, JourneyNext } from "../../components/JourneyStepper";
import { useAuth } from "../../lib/auth";
import { db } from "../../lib/db";
import guide from "../../data/clientGuide.json";

type Path = "without" | "with";

function RegistrationContent() {
  const { user } = useAuth();
  const profile = user ? db.getBusinessProfile(user.id) : null;
  const [path, setPath] = useState<Path>(profile?.hasEmployees ? "with" : "without");
  const premium = user?.role === "premium" || user?.role === "admin";

  const core = guide.filter((i) => i.stage === "Start a business");
  const employer = guide.filter((i) => i.stage === "If you hire employees");
  const steps = path === "with" ? [...core, ...employer] : core;

  return (
    <main className="screen client-guide">
      <JourneyHeader
        current="registration"
        title="Business Registration"
        intro="Follow these steps to register a sole proprietorship with the government agencies that apply to you."
      />

      <div className="guide-note">
        <strong>Scope: Sole Proprietor</strong>
        <p>This guide currently covers sole proprietors. Local requirements and your assigned tax types determine the final list, so confirm details with each agency.</p>
      </div>

      <section className="question" aria-labelledby="path-label">
        <p className="question-label" id="path-label">Does your sole proprietorship have employees?</p>
        <div className="option-row" role="group" aria-labelledby="path-label">
          <button type="button" className={`option-btn ${path === "without" ? "selected" : ""}`} aria-pressed={path === "without"} onClick={() => setPath("without")}>
            Sole Proprietor — without employees
          </button>
          <button type="button" className={`option-btn ${path === "with" ? "selected" : ""}`} aria-pressed={path === "with"} onClick={() => setPath("with")}>
            Sole Proprietor — with employees
          </button>
        </div>
        <p className="hint">
          {path === "with"
            ? "Includes the employer registrations (SSS, PhilHealth, Pag-IBIG) on top of the core registration steps."
            : "Core registration only: barangay, local business permit, and BIR."}
        </p>
        {profile && (profile.hasEmployees ? "with" : "without") !== path && (
          <p className="hint">Your checklist profile says {profile.hasEmployees ? "you have employees" : "you have no employees"}. You can still review the other path.</p>
        )}
      </section>

      <section className="guide-stage" aria-label="Registration steps">
        <h2>{path === "with" ? "Registration steps — with employees" : "Registration steps — without employees"}</h2>
        <ol className="guide-grid journey-steps-list">
          {steps.map((item, i) => (
            <li key={item.id} className="guide-card">
              <p className="v06-eyebrow">Step {i + 1} · {item.agency}</p>
              <h3>{item.title}</h3>
              <p>{item.timing}</p>
              {premium ? (
                <>
                  <h4>What to prepare</h4>
                  <ul>{item.documents.map((d) => <li key={d}>{d}</li>)}</ul>
                  <h4>Steps</h4>
                  <ol>{item.steps.map((s) => <li key={s}>{s}</li>)}</ol>
                </>
              ) : (
                <p className="guide-locked">Premium shows the document list and action steps. <Link href="/account">View your plan</Link></p>
              )}
              {item.officialUrl && <a href={item.officialUrl} target="_blank" rel="noopener noreferrer">Visit agency ↗</a>}
              <small>Client reference: {item.source}</small>
            </li>
          ))}
        </ol>
      </section>

      <JourneyNext current="registration" />
    </main>
  );
}

export default function RegistrationPage() {
  return <AuthGuard><RegistrationContent /></AuthGuard>;
}
