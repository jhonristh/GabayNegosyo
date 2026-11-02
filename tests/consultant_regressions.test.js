const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const {pathToFileURL}=require('node:url');
const fs = require('node:fs');
const root=path.resolve(__dirname,'..');
const load=(rel)=>import(pathToFileURL(path.join(root,rel)).href);
test('itemized expenses required only for graduated + itemized',async()=>{
 const {wizardStepProblem}=await load('lib/validation.ts');
 const a={taxOption:'graduated',deductionMethod:'itemized',projectedExpenses:'',businessName:'Test'};
 assert.match(wizardStepProblem(6,a),/expenses/i);
 assert.equal(wizardStepProblem(6,{...a,projectedExpenses:0}),null);
 assert.match(wizardStepProblem(6,{...a,projectedExpenses:-1}),/expenses/i);
 assert.equal(wizardStepProblem(6,{...a,taxOption:'8_percent'}),null);
 assert.equal(wizardStepProblem(6,{...a,deductionMethod:'osd'}),null);
});
test('mandatory disclaimer exactly matches consultant specification',async()=>{
 const {MANDATORY_DISCLAIMER}=await load('lib/penalty.ts');
 assert.equal(MANDATORY_DISCLAIMER,'Estimate lang ito para sa awareness. Hindi ito kapalit ng aktwal na computation ng isang accountant o ng BIR para sa opisyal na pag-file.');
});
test('source link checker has strict optional failure and records results',()=>{
 const code=fs.readFileSync(path.join(root,'scripts/check-links.mjs'),'utf8');
 assert.match(code,/LINK_CHECK_RESULTS\.json/);
 assert.match(code,/--strict/);
});
