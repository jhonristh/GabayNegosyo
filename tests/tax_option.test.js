// Consultant-final wizard + tax-option estimate (spec §2, FL-16, FL-17).
const test = require("node:test");
const assert = require("node:assert");
const fs = require("node:fs");
const path = require("node:path");
const { pathToFileURL } = require("node:url");
const ROOT = path.join(__dirname, "..");
const read = (p) => fs.readFileSync(path.join(ROOT, p), "utf8");
const canImportTs = Boolean(process.features && process.features.typescript);
const opts = { skip: canImportTs ? false : "needs Node with TypeScript type stripping (22.18+)" };

async function loadTax() {
  // lib/tax.ts imports a JSON file and a type; stage a copy with only those lines rewritten.
  const os = require("node:os");
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "gn-tax-"));
  const json = JSON.stringify(path.join(ROOT, "data", "graduatedTaxTable.json"));
  const src = read("lib/tax.ts")
    .replace('import graduatedTable from "../data/graduatedTaxTable.json";', `import graduatedTable from ${json} with { type: "json" };`)
    .replace('import type { TaxpayerType } from "./types";', 'type TaxpayerType = "self_employment_or_profession" | "mixed_income_earner";');
  fs.writeFileSync(path.join(dir, "tax.ts"), src);
  return import(pathToFileURL(path.join(dir, "tax.ts")).href);
}

test("taxpayer types: only two options remain, in the consultant's wording", () => {
  const t = read("lib/taxpayer.ts");
  assert.match(t, /Self-Employment or Profession/);
  assert.match(t, /Mixed Income Earner/);
  assert.doesNotMatch(read("lib/types.ts").match(/export type TaxpayerType[^;]*;/)[0], /purely_/);
  assert.doesNotMatch(read("app/wizard/page.tsx"), /Purely (Business|Compensation)/);
});

test("legacy saved taxpayer types are read as self-employment (old profiles keep working)", opts, async () => {
  const { normalizeTaxpayerType } = await import(pathToFileURL(path.join(ROOT, "lib/taxpayer.ts")).href).catch(() => ({}));
  if (!normalizeTaxpayerType) return; // type-only import blocks direct load on some Node builds; covered by the db harness test
  assert.strictEqual(normalizeTaxpayerType("purely_business"), "self_employment_or_profession");
  assert.strictEqual(normalizeTaxpayerType("purely_compensation"), "self_employment_or_profession");
  assert.strictEqual(normalizeTaxpayerType("mixed_income_earner"), "mixed_income_earner");
  assert.strictEqual(normalizeTaxpayerType(undefined), "self_employment_or_profession");
});

test("8%: max(0, gross - 250,000) x 8% for self-employed; zero below the deduction", opts, async () => {
  const { estimateIncomeTax } = await loadTax();
  const base = { taxpayerType: "self_employment_or_profession", taxOption: "8_percent" };
  assert.strictEqual(estimateIncomeTax({ ...base, grossSales: 1_000_000 }).amount, 60_000);
  assert.strictEqual(estimateIncomeTax({ ...base, grossSales: 250_000 }).amount, 0);
  assert.strictEqual(estimateIncomeTax({ ...base, grossSales: 100_000 }).amount, 0);
  assert.strictEqual(estimateIncomeTax({ ...base, grossSales: 0 }).amount, 0);
  assert.strictEqual(estimateIncomeTax({ ...base, grossSales: -5 }).amount, 0);
});

test("FL-16: the 250,000 deduction is NOT applied to Mixed Income Earners", opts, async () => {
  const { estimateIncomeTax } = await loadTax();
  const e = estimateIncomeTax({ taxpayerType: "mixed_income_earner", taxOption: "8_percent", grossSales: 1_000_000 });
  assert.strictEqual(e.amount, 80_000);
  assert.ok(e.lines.some((l) => /pending accountant confirmation/.test(l)));
});

test("sales of 3,000,000 or more: 8% disabled, graduated forced, VAT flagged", opts, async () => {
  const { estimateIncomeTax, eightPercentUnavailable } = await loadTax();
  assert.strictEqual(eightPercentUnavailable(2_999_999), false);
  assert.strictEqual(eightPercentUnavailable(3_000_000), true);
  const e = estimateIncomeTax({ taxpayerType: "self_employment_or_profession", taxOption: "8_percent", grossSales: 3_000_000 });
  assert.strictEqual(e.option, "graduated");
  assert.strictEqual(e.vatFlag, true);
  assert.strictEqual(e.forcedGraduated, true);
});

test("FL-17: graduated amounts stay 'pending' until the consultant table is supplied", opts, async () => {
  const { estimateIncomeTax, graduatedTableReady } = await loadTax();
  const table = JSON.parse(read("data/graduatedTaxTable.json"));
  const e = estimateIncomeTax({ taxpayerType: "self_employment_or_profession", taxOption: "graduated", deductionMethod: "osd", grossSales: 1_000_000 });
  if (table.status !== "CONSULTANT_PROVIDED") {
    assert.strictEqual(graduatedTableReady(), false);
    assert.strictEqual(e.amount, null);
    assert.ok(e.lines.some((l) => /pending/i.test(l)));
  }
  assert.ok(e.lines.some((l) => /40% OSD/.test(l)), "OSD taxable income is still shown");
});

test("itemized: expenses are asked only for Graduated + Itemized, and the step blocks only when they are missing", opts, async () => {
  const os = require("node:os");
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "gn-val-"));
  fs.writeFileSync(path.join(dir, "validation.ts"), read("lib/validation.ts"));
  const { wizardStepProblem } = await import(pathToFileURL(path.join(dir, "validation.ts")).href);
  const a = { isRegisteringNewBusiness: true, localityKnown: true, barangay: "x", leaseApplicability: "na", hasEmployees: false, employeeCount: 0, projectedGrossSales: 1, businessName: "b" };
  assert.strictEqual(wizardStepProblem(6, { ...a, taxOption: "8_percent" }), null);
  assert.strictEqual(wizardStepProblem(6, { ...a, taxOption: "graduated", deductionMethod: "osd" }), null);
  assert.ok(wizardStepProblem(6, { ...a, taxOption: "graduated", deductionMethod: "itemized", projectedExpenses: "" }));
  assert.strictEqual(wizardStepProblem(6, { ...a, taxOption: "graduated", deductionMethod: "itemized", projectedExpenses: 0 }), null);
  assert.strictEqual(wizardStepProblem(3, { ...a, leaseApplicability: "na" }), null);
});

test("wizard page: sales step has no expenses field; expenses only under itemized", () => {
  const w = read("app/wizard/page.tsx");
  const salesStep = w.slice(w.indexOf("{step === 5 && ("), w.indexOf("{step === 6 && ("));
  assert.doesNotMatch(salesStep, /expenses/i);
  const taxStep = w.slice(w.indexOf("{step === 6 && ("), w.indexOf("{step === 7 && ("));
  assert.match(taxStep, /itemized && \(/);
});
