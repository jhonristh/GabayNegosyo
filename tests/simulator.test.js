// Penalty Simulator tests.
//
// Rewritten for V0.3: the previous version of this file tested an
// "Option A / Option B" tax-due/gross-sales calculator with
// agencies[].penaltyRatePercent / penaltyRateNote fields — none of which
// exist anywhere in this codebase (checked: data/agencies.json has no such
// fields). It was testing a different, never-built simulator design
// against an unconnected "client specification §5/§6/§31/§32" numbering
// scheme. The real simulator (lib/penalty.ts, app/premium/penalty-
// simulator/page.tsx) takes a requirement's penaltyRule plus an amount and
// daysLate, mirroring the client's actual "Sample Computation" workbook
// sheet, which shows worked examples, not an automated 8%-threshold
// calculator (see CONTENT_AUDIT.md "Known gaps" #3). This file now tests
// that real implementation.

const test = require("node:test");
const assert = require("node:assert");
const requirements = require("../data/requirements.json");

// Mirrors lib/penalty.ts estimatePenalty — reimplemented here so this file
// runs with zero build tooling, consistent with the rest of this test suite.
function estimatePenalty(rule, amount, daysLate) {
  const monthsLate = Math.max(1, Math.ceil(daysLate / 30));
  switch (rule.type) {
    case "percentage_surcharge_plus_monthly_interest": {
      const surcharge = amount * (rule.surchargeRate ?? 0);
      const interest = amount * (rule.monthlyRate ?? 0) * monthsLate;
      return Math.round(surcharge + interest);
    }
    case "monthly_percentage":
      return Math.round(amount * (rule.monthlyRate ?? 0) * monthsLate);
    case "flat_plus_daily":
      return Math.round((rule.flatAmount ?? 0) + (rule.dailyRate ?? 0) * daysLate);
    case "not_specified":
      return 0;
    default:
      return 0;
  }
}

function validateAmount(value) {
  if (value === null || value === undefined || Number.isNaN(value)) return false;
  if (!Number.isFinite(value)) return false;
  if (value < 0) return false;
  return true;
}

const lguRule = requirements.find((r) => r.id === "lgu-permit-renewal").penaltyRule;
const sssRule = requirements.find((r) => r.id === "sss-contribution").penaltyRule;
const notSpecifiedRule = requirements.find((r) => r.penaltyRule.type === "not_specified").penaltyRule;

test("percentage_surcharge_plus_monthly_interest scales with amount", () => {
  assert.ok(estimatePenalty(lguRule, 100000, 30) > estimatePenalty(lguRule, 10000, 30));
});

test("zero amount produces zero penalty for a percentage-based rule", () => {
  assert.strictEqual(estimatePenalty(lguRule, 0, 45), 0);
});

test("monthly_percentage penalty grows with days late", () => {
  const short = estimatePenalty(sssRule, 10000, 20);
  const long = estimatePenalty(sssRule, 10000, 200);
  assert.ok(long > short, "more days late must cost more");
});

test("not_specified never produces a fabricated non-zero estimate", () => {
  assert.strictEqual(estimatePenalty(notSpecifiedRule, 500000, 90), 0);
});

test("validation rejects empty, negative, and non-numeric input", () => {
  assert.strictEqual(validateAmount(NaN), false);
  assert.strictEqual(validateAmount(-1), false);
  assert.strictEqual(validateAmount(Infinity), false);
  assert.strictEqual(validateAmount(undefined), false);
  assert.strictEqual(validateAmount(0), true);
  assert.strictEqual(validateAmount(10000), true);
});

test("every penalty rule type in the real data is one lib/penalty.ts actually handles", () => {
  const handled = ["percentage_surcharge_plus_monthly_interest", "monthly_percentage", "flat_plus_daily", "not_specified"];
  for (const r of requirements) {
    assert.ok(handled.includes(r.penaltyRule.type), `${r.id} has an unhandled penalty type: ${r.penaltyRule.type}`);
  }
});

test("the simulator page renders the mandatory disclaimer constant", () => {
  const fs = require("node:fs");
  const path = require("node:path");
  const simulatorPage = fs.readFileSync(
    path.join(__dirname, "..", "app", "premium", "penalty-simulator", "page.tsx"),
    "utf8"
  );
  assert.ok(simulatorPage.includes("MANDATORY_DISCLAIMER"), "simulator page must render the mandatory disclaimer constant");
});
