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
 * every result in the UI (components/PenaltyDisclaimer usage).
 */
export function estimatePenalty(rule: PenaltyRule, input: PenaltyEstimateInput): PenaltyEstimateResult {
  const { amount, daysLate } = input;
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

export const PENALTY_DISCLAIMER =
  "Estimate lang ito para sa awareness. Hindi ito kapalit ng aktwal na computation ng isang accountant o ng BIR para sa opisyal na pag-file.";
