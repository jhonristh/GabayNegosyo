"use client";

import { useMemo, useState } from "react";
import { useAuth } from "../lib/auth";
import { db } from "../lib/db";
import { assertPremium } from "../lib/authorization";
import {
  BIR_PENALTY_RATES,
  MANDATORY_DISCLAIMER,
  estimateBirPenalty,
  estimatePenalty,
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
      assertPremium(user?.role);
    } catch {
      setError("The penalty calculator is a Premium feature.");
      return;
    }
    const parsed = { amount: amount.trim() === "" ? NaN : Number(amount), daysLate: daysLate.trim() === "" ? NaN : Number(daysLate) };
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
    <>
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
            <button type="button" className={`option-btn ${tier === "general" ? "selected" : ""}`} aria-pressed={tier === "general"} onClick={() => { setTier("general"); reset(); }}>
              General — {pct(BIR_PENALTY_RATES.generalSurcharge)} surcharge, {pct(BIR_PENALTY_RATES.generalInterest)} interest
            </button>
          </div>
          <p className="hint">Choose Micro only if your business is classified as micro. Confirm your classification with the BIR.</p>
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

      <section className="question">
        <label className="question-label" htmlFor="amount">{mode === "bir" ? "Unpaid tax due (₱)" : "Relevant amount (₱)"}</label>
        <input id="amount" type="number" min={0} inputMode="decimal" className="text-input" value={amount} onChange={(e) => edit(setAmount, e.target.value)} />
        <p className="hint">{mode === "bir" ? "The tax still unpaid. Surcharge and interest are computed on this base." : "Unpaid contribution or assessed base amount."}</p>
      </section>

      <section className="question">
        <label className="question-label" htmlFor="days">Days late</label>
        <input id="days" type="number" min={0} step={1} inputMode="numeric" className="text-input" value={daysLate} onChange={(e) => edit(setDaysLate, e.target.value)} />
      </section>

      {error && <p role="alert" className="hint" style={{ color: "var(--red-text)" }}>{error}</p>}

      <button type="button" className="primary-btn" onClick={calculate}>Calculate estimated penalty</button>

      {bir && (
        <section className="checklist-card" style={{ marginTop: 16 }} aria-live="polite">
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
        <section className="checklist-card" style={{ marginTop: 16 }} aria-live="polite">
          <h3>Estimated penalty: ₱{agency.estimatedPenalty.toLocaleString()}</h3>
          <ul className="doc-checklist">{agency.breakdown.map((l, i) => <li key={i}>{l}</li>)}</ul>
          <p className="penalty" style={{ marginTop: 10 }}>{MANDATORY_DISCLAIMER}</p>
        </section>
      )}
    </>
  );
}
