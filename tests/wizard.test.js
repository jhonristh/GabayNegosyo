// Registration wizard tests.
//
// Rewritten for V0.3: the previous version of this file asserted a
// 3-question wizard ("Business Type, Tax Type, Employees") with Filipino
// option wording ("May empleyado"/"Walang empleyado") — that was never the
// real client source. The actual source is the client-provided
// Flowchart.FINAL.xlsx workbook and "Actual Contents for Registration
// Wizard.txt" (see CONTENT_AUDIT.md), which specify seven real questions:
// registering a new business?, taxpayer type, barangay (→ auto RDO code),
// lease?, employees?, projected annual gross sales, projected annual
// expenses. This file now tests that real, source-grounded wizard instead.

const test = require("node:test");
const assert = require("node:assert");
const fs = require("node:fs");
const path = require("node:path");
const requirements = require("../data/requirements.json");
const barangayRdo = require("../data/barangayRdo.json");

const wizard = fs.readFileSync(path.join(__dirname, "..", "app", "wizard", "page.tsx"), "utf8");

test("wizard asks the seven real client questions, plus business name, review, and result steps", () => {
  const match = wizard.match(/const STEPS = \[(.*?)\];/s);
  assert.ok(match, "STEPS array not found");
  const steps = match[1].split(",").map((s) => s.trim()).filter((s) => s.length > 0);
  // 9 steps: New Business?, Taxpayer Type, Business Location, Lease,
  // Employees, Projected Sales & Expenses, Business Name, Review, Generate.
  assert.strictEqual(steps.length, 9, `expected 9 wizard steps, got ${steps.length}`);
});

test("wizard uses the client's exact taxpayer-type wording", () => {
  for (const wording of ["Purely Compensation", "Self-Employment or Profession", "Purely Business", "Mixed Income Earner"]) {
    assert.ok(wizard.includes(wording), `missing client wording: ${wording}`);
  }
});

test("wizard asks about registering a new business, lease, and barangay location", () => {
  assert.ok(wizard.includes("registering a new business"), "must ask the new-business question verbatim from the source");
  assert.ok(wizard.includes("lease the space"), "must ask the lease question verbatim from the source");
  assert.ok(wizard.includes("Barangay"), "must ask for the Quezon City barangay");
});

test("barangay list resolves to a real RDO code lookup, not a free-text guess", () => {
  assert.ok(Array.isArray(barangayRdo) && barangayRdo.length > 50, "expected a substantial barangay->RDO dataset");
  assert.ok(wizard.includes("rdoCode"), "wizard must compute an RDO code from the chosen barangay");
});

// ---- Personalization: different answers must give different checklists ----
// Reimplements the real applicabilityRules matcher (lib/ruleEngine.ts) for
// the fields the actual wizard collects, consistent with this file's own
// zero-build-tooling design.

function applies(req, profile) {
  const rule = req.applicabilityRules || {};
  if (rule.taxpayerType && !rule.taxpayerType.includes(profile.taxpayerType)) return false;
  if (rule.hasEmployees !== undefined && rule.hasEmployees !== profile.hasEmployees) return false;
  if (rule.hasLease !== undefined && rule.hasLease !== profile.hasLease) return false;
  if (rule.isRegisteringNewBusiness !== undefined && rule.isRegisteringNewBusiness !== profile.isRegisteringNewBusiness) return false;
  if (rule.minEmployeeCount !== undefined && (profile.employeeCount ?? 0) < rule.minEmployeeCount) return false;
  if (rule.status && !rule.status.includes(profile.status)) return false;
  return true;
}

const checklistFor = (p) => requirements.filter((r) => !r.archived && applies(r, p)).map((r) => r.id);

const soloNoEmployees = {
  taxpayerType: "purely_business",
  hasEmployees: false,
  employeeCount: 0,
  hasLease: false,
  isRegisteringNewBusiness: false,
  status: "operating",
};
const employerWithLease = {
  taxpayerType: "mixed_income_earner",
  hasEmployees: true,
  employeeCount: 3,
  hasLease: true,
  isRegisteringNewBusiness: false,
  status: "operating",
};

test("checklist is personalized, not one fixed list for everyone", () => {
  const a = checklistFor(soloNoEmployees);
  const b = checklistFor(employerWithLease);
  assert.notDeepStrictEqual(a.sort(), b.sort(), "different answers must produce different checklists");
});

test("no employees excludes all compensation-withholding requirements", () => {
  const ids = checklistFor(soloNoEmployees);
  for (const employerOnly of ["sss-employer-reg", "philhealth-employer-reg", "pagibig-employer-reg", "sss-contribution", "bir-1601c-monthly-compensation", "bir-1604c-annual-compensation"]) {
    assert.ok(!ids.includes(employerOnly), `${employerOnly} should not apply without employees`);
  }
});

test("has employees includes SSS, PhilHealth, Pag-IBIG, and BIR compensation withholding", () => {
  const ids = checklistFor(employerWithLease);
  for (const employerOnly of ["sss-employer-reg", "philhealth-employer-reg", "pagibig-employer-reg", "bir-1601c-monthly-compensation"]) {
    assert.ok(ids.includes(employerOnly), `${employerOnly} should apply with employees`);
  }
});

test("has lease includes the Documentary Stamp Tax requirement", () => {
  assert.ok(checklistFor(employerWithLease).includes("bir-2000-dst"));
  assert.ok(!checklistFor(soloNoEmployees).includes("bir-2000-dst"));
});

test("every wizard combination yields a non-empty checklist", () => {
  for (const taxpayerType of ["purely_compensation", "self_employment_or_profession", "purely_business", "mixed_income_earner"]) {
    for (const hasEmployees of [true, false]) {
      const ids = checklistFor({ taxpayerType, hasEmployees, employeeCount: hasEmployees ? 1 : 0, hasLease: false, isRegisteringNewBusiness: false, status: "operating" });
      assert.ok(ids.length > 0, `empty checklist for ${taxpayerType}/${hasEmployees}`);
    }
  }
});
