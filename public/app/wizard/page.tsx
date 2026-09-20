"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import AuthGuard from "../../components/AuthGuard";
import { useAuth } from "../../lib/auth";
import { db } from "../../lib/db";
import type {
  BusinessProfile,
  BusinessType,
  BusinessStructure,
  TaxType,
  BusinessStatus,
} from "../../lib/types";

const STEPS = [
  "Business Type",
  "Business Structure",
  "Tax Information",
  "Employees",
  "Business Information",
  "Review",
  "Generate My Compliance Roadmap",
];

const BUSINESS_TYPES: { value: BusinessType; label: string }[] = [
  { value: "online_seller", label: "Online seller" },
  { value: "freelancer", label: "Freelancer" },
  { value: "retail_food", label: "Retail or food business" },
  { value: "service_provider", label: "Service provider" },
  { value: "other", label: "Something else" },
];

const STRUCTURES: { value: BusinessStructure; label: string }[] = [
  { value: "sole_proprietor", label: "Sole proprietor" },
  { value: "partnership", label: "Partnership" },
  { value: "corporation", label: "Corporation" },
  { value: "not_registered_yet", label: "Not registered yet" },
];

const TAX_TYPES: { value: TaxType; label: string }[] = [
  { value: "8_percent", label: "8% flat rate" },
  { value: "graduated", label: "Graduated rate" },
  { value: "vat_registered", label: "VAT-registered" },
  { value: "not_sure", label: "Not sure yet" },
];

const STATUSES: { value: BusinessStatus; label: string }[] = [
  { value: "planning", label: "Still planning" },
  { value: "newly_registered", label: "Newly registered" },
  { value: "operating", label: "Already operating" },
];

function Stepper({ step }: { step: number }) {
  return (
    <div className="wizard-stepper">
      {STEPS.map((label, i) => (
        <div key={label} className={`wizard-step-dot ${i === step ? "active" : ""} ${i < step ? "done" : ""}`}>
          <span>{i + 1}</span>
        </div>
      ))}
    </div>
  );
}

