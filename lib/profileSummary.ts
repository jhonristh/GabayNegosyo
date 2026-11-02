import type { BusinessProfile } from "./types";

/**
 * Short labels for the "Business information" area of the dashboard. They only restate what the person
 * answered in the wizard; nothing is inferred.
 */
export function taxArrangementLabel(profile: Pick<BusinessProfile, "taxType" | "deductionMethod">): string | null {
  if (profile.taxType === "8_percent") return "8% income tax option";
  if (profile.taxType === "graduated") {
    if (profile.deductionMethod === "osd") return "Graduated rates, OSD";
    if (profile.deductionMethod === "itemized") return "Graduated rates, itemized deductions";
    return "Graduated rates";
  }
  return null;
}

export function employeeLabel(profile: Pick<BusinessProfile, "hasEmployees" | "employeeCount">): string {
  if (!profile.hasEmployees) return "No employees";
  return profile.employeeCount === 1 ? "1 employee" : `${profile.employeeCount} employees`;
}

export function businessStageLabel(profile: Pick<BusinessProfile, "isRegisteringNewBusiness">): string {
  return profile.isRegisteringNewBusiness ? "Registering a new business" : "Already registered";
}
