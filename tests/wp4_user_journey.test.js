// Work Package 4: core user journey (registration, wizard, checklist, progress, requirement detail).
//
// Test types, kept apart on purpose (see docs/USER_JOURNEY_QA.md section 1):
//   EXECUTED  - the real lib/*.ts code runs here (validation, rule engine, and lib/db.ts against an in-memory
//               stand-in for Supabase). This is NOT a browser test and NOT a real-database test.
//   TEXT      - a source file is read and checked for a guard. It proves the guard is written, not that React renders it.

const test = require("node:test");
const assert = require("node:assert");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");

const ROOT = path.join(__dirname, "..");
const read = (rel) => fs.readFileSync(path.join(ROOT, rel), "utf8");
const { pathToFileURL } = require("node:url");
const load = (rel) => import(pathToFileURL(path.join(ROOT, rel)).href);

// ───────────────────────── validation (EXECUTED) ─────────────────────────

test("signup: every empty or invalid field gets its own plain-language message", async () => {
  const { validateSignup } = await load("lib/validation.ts");
  const empty = validateSignup({ name: "", email: "", password: "" });
  assert.ok(empty.name && empty.email && empty.password);
  assert.match(empty.email, /email address/i);
  const bad = validateSignup({ name: "Ana", email: "ana@", password: "short" });
  assert.ok(!bad.name);
  assert.match(bad.email, /does not look right/i);
  assert.match(bad.password, /at least 8/i);
  assert.deepStrictEqual(validateSignup({ name: "Ana Reyes", email: "ana@email.com", password: "12345678" }), {});
});

test("signup: password length boundary is 7 refused / 8 accepted; whitespace-only name refused", async () => {
  const { validateSignup } = await load("lib/validation.ts");
  assert.ok(validateSignup({ name: "A", email: "a@b.co", password: "1234567" }).password);
  assert.ok(!validateSignup({ name: "A", email: "a@b.co", password: "12345678" }).password);
  assert.ok(validateSignup({ name: "   ", email: "a@b.co", password: "12345678" }).name);
});

test("email shape check accepts normal addresses and refuses obvious typos", async () => {
  const { isPlausibleEmail } = await load("lib/validation.ts");
  for (const ok of ["juana@email.com", "a.b+c@mail.example.ph", " spaced@email.com "]) assert.ok(isPlausibleEmail(ok), ok);
  for (const bad of ["", "juana", "juana@", "@email.com", "juana@email", "ju ana@email.com", "a@b.c"]) assert.ok(!isPlausibleEmail(bad), bad);
});

test("login: asks for the missing field instead of leaving the button dead", async () => {
  const { validateLogin } = await load("lib/validation.ts");
  assert.ok(validateLogin("", "x").email && !validateLogin("", "x").password);
  assert.ok(validateLogin("a@b.co", "").password);
  assert.deepStrictEqual(validateLogin("a@b.co", "x"), {});
});

const base = {
  isRegisteringNewBusiness: true,
  localityKnown: true,
  barangay: "Poblacion",
  leaseApplicability: "no",
  hasEmployees: false,
  employeeCount: 0,
  projectedGrossSales: 0,
  businessName: "Juana's Crochet Corner",
};

test("wizard: each blocking step explains itself, and steps with defaults never block", async () => {
  const { wizardStepProblem } = await load("lib/validation.ts");
  assert.match(wizardStepProblem(0, { ...base, isRegisteringNewBusiness: null }), /Yes or No/);
  assert.strictEqual(wizardStepProblem(1, base), null); // taxpayer type has a default
  assert.match(wizardStepProblem(2, { ...base, localityKnown: false }), /city or municipality/i);
  assert.match(wizardStepProblem(2, { ...base, barangay: "  " }), /barangay/i);
  assert.match(wizardStepProblem(3, { ...base, leaseApplicability: "" }), /Not Applicable/);
  assert.match(wizardStepProblem(4, { ...base, hasEmployees: null }), /Yes or No/);
  assert.strictEqual(wizardStepProblem(6, base), null); // tax type has a default
  assert.match(wizardStepProblem(7, { ...base, businessName: "   " }), /business name/i);
  assert.strictEqual(wizardStepProblem(8, base), null);
  assert.strictEqual(wizardStepProblem(9, base), null);
});

