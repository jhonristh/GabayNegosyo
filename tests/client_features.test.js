const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const root = path.resolve(__dirname, '..');
const text = (p) => fs.readFileSync(path.join(root,p),'utf8');
test('tax calculator does not silently estimate a pending graduated tax table', () => {
  const source = text('app/tax-calculator/page.tsx');
  assert.match(source,/estimateEightPercentTaxDue/);
  assert.match(source,/FL-17/);
  assert.match(source,/not yet available/);
  assert.match(source,/excluding penalties/);
});
test('BMBE is optional and does not automatically waive income tax', () => {
  const reqs=JSON.parse(text('data/requirements.json'));
  const b=reqs.find(x=>x.id==='bmbe');
  assert.equal(b.archived,false);
  assert.deepEqual(b.applicabilityRules.bmbeIntent,['interested','registered']);
  assert.equal(b.applicabilityRules.bmbeMaxAssetsExcludingLand,3000000);
  assert.match(text('app/wizard/page.tsx'),/No automatic BMBE income-tax exemption/);
});
test('calendar uses requirement dates, not reminder preferences', () => {
  const src=text('components/DeadlineCalendar.tsx');
  assert.match(src,/calendarOccurrences/);
  assert.doesNotMatch(src,/getReminderConfig|reminderConfigs/);
  assert.match(text('app/deadlines/page.tsx'),/schedule=\{applicable\}/);
});
test('yearly, quarterly, and monthly dates expand without inventing event dates', async()=>{
  const { calendarOccurrences }=await import(pathToFileURL(path.join(root,'lib/calendarOccurrences.ts')).href);
  const r=(deadlineKind,extra={})=>({deadlineKind,...extra});
  assert.deepEqual(calendarOccurrences(r('fixed_dates',{deadlineDates:[{month:5,day:15},{month:8,day:15},{month:11,day:15}]}),2027).map(d=>d.getMonth()+1),[5,8,11]);
  assert.equal(calendarOccurrences(r('monthly_day',{deadlineDayOfMonth:10}),2027).length,12);
  assert.equal(calendarOccurrences(r('quarter_offset',{deadlineQuarterOffsetDays:25}),2027).length,4);
  assert.equal(calendarOccurrences(r('one_time'),2027).length,0);
  assert.equal(calendarOccurrences(r('event_offset',{deadlineEventOffsetDays:30}),2027).length,0);
});
