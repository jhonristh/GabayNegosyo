// Penalty Simulator tests — client specification §32.
// Mirrors the pure functions in lib/penalty.ts so they run on Node's built-in
// runner with no build tooling. Values here are the exact worked examples the
// client specification gives.

const test = require("node:test");
const assert = require("node:assert");
const agencies = require("../data/agencies.json");

const FLAT_RATE_DEDUCTION = 250000;
const FLAT_RATE_PERCENT = 8;

function calculateFromTaxDue(taxDue, ratePercent) {
  return taxDue * (ratePercent / 100);
}

function calculateFromGrossSales(grossSales, ratePercent) {
  const taxableBase = Math.max(0, grossSales - FLAT_RATE_DEDUCTION);
  const estimatedTaxDue = taxableBase * (FLAT_RATE_PERCENT / 100);
  return { taxableBase, estimatedTaxDue, penalty: estimatedTaxDue * (ratePercent / 100) };
}

function isOptionBAvailable(taxType) {
  return taxType === "8_percent";
}

function validateAmount(value) {
  if (value === null || value === undefined || Number.isNaN(value)) return false;
  if (!Number.isFinite(value)) return false;
  if (value < 0) return false;
  return true;
}

// ---- Option A (spec §5, §32) ----

test("Option A: ₱10,000 tax due at 25% = ₱2,500", () => {
  assert.strictEqual(calculateFromTaxDue(10000, 25), 2500);
});

test("Option A: zero tax due produces zero penalty", () => {
  assert.strictEqual(calculateFromTaxDue(0, 25), 0);
});

test("Option A: penalty scales linearly with tax due", () => {
  assert.strictEqual(calculateFromTaxDue(20000, 25), calculateFromTaxDue(10000, 25) * 2);
});

// ---- Option B (spec §6, §32) ----

test("Option B: ₱500,000 gross sales gives ₱20,000 estimated tax due", () => {
  const r = calculateFromGrossSales(500000, 25);
  assert.strictEqual(r.taxableBase, 250000);
  assert.strictEqual(r.estimatedTaxDue, 20000);
});

test("Option B: ₱500,000 gross sales gives ₱5,000 penalty at 25%", () => {
  assert.strictEqual(calculateFromGrossSales(500000, 25).penalty, 5000);
});

test("Option B: gross sales below the threshold never goes negative", () => {
  const r = calculateFromGrossSales(200000, 25);
  assert.strictEqual(r.taxableBase, 0, "taxable base must floor at zero, not -50,000");
  assert.strictEqual(r.estimatedTaxDue, 0, "must not produce -₱4,000");
  assert.strictEqual(r.penalty, 0);
  assert.ok(r.estimatedTaxDue >= 0);
});

test("Option B: gross sales exactly at the threshold produces zero", () => {
  const r = calculateFromGrossSales(250000, 25);
  assert.strictEqual(r.estimatedTaxDue, 0);
});

// ---- Option B restriction (spec §6) ----

test("Option B is available only for 8% flat-rate profiles", () => {
  assert.strictEqual(isOptionBAvailable("8_percent"), true);
  assert.strictEqual(isOptionBAvailable("graduated"), false);
  assert.strictEqual(isOptionBAvailable("vat_registered"), false);
  assert.strictEqual(isOptionBAvailable("not_sure"), false);
  assert.strictEqual(isOptionBAvailable(undefined), false);
});

// ---- Validation (spec §31) ----

test("validation rejects empty, negative, and non-numeric input", () => {
  assert.strictEqual(validateAmount(NaN), false);
  assert.strictEqual(validateAmount(-1), false);
  assert.strictEqual(validateAmount(Infinity), false);
  assert.strictEqual(validateAmount(undefined), false);
  assert.strictEqual(validateAmount(0), true);
  assert.strictEqual(validateAmount(10000), true);
});

// ---- Penalty rates are data-driven (spec §5) ----

test("agency penalty rates come from data, matching the client's assumptions", () => {
  const byId = Object.fromEntries(agencies.map((a) => [a.id, a]));
  assert.strictEqual(byId.bir.penaltyRatePercent, 25);
  for (const id of ["sss", "philhealth", "pagibig"]) {
    const rate = byId[id].penaltyRatePercent;
    assert.ok(rate >= 2 && rate <= 3, `${id} rate ${rate} outside the specified 2–3% assumption`);
  }
});

test("every agency rate is labelled as a prototype assumption, not an official rate", () => {
  for (const a of agencies.filter((x) => x.penaltyRatePercent !== undefined)) {
    assert.ok(a.penaltyRateNote && a.penaltyRateNote.length > 0, `${a.id} missing penaltyRateNote`);
    assert.match(a.penaltyRateNote, /not a verified official rate/i);
  }
});