test("wizard: employee count must be a whole number of 1 or more when there are employees", async () => {
  const { wizardStepProblem } = await load("lib/validation.ts");
  const yes = { ...base, hasEmployees: true };
  for (const n of [0, -1, 1.5, NaN]) assert.ok(wizardStepProblem(4, { ...yes, employeeCount: n }), `count ${n}`);
  for (const n of [1, 9, 250]) assert.strictEqual(wizardStepProblem(4, { ...yes, employeeCount: n }), null, `count ${n}`);
  assert.strictEqual(wizardStepProblem(4, { ...base, hasEmployees: false, employeeCount: 0 }), null);
});

test("wizard: gross sales must be entered and not negative; 0 is a valid answer", async () => {
  const { wizardStepProblem } = await load("lib/validation.ts");
  assert.ok(wizardStepProblem(5, { ...base, projectedGrossSales: "" }));
  assert.ok(wizardStepProblem(5, { ...base, projectedGrossSales: NaN }));
  assert.match(wizardStepProblem(5, { ...base, projectedGrossSales: -1 }), /negative/i);
  assert.strictEqual(wizardStepProblem(5, { ...base, projectedGrossSales: 0 }), null);
  assert.strictEqual(wizardStepProblem(5, { ...base, projectedGrossSales: 2000000 }), null);
});

test("post-login destination: same-site paths only", async () => {
  const { safeNextPath } = await load("lib/validation.ts");
  assert.strictEqual(safeNextPath("/checklist"), "/checklist");
  assert.strictEqual(safeNextPath("/requirements/bir-cor"), "/requirements/bir-cor");
  for (const bad of ["https://evil.example", "//evil.example", "/\\evil.example", "javascript:alert(1)", "checklist", "", null, undefined, "/login", "/login?next=/x", "/signup", "/a\nb", "/" + "x".repeat(300)]) {
    assert.strictEqual(safeNextPath(bad), null, String(bad));
  }
});

test("dashboard business-information labels only restate the person's answers", async () => {
  const { taxArrangementLabel, employeeLabel, businessStageLabel } = await load("lib/profileSummary.ts");
  assert.strictEqual(taxArrangementLabel({ taxType: "8_percent" }), "8% income tax option");
  assert.strictEqual(taxArrangementLabel({ taxType: "graduated", deductionMethod: "osd" }), "Graduated rates, OSD");
  assert.strictEqual(taxArrangementLabel({ taxType: "graduated", deductionMethod: "itemized" }), "Graduated rates, itemized deductions");
  assert.strictEqual(taxArrangementLabel({ taxType: "graduated" }), "Graduated rates"); // older profile: no invented method
  assert.strictEqual(taxArrangementLabel({ taxType: "not_sure" }), null);
  assert.strictEqual(employeeLabel({ hasEmployees: false, employeeCount: 0 }), "No employees");
  assert.strictEqual(employeeLabel({ hasEmployees: true, employeeCount: 1 }), "1 employee");
  assert.strictEqual(employeeLabel({ hasEmployees: true, employeeCount: 4 }), "4 employees");
  assert.strictEqual(businessStageLabel({ isRegisteringNewBusiness: true }), "Registering a new business");
  assert.strictEqual(businessStageLabel({ isRegisteringNewBusiness: false }), "Already registered");
});

// ───────────── checklist generation across every wizard-reachable profile (EXECUTED) ─────────────

const requirements = require("../data/requirements.json");
const agencies = require("../data/agencies.json");

function profile({ isNew, taxpayerType, employees, lease, taxType }) {
  return {
    id: "biz-test",
    userId: "u1",
    isRegisteringNewBusiness: isNew,
    taxpayerType,
    barangay: "Test",
    rdoCode: "",
    hasLease: lease === "yes",
    hasEmployees: employees > 0,
    employeeCount: employees,
    projectedGrossSales: 1000000,
    projectedExpenses: 0,
    businessName: "T",
    location: "T",
    status: isNew ? "planning" : "operating",
    businessType: "other",
    businessStructure: "sole_proprietor",
    taxType,
    createdAt: "2026-01-01T00:00:00.000Z",
  };
}

