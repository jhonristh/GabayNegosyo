// Registration wizard tests — client specification §2.1, §10, §35.
// The client asked for a SHORT questionnaire: Business Type, Tax Type,
// Employees. These tests guard against the wizard creeping back toward the
// earlier 7-step version.

const test = require("node:test");
const assert = require("node:assert");
const fs = require("node:fs");
const path = require("node:path");
const requirements = require("../data/requirements.json");

const wizard = fs.readFileSync(path.join(__dirname, "..", "app", "wizard", "page.tsx"), "utf8");

test("wizard asks exactly the client's three questions plus a result step", () => {
  const match = wizard.match(/const STEPS = \[(.*?)\]/s);
  assert.ok(match, "STEPS array not found");
  const steps = match[1].split(",").filter((s) => s.trim().length > 0);
  assert.strictEqual(steps.length, 4, `expected 3 questions + result, got ${steps.length} steps`);
});

test("wizard uses the client's exact option wording", () => {
  for (const wording of ["Sole Proprietor", "Employer", "8% Flat Rate", "Graduated", "May empleyado", "Walang empleyado"]) {
    assert.ok(wizard.includes(wording), `missing client wording: ${wording}`);
  }
});

test("wizard no longer asks for business name, location, or structure", () => {
  for (const removed of ["Business name", "City or municipality", "business structure"]) {
    assert.ok(!wizard.includes(removed), `wizard should not ask for: ${removed}`);
  }
});

// ---- Personalization: different answers must give different checklists ----

function applies(req, profile) {
  const rule = req.applicabilityRules || {};
  if (rule.taxType && !rule.taxType.includes(profile.taxType)) return false;
  if (rule.hasEmployees !== undefined && rule.hasEmployees !== profile.hasEmployees) return false;
  if (rule.minEmployeeCount !== undefined && profile.employeeCount < rule.minEmployeeCount) return false;
  if (rule.status && !rule.status.includes(profile.status)) return false;
  return true;
}

const checklistFor = (p) => requirements.filter((r) => applies(r, p)).map((r) => r.id);

const soloFlat = { taxType: "8_percent", hasEmployees: false, employeeCount: 0, status: "operating" };
const employerGraduated = { taxType: "graduated", hasEmployees: true, employeeCount: 1, status: "operating" };

test("checklist is personalized, not one fixed list for everyone", () => {
  const a = checklistFor(soloFlat);
  const b = checklistFor(employerGraduated);
  assert.notDeepStrictEqual(a.sort(), b.sort(), "different answers must produce different checklists");
});

test("walang empleyado excludes all employer remittance requirements", () => {
  const ids = checklistFor(soloFlat);
  for (const employerOnly of ["sss-employer-reg", "philhealth-employer-reg", "pagibig-employer-reg", "sss-contribution"]) {
    assert.ok(!ids.includes(employerOnly), `${employerOnly} should not apply without employees`);
  }
});

test("may empleyado includes SSS, PhilHealth and Pag-IBIG registration", () => {
  const ids = checklistFor(employerGraduated);
  for (const employerOnly of ["sss-employer-reg", "philhealth-employer-reg", "pagibig-employer-reg"]) {
    assert.ok(ids.includes(employerOnly), `${employerOnly} should apply with employees`);
  }
});

test("every wizard combination yields a non-empty checklist", () => {
  for (const taxType of ["8_percent", "graduated"]) {
    for (const hasEmployees of [true, false]) {
      const ids = checklistFor({ taxType, hasEmployees, employeeCount: hasEmployees ? 1 : 0, status: "operating" });
      assert.ok(ids.length > 0, `empty checklist for ${taxType}/${hasEmployees}`);
    }
  }
});
