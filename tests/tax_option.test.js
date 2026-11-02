// Consultant-approved tax-option regression tests. Portable on Windows and Linux.
// Legacy identifiers remain valid in the model to read existing saved accounts;
// only two types must appear as choices in the new-user wizard.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const root = path.resolve(__dirname,'..');
const source = rel => fs.readFileSync(path.join(root,rel),'utf8');
const load = rel => import(pathToFileURL(path.join(root,rel)).href);

test('only consultant-approved taxpayer categories are offered in the wizard; historical profile types remain readable', () => {
  const wizard=source('app/wizard/page.tsx');
  const choices=wizard.match(/const TAXPAYER_TYPES:[\s\S]*?= \[([\s\S]*?)\];/);
  assert.ok(choices, 'taxpayer choice configuration exists');
  assert.match(choices[1],/self_employment_or_profession/);
  assert.match(choices[1],/mixed_income_earner/);
  assert.doesNotMatch(choices[1],/purely_compensation|purely_business/);
  assert.match(wizard,/existing\?\.taxpayerType === "mixed_income_earner"/);
});

test('8% estimates subtract 250,000 for qualified self-employed, never yield negative tax',async()=>{
  const {estimateEightPercentTaxDue:f}=await load('lib/penalty.ts');
  assert.equal(f(100000),0);
  assert.equal(f(250000),0);
  assert.equal(f(1250000),80000);
  assert.equal(f(-100),null);
});

test('FL-16: mixed-income estimate excludes 250,000 deduction pending consultant confirmation',async()=>{
  const {estimateEightPercentTaxDue:f}=await load('lib/penalty.ts');
  assert.equal(f(1250000,true),100000);
  assert.equal(f(0,true),0);
});

test('at or above 3,000,000 the 8% estimator is unavailable and wizard flags VAT',async()=>{
  const {estimateEightPercentTaxDue:f}=await load('lib/penalty.ts');
  assert.equal(f(3000000),null);
  assert.equal(f(3000001),null);
  const wizard=source('app/wizard/page.tsx');
  assert.match(wizard,/disabled=\{Number\(projectedGrossSales\) >= 3000000\}/);
  assert.match(wizard,/effectiveTaxType = Number\(projectedGrossSales\) >= 3000000 \? "vat_registered"/);
});

test('FL-17: no invented graduated rate table is used for the wizard preview',()=>{
  const wizard=source('app/wizard/page.tsx');
  assert.match(wizard,/Graduated tax estimate is pending consultant-provided tax table/);
});

test('itemized expenses are mandatory when graduated + itemized; zero is allowed',async()=>{
  const {wizardStepProblem}=await load('lib/validation.ts');
  const a={isRegisteringNewBusiness:true,localityKnown:true,barangay:'Poblacion',leaseApplicability:'na',hasEmployees:false,employeeCount:0,projectedGrossSales:1000000,businessName:'Shop'};
  assert.ok(wizardStepProblem(6,{...a,taxOption:'graduated',deductionMethod:'itemized',projectedExpenses:''}));
  assert.equal(wizardStepProblem(6,{...a,taxOption:'graduated',deductionMethod:'itemized',projectedExpenses:0}),null);
  assert.equal(wizardStepProblem(6,{...a,taxOption:'graduated',deductionMethod:'osd',projectedExpenses:''}),null);
  assert.equal(wizardStepProblem(6,{...a,taxOption:'8_percent',projectedExpenses:''}),null);
});

test('sales input and itemized expense input belong to separate wizard steps',()=>{
  const wizard=source('app/wizard/page.tsx');
  const sales=wizard.match(/\{step === 5 && \(([\s\S]*?)\{step === 6 && \(/);
  assert.ok(sales);
  assert.doesNotMatch(sales[1],/id="expenses"/);
  const tax=wizard.match(/\{step === 6 && \(([\s\S]*?)\{step === 7 && \(/);
  assert.ok(tax);
  assert.match(tax[1],/deductionMethod === "itemized" && <section/);
  assert.match(tax[1],/id="expenses"/);
});