// Exactly what the wizard can produce today: 2 taxpayer types, 3 lease answers (na is saved as hasLease=false), 2 tax types.
function* wizardReachableProfiles() {
  for (const isNew of [true, false])
    for (const taxpayerType of ["self_employment_or_profession", "mixed_income_earner"])
      for (const employees of [0, 1, 9])
        for (const lease of ["yes", "no", "na"])
          for (const taxType of ["8_percent", "graduated"]) yield { key: `${isNew ? "new" : "existing"}/${taxpayerType}/emp${employees}/lease-${lease}/${taxType}`, p: profile({ isNew, taxpayerType, employees, lease, taxType }) };
}

test("every wizard-reachable profile gets a non-empty checklist made only of the five tracked agencies", async () => {
  const { generateApplicableRequirements } = await load("lib/ruleEngine.ts");
  const tracked = new Set(["bir", "sss", "philhealth", "pagibig", "lgu", "dti", "barangay"]);
  const known = new Set(agencies.map((a) => a.id));
  let combos = 0;
  for (const { key, p } of wizardReachableProfiles()) {
    combos++;
    const list = generateApplicableRequirements(p, requirements);
    assert.ok(list.length > 0, `${key} produced an empty checklist`);
    assert.strictEqual(new Set(list.map((r) => r.id)).size, list.length, `${key} has duplicate requirements`);
    for (const r of list) {
      assert.ok(tracked.has(r.agencyId) && known.has(r.agencyId), `${key}: ${r.id} has unknown agency ${r.agencyId}`);
    }
  }
  assert.strictEqual(combos, 72);
});

test("employee answers drive exactly the employer requirements", async () => {
  const { generateApplicableRequirements } = await load("lib/ruleEngine.ts");
  const employerIds = ["sss-employer-reg", "sss-contribution", "philhealth-employer-reg", "pagibig-employer-reg", "bir-1601c-monthly-compensation", "bir-2316-certificate"];
  for (const { key, p } of wizardReachableProfiles()) {
    const ids = new Set(generateApplicableRequirements(p, requirements).map((r) => r.id));
    for (const id of employerIds) assert.strictEqual(ids.has(id), p.hasEmployees && requirements.find((r) => r.id === id)?.contentSource !== "prototype_placeholder", `${key}: ${id}`);
  }
});

test("lease answer drives the documentary stamp requirement; new vs existing drives registration vs renewal", async () => {
  const { generateApplicableRequirements } = await load("lib/ruleEngine.ts");
  for (const { key, p } of wizardReachableProfiles()) {
    const ids = new Set(generateApplicableRequirements(p, requirements).map((r) => r.id));
    assert.ok(!ids.has("bir-2000-dst"), `${key}: unsourced 2000 DST omitted`);
    for (const id of ["bir-registration", "dti-registration", "barangay-clearance", "mayor-permit"]) assert.strictEqual(ids.has(id), p.isRegisteringNewBusiness, `${key}: ${id}`);
    assert.strictEqual(ids.has("mayor-permit-renewal"), !p.isRegisteringNewBusiness, key);
  }
});

test("KNOWN GAP (owner decision): the tax arrangement is collected but changes no requirement", async () => {
  // Zero requirements in data/requirements.json use a taxType rule, so choosing 8% vs graduated cannot change the
  // checklist. This test records that fact; if the owner approves tax-type rules, update it deliberately.
  const { generateApplicableRequirements } = await load("lib/ruleEngine.ts");
  assert.ok(requirements.some((r) => !r.archived && "taxType" in (r.applicabilityRules || {})));
  for (const isNew of [true, false])
    for (const taxpayerType of ["self_employment_or_profession", "mixed_income_earner"]) {
      const a = generateApplicableRequirements(profile({ isNew, taxpayerType, employees: 1, lease: "yes", taxType: "8_percent" }), requirements).map((r) => r.id).sort();
      const b = generateApplicableRequirements(profile({ isNew, taxpayerType, employees: 1, lease: "yes", taxType: "graduated" }), requirements).map((r) => r.id).sort();
      assert.notDeepStrictEqual(a, b);
    }
});

