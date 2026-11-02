"use client";

import { useMemo, useState } from "react";
import { useAuth } from "../lib/auth";
import { db } from "../lib/db";
import { assertPremiumAccess } from "../lib/authorization";
import {
  BIR_PENALTY_RATES,
  MANDATORY_DISCLAIMER,
  estimateBirPenalty,
  estimatePenalty,
  estimateEightPercentTaxDue,
  validatePenaltyInput,
  type BirPenaltyResult,
  type BirTaxpayerTier,
} from "../lib/penalty";

type Mode = "bir" | "agency";

/** Estimate-only calculator. Rates come from lib/penalty.ts constants; nothing is hardcoded here. */
export default function PenaltyCalculator() {
  const { user } = useAuth();
  const agencyRequirements = useMemo(() => db.getRequirements().filter((r) => r.penaltyRule.type !== "not_specified"), []);
  const [mode, setMode] = useState<Mode>("bir");
  const [tier, setTier] = useState<BirTaxpayerTier>("micro");
  const [requirementId, setRequirementId] = useState(agencyRequirements[0]?.id ?? "");
  // Text state so an emptied field is "empty", not silently 0.
  const [useGross, setUseGross] = useState(false);
  const [mixedIncome, setMixedIncome] = useState(false);
  const [amount, setAmount] = useState("50000");
  const [daysLate, setDaysLate] = useState("20");
  const [error, setError] = useState<string | null>(null);
  const [bir, setBir] = useState<BirPenaltyResult | null>(null);
  const [agency, setAgency] = useState<{ estimatedPenalty: number; breakdown: string[] } | null>(null);

  function reset() {
    setBir(null);
    setAgency(null);
    setError(null);
  }
  function edit(setter: (v: string) => void, value: string) {
    setter(value);
    reset();
  }

  function calculate() {
    try {
      assertPremiumAccess(user);
    } catch {
      setError("The penalty calculator is a Premium feature.");
      return;
    }
    const raw = amount.trim() === "" ? NaN : Number(amount);
    const estimated = mode === "bir" && useGross ? estimateEightPercentTaxDue(raw,mixedIncome) : raw;
    if (mode === "bir" && useGross && estimated === null) {setError("Option B requires eligible gross sales below ₱3,000,000."); return;}
    const parsed = { amount: estimated ?? NaN, daysLate: daysLate.trim() === "" ? NaN : Number(daysLate) };
    const problem = validatePenaltyInput(parsed);
    if (problem) {
      setError(problem);
      setBir(null);
      setAgency(null);
      return;
    }
    setError(null);
    if (mode === "bir") {
      setBir(estimateBirPenalty({ taxDue: parsed.amount, daysLate: parsed.daysLate, tier }));
      setAgency(null);
    } else {
      const req = agencyRequirements.find((r) => r.id === requirementId);
      if (!req) return;
      setAgency(estimatePenalty(req.penaltyRule, parsed));
      setBir(null);
    }
  }

  const pct = (n: number) => `${(n * 100).toFixed(0)}%`;
  const peso = (n: number) => `₱${n.toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  return (
    <div className="penalty-sim">
      <div className="penalty-sim-inputs">
      <section className="question">
        <p className="question-label" id="mode-label">What are you estimating?</p>
        <div className="option-row" role="group" aria-labelledby="mode-label">
          <button type="button" className={`option-btn ${mode === "bir" ? "selected" : ""}`} aria-pressed={mode === "bir"} onClick={() => { setMode("bir"); reset(); }}>BIR tax filed or paid late</button>
          <button type="button" className={`option-btn ${mode === "agency" ? "selected" : ""}`} aria-pressed={mode === "agency"} onClick={() => { setMode("agency"); reset(); }}>Other agency requirement</button>
        </div>
      </section>

      {mode === "bir" ? (
        <section className="question">
          <p className="question-label" id="tier-label">Which rates apply to your business?</p>
          <div className="option-row" role="group" aria-labelledby="tier-label">
            <button type="button" className={`option-btn ${tier === "micro" ? "selected" : ""}`} aria-pressed={tier === "micro"} onClick={() => { setTier("micro"); reset(); }}>
              Micro business — {pct(BIR_PENALTY_RATES.microSurcharge)} penalty, {pct(BIR_PENALTY_RATES.microInterest)} interest
            </button>
            <button type="button" className={`option-btn ${tier === "small" ? "selected" : ""}`} aria-pressed={tier === "small"} onClick={() => { setTier("small"); reset(); }}>
              Small taxpayer — {pct(BIR_PENALTY_RATES.generalSurcharge)} surcharge, {pct(BIR_PENALTY_RATES.generalInterest)} interest
            </button>
          </div>
          <p className="hint">Micro: annual gross below ₱3M; small: ₱3M to below ₱20M. Confirm classification with BIR. RR 6-2024 applies subject to its conditions.</p>
        </section>
      ) : (
        <section className="question">
          <label className="question-label" htmlFor="req">Requirement</label>
          <select id="req" className="text-input" value={requirementId} onChange={(e) => edit(setRequirementId, e.target.value)}>
            {agencyRequirements.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
          </select>
          <p className="hint">{agencyRequirements.find((r) => r.id === requirementId)?.penaltyRule.description}</p>
        </section>
      )}

      {mode === "bir" && <section className="question"><label><input type="checkbox" checked={useGross} onChange={(e)=>{setUseGross(e.target.checked);reset();}} /> Option B: estimate 8% tax due from gross sales (eligible non-VAT only)</label>{useGross && <label><input type="checkbox" checked={mixedIncome} onChange={(e)=>{setMixedIncome(e.target.checked);reset();}} /> Mixed-income earner (no ₱250,000 deduction pending consultant confirmation)</label>}</section>}
      <section className="question">
        <label className="question-label" htmlFor="amount">{mode === "bir" ? (useGross ? "Projected gross sales (₱)" : "Unpaid tax due (₱)") : "Relevant amount (₱)"}</label>
        <input id="amount" type="number" min={0} inputMode="decimal" className="text-input" value={amount} onChange={(e) => edit(setAmount, e.target.value)} />
        <p className="hint">{mode === "bir" ? "Option A: known unpaid tax; Option B: gross sales less allowed ₱250k deduction for self-employed only; mixed-income deduction remains OPEN." : "Unpaid contribution or assessed base amount."}</p>
      </section>

      <section className="question">
        <label className="question-label" htmlFor="days">Days late</label>
        <input id="days" type="number" min={0} step={1} inputMode="numeric" className="text-input" value={daysLate} onChange={(e) => edit(setDaysLate, e.target.value)} />
      </section>

      {error && <p role="alert" className="hint" style={{ color: "var(--red-text)" }}>{error}</p>}

      <button type="button" className="primary-btn" onClick={calculate}>Calculate estimated penalty</button>
      </div>

      <div className="penalty-sim-result" aria-live="polite">
      {!bir && !agency && (
        <section className="checklist-card penalty-sim-empty">
          <h3>Your estimate</h3>
          <p className="hint">Fill in the amount and days late, then choose Calculate. The estimate and its breakdown appear here. It is a reference only, not an official BIR computation.</p>
        </section>
      )}

      {bir && (
        <section className="checklist-card">
          <h3>Estimated penalty: {peso(bir.totalPenalty)}</h3>
          <dl className="penalty-summary">
            <div><dt>Base (unpaid tax)</dt><dd>{peso(bir.taxDue)}</dd></div>
            <div><dt>Penalty rate (surcharge)</dt><dd>{pct(bir.surchargeRate)}</dd></div>
            <div><dt>Interest rate (per year)</dt><dd>{pct(bir.interestRate)}</dd></div>
            <div><dt>Surcharge</dt><dd>{peso(bir.surcharge)}</dd></div>
            <div><dt>Interest</dt><dd>{peso(bir.interest)}</dd></div>
            <div><dt>Estimated total (tax + penalty)</dt><dd>{peso(bir.totalAmount)}</dd></div>
          </dl>
          <ul className="doc-checklist">{bir.breakdown.map((l, i) => <li key={i}>{l}</li>)}</ul>
          <p className="penalty" style={{ marginTop: 10 }}>The compromise penalty is not included. {MANDATORY_DISCLAIMER}</p>
        </section>
      )}

      {agency && (
        <section className="checklist-card">
          <h3>Estimated penalty: ₱{agency.estimatedPenalty.toLocaleString()}</h3>
          <ul className="doc-checklist">{agency.breakdown.map((l, i) => <li key={i}>{l}</li>)}</ul>
          <p className="penalty" style={{ marginTop: 10 }}>{MANDATORY_DISCLAIMER}</p>
        </section>
      )}
      </div>
    </div>
  );
}
