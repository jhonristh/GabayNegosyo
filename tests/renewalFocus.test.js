const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const path = require('node:path');
const source = fs.readFileSync(path.join(__dirname, '../lib/renewalFocus.ts'), 'utf8');
const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 }}).outputText;
const sandbox = { exports: {} }; vm.runInNewContext(compiled, sandbox);
const { renewalStepState, isRenewalRequirement, isOutlineRenewal } = sandbox.exports;
const requirements = require('../data/requirements.json');
test('renewal selection includes actual renewals without adding registrations or tax filings', () => {
  for (const id of ['lgu-permit-renewal','dti-renewal','barangay-renewal','mayor-permit-renewal']) assert.equal(isRenewalRequirement(requirements.find(r => r.id === id)), true);
  for (const id of ['dti-registration','bir-1701q-quarterly']) assert.equal(isRenewalRequirement(requirements.find(r => r.id === id)), false);
});
test('continuation opens the first unfinished step, ignoring invalid or stale indexes', () => {
  const value = renewalStepState(['a','b','c'], [0,0,2,-1,8,1.5]);
  assert.equal(value.count, 2); assert.equal(value.firstIncomplete, 1); assert.equal(value.allDone, false);
});
test('a new cycle with no saved step indexes starts fresh', () => {
  const value = renewalStepState(['a','b'], []);
  assert.equal(value.count, 0); assert.equal(value.firstIncomplete, 0); assert.equal(value.allDone, false);
});
test('empty instructions never imply that a requirement is complete', () => {
  assert.equal(renewalStepState([], []).allDone, false);
});
test('completed steps can be reviewed, and undo reopens the matching step', () => {
  assert.equal(renewalStepState(['a','b'], [0,1]).allDone, true);
  const reopened = renewalStepState(['a','b'], [0]);
  assert.equal(reopened.allDone, false); assert.equal(reopened.firstIncomplete, 1);
});
test('generic catalog instructions are labeled outline even if their source is a guide', () => {
  assert.equal(isOutlineRenewal(requirements.find(r => r.id === 'dti-renewal')), true);
  assert.equal(isOutlineRenewal(requirements.find(r => r.id === 'lgu-permit-renewal')), false);
});
