/**
 * Plain-language validation for the account and wizard screens (Work Package 4).
 *
 * Pure functions, so the exact wording and the boundaries can be unit-tested without a browser.
 * Nothing here talks to Supabase; the server still enforces its own rules (for example the
 * password policy configured in Supabase Auth).
 */

export const MIN_PASSWORD_LENGTH = 8;

export interface SignupFields {
  name: string;
  email: string;
  password: string;
}
export type SignupErrors = Partial<Record<keyof SignupFields, string>>;

/** A deliberately simple shape check (something@something.tld). Supabase decides whether the address is deliverable. */
export function isPlausibleEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value.trim());
}

export function validateSignup(fields: SignupFields): SignupErrors {
  const errors: SignupErrors = {};
  if (!fields.name.trim()) errors.name = "Enter your name.";
  if (!fields.email.trim()) errors.email = "Enter your email address.";
  else if (!isPlausibleEmail(fields.email)) errors.email = "That email address does not look right. Check it for typos, for example name@email.com.";
  if (!fields.password) errors.password = "Create a password.";
  else if (fields.password.length < MIN_PASSWORD_LENGTH) errors.password = `Use at least ${MIN_PASSWORD_LENGTH} characters for your password.`;
  return errors;
}

export function validateLogin(email: string, password: string): Partial<Record<"email" | "password", string>> {
  const errors: Partial<Record<"email" | "password", string>> = {};
  if (!email.trim()) errors.email = "Enter your email address.";
  else if (!isPlausibleEmail(email)) errors.email = "That email address does not look right. Check it for typos.";
  if (!password) errors.password = "Enter your password.";
  return errors;
}

/** The answers the wizard needs to decide whether a step is complete. */
export interface WizardAnswers {
  isRegisteringNewBusiness: boolean | null;
  localityKnown: boolean;
  barangay: string;
  leaseApplicability: "" | "yes" | "no" | "na";
  hasEmployees: boolean | null;
  employeeCount: number;
  projectedGrossSales: number | "";
  businessName: string;
}

/**
 * Why a wizard step cannot continue yet, in plain language, or null when it can.
 * Step numbers follow the STEPS list in app/wizard/page.tsx. Steps with a default answer
 * (taxpayer type, tax type) and the review steps never block.
 */
export function wizardStepProblem(step: number, a: WizardAnswers): string | null {
  switch (step) {
    case 0:
      return a.isRegisteringNewBusiness === null ? "Choose Yes or No to continue." : null;
    case 2:
      if (!a.localityKnown) return "Select your city or municipality to continue.";
      if (!a.barangay.trim()) return "Select your barangay, or choose “My barangay isn’t listed” and type it.";
      return null;
    case 3:
      return a.leaseApplicability === "" ? "Choose Yes, No or Not Applicable to continue." : null;
    case 4:
      if (a.hasEmployees === null) return "Choose Yes or No to continue.";
      if (a.hasEmployees && !(Number.isInteger(a.employeeCount) && a.employeeCount >= 1)) return "Enter how many employees you have, as a whole number of 1 or more.";
      return null;
    case 5:
      if (a.projectedGrossSales === "" || Number.isNaN(a.projectedGrossSales)) return "Enter your projected annual gross sales or receipts. Enter 0 if you do not expect any yet.";
      if (a.projectedGrossSales < 0) return "Gross sales cannot be negative.";
      return null;
    case 7:
      return a.businessName.trim() ? null : "Enter a business name. It is only used to label your dashboard.";
    default:
      return null;
  }
}

/**
 * A post-login destination is accepted only when it is a path inside this site.
 * Anything else (another site, a protocol-relative URL, backslash tricks, control characters) is ignored.
 */
export function safeNextPath(raw: string | null | undefined): string | null {
  if (!raw || typeof raw !== "string") return null;
  if (!raw.startsWith("/") || raw.startsWith("//") || raw.includes("\\")) return null;
  if (/[\u0000-\u001f\u007f]/.test(raw)) return null;
  if (raw === "/login" || raw.startsWith("/login?") || raw.startsWith("/signup")) return null;
  return raw.length <= 200 ? raw : null;
}
