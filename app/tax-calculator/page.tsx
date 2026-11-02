"use client";

import { useState } from "react";
import Link from "next/link";
import { estimateEightPercentTaxDue } from "../../lib/penalty";

/** Free, penalty-free estimate. Graduated rates are intentionally pending consultant FL-17. */
export default function TaxCalculatorPage() {
  const [sales, setSales] = useState<string>("");
  const [taxpayer, setTaxpayer] = useState<"self" | "mixed">("self");
  const [option, setOption] = useState<"8_percent" | "graduated">("8_percent");
  const valid = sales.trim() !== "" && Number.isFinite(Number(sales)) && Number(sales) >= 0;
  const gross = valid ? Number(sales) : 0;
  const overThreshold = valid && gross >= 3000000;
  const estimate = valid && !overThreshold && option === "8_percent"
    ? estimateEightPercentTaxDue(gross, taxpayer === "mixed") : null;
  return <main className="screen">
    <header className="intro"><h1>Estimated Income Tax Calculator</h1><p>Calculate a preliminary tax amount without late-payment penalties or interest. This is separate from the Premium Penalty Simulator.</p></header>
    <section className="checklist-card" style={{maxWidth:720}}>
      <label className="question-label" htmlFor="tax-calc-sales">Annual gross sales / receipts (₱)</label>
      <input className="text-input" id="tax-calc-sales" type="number" min="0" value={sales} onChange={e=>setSales(e.target.value)} placeholder="e.g. 500000" />
      <label className="question-label" htmlFor="tax-calc-taxpayer">Taxpayer type</label>
      <select className="text-input" id="tax-calc-taxpayer" value={taxpayer} onChange={e=>setTaxpayer(e.target.value as "self" | "mixed")}><option value="self">Self-Employment or Profession</option><option value="mixed">Mixed Income Earner</option></select>
      <label className="question-label" htmlFor="tax-calc-option">Tax option</label>
      <select className="text-input" id="tax-calc-option" value={overThreshold ? "graduated" : option} onChange={e=>setOption(e.target.value as "8_percent" | "graduated")}><option value="8_percent" disabled={overThreshold}>8% option</option><option value="graduated">Graduated rates (pending consultant's table)</option></select>
      {!valid && sales !== "" && <p role="alert">Enter a non-negative annual gross sales amount.</p>}
      {overThreshold && <p role="status">The 8% option is disabled at ₱3,000,000 or more under the current prototype rule. VAT registration and the graduated-tax calculation require confirmation; no amount is calculated here.</p>}
      {valid && (option === "graduated" || overThreshold) && <p role="status">Graduated income-tax computation is not yet available because the consultant-approved tax table is pending (FL-17). No amount has been estimated.</p>}
      {estimate !== null && <div aria-live="polite"><p className="question-label">Estimated annual income tax (excluding penalties)</p><h2>₱{estimate.toLocaleString("en-PH",{minimumFractionDigits:2,maximumFractionDigits:2})}</h2><p className="hint">{taxpayer === "mixed" ? "Mixed-income illustration: gross business receipts × 8%, without a ₱250,000 deduction (FL-16 pending confirmation). Compensation income tax is not included." : "Illustration: max(0, gross receipts − ₱250,000) × 8%."}</p></div>}
      <p className="hint">BMBE registration is not automatically a tax exemption. This tool does not determine BMBE eligibility, VAT, percentage tax, allowable credits, or the final amount payable. Confirm your tax treatment with BIR or a qualified accountant.</p>
      <p className="hint">Estimate lang ito para sa awareness. Hindi ito kapalit ng aktwal na computation ng isang accountant o ng BIR para sa opisyal na pag-file.</p>
      <Link href="/penalties" className="secondary-btn">View penalties separately</Link>
    </section>
  </main>;
}