test("KNOWN GAP (owner decision): the wizard offers 2 of 4 taxpayer types, so some requirements cannot be reached from it", async () => {
  const { generateApplicableRequirements } = await load("lib/ruleEngine.ts");
  const reachable = new Set();
  for (const { p } of wizardReachableProfiles()) generateApplicableRequirements(p, requirements).forEach((r) => reachable.add(r.id));
  const unreachable = requirements.filter((r) => !reachable.has(r.id)).map((r) => r.id);
  assert.ok(!reachable.has("bir-1700-compensation")); // retired category does not appear in active wizard
});

test("every requirement a person can open has the content the detail page needs, and no invented dates", async () => {
  const { resolveObligation } = await load("lib/ruleEngine.ts");
  const ids = new Set();
  for (const r of requirements) {
    assert.ok(!ids.has(r.id), `duplicate id ${r.id}`);
    ids.add(r.id);
    for (const f of ["name", "description", "whoItAppliesTo", "deadlineDescription", "lastVerified"]) assert.ok(String(r[f] || "").trim(), `${r.id}.${f}`);
    assert.match(r.lastVerified, /^\d{4}-\d{2}-\d{2}$/, `${r.id} lastVerified`);
    assert.ok(!r.officialUrl || /^https:\/\//.test(r.officialUrl), `${r.id} officialUrl`);
    assert.ok(Array.isArray(r.instructions) && r.instructions.length > 0, `${r.id} has no steps`);
    assert.ok(Array.isArray(r.requiredDocuments), `${r.id} must declare a documents list (may be empty pending consultant)`);
    if (r.deadlineKind === "fixed_annual") {
      assert.ok(r.deadlineMonth >= 1 && r.deadlineMonth <= 12 && r.deadlineDay >= 1 && r.deadlineDay <= 31, `${r.id} fixed date`);
    } else {
      if (r.deadlineKind !== "window") assert.strictEqual(r.deadlineMonth, undefined, `${r.id} must not carry a month without a fixed date`);
      const o = resolveObligation(r, undefined, new Date(2026, 5, 1));
      if (["one_time", "recurring_variable", "event_offset"].includes(r.deadlineKind)) {
        assert.strictEqual(o.dueDate, null, `${r.id} shows an invented date`);
        assert.strictEqual(o.status, "no_deadline");
      } else if (o.dueDate) {
        assert.ok(!Number.isNaN(o.dueDate.valueOf()), `${r.id} calculates a real date`);
      }
    }
  }
});

test("explainApplicability only states answers the person actually gave", async () => {
  const { explainApplicability } = await load("lib/ruleEngine.ts");
  const p = profile({ isNew: false, taxpayerType: "mixed_income_earner", employees: 3, lease: "no", taxType: "8_percent" });
  const dst = requirements.find((r) => r.id === "bir-2000-dst");
  assert.deepStrictEqual(explainApplicability(dst, { ...p, hasLease: true }), ["You lease your business space."]);
  const emp = requirements.find((r) => r.id === "sss-employer-reg");
  assert.deepStrictEqual(explainApplicability(emp, p), ["You have 3 employees."]);
});

// ───── lib/db.ts running for real against an in-memory stand-in for Supabase (EXECUTED; not a real database) ─────

function makeFakeSupabase() {
  const tables = { business_profiles: [], checklist_progress: [], reminder_configs: [], sent_emails: [], task_progress: [] };
  const keys = { business_profiles: ["user_id"], checklist_progress: ["user_id", "requirement_id"], reminder_configs: ["user_id", "requirement_id"], sent_emails: ["id"], task_progress: ["user_id", "requirement_id", "cycle", "task_index"] };
  const fake = { tables, failReads: false, failWrites: false, writes: [] };
  fake.from = (table) => {
    const q = { op: "select", filters: [], patch: null };
    const run = () => {
      const isWrite = q.op !== "select";
      if (isWrite && fake.failWrites) return { data: null, error: { message: "Failed to fetch" } };
      if (!isWrite && fake.failReads) return { data: null, error: { message: "Failed to fetch" } };
      const rows = tables[table];
      const match = (row) => q.filters.every(([c, v]) => row[c] === v);
      if (q.op === "upsert") {
        const row = q.patch;
        const idx = rows.findIndex((r) => keys[table].every((k) => r[k] === row[k]));
        if (idx >= 0) rows[idx] = { ...rows[idx], ...row };
        else rows.push({ ...row });
        fake.writes.push([table, "upsert"]);
        return { data: null, error: null };
      }
      if (q.op === "update") {
        rows.filter(match).forEach((r) => Object.assign(r, q.patch));
        fake.writes.push([table, "update"]);
        return { data: null, error: null };
      }
      if (q.op === "delete") {
        tables[table] = rows.filter((r) => !match(r));
        fake.writes.push([table, "delete"]);
        return { data: null, error: null };
      }
      return { data: rows.filter(match).map((r) => ({ ...r })), error: null };
    };
    const b = {
      select: () => b,
      eq: (c, v) => (q.filters.push([c, v]), b),
      order: () => b,
      limit: () => b,
      upsert: (row) => ((q.op = "upsert"), (q.patch = row), b),
      update: (patch) => ((q.op = "update"), (q.patch = patch), b),
      delete: () => ((q.op = "delete"), b),
      maybeSingle: () => {
        const res = run();
        return Promise.resolve(res.error ? res : { data: res.data[0] ?? null, error: null });
      },
      then: (ok, bad) => Promise.resolve(run()).then(ok, bad),
    };
    return b;
  };
  return fake;
}

let dbModule;
let fake;
async function loadRealDb() {
  if (dbModule) return dbModule;
  // lib/db.ts imports JSON and extensionless modules, which plain Node cannot resolve. Write a copy of the REAL source into a
  // temp folder with only those import lines rewritten; the Supabase client is replaced by the in-memory stand-in above.
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "gn-wp4-"));
  const data = (n) => JSON.stringify(pathToFileURL(path.join(ROOT, "data", n)).href);
  let src = read("lib/db.ts")
    .replace(/from "\.\.\/data\/(\w+)\.json";/g, (_, n) => `from ${data(n + ".json")} with { type: "json" };`)
    .replace('from "./supabase";', 'from "./supabase.ts";')
    .replace('from "./demoAccounts";', 'from "./demoAccounts.ts";');
  fs.writeFileSync(path.join(dir, "db.ts"), src);
  fs.writeFileSync(path.join(dir, "demoAccounts.ts"), read("lib/demoAccounts.ts"));
  fs.writeFileSync(path.join(dir, "supabase.ts"), "export function getSupabase() { return globalThis.__fakeSupabase; }\n");
  dbModule = await import(pathToFileURL(path.join(dir, "db.ts")).href);
  return dbModule;
}

