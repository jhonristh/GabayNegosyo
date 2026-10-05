import type { PenaltyRule } from "./types";

export interface PenaltyEstimateInput {
  amount: number; // relevant income/tax/contribution base
  daysLate: number;
}

export interface PenaltyEstimateResult {
  estimatedPenalty: number;
  breakdown: string[];
}

/**
 * Pure calculation layer. Each PenaltyRuleType maps to one formula here.
 * Swapping or correcting a formula never touches UI code — only this file.
 * All results are ESTIMATES; see the mandatory disclaimer shown alongside
 * every result in the UI (MANDATORY_DISCLAIMER, rendered by the simulator page).
 */
export function isValidAmount(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && value >= 0;
}

export function isValidDaysLate(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && value >= 0 && Number.isInteger(value);
}

/** Returns a plain-language problem with the input, or null when it is usable. */
export function validatePenaltyInput(input: { amount: unknown; daysLate: unknown }): string | null {
  if (!isValidAmount(input.amount)) return "Enter an amount of 0 or more.";
  if (!isValidDaysLate(input.daysLate)) return "Enter days late as a whole number, 0 or more.";
  return null;
}

export function estimatePenalty(rule: PenaltyRule, input: PenaltyEstimateInput): PenaltyEstimateResult {
  const { amount, daysLate } = input;
  if (validatePenaltyInput({ amount, daysLate })) {
    return { estimatedPenalty: 0, breakdown: ["Enter a valid amount and number of days late to see an estimate."] };
  }
  // Not late yet → nothing has accrued (previously this still charged a full month).
  if (daysLate === 0) {
    return { estimatedPenalty: 0, breakdown: ["0 days late: no penalty has accrued yet."] };
  }
  const monthsLate = Math.max(1, Math.ceil(daysLate / 30));
  const breakdown: string[] = [];

  switch (rule.type) {
    case "percentage_surcharge_plus_monthly_interest": {
      const surcharge = amount * (rule.surchargeRate ?? 0);
      const interest = amount * (rule.monthlyRate ?? 0) * monthsLate;
      breakdown.push(`Surcharge (${((rule.surchargeRate ?? 0) * 100).toFixed(0)}%): ₱${surcharge.toLocaleString()}`);
      breakdown.push(`Interest (${((rule.monthlyRate ?? 0) * 100).toFixed(1)}%/month × ${monthsLate} mo.): ₱${interest.toLocaleString()}`);
      return { estimatedPenalty: Math.round(surcharge + interest), breakdown };
    }
    case "monthly_percentage": {
      const penalty = amount * (rule.monthlyRate ?? 0) * monthsLate;
      breakdown.push(`${((rule.monthlyRate ?? 0) * 100).toFixed(0)}%/month × ${monthsLate} month(s): ₱${penalty.toLocaleString()}`);
      return { estimatedPenalty: Math.round(penalty), breakdown };
    }
    case "flat_plus_daily": {
      const flat = rule.flatAmount ?? 0;
      const daily = (rule.dailyRate ?? 0) * daysLate;
      breakdown.push(`Base compromise penalty: ₱${flat.toLocaleString()}`);
      if (daily > 0) breakdown.push(`Additional daily rate × ${daysLate} day(s): ₱${daily.toLocaleString()}`);
      return { estimatedPenalty: Math.round(flat + daily), breakdown };
    }
    case "not_specified":
      return {
        estimatedPenalty: 0,
        breakdown: ["Information not provided in the current content source. No estimate is computed for this requirement."],
      };
    default:
      return { estimatedPenalty: 0, breakdown: ["No penalty formula available for this requirement."] };
  }
}

export const MANDATORY_DISCLAIMER =
  "Estimate lang ito para sa awareness. Hindi ito kapalit ng aktwal na computation ng isang accountant o ng BIR para sa opisyal na pag-file.";

/**
 * BIR late-filing / late-payment rates approved by the client for this release.
 * One source of truth: the Penalties page rate table AND the calculator below
 * both read these constants, so the displayed rates can never drift from the math.
 *
 * - Micro business: 10% surcharge, 6% per annum interest (halved).
 * - General taxpayer: 12% per annum interest. The 25% surcharge for the general
 *   case comes from the client's PENALTIES.pdf (NIRC Sec. 248) and is unchanged.
 */
export const BIR_PENALTY_RATES = {
  microSurcharge: 0.1,
  microInterest: 0.06,
  generalSurcharge: 0.25,
  generalInterest: 0.12,
} as const;

export type BirTaxpayerTier = "micro" | "general";

export interface BirPenaltyResult {
  tier: BirTaxpayerTier;
  taxDue: number;
  daysLate: number;
  surchargeRate: number;
  interestRate: number; // per annum
  surcharge: number;
  interest: number;
  totalPenalty: number; // surcharge + interest
  totalAmount: number; // tax due + penalty
  breakdown: string[];
}

const peso = (n: number) => `₱${n.toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

/**
 * Surcharge is a one-time percentage of the unpaid tax; interest is a per-annum
 * rate accrued daily (rate × days late ÷ 365). The compromise penalty is not
 * computed (the client source gives only a range, scaled per RMO 7-2015).
 */
export function estimateBirPenalty(input: { taxDue: number; daysLate: number; tier: BirTaxpayerTier }): BirPenaltyResult | null {
  const { taxDue, daysLate, tier } = input;
  if (validatePenaltyInput({ amount: taxDue, daysLate })) return null;
  const surchargeRate = tier === "micro" ? BIR_PENALTY_RATES.microSurcharge : BIR_PENALTY_RATES.generalSurcharge;
  const interestRate = tier === "micro" ? BIR_PENALTY_RATES.microInterest : BIR_PENALTY_RATES.generalInterest;
  const late = daysLate > 0;
  const surcharge = late ? taxDue * surchargeRate : 0;
  const interest = late ? (taxDue * interestRate * daysLate) / 365 : 0;
  const totalPenalty = surcharge + interest;
  const pct = (r: number) => `${(r * 100).toFixed(0)}%`;
  const breakdown = late
    ? [
        `Unpaid tax (base): ${peso(taxDue)}`,
        `Surcharge: ${pct(surchargeRate)} × ${peso(taxDue)} = ${peso(surcharge)}`,
        `Interest: ${pct(interestRate)} per year × ${daysLate} day(s) ÷ 365 = ${peso(interest)}`,
        `Estimated penalty (surcharge + interest): ${peso(totalPenalty)}`,
        `Estimated total (tax + penalty): ${peso(taxDue + totalPenalty)}`,
      ]
    : ["0 days late: no surcharge or interest has accrued yet."];
  if (late && taxDue === 0) breakdown.push("No tax is due, so surcharge and interest are ₱0. Only a compromise penalty may apply; it is not computed here.");
  return { tier, taxDue, daysLate, surchargeRate, interestRate, surcharge, interest, totalPenalty, totalAmount: taxDue + totalPenalty, breakdown };
}