function WizardInner() {
  const { user } = useAuth();
  const router = useRouter();
  const [step, setStep] = useState(0);

  const [businessName, setBusinessName] = useState("");
  const [businessType, setBusinessType] = useState<BusinessType>("online_seller");
  const [businessStructure, setBusinessStructure] = useState<BusinessStructure>("sole_proprietor");
  const [taxType, setTaxType] = useState<TaxType>("8_percent");
  const [hasEmployees, setHasEmployees] = useState<boolean | null>(null);
  const [employeeCount, setEmployeeCount] = useState(0);
  const [location, setLocation] = useState("");
  const [status, setStatus] = useState<BusinessStatus>("newly_registered");

  function next() {
    setStep((s) => Math.min(s + 1, STEPS.length - 1));
  }
  function back() {
    setStep((s) => Math.max(s - 1, 0));
  }

  function canProceed(): boolean {
    if (step === 3) return hasEmployees !== null;
    if (step === 4) return businessName.trim().length > 0 && location.trim().length > 0;
    return true;
  }

  function generateRoadmap() {
    if (!user) return;
    const profile: BusinessProfile = {
      id: `biz-${user.id}`,
      userId: user.id,
      businessName: businessName.trim(),
      businessType,
      businessStructure,
      taxType,
      hasEmployees: Boolean(hasEmployees),
      employeeCount: hasEmployees ? employeeCount : 0,
      location: location.trim(),
      status,
      createdAt: new Date().toISOString(),
    };
    db.saveBusinessProfile(profile);
    router.push("/dashboard");
  }

  return (
    <main className="screen wizard">
      <header className="intro">
        <h1>Set up your business profile</h1>
        <p>
          Step {step + 1} of {STEPS.length}: {STEPS[step]}
        </p>
      </header>

      <Stepper step={step} />

      {step === 0 && (
        <section className="question">
          <label className="question-label">What kind of business is this?</label>
          <div className="option-grid">
            {BUSINESS_TYPES.map((opt) => (
              <button
                key={opt.value}
                type="button"
                className={`option-btn ${businessType === opt.value ? "selected" : ""}`}
                onClick={() => setBusinessType(opt.value)}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </section>
      )}

      {step === 1 && (
        <section className="question">
          <label className="question-label">What's your business structure?</label>
          <div className="option-grid">
            {STRUCTURES.map((opt) => (
              <button
                key={opt.value}
                type="button"
                className={`option-btn ${businessStructure === opt.value ? "selected" : ""}`}
                onClick={() => setBusinessStructure(opt.value)}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </section>
      )}

      {step === 2 && (
        <section className="question">
          <label className="question-label">Which BIR tax option applies to you?</label>
          <div className="option-grid">
            {TAX_TYPES.map((opt) => (
              <button
                key={opt.value}
                type="button"
                className={`option-btn ${taxType === opt.value ? "selected" : ""}`}
                onClick={() => setTaxType(opt.value)}
              >
                {opt.label}
              </button>
            ))}
          </div>
          <p className="hint">Not sure? Check your Certificate of Registration (COR), or pick "Not sure yet."</p>
        </section>
      )}

      {step === 3 && (
        <section className="question">
          <label className="question-label">Do you have any employees?</label>
          <div className="option-row">
            <button type="button" className={`option-btn ${hasEmployees === true ? "selected" : ""}`} onClick={() => setHasEmployees(true)}>
              Yes
            </button>
            <button type="button" className={`option-btn ${hasEmployees === false ? "selected" : ""}`} onClick={() => setHasEmployees(false)}>
              No
            </button>
          </div>
          {hasEmployees && (
            <div style={{ marginTop: 14 }}>
              <label className="question-label" htmlFor="empCount">
                How many?
              </label>
              <input
                id="empCount"
                type="number"
                min={1}
                className="text-input"
                value={employeeCount || ""}
                onChange={(e) => setEmployeeCount(Number(e.target.value))}
              />
            </div>
          )}
        </section>
      )}

      {step === 4 && (
        <>
          <section className="question">
            <label className="question-label" htmlFor="bizName">
              Business name
            </label>
            <input id="bizName" className="text-input" value={businessName} onChange={(e) => setBusinessName(e.target.value)} placeholder="e.g. Juana's Crochet Corner" />
          </section>
          <section className="question">
            <label className="question-label" htmlFor="loc">
              City or municipality
            </label>
            <input id="loc" className="text-input" value={location} onChange={(e) => setLocation(e.target.value)} placeholder="e.g. Quezon City" />
          </section>
          <section className="question">
            <label className="question-label">Business status</label>
            <div className="option-grid">
              {STATUSES.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  className={`option-btn ${status === opt.value ? "selected" : ""}`}
                  onClick={() => setStatus(opt.value)}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </section>
        </>
      )}

      {step === 5 && (
        <section className="review-summary">
          <h2>Review your profile</h2>
          <dl>
            <dt>Business name</dt>
            <dd>{businessName || "—"}</dd>
            <dt>Type</dt>
            <dd>{BUSINESS_TYPES.find((b) => b.value === businessType)?.label}</dd>
            <dt>Structure</dt>
            <dd>{STRUCTURES.find((s) => s.value === businessStructure)?.label}</dd>
            <dt>Tax option</dt>
            <dd>{TAX_TYPES.find((t) => t.value === taxType)?.label}</dd>
            <dt>Employees</dt>
            <dd>{hasEmployees ? `Yes — ${employeeCount}` : "No"}</dd>
            <dt>Location</dt>
            <dd>{location || "—"}</dd>
            <dt>Status</dt>
            <dd>{STATUSES.find((s) => s.value === status)?.label}</dd>
          </dl>
        </section>
      )}

      {step === 6 && (
        <section className="review-summary">
          <h2>Ready to generate your roadmap</h2>
          <p>
            We'll match your profile against BIR, SSS, PhilHealth, Pag-IBIG, and LGU requirements
            using our rule engine, and build your personalized compliance checklist.
          </p>
        </section>
      )}

      <div className="wizard-actions">
        {step > 0 && (
          <button type="button" className="secondary-btn" onClick={back}>
            Back
          </button>
        )}
        {step < STEPS.length - 1 && (
          <button type="button" className="primary-btn" disabled={!canProceed()} onClick={next}>
            Continue
          </button>
        )}
        {step === STEPS.length - 1 && (
          <button type="button" className="primary-btn" onClick={generateRoadmap}>
            Generate My Compliance Roadmap
          </button>
        )}
      </div>
    </main>
  );
}

export default function WizardPage() {
  return (
    <AuthGuard>
      <WizardInner />
    </AuthGuard>
  );
}
