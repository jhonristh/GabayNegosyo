import graduatedTable from "../data/graduatedTaxTable.json";
import type { TaxpayerType } from "./types";

/**
 * Wizard tax-option estimate (Free tier, spec §1/§2). Pure functions; no UI.
 *
 * Spec §2: 8% tax is on (gross sales − ₱250,000), so expenses do not apply.
 * OPEN FL-16: the ₱250,000 deduction is NOT applied to Mixed Income Earners until the
 *   consultant/accountant confirms. Their 8% estimate is computed on gross sales without it.
 * OPEN FL-17: the graduated tax table comes from the consultant and lives in
 *   data/graduatedTaxTable.json. Until it is filled in, graduated amounts are "pending".
 */
export const EIGHT_PERCENT_RATE = 0.08;
export const EIGHT_PERCENT_DEDUCTION = 250_000;
/** Spec §2.5: at ₱3,000,000 and above the 8% option is unavailable and VAT registration applies. */
export const SALES_LIMIT_FOR_EIGHT_PERCENT = 3_000_000;
export const OSD_RATE = 0.4;

export interface Bracket { over: number; notOver: number | null; rate: number; plus: number; excessOver: number | null }

export function eightPercentUnavailable(grossSales: number): boolean {
  return Number.isFinite(grossSales) && grossSales >= SALES_LIMIT_FOR_EIGHT_PERCENT;
}

export interface TaxEstimateInput {
  taxpayerType: TaxpayerType;
  taxOption: "8_percent" | "graduated";
  deductionMethod?: "osd" | "itemized";
  grossSales: number;
  expenses?: number;
}
export interface TaxEstimate {
  /** null when an amount cannot be computed yet (graduated table pending). */
  amount: number | null;
  /** True when sales reached the limit, so graduated was applied automatically. */
  forcedGraduated: boolean;
  vatFlag: boolean;
  option: "8_percent" | "graduated";
  lines: string[];
}

const peso = (n: number) => `₱${n.toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const clean = (n: unknown) => (typeof n === "number" && Number.isFinite(n) && n > 0 ? n : 0);

export function graduatedTableReady(): boolean {
  const t = graduatedTable as { status: string; brackets: Bracket[] };
  return t.status === "CONSULTANT_PROVIDED" && Array.isArray(t.brackets) && t.brackets.length > 0;
}

export function graduatedTaxOn(taxableIncome: number): number | null {
  if (!graduatedTableReady()) return null;
  const brackets = (graduatedTable as { brackets: Bracket[] }).brackets;
  const income = clean(taxableIncome);
  const b = [...brackets].reverse().find((x) => income > x.over) ?? brackets[0];
  return b.plus + b.rate * (income - (b.excessOver ?? b.over));
}

export function estimateIncomeTax(input: TaxEstimateInput): TaxEstimate {
  const gross = clean(input.grossSales);
  const forced = eightPercentUnavailable(gross);
  const option = forced ? "graduated" : input.taxOption;
  const lines: string[] = [];
  const vatFlag = forced;
  if (forced) lines.push("Sales are ₱3,000,000 or more: the 8% option is not available, the graduated tax table applies, and the business must register as a VAT taxpayer.");

  if (option === "8_percent") {
    const mixed = input.taxpayerType === "mixed_income_earner";
    // FL-16: no ₱250,000 for mixed income earners (pending accountant confirmation).
    const base = mixed ? gross : Math.max(0, gross - EIGHT_PERCENT_DEDUCTION);
    const amount = base * EIGHT_PERCENT_RATE;
    lines.push(`Gross sales: ${peso(gross)}`);
    lines.push(mixed ? "₱250,000 deduction not applied for Mixed Income Earners (pending accountant confirmation)." : `Less ₱250,000: ${peso(base)}`);
    lines.push(`8% × ${peso(base)} = ${peso(amount)}`);
    return { amount, forcedGraduated: false, vatFlag: false, option, lines };
  }

  const method = input.deductionMethod === "itemized" ? "itemized" : "osd";
  const taxable = method === "osd" ? gross * (1 - OSD_RATE) : Math.max(0, gross - clean(input.expenses));
  lines.push(`Gross sales: ${peso(gross)}`);
  lines.push(method === "osd" ? `Less 40% OSD: taxable income ${peso(taxable)}` : `Less itemized expenses ${peso(clean(input.expenses))}: taxable income ${peso(taxable)}`);
  const tax = graduatedTaxOn(taxable);
  if (tax === null) lines.push("Graduated tax amount: pending the consultant's graduated tax table.");
  else lines.push(`Graduated tax: ${peso(tax)}`);
  return { amount: tax, forcedGraduated: forced, vatFlag, option, lines };
}
