// Core domain types. Mirrors database/schema.sql so the local demo layer
// can be swapped for Supabase later without changing consumer code.

export type Role = "free" | "premium" | "admin";

export type BusinessType = "online_seller" | "freelancer" | "retail_food" | "service_provider" | "other";
export type BusinessStructure = "sole_proprietor" | "partnership" | "corporation" | "not_registered_yet";
export type TaxType = "8_percent" | "graduated" | "vat_registered" | "not_sure";
export type BusinessStatus = "planning" | "newly_registered" | "operating";

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
  businessName: string;
  businessType: BusinessType;
  businessStructure: BusinessStructure;
  taxType: TaxType;
  hasEmployees: boolean;
  employeeCount: number;
  location: string;
  status: BusinessStatus;
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

export type PenaltyRuleType = "percentage_surcharge_plus_monthly_interest" | "monthly_percentage" | "flat_plus_daily";

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
  hasEmployees?: boolean;
  minEmployeeCount?: number;
  status?: BusinessStatus[];
}

export interface Requirement {
  id: string;
  agencyId: string;
  name: string;
  description: string; // "What is this?"
  whoItAppliesTo: string; // human-readable, in addition to applicabilityRules
  applicabilityRules: ApplicabilityRule;
  requiredDocuments: RequiredDocument[];
  instructions: string[]; // step by step
  deadlineDescription: string; // human-readable recurrence, e.g. "Annually, May 15"
  deadlineMonth: number; // 1-12, used to compute next due date
  deadlineDay: number;
  penaltyRule: PenaltyRule;
  officialUrl: string;
  tutorialId?: string;
  lastVerified: string; // ISO date
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
