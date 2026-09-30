// Tests that import the REAL lib modules (not re-implemented copies).
//
// The older test files in this folder mirror lib/*.ts logic inline so they
// run with zero tooling; that means they can pass while the app's own code is
// wrong (e.g. tests/simulator.test.js validated input that the page never
// validated). These tests load lib/ruleEngine.ts and lib/penalty.ts directly
// using Node's built-in TypeScript type-stripping (Node 22.18+; the
// project already requires Node 22+ for @supabase/supabase-js).

const test = require("node:test");
const assert = require("node:assert");

const load = (rel) => import(rel);

const req = (month, day) => ({ deadlineMonth: month, deadlineDay: day });

test("a deadline that falls today is 'Due today', not rolled to next year", async () => {
  const { computeNextDueDate, computeStatus } = await load("../lib/ruleEngine.ts");
  const afternoon = new Date(2026, 4, 15, 15, 30); // May 15, 3:30 pm
  const due = computeNextDueDate(req(5, 15), afternoon);
  assert.strictEqual(due.getFullYear(), 2026);
  assert.strictEqual(due.getMonth(), 4);
  assert.strictEqual(due.getDate(), 15);
  assert.strictEqual(computeStatus(due, undefined, afternoon), "due_today");
});

test("the day after a deadline rolls to next year's occurrence", async () => {
  const { computeNextDueDate } = await load("../lib/ruleEngine.ts");
  const due = computeNextDueDate(req(5, 15), new Date(2026, 4, 16, 0, 1));
  assert.strictEqual(due.getFullYear(), 2027);
});

test("status boundaries: today / tomorrow / 14 days / 15 days", async () => {
  const { computeStatus } = await load("../lib/ruleEngine.ts");
  const now = new Date(2026, 8, 30, 22, 0); // late evening must not shift the day count
  const day = (offset) => new Date(2026, 8, 30 + offset);
  assert.strictEqual(computeStatus(day(0), undefined, now), "due_today");
  assert.strictEqual(computeStatus(day(1), undefined, now), "due_soon");
  assert.strictEqual(computeStatus(day(14), undefined, now), "due_soon");
  assert.strictEqual(computeStatus(day(15), undefined, now), "upcoming");
  assert.strictEqual(computeStatus(day(-1), undefined, now), "overdue");
  assert.strictEqual(computeStatus(day(-1), "2026-09-01T00:00:00.000Z", now), "completed");
});

test("penalty: invalid input never produces a fabricated estimate", async () => {
  const { estimatePenalty, validatePenaltyInput } = await load("../lib/penalty.ts");
  const rule = { type: "monthly_percentage", monthlyRate: 0.02, description: "" };
  for (const bad of [
    { amount: NaN, daysLate: 10 },
    { amount: -5, daysLate: 10 },
    { amount: 1000, daysLate: -3 },
    { amount: 1000, daysLate: 2.5 },
    { amount: Infinity, daysLate: 1 },
  ]) {
    assert.ok(validatePenaltyInput(bad), `should reject ${JSON.stringify(bad)}`);
    assert.strictEqual(estimatePenalty(rule, bad).estimatedPenalty, 0);
  }
  assert.strictEqual(validatePenaltyInput({ amount: 0, daysLate: 0 }), null);
});

test("penalty: zero days late accrues nothing (was a full phantom month)", async () => {
  const { estimatePenalty } = await load("../lib/penalty.ts");
  const monthly = { type: "monthly_percentage", monthlyRate: 0.02, description: "" };
  const surcharge = { type: "percentage_surcharge_plus_monthly_interest", surchargeRate: 0.25, monthlyRate: 0.02, description: "" };
  assert.strictEqual(estimatePenalty(monthly, { amount: 10000, daysLate: 0 }).estimatedPenalty, 0);
  assert.strictEqual(estimatePenalty(surcharge, { amount: 10000, daysLate: 0 }).estimatedPenalty, 0);
  assert.strictEqual(estimatePenalty(monthly, { amount: 10000, daysLate: 1 }).estimatedPenalty, 200);
  assert.strictEqual(estimatePenalty(monthly, { amount: 10000, daysLate: 31 }).estimatedPenalty, 400);
});

test("penalty: not_specified still returns the honest 'no estimate' message", async () => {
  const { estimatePenalty } = await load("../lib/penalty.ts");
  const out = estimatePenalty({ type: "not_specified", description: "" }, { amount: 5000, daysLate: 30 });
  assert.strictEqual(out.estimatedPenalty, 0);
  assert.match(out.breakdown[0], /not provided/i);
});

test("every real requirement's penalty rule runs through the real estimator without throwing", async () => {
  const { estimatePenalty } = await load("../lib/penalty.ts");
  const requirements = require("../data/requirements.json");
  for (const r of requirements) {
    const out = estimatePenalty(r.penaltyRule, { amount: 50000, daysLate: 45 });
    assert.ok(Number.isFinite(out.estimatedPenalty) && out.estimatedPenalty >= 0, r.id);
  }
});

test("service worker only caches complete, successful responses", () => {
  const fs = require("node:fs");
  const path = require("node:path");
  const sw = fs.readFileSync(path.join(__dirname, "..", "public", "sw.js"), "utf8");
  assert.ok(sw.includes("isCacheable"), "sw.js must gate cache writes on response status");
  assert.ok(!/cache\.put\(request, copy\)\)\s*;\s*\n\s*return response/.test(sw), "no unconditional cache.put after fetch");
});