function fakeStorage() {
  const m = new Map();
  return { getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => void m.set(k, String(v)), removeItem: (k) => void m.delete(k) };
}

async function fresh() {
  fake = makeFakeSupabase();
  globalThis.__fakeSupabase = fake;
  globalThis.window = { localStorage: fakeStorage(), sessionStorage: fakeStorage() };
  const { db } = await loadRealDb();
  db.clearUserData();
  return db;
}
const flush = () => new Promise((r) => setImmediate(r));
const P = (userId) => ({ ...profile({ isNew: true, taxpayerType: "self_employment_or_profession", employees: 0, lease: "no", taxType: "8_percent" }), userId, id: `biz-${userId}` });

test("progress survives a refresh and a new login: profile, requirement completion and task steps come back", async () => {
  const db = await fresh();
  await db.hydrate("user-1"); // first login: nothing saved yet
  assert.strictEqual(db.getBusinessProfile("user-1"), null);

  assert.strictEqual(db.saveBusinessProfile(P("user-1")), true);
  db.markComplete("bir-cor", "biz-user-1", null);
  db.setTaskDone("bir-registration-filing", "once", 0, true);
  db.setTaskDone("bir-registration-filing", "once", 2, true);
  db.setTaskDone("bir-registration-filing", "once", 2, false); // unchecking must persist too
  await flush();

  // "Refresh": the in-memory cache is gone; everything must be rebuilt from the saved rows only.
  db.clearUserData();
  assert.strictEqual(db.getProgress()["bir-cor"], undefined);
  await db.hydrate("user-1");
  assert.ok(db.getBusinessProfile("user-1"));
  assert.strictEqual(db.getProgress()["bir-cor"].status, "completed");
  assert.deepStrictEqual(db.getDoneTasks("bir-registration-filing", "once"), [0]);
});

