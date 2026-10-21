// v0.16 — automatic daily reminder digest. Pure helpers are imported directly (Node >= 22.18 strips
// types; on older Node those tests are skipped). Safety properties of the routes are checked on source.
const test = require("node:test");
const assert = require("node:assert");
const fs = require("node:fs");
const path = require("node:path");
const { pathToFileURL } = require("node:url");

const read = (p) => fs.readFileSync(path.join(__dirname, "..", p), "utf8");
const canImportTs = Boolean(process.features && process.features.typescript);
const opts = { skip: canImportTs ? false : "needs Node with TypeScript type stripping (22.18+)" };
const load = (p) => import(pathToFileURL(path.join(__dirname, "..", p)).href);

test("manilaDateKey uses the Asia/Manila calendar date, not UTC", opts, async () => {
  const { manilaDateKey } = await load("lib/reminderDigest.ts");
  assert.strictEqual(manilaDateKey(new Date("2026-05-14T16:30:00Z")), "2026-05-15"); // 00:30 in Manila
  assert.strictEqual(manilaDateKey(new Date("2026-05-14T15:30:00Z")), "2026-05-14"); // 23:30 in Manila
});

test("daysUntilKey counts whole calendar days", opts, async () => {
  const { daysUntilKey } = await load("lib/reminderDigest.ts");
  assert.strictEqual(daysUntilKey("2026-05-08", "2026-05-15"), 7);
  assert.strictEqual(daysUntilKey("2026-05-12", "2026-05-15"), 3);
  assert.strictEqual(daysUntilKey("2026-05-14", "2026-05-15"), 1);
  assert.strictEqual(daysUntilKey("2026-05-16", "2026-05-15"), -1);
  assert.strictEqual(daysUntilKey("2026-12-30", "2027-01-02"), 3);
});

test("renderDigest: one email, sorted, escaped, with disclaimer and unsubscribe link", opts, async () => {
  const { renderDigest } = await load("lib/reminderDigest.ts");
  const mail = renderDigest({
    name: "Juana <script>",
    siteUrl: "https://example.vercel.app",
    unsubscribeUrl: "https://example.vercel.app/api/unsubscribe?u=1&t=abc",
    items: [
      { requirementId: "b", name: "Second <b>item</b>", agency: "SSS", dueKey: "2026-06-01", daysBefore: 7 },
      { requirementId: "a", name: "First item", agency: "BIR", dueKey: "2026-05-15", daysBefore: 7 },
    ],
  });
  assert.match(mail.subject, /2 requirements coming up/);
  assert.ok(mail.text.indexOf("First item") < mail.text.indexOf("Second"));
  assert.ok(!mail.html.includes("<script>") && !mail.html.includes("<b>item</b>"), "user/content text must be HTML-escaped");
  assert.match(mail.text, /not a government notice/);
  assert.match(mail.text, /api\/unsubscribe/);
  const one = renderDigest({ name: "", siteUrl: null, unsubscribeUrl: "u", items: [{ requirementId: "a", name: "Only", agency: "BIR", dueKey: "2026-05-15", daysBefore: 1 }] });
  assert.match(one.subject, /Only is due tomorrow/);
});

test("unsubscribe tokens verify only for the right user and secret", opts, async () => {
  process.env.CRON_SECRET = "test-secret";
  delete process.env.REMINDER_SECRET;
  const { signUnsubscribe, verifyUnsubscribe } = await load("lib/unsubscribeToken.ts");
  const t = signUnsubscribe("user-1");
  assert.ok(verifyUnsubscribe("user-1", t));
  assert.ok(!verifyUnsubscribe("user-2", t));
  assert.ok(!verifyUnsubscribe("user-1", t.slice(0, -1) + (t.endsWith("0") ? "1" : "0")));
  assert.ok(!verifyUnsubscribe("user-1", ""));
});

test("cron route: secret required, off by default, allowlist, no PII in response", () => {
  const src = read("app/api/cron/send-reminders/route.ts");
  assert.match(src, /CRON_SECRET/);
  assert.match(src, /timingSafeEqual/);
  assert.match(src, /REMINDERS_MODE \?\? "off"/);
  assert.match(src, /REMINDER_ALLOWLIST/);
  assert.match(src, /\.eq\("is_demo", false\)/);
  assert.match(src, /reminders_unsubscribed_at/);
  assert.match(src, /role", \["premium", "admin"\]/);
  assert.match(src, /ignoreDuplicates: true/);
  const json = src.match(/NextResponse\.json\(\{ mode[^)]*\)/g) || [];
  assert.ok(json.every((j) => !/email/i.test(j)), "run summary must not contain addresses");
});

test("unsubscribe: GET never writes; POST verifies the signed token", () => {
  const src = read("app/api/unsubscribe/route.ts");
  const get = src.slice(src.indexOf("export async function GET"), src.indexOf("export async function POST"));
  assert.ok(!/\.update\(/.test(get), "GET must not change data");
  assert.match(src.slice(src.indexOf("export async function POST")), /verifyUnsubscribe/);
});

test("migration 004 is service-role only", () => {
  const sql = read("database/migrations/004_reminder_digest.sql");
  assert.match(sql, /revoke all on public\.reminder_deliveries from anon, authenticated/);
  assert.match(sql, /enable row level security/);
  assert.ok(!/grant .* to (anon|authenticated)/i.test(sql));
});

test("vercel cron points at the route once a day", () => {
  const cfg = JSON.parse(read("vercel.json"));
  assert.deepStrictEqual(cfg.crons, [{ path: "/api/cron/send-reminders", schedule: "0 0 * * *" }]);
});
