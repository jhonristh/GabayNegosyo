// Core domain types. Mirrors database/schema.sql so the local demo layer
// can be swapped for Supabase later without changing consumer code.

export type Role = "free" | "premium" | "admin";

export type BusinessType = "online_seller" | "freelancer" | "retail_food" | "service_provider" | "other";
export type BusinessStructure = "sole_proprietor" | "partnership" | "corporation" | "not_registered_yet";
export type TaxType = "8_percent" | "graduated" | "vat_registered" | "not_sure";
export type BusinessStatus = "planning" | "newly_registered" | "operating";

/**
 * Taxpayer Type — the four options from the Registration Wizard content
 * source (Flowchart.FINAL.xlsx > Registration sheet; "Actual Contents for
 * Registration Wizard.txt"). These are the actual BIR taxpayer categories
 * the client's intake flow is built around.
 */
export type TaxpayerType =
  | "purely_compensation"
  | "self_employment_or_profession"
  | "purely_business"
  | "mixed_income_earner";

export interface User {
  id: string;
  email: string;
  name: string;
  role: Role;
  createdAt: string;
}

export interface BusinessProfile {
  id: string;
  userId: string;
  // ── Fields from the actual Registration Wizard content source ──
  isRegisteringNewBusiness: boolean;
  taxpayerType: TaxpayerType;
  barangay: string; // Quezon City barangay, looked up against data/barangayRdo.json
  rdoCode: string; // auto-derived from barangay, e.g. "RDO 39"
  hasLease: boolean;
  hasEmployees: boolean;
  projectedGrossSales: number; // annual, PHP
  projectedExpenses: number; // annual, PHP
  // ── Prototype UX additions (not part of the source questionnaire,
  //    kept for personalization / legacy screens; see PROGRESS.md) ──
  businessName: string;
  employeeCount: number;
  location: string;
  status: BusinessStatus;
  // ── Legacy MVP fields, retained so older seed data / UI still compiles.
  //    New logic should prefer taxpayerType over businessType/taxType. ──
  businessType: BusinessType;
  businessStructure: BusinessStructure;
  taxType: TaxType;
  createdAt: string;
}

export interface Agency {
  id: string;
  name: string;
  description: string;
  officialUrl: string;
  archived?: boolean;
}

export interface RequiredDocument {
  name: string;
  description: string;
}

export type PenaltyRuleType =
  | "percentage_surcharge_plus_monthly_interest"
  | "monthly_percentage"
  | "flat_plus_daily"
  | "not_specified"; // penalty rate/formula not given in the current content source — do not compute an estimate

export interface PenaltyRule {
  type: PenaltyRuleType;
  surchargeRate?: number; // e.g. 0.25 for 25%
  monthlyRate?: number; // e.g. 0.02 for 2%/month
  flatAmount?: number;
  dailyRate?: number;
  description: string;
}

export interface ApplicabilityRule {
  businessType?: BusinessType[];
  businessStructure?: BusinessStructure[];
  taxType?: TaxType[];
  taxpayerType?: TaxpayerType[];
  hasEmployees?: boolean;
  minEmployeeCount?: number;
  hasLease?: boolean;
  isRegisteringNewBusiness?: boolean;
  status?: BusinessStatus[];
}

/**
 * Where a Requirement's content came from. Set on every record so the UI
 * (and this migration's content audit) can show provenance honestly —
 * required by the "no invented compliance content" rule.
 */
export type ContentSource =
  | "flowchart_final_workbook" // Flowchart.FINAL.xlsx — authoritative
  | "registration_wizard_txt" // Actual Contents for Registration Wizard.txt
  | "prototype_placeholder"; // earlier MVP demo content, not yet sourced from client material

export interface Requirement {
  id: string;
  agencyId: string;
  name: string;
  description: string; // "What is this?"
  whoItAppliesTo: string; // human-readable, in addition to applicabilityRules
  applicabilityRules: ApplicabilityRule;
  requiredDocuments: RequiredDocument[];
  instructions: string[]; // step by step ("Action Step" column in the workbook)
  complianceStage?: string; // e.g. "Pre-Registration", "BIR Registration", "Books Registration"
  deadlineDescription: string; // human-readable recurrence, e.g. "Annually, May 15"
  deadlineMonth: number; // 1-12, used to compute next due date
  deadlineDay: number;
  penaltyRule: PenaltyRule;
  officialUrl: string;
  tutorialId?: string;
  lastVerified: string; // ISO date
  contentSource: ContentSource;
  archived?: boolean;
}

export type ResourceType = "form" | "guide" | "tutorial" | "official_website" | "requirement" | "document";

export interface ResourceItem {
  id: string;
  title: string;
  resourceType: ResourceType;
  agencyId: string;
  description: string;
  url: string;
  relatedRequirementId?: string;
  lastVerified: string;
  archived?: boolean;
}

export interface Tutorial {
  id: string;
  title: string;
  description: string;
  videoUrl: string;
  agencyId: string;
  relatedRequirementId?: string;
  category: "registration" | "filing" | "payment" | "contribution" | "renewal" | "application";
  isPlaceholder: boolean;
  archived?: boolean;
}

export type RequirementStatus = "upcoming" | "due_soon" | "overdue" | "completed";

export interface ChecklistItem {
  requirementId: string;
  businessId: string;
  status: RequirementStatus;
  dueDate: string; // ISO date, computed
  completedAt?: string;
}

export interface ReminderConfig {
  requirementId: string;
  enabled: boolean;
  daysBefore: 7 | 3 | 1;
}

export interface SentEmail {
  id: string;
  to: string;
  subject: string;
  body: string;
  sentAt: string;
}

export interface AnalyticsEvent {
  id: string;
  userId: string;
  eventType: string;
  metadata: Record<string, unknown>;
  createdAt: string;
}
