// v0.12 regression tests. They import the REAL lib modules and the REAL data
// files (Node 22.18+ strips TypeScript types), so they cannot drift from the app.
const test = require("node:test");
const assert = require("node:assert");
const fs = require("node:fs");
const path = require("node:path");

const root = path.join(__dirname, "..");
const load = (rel) => import(rel);
const requirements = JSON.parse(fs.readFileSync(path.join(root, "data", "requirements.json"), "utf8"));
const byId = (id) => requirements.find((r) => r.id === id);

const baseProfile = {
  isRegisteringNewBusiness: true,
  taxpayerType: "purely_business",
  hasLease: false,
  hasEmployees: false,
  employeeCount: 0,
  status: "planning",
  businessType: "other",
  businessStructure: "sole_proprietor",
  taxType: "not_sure",
};
const OCT_5 = new Date(2026, 9, 5);

// ── BUG-005: no invented dates ─────────────────────────────────────────────
test("every requirement declares a deadlineKind; only fixed_annual carries a calendar date", () => {
  for (const r of requirements) {
    assert.ok(["fixed_annual", "one_time", "recurring_variable"].includes(r.deadlineKind), `${r.id} deadlineKind`);
    if (r.deadlineKind === "fixed_annual") {
      assert.ok(r.deadlineMonth >= 1 && r.deadlineMonth <= 12 && r.deadlineDay >= 1 && r.deadlineDay <= 31, `${r.id} month/day`);
    } else {
      assert.strictEqual(r.deadlineMonth, undefined, `${r.id} must not carry a month`);
      assert.strictEqual(r.deadlineDay, undefined, `${r.id} must not carry a day`);
    }
  }
});

test("items whose source gives no single date resolve to no_deadline with a null date", async () => {
  const { resolveObligation } = await load("../lib/ruleEngine.ts");
  for (const id of ["bir-cor", "sss-contribution", "bir-1601c-monthly-compensation", "philhealth-employer-reg"]) {
    const result = resolveObligation(byId(id), undefined, OCT_5, "2026-01-01T00:00:00Z");
    assert.strictEqual(result.dueDate, null, id);
    assert.strictEqual(result.status, "no_deadline", id);
    assert.strictEqual(result.cycle, "once", id);
  }
});

test("a completed undated item shows completed", async () => {
  const { resolveObligation } = await load("../lib/ruleEngine.ts");
  const done = { completedAt: "2026-09-01T00:00:00Z", dueDate: "2026-09-01T00:00:00Z" };
  assert.strictEqual(resolveObligation(byId("bir-cor"), done, OCT_5).status, "completed");
});

// ── BUG-004: overdue is reachable; completion is per cycle ─────────────────
test("a passed annual deadline is overdue for someone who was already on the app", async () => {
  const { resolveObligation } = await load("../lib/ruleEngine.ts");
  const r = resolveObligation(byId("bir-1701a-8percent"), undefined, OCT_5, "2026-01-10T00:00:00Z");
  assert.strictEqual(r.status, "overdue");
  assert.strictEqual(r.dueKey, "2026-04-15");
});

test("a deadline that passed before the profile existed rolls to next year instead of showing overdue", async () => {
  const { resolveObligation } = await load("../lib/ruleEngine.ts");
  const r = resolveObligation(byId("bir-1701a-8percent"), undefined, OCT_5, "2026-08-01T00:00:00Z");
  assert.strictEqual(r.status, "upcoming");
  assert.strictEqual(r.dueKey, "2027-04-15");
  assert.strictEqual(r.cycle, "2027");
});

test("completing an annual item counts for its own cycle only and resets next year", async () => {
  const { resolveObligation } = await load("../lib/ruleEngine.ts");
  const progress = { completedAt: "2026-04-10T00:00:00Z", dueDate: "2026-04-15T12:00:00.000Z" };
  const created = "2026-01-10T00:00:00Z";
  assert.strictEqual(resolveObligation(byId("bir-1701a-8percent"), progress, OCT_5, created).status, "completed");
  const nextJan = resolveObligation(byId("bir-1701a-8percent"), progress, new Date(2027, 0, 2), created);
  assert.strictEqual(nextJan.status, "upcoming");
  assert.strictEqual(nextJan.cycle, "2027");
  const nextMay = resolveObligation(byId("bir-1701a-8percent"), progress, new Date(2027, 4, 1), created);
  assert.strictEqual(nextMay.status, "overdue");
});

test("due-soon and due-today still work for annual items", async () => {
  const { resolveObligation } = await load("../lib/ruleEngine.ts");
  const created = "2026-01-01T00:00:00Z";
  assert.strictEqual(resolveObligation(byId("lgu-permit-renewal"), undefined, new Date(2026, 0, 20, 15), created).status, "due_today");
  assert.strictEqual(resolveObligation(byId("lgu-permit-renewal"), undefined, new Date(2026, 0, 10), created).status, "due_soon");
});

test("toDateKey uses the local calendar date (Jan 1 does not slip into the previous year)", async () => {
  const { toDateKey } = await load("../lib/ruleEngine.ts");
  assert.strictEqual(toDateKey(new Date(2027, 0, 1)), "2027-01-01");
  assert.strictEqual(toDateKey(new Date(2026, 11, 31)), "2026-12-31");
});

