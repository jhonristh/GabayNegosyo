"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "../../lib/auth";
import { db } from "../../lib/db";
import { trackConversion } from "../../lib/webAnalytics";
import barangayRdoData from "../../data/barangayRdo.json";
import { NCR_LOCALITIES, getLocality, localityIdOf, formatLocation } from "../../lib/ncr";
import type { BusinessProfile, TaxpayerType } from "../../lib/types";

/**
 * REGISTRATION WIZARD
 * ───────────────────
 * Question order and wording follow Gabay Negosyo's registration guide.
 * The Barangay → RDO Code lookup is data-driven from data/barangayRdo.json
 * (available for Quezon City only; other NCR localities enter the barangay as text and verify the RDO with the BIR).
 *
 * "Business name" is a prototype UX addition (not part of the source
 * questionnaire) kept only so the dashboard has something to greet the
 * user with — see PROGRESS.md.
 */

const STEPS = [
  "New Business?",
  "Taxpayer Type",
  "Business Location",
  "Lease",
  "Employees",
  "Projected Sales & Expenses",
  "Business Name",
  "Review",
  "Generate My Compliance Roadmap",
];

const TAXPAYER_TYPES: { value: TaxpayerType; label: string }[] = [
  { value: "purely_compensation", label: "Purely Compensation" },
  { value: "self_employment_or_profession", label: "Self-Employment or Profession" },
  { value: "purely_business", label: "Purely Business" },
  { value: "mixed_income_earner", label: "Mixed Income Earner" },
];

const BARANGAY_RDO: { barangay: string; rdoCode: string }[] = barangayRdoData;

function Stepper({ step }: { step: number }) {
  return (
    <div className="wizard-stepper" aria-hidden="true">
      {STEPS.map((label, i) => (
        <div key={label} className={`wizard-step-dot ${i === step ? "active" : ""} ${i < step ? "done" : ""}`}>
          <span>{i + 1}</span>
        </div>
      ))}
    </div>
  );
}

