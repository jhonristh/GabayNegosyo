import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
const root = process.cwd();
const text = f => fs.readFileSync(path.join(root,f),'utf8');
const sql = text('database/migrations/009_manual_premium_reminders.sql');
const page = text('app/admin/manual-reminders/page.tsx');
const service = text('lib/manualReminders.ts');
const requirements = JSON.parse(text('data/requirements.json'));
async function moduleLoad(name) { return await import(pathToFileURL(path.join(root,name)).href); }

test('manual reminder SQL has RLS, admin-only RPCs and no client table privileges', () => {
  assert.match(sql,/alter table public\.manual_reminder_records enable row level security/i);
  assert.match(sql,/revoke all on public\.manual_reminder_records from public, anon, authenticated/i);
  assert.equal((sql.match(/if not public\.is_admin\(\)/g)||[]).length,3);
  assert.match(sql,/grant execute on function public\.admin_manual_reminder_queue\(\) to authenticated/i);
  assert.match(sql,/revoke execute on function public\.admin_record_manual_reminder\(uuid,text,date,smallint\) from public, anon/i);
});
test('recording checks computed Premium, demo, admin, deactivation, unsubscribe and preference',()=>{
  const fn = sql.split('create or replace function public.admin_record_manual_reminder(')[1];
  for (const term of ['public.entitlement_for','ef.status=\'premium\'','p.role<>\'admin\'','not p.is_demo','p.deactivated_at is null','p.reminders_unsubscribed_at is null','c.enabled','c.days_before=p_days']) assert.ok(fn.includes(term),term);
  assert.match(fn,/on conflict \(user_id,requirement_id,due_date,days_before\) do nothing/i);
  assert.match(sql,/primary key \(user_id, requirement_id, due_date, days_before\)/i);
});
test('manual UI never performs a send and requires confirmation',()=>{
  assert.match(page,/navigator\.clipboard\.writeText/);
  assert.match(page,/I confirm this email was sent manually/);
  assert.match(page,/confirmation !== id/);
  assert.doesNotMatch(page,/fetch\(["']\/api\/send-email/);
  assert.doesNotMatch(service,/nodemailer|resend|smtp|sendEmail\(/i);
});
test('calendar derives dates only from source-backed models; no fabricated event deadlines',()=>{
  assert.match(service,/calendarOccurrences\(req, year\)/);
  assert.match(service,/generateApplicableRequirements\(profile as BusinessProfile, \[req\]\)/);
  assert.match(service,/if \(days < 0 \|\| days > lookaheadDays\) continue/);
  assert.match(service,/requirement_id/);
  assert.match(text('lib/calendarOccurrences.ts'),/case "fixed_annual"/);
  assert.match(text('lib/calendarOccurrences.ts'),/default: break/);
});
