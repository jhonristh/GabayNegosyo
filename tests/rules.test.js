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

test("tax type selects exactly one income tax return", () => {
  const solo = applicable(soloFreelancer).map((r) => r.id);
  assert.ok(solo.includes("bir-1701a"), "8% should get 1701A");
  assert.ok(!solo.includes("bir-1701q"), "8% should not get 1701Q");

  const grad = applicable(employerRetail).map((r) => r.id);
  assert.ok(grad.includes("bir-1701q"), "graduated should get 1701Q");
  assert.ok(!grad.includes("bir-1701a"), "graduated should not get 1701A");
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
  const rule = requirements.find((r) => r.id === "bir-1701a").penaltyRule;
  assert.ok(estimate(rule, 100000, 30) > estimate(rule, 10000, 30));
});

test("zero amount produces zero percentage-based penalty", () => {
  const rule = requirements.find((r) => r.id === "bir-1701a").penaltyRule;
  assert.strictEqual(estimate(rule, 0, 45), 0);
});

test("every requirement has a usable penalty rule", () => {
  const valid = ["percentage_surcharge_plus_monthly_interest", "monthly_percentage", "flat_plus_daily"];
  for (const r of requirements) {
    assert.ok(valid.includes(r.penaltyRule.type), `${r.id} bad penalty type`);
    assert.ok(r.penaltyRule.description.length > 0, `${r.id} penalty missing description`);
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
