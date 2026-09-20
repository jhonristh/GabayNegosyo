"use client";

import { useMemo, useState } from "react";
import AuthGuard from "../../../components/AuthGuard";
import PremiumGate from "../../../components/PremiumGate";
import { useAuth } from "../../../lib/auth";
import { db } from "../../../lib/db";
import { estimatePenalty, PENALTY_DISCLAIMER } from "../../../lib/penalty";
import { assertPremium } from "../../../lib/authorization";

function SimulatorForm() {
  const { user } = useAuth();
  const requirements = useMemo(() => db.getRequirements(), []);
  const [requirementId, setRequirementId] = useState(requirements[0]?.id ?? "");
  const [amount, setAmount] = useState<number>(50000);
  const [daysLate, setDaysLate] = useState<number>(20);
  const [result, setResult] = useState<{ estimatedPenalty: number; breakdown: string[] } | null>(null);

  const requirement = requirements.find((r) => r.id === requirementId);

  function handleCalculate() {
    // Service-layer check as well as UI-level PremiumGate wrapper — belt and suspenders.
    try {
      assertPremium(user?.role);
    } catch {
      return;
    }
    if (!requirement) return;
    setResult(estimatePenalty(requirement.penaltyRule, { amount, daysLate }));
  }

  return (
    <>
      <section className="question">
        <label className="question-label" htmlFor="req">
          Requirement
        </label>
        <select id="req" className="text-input" value={requirementId} onChange={(e) => setRequirementId(e.target.value)}>
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
        <input id="amount" type="number" className="text-input" value={amount} onChange={(e) => setAmount(Number(e.target.value))} />
        <p className="hint">Tax due, unpaid contribution, or assessed base amount — depends on the requirement.</p>
      </section>

      <section className="question">
        <label className="question-label" htmlFor="days">
          Days late
        </label>
        <input id="days" type="number" className="text-input" value={daysLate} onChange={(e) => setDaysLate(Number(e.target.value))} />
      </section>

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
            {PENALTY_DISCLAIMER}
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
