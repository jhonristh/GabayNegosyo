"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "../../lib/auth";
import { db } from "../../lib/db";
import { trackConversion } from "../../lib/webAnalytics";
import { NCR_LOCALITIES, getLocality, localityIdOf, formatLocation } from "../../lib/ncr";
import { getBarangays } from "../../lib/barangays";
import { wizardStepProblem } from "../../lib/validation";
import { ErrorState } from "../../components/StateBlocks";
import { TAXPAYER_TYPES } from "../../lib/taxpayer";
import { eightPercentUnavailable, estimateIncomeTax, SALES_LIMIT_FOR_EIGHT_PERCENT } from "../../lib/tax";
import { peso } from "../../lib/money";
import type { BusinessProfile, TaxpayerType } from "../../lib/types";

/**
 * REGISTRATION WIZARD
 * ───────────────────
 * Question order and wording follow Gabay Negosyo's registration guide.
 * The Barangay → RDO Code lookup is data-driven from data/barangayRdo.json
 * QC RDOs are app-supplied. Every NCR locality now has a barangay dropdown (data/ncrBarangays.json, PSA PSGC 2Q 2026); other localities only show a *suggested* RDO from the BIR office name, which is never saved.
 *
 * "Business name" is a prototype UX addition (not part of the source
 * questionnaire) kept only so the dashboard has something to greet the
 * user with — see CHANGELOG.md.
 */