test("marking a requirement not completed also persists across a refresh", async () => {
  const db = await fresh();
  await db.hydrate("user-1");
  db.saveBusinessProfile(P("user-1"));
  db.markComplete("bir-cor", "biz-user-1", null);
  await flush();
  db.markIncomplete("bir-cor");
  await flush();
  db.clearUserData();
  await db.hydrate("user-1");
  assert.notStrictEqual(db.getProgress()["bir-cor"].status, "completed");
  assert.strictEqual(db.getProgress()["bir-cor"].completedAt, undefined);
});

test("a fixed-annual completion stores its due year so it counts for that year only", async () => {
  const db = await fresh();
  const { resolveObligation } = await load("lib/ruleEngine.ts");
  await db.hydrate("user-1");
  db.saveBusinessProfile({ ...P("user-1"), createdAt: "2025-06-01T00:00:00.000Z", isRegisteringNewBusiness: false, status: "operating" });
  const permit = requirements.find((r) => r.id === "lgu-permit-renewal");
  const today = new Date(2026, 5, 1);
  const first = resolveObligation(permit, undefined, today, "2025-06-01T00:00:00.000Z");
  db.markComplete(permit.id, "biz-user-1", first.dueKey);
  await flush();
  db.clearUserData();
  await db.hydrate("user-1");
  const after = resolveObligation(permit, db.getProgress()[permit.id], today, "2025-06-01T00:00:00.000Z");
  assert.strictEqual(after.status, "completed");
  const nextYear = resolveObligation(permit, db.getProgress()[permit.id], new Date(2027, 0, 5), "2025-06-01T00:00:00.000Z");
  assert.notStrictEqual(nextYear.status, "completed"); // the new cycle starts open
});

test("one person's data is never written to or read as another's", async () => {
  const db = await fresh();
  await db.hydrate("user-1");
  assert.strictEqual(db.saveBusinessProfile(P("user-2")), false); // someone else's profile is refused
  assert.strictEqual(fake.tables.business_profiles.length, 0);
  db.saveBusinessProfile(P("user-1"));
  assert.strictEqual(db.getBusinessProfile("user-2"), null);
});

test("network failure while loading: nothing is invented and a save is refused, not silently dropped", async () => {
  const db = await fresh();
  fake.failReads = true;
  await assert.rejects(() => db.hydrate("user-1"), /Failed to fetch/);
  assert.strictEqual(db.getBusinessProfile("user-1"), null);
  assert.strictEqual(db.saveBusinessProfile(P("user-1")), false, "the wizard must be told that nothing was saved");
  assert.strictEqual(fake.tables.business_profiles.length, 0);
});

test("network failure while saving: the failure is reported to the screen (toast) instead of vanishing", async () => {
  const db = await fresh();
  await db.hydrate("user-1");
  db.saveBusinessProfile(P("user-1"));
  await flush();
  const seen = [];
  const off = db.onPersistError((label) => seen.push(label));
  fake.failWrites = true;
  db.markComplete("bir-cor", "biz-user-1", null);
  db.setTaskDone("bir-cor", "once", 0, true);
  await flush();
  off();
  assert.deepStrictEqual(seen, ["markComplete", "setTaskDone"]);
});

