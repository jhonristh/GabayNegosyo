// Rule-engine, penalty, and role tests (V0.2 §32).
// The engine/penalty logic lives in TypeScript; these tests re-implement the
// same pure functions against the real seed data so they run with zero build
// tooling. Any divergence between these and lib/ is itself a signal to check.

const test = require("node:test");
const assert = require("node:assert");
const requirements = require("../data/requirements.json");

function requirementApplies(req, profile) {
  const rule = req.applicabilityRules || {};
  if (rule.businessType && !rule.businessType.includes(profile.businessType)) return false;
  if (rule.businessStructure && !rule.businessStructure.includes(profile.businessStructure)) return false;
  if (rule.taxType && !rule.taxType.includes(profile.taxType)) return false;
  if (rule.hasEmployees !== undefined && rule.hasEmployees !== profile.hasEmployees) return false;
  if (rule.minEmployeeCount !== undefined && profile.employeeCount < rule.minEmployeeCount) return false;
  if (rule.status && !rule.status.includes(profile.status)) return false;
  return true;
}

function applicable(profile) {
  return requirements.filter((r) => !r.archived && requirementApplies(r, profile));
}

const soloFreelancer = {
  businessType: "freelancer", businessStructure: "sole_proprietor",
  taxType: "8_percent", hasEmployees: false, employeeCount: 0, status: "operating",
};
const employerRetail = {
  businessType: "retail_food", businessStructure: "sole_proprietor",
  taxType: "graduated", hasEmployees: true, employeeCount: 3, status: "operating",
};

test("solo freelancer gets no employer requirements", () => {
  const ids = applicable(soloFreelancer).map((r) => r.id);
  assert.ok(!ids.includes("sss-employer-reg"));
  assert.ok(!ids.includes("philhealth-employer-reg"));
  assert.ok(!ids.includes("pagibig-employer-reg"));
  assert.ok(!ids.includes("sss-contribution"));
});

test("employer gets all three agency registrations", () => {
  const ids = applicable(employerRetail).map((r) => r.id);
  assert.ok(ids.includes("sss-employer-reg"));
  assert.ok(ids.includes("philhealth-employer-reg"));
  assert.ok(ids.includes("pagibig-employer-reg"));
});

test("taxpayer type selects a matching income tax return (client-sourced BIR forms, not the old MVP taxType field)", () => {
  // rules.test.js pre-dates the real content migration (see CONTENT_AUDIT.md):
  // "bir-1701a"/"bir-1701q" were placeholder MVP ids keyed off a `taxType`
  // question the actual client wizard never asks. The real wizard asks
  // `taxpayerType` (see lib/types.ts TaxpayerType), and the workbook-sourced
  // requirements are "bir-1701a-8percent" / "bir-1701q-quarterly", matched
  // on taxpayerType. Re-implementing that matcher here rather than importing
  // lib/ruleEngine.ts, consistent with this file's own "zero build tooling"
  // design (see file header).
  function taxpayerTypeApplies(req, taxpayerType) {
    const rule = req.applicabilityRules || {};
    if (!rule.taxpayerType) return false;
    return rule.taxpayerType.includes(taxpayerType);
  }

  const eightPercentForm = requirements.find((r) => r.id === "bir-1701a-8percent");
  const quarterlyForm = requirements.find((r) => r.id === "bir-1701q-quarterly");
  assert.ok(eightPercentForm, "bir-1701a-8percent should exist in the real content");
  assert.ok(quarterlyForm, "bir-1701q-quarterly should exist in the real content");

  assert.ok(taxpayerTypeApplies(eightPercentForm, "purely_business"), "1701A should apply to a purely-business taxpayer");
  assert.ok(!taxpayerTypeApplies(eightPercentForm, "purely_compensation"), "1701A should not apply to a purely-compensation taxpayer");
  assert.ok(taxpayerTypeApplies(quarterlyForm, "self_employment_or_profession"), "1701Q should apply to a self-employed taxpayer");
});