const STEPS = [
  "New Business?",
  "Taxpayer Type",
  "Business Location",
  "Lease",
  "Employees",
  "Projected Sales",
  "Tax Option",
  "Business Name",
  "Review",
  "Generate My Compliance Roadmap",
];


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
  const [taxpayerType, setTaxpayerType] = useState<TaxpayerType>(existing?.taxpayerType === "mixed_income_earner" ? "mixed_income_earner" : "self_employment_or_profession");
  const [locality, setLocality] = useState(localityIdOf(existing));
  const [barangay, setBarangay] = useState(existing?.barangay ?? "");
  const [hasLease, setHasLease] = useState<boolean | null>(existing ? existing.hasLease : null);
  const [hasEmployees, setHasEmployees] = useState<boolean | null>(existing ? existing.hasEmployees : null);
  const [employeeCount, setEmployeeCount] = useState(existing?.employeeCount ?? 0);
  const [projectedGrossSales, setProjectedGrossSales] = useState<number | "">(existing ? existing.projectedGrossSales : "");
  const [projectedExpenses, setProjectedExpenses] = useState<number | "">(existing ? existing.projectedExpenses : "");
  const [taxType, setTaxType] = useState<"8_percent" | "graduated">(existing?.taxType === "graduated" ? "graduated" : "8_percent");
  const [deductionMethod, setDeductionMethod] = useState<"osd" | "itemized">(existing?.deductionMethod === "itemized" ? "itemized" : "osd");
  const [leaseApplicability, setLeaseApplicability] = useState<"" | "yes" | "no" | "na">(existing ? (existing.leaseApplicability ?? (existing.hasLease ? "yes" : "no")) : "");
  const [saveError, setSaveError] = useState<string | null>(null);
  const [businessName, setBusinessName] = useState(existing?.businessName ?? "");

  // Spec §2.5: at ₱3,000,000 and above 8% is unavailable and graduated applies automatically.
  const salesAboveLimit = projectedGrossSales !== "" && eightPercentUnavailable(Number(projectedGrossSales));
  const effectiveTaxType: "8_percent" | "graduated" = salesAboveLimit ? "graduated" : taxType;
  const itemized = effectiveTaxType === "graduated" && deductionMethod === "itemized";

  const localityInfo = getLocality(locality);
  const barangayOptions = useMemo(() => getBarangays(locality), [locality]);
  const selectedBarangay = barangayOptions.find((b) => b.name === barangay);
  // Saved only when backed by app data or a BIR order; "office" matches are suggestions only.
  const rdoCode = selectedBarangay && selectedBarangay.rdoBasis !== "office" ? selectedBarangay.rdoCode ?? "" : "";
  const suggestedRdo = selectedBarangay && selectedBarangay.rdoBasis === "office" ? selectedBarangay.rdoCode ?? "" : "";
  const hasDistricts = barangayOptions.some((b) => b.district);
  const [barangayNotListed, setBarangayNotListed] = useState(Boolean(existing?.barangay) && !getBarangays(localityIdOf(existing)).some((b) => b.name === existing?.barangay));

  function next() {
    setStep((s) => Math.min(s + 1, STEPS.length - 1));
  }
  function back() {
    setStep((s) => Math.max(s - 1, 0));
  }

  /** Plain-language reason the current step cannot continue yet, or null (lib/validation.ts). */
  function stepProblem(): string | null {
    return wizardStepProblem(step, {
      isRegisteringNewBusiness,
      localityKnown: Boolean(localityInfo),
      barangay,
      leaseApplicability,
      hasEmployees,
      employeeCount,
      projectedGrossSales,
      businessName,
      taxOption: effectiveTaxType,
      deductionMethod,
      projectedExpenses,
    });
  }
  const problem = stepProblem();

  function generateRoadmap() {
    const profile: BusinessProfile = {
      id: user ? `biz-${user.id}` : "biz-guest",
      userId: user ? user.id : "guest",
      isRegisteringNewBusiness: Boolean(isRegisteringNewBusiness),
      taxpayerType,
      locality,
      barangay: barangay.trim(),
      rdoCode,
      hasLease: leaseApplicability === "yes",
      hasEmployees: Boolean(hasEmployees),
      employeeCount: hasEmployees ? employeeCount : 0,
      projectedGrossSales: Number(projectedGrossSales) || 0,
      projectedExpenses: itemized ? (Number(projectedExpenses) || 0) : 0,
      deductionMethod: effectiveTaxType === "graduated" ? deductionMethod : undefined,
      leaseApplicability: leaseApplicability === "" ? undefined : leaseApplicability,
      businessName: businessName.trim(),
      location: formatLocation(barangay, locality),
      status: isRegisteringNewBusiness ? "planning" : "operating",
      // legacy MVP fields — kept for backward compatibility, not asked by the
      // actual registration wizard content source
      businessType: "other",
      businessStructure: "sole_proprietor",
      taxType: effectiveTaxType,
      createdAt: existing?.createdAt ?? new Date().toISOString(),
    };
    if (user) {
      // WP4: never move on as if it saved when nothing was saved (for example, the person's data failed to load).
      if (!db.saveBusinessProfile(profile)) {
        setSaveError("We could not save your answers because your account data is not loaded. Check your internet connection, reload the page and try again. Your answers on this screen are still here.");
        return;
      }
      setSaveError(null);
      trackConversion("wizard_completed");
      router.push("/checklist");
    } else {
      trackConversion("wizard_completed");
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
              setBarangayNotListed(false);
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
              <select
                id="barangay"
                className="text-input"
                value={barangayNotListed ? "__other__" : barangay}
                onChange={(e) => {
                  if (e.target.value === "__other__") {
                    setBarangayNotListed(true);
                    setBarangay("");
                  } else {
                    setBarangayNotListed(false);
                    setBarangay(e.target.value);
                  }
                }}
              >
                <option value="">Select your barangay…</option>
                {hasDistricts
                  ? Array.from(new Set(barangayOptions.map((b) => b.district ?? ""))).map((d) => (
                      <optgroup key={d} label={d}>
                        {barangayOptions
                          .filter((b) => (b.district ?? "") === d)
                          .map((b) => (
                            <option key={b.code} value={b.name}>
                              {b.name}
                            </option>
                          ))}
                      </optgroup>
                    ))
                  : barangayOptions.map((b) => (
                      <option key={b.code} value={b.name}>
                        {b.name}
                      </option>
                    ))}
                <option value="__other__">My barangay isn&apos;t listed</option>
              </select>
              {barangayNotListed && (
                <input
                  id="barangay-other"
                  className="text-input"
                  style={{ marginTop: 8 }}
                  value={barangay}
                  onChange={(e) => setBarangay(e.target.value)}
                  placeholder="Type your barangay"
                  aria-label="Barangay (not listed)"
                />
              )}
              <p className="hint">Barangay list: PSA Philippine Standard Geographic Code, 2Q 2026.</p>
              {rdoCode && (
                <p className="hint">
                  RDO Code: <strong>{rdoCode}</strong> (auto-determined from your barangay)
                </p>
              )}
              {suggestedRdo && (
                <p className="hint">
                  Likely RDO: <strong>{suggestedRdo}</strong> (based on the BIR office name for {localityInfo.name}, not a
                  confirmed barangay list). Confirm your Revenue District Office with the BIR before registering.
                </p>
              )}
              {barangay && !rdoCode && !suggestedRdo && (
                <p className="hint">
                  We don&apos;t have a confirmed RDO Code on file for that barangay yet. Confirm your Revenue District
                  Office with the BIR before registering.
                </p>
              )}
              {localityInfo.lguGuidance !== "verified" && (
                <p className="hint">
                  Local permit guidance for {localityInfo.name} is general and not yet verified against that LGU&apos;s own
                  rules.
                </p>
              )}
            </>
          )}
        </section>
      )}

      {step === 3 && (
        <section className="question">
          <label className="question-label">Do you lease the space for your business?</label>
          <p className="hint">Choose Not Applicable if you work remotely or from home and no separate business space is leased.</p>
          <div className="option-grid">
            {([{value:"yes",label:"Yes"},{value:"no",label:"No"},{value:"na",label:"Not Applicable"}] as const).map(option => <button key={option.value} type="button" aria-pressed={leaseApplicability === option.value} className={`option-btn ${leaseApplicability === option.value ? "selected" : ""}`} onClick={() => {setLeaseApplicability(option.value); setHasLease(option.value === "yes" ? true : option.value === "no" ? false : null);}}>{option.label}</button>)}
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
              What are your projected annual gross sales/receipts? (₱)
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
            {salesAboveLimit && (
              <p className="hint" role="status">
                Sales of {peso(SALES_LIMIT_FOR_EIGHT_PERCENT)} or more: the 8% option is not available. The graduated tax table applies automatically, and your business must register as a VAT taxpayer.
              </p>
            )}
          </section>

        </>
      )}

      {step === 6 && (
        <section className="question">
          <label className="question-label">Tax option</label>
          <p className="hint">The 8% option is optional. It is for qualified self-employed individuals and professionals with annual gross sales or receipts below ₱3,000,000, and it is in place of the graduated income tax and the 3% percentage tax. Confirm your eligibility with the BIR or a tax professional.</p>
          {salesAboveLimit && (
            <p className="hint" role="status">Your projected sales are ₱3,000,000 or more, so the 8% option is turned off. Graduated tax applies automatically and VAT registration is required.</p>
          )}
          <div className="option-grid">
            <button type="button" disabled={salesAboveLimit} aria-pressed={effectiveTaxType === "8_percent"} className={`option-btn ${effectiveTaxType === "8_percent" ? "selected" : ""}`} onClick={() => setTaxType("8_percent")}>8%</button>
            <button type="button" aria-pressed={effectiveTaxType === "graduated"} className={`option-btn ${effectiveTaxType === "graduated" ? "selected" : ""}`} onClick={() => setTaxType("graduated")}>Graduated</button>
          </div>
          {effectiveTaxType === "8_percent" && taxpayerType !== "mixed_income_earner" && (
            <p className="hint">The ₱250,000 is deducted automatically, so no expenses question is needed.</p>
          )}
          {effectiveTaxType === "8_percent" && taxpayerType === "mixed_income_earner" && (
            <p className="hint">For Mixed Income Earners the ₱250,000 deduction is not applied in this estimate while it is being confirmed with our tax consultant.</p>
          )}
          {effectiveTaxType === "graduated" && (
            <>
              <label className="question-label" style={{ marginTop: 16 }}>Deduction method</label>
              <div className="option-grid">
                <button type="button" aria-pressed={deductionMethod === "osd"} className={`option-btn ${deductionMethod === "osd" ? "selected" : ""}`} onClick={() => setDeductionMethod("osd")}>OSD (40% optional standard deduction)</button>
                <button type="button" aria-pressed={deductionMethod === "itemized"} className={`option-btn ${deductionMethod === "itemized" ? "selected" : ""}`} onClick={() => setDeductionMethod("itemized")}>Itemized</button>
              </div>
              {itemized && (
                <section className="question">
                  <label className="question-label" htmlFor="expenses">Projected annual expenses (₱)</label>
                  <input id="expenses" type="number" min={0} className="text-input" value={projectedExpenses} onChange={(e) => setProjectedExpenses(e.target.value === "" ? "" : Number(e.target.value))} placeholder="e.g. 250000" />
                </section>
              )}
            </>
          )}
          <p className="hint">This estimate is for guidance only, not an official tax computation.</p>
        </section>
      )}

      {step === 7 && (
        <section className="question">
          <label className="question-label" htmlFor="bizName">
            Business name
          </label>
          <input id="bizName" className="text-input" value={businessName} onChange={(e) => setBusinessName(e.target.value)} placeholder="e.g. Juana's Crochet Corner" />
          <p className="hint">Not part of the registration questions; it's just so we can label your dashboard.</p>
        </section>
      )}

      {step === 8 && (
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
            <dd>{leaseApplicability === "na" ? "Not Applicable" : leaseApplicability === "yes" ? "Yes" : "No"}</dd>
            <dt>Employees?</dt>
            <dd>{hasEmployees ? `Yes (${employeeCount})` : "No"}</dd>
            <dt>Projected annual gross sales</dt>
            <dd>₱{Number(projectedGrossSales || 0).toLocaleString()}</dd>
            <dt>Tax option</dt>
            <dd>{effectiveTaxType === "8_percent" ? "8%" : `Graduated — ${deductionMethod === "osd" ? "OSD" : "Itemized"}`}{salesAboveLimit ? " (set automatically: sales are ₱3,000,000 or more; VAT registration applies)" : ""}</dd>
            {itemized && <><dt>Projected annual expenses</dt><dd>₱{Number(projectedExpenses || 0).toLocaleString()}</dd></>}
            <dt>Estimated income tax</dt>
            <dd>{(() => {
              const est = estimateIncomeTax({ taxpayerType, taxOption: effectiveTaxType, deductionMethod, grossSales: Number(projectedGrossSales) || 0, expenses: Number(projectedExpenses) || 0 });
              return est.amount === null ? "Pending the consultant's graduated tax table" : peso(est.amount);
            })()}</dd>
            <dt>Business name</dt>
            <dd>{businessName || "—"}</dd>
          </dl>
        </section>
      )}

      {step === 9 && (
        <section className="review-summary">
          <h2>Ready to generate your roadmap</h2>
          <p>
            After answering the questions above, we'll match your profile against Gabay Negosyo's BIR compliance
            guide and build your personalized compliance checklist.
            {!user && " You can preview it now and create a free account afterwards to save it."}
          </p>
        </section>
      )}

      {step < STEPS.length - 1 && problem && (
        <p id="wizard-step-problem" role="status" className="hint wizard-problem">
          {problem}
        </p>
      )}
      {saveError && (
        <p role="alert" className="hint" style={{ color: "var(--red-text)" }}>
          {saveError}
        </p>
      )}

      <div className="wizard-actions">
        {step > 0 && (
          <button type="button" className="secondary-btn" onClick={back}>
            Back
          </button>
        )}
        {step < STEPS.length - 1 && (
          <button type="button" className="primary-btn" disabled={Boolean(problem)} aria-describedby={problem ? "wizard-step-problem" : undefined} onClick={next}>
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
  const { user, loading, reloadData } = useAuth();
  // Wait for the session check so a signed-in person's saved answers are loaded
  // before the form reads them (useState initial values are read once).
  if (loading) {
    return (
      <main className="screen">
        <p>Loading…</p>
      </main>
    );
  }
  // WP4: the wizard is open to guests, but a signed-in person whose saved data failed to load must not answer
  // questions that cannot be saved (and might overwrite the profile they already have).
  if (user?.dataLoadFailed) {
    return (
      <main className="screen">
        <ErrorState
          message="We could not load your saved information, so we cannot safely change your business profile right now. Check your internet connection and try again. Nothing has been lost or changed."
          onRetry={() => {
            void reloadData();
          }}
        />
      </main>
    );
  }
  return <WizardInner />;
}
