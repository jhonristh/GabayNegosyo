import type { TaxpayerType } from "./types";

/**
 * Consultant-final wizard (spec §2): only two taxpayer types remain.
 * "Purely Compensation" (not applicable) and "Purely Business" (redundant with
 * Self-Employment or Profession) were removed. Profiles saved before this change
 * may still carry the old values, so every profile read passes through here.
 */
export const TAXPAYER_TYPES: { value: TaxpayerType; label: string }[] = [
  { value: "self_employment_or_profession", label: "Self-Employment or Profession" },
  { value: "mixed_income_earner", label: "Mixed Income Earner" },
];

/** Maps any stored value (including removed ones) to a current TaxpayerType. Unknown values fall back to self-employment. */
export function normalizeTaxpayerType(raw: unknown): TaxpayerType {
  if (raw === "mixed_income_earner") return "mixed_income_earner";
  // "self_employment_or_profession", legacy "purely_business" and "purely_compensation", and anything unknown.
  return "self_employment_or_profession";
}