function WizardInner() {
  // v0.12: guest-first. Anyone can answer the wizard; with no account the answers
  // stay in this tab (sessionStorage) and lead to a read-only preview.
  const { user } = useAuth();
  const router = useRouter();
  const [step, setStep] = useState(0);
  // Existing answers (if any) so "Review or update answers" starts from what was saved.
  const existing = useMemo(() => (user ? db.getBusinessProfile(user.id) : db.getGuestProfile()), [user]);

  const [isRegisteringNewBusiness, setIsRegisteringNewBusiness] = useState<boolean | null>(existing ? existing.isRegisteringNewBusiness : null);
  const [taxpayerType, setTaxpayerType] = useState<TaxpayerType>(existing?.taxpayerType ?? "purely_business");
  const [locality, setLocality] = useState(localityIdOf(existing));
  const [barangay, setBarangay] = useState(existing?.barangay ?? "");
  const [hasLease, setHasLease] = useState<boolean | null>(existing ? existing.hasLease : null);
  const [hasEmployees, setHasEmployees] = useState<boolean | null>(existing ? existing.hasEmployees : null);
  const [employeeCount, setEmployeeCount] = useState(existing?.employeeCount ?? 0);
  const [projectedGrossSales, setProjectedGrossSales] = useState<number | "">(existing ? existing.projectedGrossSales : "");
  const [projectedExpenses, setProjectedExpenses] = useState<number | "">(existing ? existing.projectedExpenses : "");
  const [businessName, setBusinessName] = useState(existing?.businessName ?? "");

  useEffect(() => {
    if (!user) return;
    const saved = db.getBusinessProfile(user.id);
    if (!saved) return;
    setIsRegisteringNewBusiness(saved.isRegisteringNewBusiness);
    setTaxpayerType(saved.taxpayerType);
    setLocality(localityIdOf(saved));
    setBarangay(saved.barangay ?? "");
    setHasLease(saved.hasLease);
    setHasEmployees(saved.hasEmployees);
    setEmployeeCount(saved.employeeCount ?? 0);
    setProjectedGrossSales(saved.projectedGrossSales);
    setProjectedExpenses(saved.projectedExpenses);
    setBusinessName(saved.businessName ?? "");
  }, [user]);

  const localityInfo = getLocality(locality);
  const rdoCode = useMemo(
    () => (localityInfo?.barangayLookup ? BARANGAY_RDO.find((b) => b.barangay === barangay)?.rdoCode ?? "" : ""),
    [barangay, localityInfo]
  );

  function next() {
    setStep((s) => Math.min(s + 1, STEPS.length - 1));
  }
  function back() {
    setStep((s) => Math.max(s - 1, 0));
  }

  function canProceed(): boolean {
    if (step === 0) return isRegisteringNewBusiness !== null;
    if (step === 2) return Boolean(localityInfo) && barangay.trim().length > 0;
    if (step === 3) return hasLease !== null;
    if (step === 4) return hasEmployees !== null && (hasEmployees === false || (Number.isInteger(employeeCount) && employeeCount >= 1));
    if (step === 5) return projectedGrossSales !== "" && projectedExpenses !== "" && projectedGrossSales >= 0 && projectedExpenses >= 0;
    if (step === 6) return businessName.trim().length > 0;
    return true;
  }

  function generateRoadmap() {
    const profile: BusinessProfile = {
      id: user ? `biz-${user.id}` : "biz-guest",
      userId: user ? user.id : "guest",
      isRegisteringNewBusiness: Boolean(isRegisteringNewBusiness),
      taxpayerType,
      locality,
      barangay: barangay.trim(),
      rdoCode,
      hasLease: Boolean(hasLease),
      hasEmployees: Boolean(hasEmployees),
      employeeCount: hasEmployees ? employeeCount : 0,
      projectedGrossSales: Number(projectedGrossSales) || 0,
      projectedExpenses: Number(projectedExpenses) || 0,
      businessName: businessName.trim(),
      location: formatLocation(barangay, locality),
      status: isRegisteringNewBusiness ? "planning" : "operating",
      // legacy MVP fields — kept for backward compatibility, not asked by the
      // actual registration wizard content source
      businessType: "other",
      businessStructure: "sole_proprietor",
      taxType: "not_sure",
      createdAt: existing?.createdAt ?? new Date().toISOString(),
    };
    trackConversion("wizard_completed");
    if (user) {
      db.saveBusinessProfile(profile);
      router.push("/checklist");
    } else {
      db.saveGuestProfile(profile);
      router.push("/preview");
    }
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
          <label className="question-label">Are you registering a new business?</label>
          <div className="option-row">
            <button type="button" aria-pressed={isRegisteringNewBusiness === true} className={`option-btn ${isRegisteringNewBusiness === true ? "selected" : ""}`} onClick={() => setIsRegisteringNewBusiness(true)}>
              Yes
            </button>
            <button type="button" aria-pressed={isRegisteringNewBusiness === false} className={`option-btn ${isRegisteringNewBusiness === false ? "selected" : ""}`} onClick={() => setIsRegisteringNewBusiness(false)}>
              No
            </button>
          </div>
        </section>
      )}

      {step === 1 && (
        <section className="question">
          <label className="question-label">Taxpayer Type</label>
          <div className="option-grid">
            {TAXPAYER_TYPES.map((opt) => (
              <button
                key={opt.value}
                type="button"
                aria-pressed={taxpayerType === opt.value}
                className={`option-btn ${taxpayerType === opt.value ? "selected" : ""}`}
                onClick={() => setTaxpayerType(opt.value)}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </section>
      )}

      {step === 2 && (
        <section className="question">
          <label className="question-label" htmlFor="locality">
            City or municipality (NCR)
          </label>
          <select
            id="locality"
            className="text-input"
            value={locality}
            onChange={(e) => {
              setLocality(e.target.value);
              setBarangay("");
            }}
          >
            <option value="">Select your city or municipality…</option>
            {NCR_LOCALITIES.map((l) => (
              <option key={l.id} value={l.id}>
                {l.name}
                {l.type === "municipality" ? " (municipality)" : ""}
              </option>
            ))}
          </select>
          <p className="hint">
            Covers the National Capital Region. National requirements (BIR, SSS, PhilHealth, Pag-IBIG) are the same
            wherever you are; local permit steps vary by LGU.
          </p>

          {localityInfo && (
            <>
              <label className="question-label" htmlFor="barangay" style={{ marginTop: 16 }}>
                Barangay
              </label>
              <input
                id="barangay"
                list={localityInfo.barangayLookup ? "barangay-list" : undefined}
                className="text-input"
                value={barangay}
                onChange={(e) => setBarangay(e.target.value)}
                placeholder={localityInfo.barangayLookup ? "Start typing your barangay…" : "Type your barangay"}
              />
              {localityInfo.barangayLookup && (
                <datalist id="barangay-list">
                  {BARANGAY_RDO.map((b) => (
                    <option key={b.barangay} value={b.barangay} />
                  ))}
                </datalist>
              )}
              {rdoCode && (
                <p className="hint">
                  RDO Code: <strong>{rdoCode}</strong> (auto-determined from your barangay)
                </p>
              )}
              {barangay && localityInfo.barangayLookup && !rdoCode && (
                <p className="hint">
                  We don&apos;t have an RDO Code on file for that barangay yet. Double-check the spelling, or continue and
                  verify with your RDO directly.
                </p>
              )}
              {!localityInfo.barangayLookup && (
                <p className="hint">
                  Automatic RDO lookup is not available for {localityInfo.name} yet. Confirm your Revenue District Office
                  with the BIR before registering. Local permit guidance for {localityInfo.name} is general and not yet
                  verified against that LGU&apos;s own rules.
                </p>
              )}
            </>
          )}
        </section>
      )}

      {step === 3 && (
        <section className="question">
          <label className="question-label">Do you lease the space for your business?</label>
          <div className="option-row">
            <button type="button" aria-pressed={hasLease === true} className={`option-btn ${hasLease === true ? "selected" : ""}`} onClick={() => setHasLease(true)}>
              Yes
            </button>
            <button type="button" aria-pressed={hasLease === false} className={`option-btn ${hasLease === false ? "selected" : ""}`} onClick={() => setHasLease(false)}>
              No
            </button>
          </div>
        </section>
      )}

      {step === 4 && (
        <section className="question">
          <label className="question-label">Are you hiring employees to help you run the business?</label>
          <div className="option-row">
            <button type="button" aria-pressed={hasEmployees === true} className={`option-btn ${hasEmployees === true ? "selected" : ""}`} onClick={() => setHasEmployees(true)}>
              Yes
            </button>
            <button type="button" aria-pressed={hasEmployees === false} className={`option-btn ${hasEmployees === false ? "selected" : ""}`} onClick={() => setHasEmployees(false)}>
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

      {step === 5 && (
        <>
          <section className="question">
            <label className="question-label" htmlFor="gross">
              How much is your projected annual gross sales? (₱)
            </label>
            <input
              id="gross"
              type="number"
              min={0}
              className="text-input"
              value={projectedGrossSales}
              onChange={(e) => setProjectedGrossSales(e.target.value === "" ? "" : Number(e.target.value))}
              placeholder="e.g. 2000000"
            />
          </section>
          <section className="question">
            <label className="question-label" htmlFor="expenses">
              How much is your projected annual expenses? (₱)
            </label>
            <input
              id="expenses"
              type="number"
              min={0}
              className="text-input"
              value={projectedExpenses}
              onChange={(e) => setProjectedExpenses(e.target.value === "" ? "" : Number(e.target.value))}
              placeholder="e.g. 250000"
            />
          </section>
        </>
      )}

      {step === 6 && (
        <section className="question">
          <label className="question-label" htmlFor="bizName">
            Business name
          </label>
          <input id="bizName" className="text-input" value={businessName} onChange={(e) => setBusinessName(e.target.value)} placeholder="e.g. Juana's Crochet Corner" />
          <p className="hint">Not part of the registration questions; it's just so we can label your dashboard.</p>
        </section>
      )}

      {step === 7 && (
        <section className="review-summary">
          <h2>Review your answers</h2>
          <dl>
            <dt>Registering a new business?</dt>
            <dd>{isRegisteringNewBusiness ? "Yes" : "No"}</dd>
            <dt>Taxpayer Type</dt>
            <dd>{TAXPAYER_TYPES.find((t) => t.value === taxpayerType)?.label}</dd>
            <dt>Barangay</dt>
            <dd>{barangay ? formatLocation(barangay, locality) : "—"}</dd>
            <dt>RDO Code</dt>
            <dd>{rdoCode || "Not found for this barangay"}</dd>
            <dt>Leases business space?</dt>
            <dd>{hasLease ? "Yes" : "No"}</dd>
            <dt>Employees?</dt>
            <dd>{hasEmployees ? `Yes (${employeeCount})` : "No"}</dd>
            <dt>Projected annual gross sales</dt>
            <dd>₱{Number(projectedGrossSales || 0).toLocaleString()}</dd>
            <dt>Projected annual expenses</dt>
            <dd>₱{Number(projectedExpenses || 0).toLocaleString()}</dd>
            <dt>Business name</dt>
            <dd>{businessName || "—"}</dd>
          </dl>
        </section>
      )}

      {step === 8 && (
        <section className="review-summary">
          <h2>Ready to generate your roadmap</h2>
          <p>
            After answering the questions above, we'll match your profile against Gabay Negosyo's BIR compliance
            guide and build your personalized compliance checklist.
            {!user && " You can preview it now and create a free account afterwards to save it."}
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
  const { loading } = useAuth();
  return <>
    {loading && <p className="guest-auth-note" role="status">You can continue as a guest. We’ll check your saved account in the background.</p>}
    <WizardInner />
  </>;
}
