import type { BusinessProfile } from "./types";

/** Synthetic, clearly labelled sample business for demo mode. Not real data. */
export function demoSeedProfile(userId: string): BusinessProfile {
  return {
    id: `biz-${userId}`,
    userId,
    isRegisteringNewBusiness: false,
    taxpayerType: "purely_business",
    locality: "manila",
    barangay: "Sample Barangay",
    rdoCode: "",
    hasLease: true,
    hasEmployees: true,
    employeeCount: 2,
    projectedGrossSales: 500000,
    projectedExpenses: 200000,
    businessName: "Sample Store (demo data)",
    location: "Sample Barangay, City of Manila",
    status: "operating",
    businessType: "other",
    businessStructure: "sole_proprietor",
    taxType: "not_sure",
    createdAt: new Date(0).toISOString(),
  };
}
