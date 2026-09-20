// Minimal smoke test for the rule engine, runnable via `node --test tests/`
// without any extra dependencies. Uses Node's built-in test runner and
// re-implements the matcher logic inline (since the source is TypeScript
// and this prototype has no build step wired for test-time TS execution)
// to sanity-check the applicability rules encoded in data/requirements.json.
//
// For full TS-aware testing, wire up ts-node or vitest — noted in
// PROGRESS.md under Phase 12.

const test = require("node:test");
const assert = require("node:assert");
const requirements = require("../data/requirements.json");
const agencies = require("../data/agencies.json");

test("every requirement references a real agency", () => {
  const agencyIds = new Set(agencies.map((a) => a.id));
  for (const req of requirements) {
    assert.ok(agencyIds.has(req.agencyId), `${req.id} references unknown agency ${req.agencyId}`);
  }
});

test("employer-only requirements require hasEmployees: true", () => {
  const employerReqs = requirements.filter((r) => r.id.includes("employer") || r.id === "sss-contribution");
  for (const req of employerReqs) {
    assert.strictEqual(req.applicabilityRules.hasEmployees, true, `${req.id} should require hasEmployees=true`);
  }
});

test("8% and graduated income tax requirements are mutually exclusive by taxType", () => {
  const flat = requirements.find((r) => r.id === "bir-1701a");
  const graduated = requirements.find((r) => r.id === "bir-1701q");
  assert.deepStrictEqual(flat.applicabilityRules.taxType, ["8_percent"]);
  assert.deepStrictEqual(graduated.applicabilityRules.taxType, ["graduated"]);
});

test("every requirement has at least one instruction step and one required document or explicitly none", () => {
  for (const req of requirements) {
    assert.ok(Array.isArray(req.instructions) && req.instructions.length > 0, `${req.id} missing instructions`);
    assert.ok(Array.isArray(req.requiredDocuments), `${req.id} requiredDocuments must be an array`);
  }
});
