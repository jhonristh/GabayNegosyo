"use client";

import AuthGuard from "../../components/AuthGuard";
import PremiumGate from "../../components/PremiumGate";
import PenaltyCalculator from "../../components/PenaltyCalculator";
import { JourneyHeader, JourneyNext } from "../../components/JourneyStepper";
import { BIR_PENALTY_RATES } from "../../lib/penalty";

const pct = (n: number) => `${(n * 100).toFixed(0)}%`;

export default function PenaltiesPage() {
  return (
    <AuthGuard>
      <main className="screen">
        <JourneyHeader
          current="penalties"
          title="Penalties"
          intro="See the rates used for late BIR filing and payment, then estimate what a late filing could cost."
        />

        <section className="checklist-card" aria-labelledby="rates-h">
          <h2 id="rates-h">Rates used on GabayNegosyo</h2>
          <table className="rates-table">
            <thead><tr><th scope="col">Component</th><th scope="col">Rate</th></tr></thead>
            <tbody>
              <tr><th scope="row">Micro business penalty (surcharge)</th><td>{pct(BIR_PENALTY_RATES.microSurcharge)}</td></tr>
              <tr><th scope="row">Interest, micro-business calculation (per year)</th><td>{pct(BIR_PENALTY_RATES.microInterest)}</td></tr>
              <tr><th scope="row">General interest (per year)</th><td>{pct(BIR_PENALTY_RATES.generalInterest)}</td></tr>
            </tbody>
          </table>
          <p className="hint">For non-micro taxpayers the client’s guide also lists a {pct(BIR_PENALTY_RATES.generalSurcharge)} surcharge. Interest accrues daily on the unpaid tax. A compromise penalty may also apply and is not computed here.</p>
        </section>

        <PremiumGate>
          <PenaltyCalculator />
        </PremiumGate>

        <JourneyNext current="penalties" />
      </main>
    </AuthGuard>
  );
}
