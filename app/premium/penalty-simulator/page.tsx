"use client";

import { useMemo, useState } from "react";
import AuthGuard from "../../../components/AuthGuard";
import PremiumGate from "../../../components/PremiumGate";
import { useAuth } from "../../../lib/auth";
import { db } from "../../../lib/db";
import { estimatePenalty, validatePenaltyInput, MANDATORY_DISCLAIMER } from "../../../lib/penalty";
import { assertPremium } from "../../../lib/authorization";

function SimulatorForm() {
  const { user } = useAuth();
  const requirements = useMemo(() => db.getRequirements(), []);
  const [requirementId, setRequirementId] = useState(requirements[0]?.id ?? "");
  // Inputs are kept as text so an emptied field is "empty", not silently 0.
  const [amount, setAmount] = useState<string>("50000");
  const [daysLate, setDaysLate] = useState<string>("20");
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ estimatedPenalty: number; breakdown: string[] } | null>(null);

  const requirement = requirements.find((r) => r.id === requirementId);

  function handleCalculate() {
    // Service-layer check as well as UI-level PremiumGate wrapper — belt and suspenders.
    try {
      assertPremium(user?.role);
    } catch {
      setError("The penalty simulator is a Premium feature.");
      return;
    }
    if (!requirement) return;
    const parsed = { amount: amount.trim() === "" ? NaN : Number(amount), daysLate: daysLate.trim() === "" ? NaN : Number(daysLate) };
    const problem = validatePenaltyInput(parsed);
    if (problem) {
      setError(problem);
      setResult(null);
      return;
    }
    setError(null);
    setResult(estimatePenalty(requirement.penaltyRule, parsed));
  }

  function edit(setter: (v: string) => void, value: string) {
    setter(value);
    setResult(null); // never leave a stale estimate next to changed inputs
    setError(null);
  }

  return (
    <>
      <section className="question">
        <label className="question-label" htmlFor="req">
          Requirement
        </label>
        <select id="req" className="text-input" value={requirementId} onChange={(e) => edit(setRequirementId, e.target.value)}>
          {requirements.map((r) => (
            <option key={r.id} value={r.id}>
              {r.name}
            </option>
          ))}
        </select>
      </section>

      <section className="question">
        <label className="question-label" htmlFor="amount">
          Relevant amount (₱)
        </label>
        <input id="amount" type="number" min={0} inputMode="decimal" className="text-input" value={amount} onChange={(e) => edit(setAmount, e.target.value)} />
        <p className="hint">Tax due, unpaid contribution, or assessed base amount; depends on the requirement.</p>
      </section>

      <section className="question">
        <label className="question-label" htmlFor="days">
          Days late
        </label>
        <input id="days" type="number" min={0} step={1} inputMode="numeric" className="text-input" value={daysLate} onChange={(e) => edit(setDaysLate, e.target.value)} />
      </section>

      {error && (
        <p role="alert" className="hint" style={{ color: "var(--red-text)" }}>
          {error}
        </p>
      )}

      <button type="button" className="primary-btn" onClick={handleCalculate}>
        Calculate estimated penalty
      </button>

      {result && (
        <section className="checklist-card" style={{ marginTop: 16 }}>
          <h3>Estimated Penalty: ₱{result.estimatedPenalty.toLocaleString()}</h3>
          <ul className="doc-checklist">
            {result.breakdown.map((line, i) => (
              <li key={i}>{line}</li>
            ))}
          </ul>
          <p className="penalty" style={{ marginTop: 10 }}>
            {MANDATORY_DISCLAIMER}
          </p>
        </section>
      )}
    </>
  );
}

function SimulatorInner() {
  return (
    <main className="screen">
      <header className="intro">
        <h1>Penalty Simulator</h1>
        <p>Estimate the potential penalty for a specific requirement.</p>
      </header>
      <PremiumGate>
        <SimulatorForm />
      </PremiumGate>
    </main>
  );
}

export default function PenaltySimulatorPage() {
  return (
    <AuthGuard>
      <SimulatorInner />
    </AuthGuard>
  );
}