test("a guest's wizard answers move into the new account at sign-in, so the guest store is already empty afterwards", async () => {
  const db = await fresh();
  db.saveGuestProfile({ ...P("guest"), userId: "guest", id: "biz-guest" });
  assert.ok(db.getGuestProfile());
  await db.hydrate("user-9"); // what signup/login does
  assert.strictEqual(db.getGuestProfile(), null); // why signup must ask the account, not the guest store
  assert.strictEqual(db.getBusinessProfile("user-9").userId, "user-9");
  await flush();
  assert.strictEqual(fake.tables.business_profiles.length, 1);
});

test("a guest's answers never overwrite a profile the account already has", async () => {
  const db = await fresh();
  fake.tables.business_profiles.push({ user_id: "user-3", data: { ...P("user-3"), businessName: "Saved Shop" } });
  db.saveGuestProfile({ ...P("guest"), userId: "guest", businessName: "Guest Shop" });
  await db.hydrate("user-3");
  assert.strictEqual(db.getBusinessProfile("user-3").businessName, "Saved Shop");
  assert.strictEqual(db.getGuestProfile(), null);
});

test("demo mode keeps its own progress in the browser and never calls Supabase", async () => {
  const db = await fresh();
  const seed = P("demo-free");
  db.enterDemo("demo-free", seed);
  db.markComplete("bir-cor", "biz-demo-free", null);
  db.setTaskDone("bir-cor", "once", 1, true);
  await flush();
  assert.strictEqual(fake.writes.length, 0);
  db.clearUserData();
  db.enterDemo("demo-free", seed); // "refresh"
  assert.strictEqual(db.getProgress()["bir-cor"].status, "completed");
  assert.deepStrictEqual(db.getDoneTasks("bir-cor", "once"), [1]);
});

// ───────────────────────── wiring guards (TEXT) ─────────────────────────

test("pages that read saved data ask the guard to check that the data loaded (TEXT)", () => {
  for (const f of ["app/dashboard/page.tsx", "app/checklist/page.tsx", "app/requirements/[id]/page.tsx", "app/deadlines/page.tsx"]) {
    assert.match(read(f), /<AuthGuard requireData>/, f);
  }
  const guard = read("components/AuthGuard.tsx");
  assert.match(guard, /dataLoadFailed/);
  assert.match(guard, /encodeURIComponent\(pathname\)/);
  assert.match(read("lib/auth.tsx"), /user\.dataLoadFailed = true/);
});

test("signup sends a guest-turned-member to the saved checklist by asking the account (TEXT)", () => {
  const s = read("app/signup/page.tsx");
  assert.match(s, /db\.getBusinessProfile\(result\.user\.id\)/);
  assert.doesNotMatch(s, /router\.push\(db\.getGuestProfile\(\)/);
  assert.match(s, /validateSignup/);
});

test("login uses a same-site return path and does not strand a person whose data failed to load (TEXT)", () => {
  const s = read("app/login/page.tsx");
  assert.match(s, /safeNextPath/);
  assert.match(s, /user\.dataLoadFailed/);
});

test("wizard shows why Continue is unavailable, refuses to pretend a failed save worked, and remembers the deduction method (TEXT)", () => {
  const w = read("app/wizard/page.tsx");
  assert.match(w, /wizardStepProblem/);
  assert.match(w, /id="wizard-step-problem"/);
  assert.match(w, /await db\.saveConfirmedBusinessProfile\(profile\)/);
  assert.match(w, /deductionMethod: taxType === "graduated"/);
  assert.match(w, /user\?\.dataLoadFailed/);
});

test("an unknown requirement id shows a message instead of silently redirecting (TEXT)", () => {
  const r = read("app/requirements/[id]/page.tsx");
  assert.doesNotMatch(r, /router\.replace\("\/dashboard"\)/);
  assert.match(r, /We could not find that requirement/);
});

test("checklist cards say so when a requirement is still placeholder content (TEXT)", () => {
  assert.match(read("app/checklist/page.tsx"), /contentSource === "prototype_placeholder"/);
  assert.strictEqual(requirements.filter((r) => r.contentSource === "prototype_placeholder").length, 4);
});