test("sorting puts dated items first and undated last", async () => {
  const { compareByDue } = await load("../lib/ruleEngine.ts");
  const list = [{ n: "x", dueDate: null }, { n: "b", dueDate: new Date(2026, 5, 1) }, { n: "a", dueDate: new Date(2026, 1, 1) }];
  assert.deepStrictEqual(list.sort(compareByDue).map((i) => i.n), ["a", "b", "x"]);
});

// ── BUG-011: existing businesses ───────────────────────────────────────────
test("an already-registered business does not get one-time new-registration items", async () => {
  const { generateApplicableRequirements } = await load("../lib/ruleEngine.ts");
  const existing = { ...baseProfile, isRegisteringNewBusiness: false, status: "operating", hasEmployees: true, employeeCount: 2, taxpayerType: "self_employment_or_profession" };
  const ids = generateApplicableRequirements(existing, requirements).map((r) => r.id);
  for (const gone of ["bir-cor", "bir-registration-filing", "lgu-barangay-mayors-clearance", "bir-books-of-accounts", "bir-orus-registration", "bir-1906-authority-to-print"]) {
    assert.ok(!ids.includes(gone), `${gone} should not appear for an existing business`);
  }
  for (const stays of ["bir-1701-self-employed", "bir-1701q-quarterly", "sss-contribution", "lgu-permit-renewal", "bir-1601c-monthly-compensation"]) {
    assert.ok(ids.includes(stays), `${stays} should stay for an existing business`);
  }
});

test("a new business still gets the registration steps", async () => {
  const { generateApplicableRequirements } = await load("../lib/ruleEngine.ts");
  const ids = generateApplicableRequirements(baseProfile, requirements).map((r) => r.id);
  for (const id of ["bir-cor", "bir-registration-filing", "lgu-barangay-mayors-clearance", "bir-books-of-accounts", "bir-orus-registration", "bir-1906-authority-to-print"]) {
    assert.ok(ids.includes(id), id);
  }
});

test("every wizard combination still yields a non-empty checklist", async () => {
  const { generateApplicableRequirements } = await load("../lib/ruleEngine.ts");
  for (const isNew of [true, false])
    for (const taxpayerType of ["purely_compensation", "self_employment_or_profession", "purely_business", "mixed_income_earner"])
      for (const hasEmployees of [true, false])
        for (const hasLease of [true, false]) {
          const profile = { ...baseProfile, isRegisteringNewBusiness: isNew, status: isNew ? "planning" : "operating", taxpayerType, hasEmployees, employeeCount: hasEmployees ? 2 : 0, hasLease };
          assert.ok(generateApplicableRequirements(profile, requirements).length > 0, JSON.stringify({ isNew, taxpayerType, hasEmployees, hasLease }));
        }
});

// ── Requirement detail: why it applies ─────────────────────────────────────
test("explainApplicability derives reasons from the matched rule", async () => {
  const { explainApplicability } = await load("../lib/ruleEngine.ts");
  const reasons = explainApplicability(byId("sss-employer-reg"), { ...baseProfile, hasEmployees: true, employeeCount: 3 });
  assert.ok(reasons.some((r) => r.includes("3 employees")));
  assert.deepStrictEqual(explainApplicability({ applicabilityRules: {} }, baseProfile), []);
});

// ── Task progress migration / RLS ──────────────────────────────────────────
test("task_progress migration enables RLS with an owner-only policy", () => {
  const sql = fs.readFileSync(path.join(root, "database", "migrations", "002_task_progress.sql"), "utf8");
  assert.match(sql, /enable row level security/i);
  assert.match(sql, /using \(user_id = \(select auth\.uid\(\)\)\)/i);
  assert.match(sql, /revoke all on public\.task_progress from anon/i);
  for (const file of ["supabase_setup.sql", "schema.sql"]) {
    assert.match(fs.readFileSync(path.join(root, "database", file), "utf8"), /task_progress/);
  }
});

// ── Guest-first flow wiring ────────────────────────────────────────────────
test("the wizard is not behind AuthGuard and the landing CTAs go to the wizard", () => {
  const wizard = fs.readFileSync(path.join(root, "app", "wizard", "page.tsx"), "utf8");
  assert.ok(!wizard.includes("AuthGuard"), "wizard must be reachable by guests");
  assert.ok(fs.existsSync(path.join(root, "app", "preview", "page.tsx")));
  const landing = fs.readFileSync(path.join(root, "app", "page.tsx"), "utf8");
  assert.ok(landing.includes('href="/wizard"'));
  const nav = fs.readFileSync(path.join(root, "components", "Navbar.tsx"), "utf8");
  assert.ok(nav.includes('href="/wizard" className="primary-btn nav-cta"'));
});

test("the free requirement detail shows source and applicability outside the premium gate", () => {
  const src = fs.readFileSync(path.join(root, "app", "requirements", "[id]", "page.tsx"), "utf8");
  const gateStart = src.indexOf("<PremiumGate>");
  for (const marker of ["Official Resource", "What is this?", "Last verified"]) {
    const at = src.indexOf(marker);
    assert.ok(at > -1 && at < gateStart, `${marker} must be before the PremiumGate`);
  }
  for (const marker of ["Required Documents", "How to complete"]) {
    assert.ok(src.indexOf(marker) > gateStart, `${marker} stays Premium`);
  }
});