test("every profile gets at least one requirement", () => {
  for (const profile of [soloFreelancer, employerRetail]) {
    assert.ok(applicable(profile).length > 0);
  }
});

test("planning-stage business does not yet get permit renewal", () => {
  const planning = { ...soloFreelancer, status: "planning" };
  const ids = applicable(planning).map((r) => r.id);
  assert.ok(!ids.includes("lgu-permit-renewal"), "renewal only applies once operating");
});

// ---- Penalty calculation ----

function estimate(rule, amount, daysLate) {
  const months = Math.max(1, Math.ceil(daysLate / 30));
  switch (rule.type) {
    case "percentage_surcharge_plus_monthly_interest":
      return Math.round(amount * (rule.surchargeRate || 0) + amount * (rule.monthlyRate || 0) * months);
    case "monthly_percentage":
      return Math.round(amount * (rule.monthlyRate || 0) * months);
    case "flat_plus_daily":
      return Math.round((rule.flatAmount || 0) + (rule.dailyRate || 0) * daysLate);
    default:
      return 0;
  }
}

test("penalty grows with days late", () => {
  const rule = requirements.find((r) => r.id === "sss-contribution").penaltyRule;
  const short = estimate(rule, 10000, 20);
  const long = estimate(rule, 10000, 200);
  assert.ok(long > short, "more days late must cost more");
});

test("penalty scales with amount", () => {
  // bir-1701a-8percent's penalty is honestly "not_specified" (see
  // CONTENT_AUDIT.md) — using lgu-permit-renewal instead, which does carry
  // a real numeric rate from the original MVP seed data.
  const rule = requirements.find((r) => r.id === "lgu-permit-renewal").penaltyRule;
  assert.ok(estimate(rule, 100000, 30) > estimate(rule, 10000, 30));
});

test("zero amount produces zero percentage-based penalty", () => {
  const rule = requirements.find((r) => r.id === "lgu-permit-renewal").penaltyRule;
  assert.strictEqual(estimate(rule, 0, 45), 0);
});

test("every requirement's penalty rule is a recognized type, and not_specified is never given a fabricated rate", () => {
  // "not_specified" is a deliberate, honest state (see R2 / CONTENT_AUDIT.md):
  // the client-provided workbook did not give penalty rates for almost every
  // BIR requirement, so this field says so instead of inventing a number.
  const valid = ["percentage_surcharge_plus_monthly_interest", "monthly_percentage", "flat_plus_daily", "not_specified"];
  for (const r of requirements) {
    assert.ok(valid.includes(r.penaltyRule.type), `${r.id} bad penalty type`);
    assert.ok(r.penaltyRule.description.length > 0, `${r.id} penalty missing description`);
    if (r.penaltyRule.type === "not_specified") {
      assert.ok(
        r.penaltyRule.flatAmount === undefined && r.penaltyRule.surchargeRate === undefined && r.penaltyRule.monthlyRate === undefined,
        `${r.id} is not_specified but still carries a numeric rate`
      );
    }
  }
});

// ---- Role / permission model ----

function isPremiumRole(role) { return role === "premium" || role === "admin"; }
function isAdminRole(role) { return role === "admin"; }

test("free users are not premium and not admin", () => {
  assert.strictEqual(isPremiumRole("free"), false);
  assert.strictEqual(isAdminRole("free"), false);
});

test("premium users get premium but not admin", () => {
  assert.strictEqual(isPremiumRole("premium"), true);
  assert.strictEqual(isAdminRole("premium"), false);
});

test("admins get both", () => {
  assert.strictEqual(isPremiumRole("admin"), true);
  assert.strictEqual(isAdminRole("admin"), true);
});

test("undefined role is denied everything", () => {
  assert.strictEqual(isPremiumRole(undefined), false);
  assert.strictEqual(isAdminRole(undefined), false);
});
