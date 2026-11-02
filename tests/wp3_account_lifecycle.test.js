// Work Package 3 — account lifecycle, Premium entitlements and admin audit trail.
//
// WHAT THESE ARE: (a) real executions of the pure TypeScript logic (entitlement decisions, the delete-account handler, the
// admin account-status handler, auth error wording) using fake dependencies, and (b) checks of the SQL FILES and the source
// files as TEXT. (a) proves the logic behaves as described. (b) proves a guard is WRITTEN, not that PostgreSQL enforces it.
// WHAT THEY ARE NOT: database tests, browser tests or tests against Supabase. None of those were run for this package.
// database/rehearsal/run_rehearsal.sh section 15 holds the database checks for migration 008; it needs a local PostgreSQL
// and was NOT executed when it was written. See docs/ACCOUNT_LIFECYCLE_QA.md.
const test = require("node:test");
const assert = require("node:assert");
const fs = require("node:fs");
const path = require("node:path");

const ROOT = path.join(__dirname, "..");
const read = (...p) => fs.readFileSync(path.join(ROOT, ...p), "utf8");
const noComments = (sql) => sql.replace(/--.*$/gm, "");
const { pathToFileURL } = require("node:url");
const load = (rel) => import(pathToFileURL(path.resolve(__dirname, rel)).href);
const walk = (d) => fs.readdirSync(d, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk(path.join(d, e.name)) : [path.join(d, e.name)]));
const srcFiles = (...dirs) => dirs.flatMap((d) => walk(path.join(ROOT, d))).filter((f) => /\.(ts|tsx)$/.test(f));
const rel = (f) => path.relative(ROOT, f).split(path.sep).join("/");

const FUTURE = new Date(Date.now() + 86_400_000).toISOString();
const PAST = new Date(Date.now() - 86_400_000).toISOString();
const row = (status, source = "admin_grant", expires_at = null, deactivated_at = null) => [{ status, source, expires_at, deactivated_at }];

const m005 = noComments(read("database", "migrations", "005_account_lifecycle.sql"));
const m006 = noComments(read("database", "migrations", "006_entitlements.sql"));
const m008raw = read("database", "migrations", "008_audit_hardening.sql");
const m008 = noComments(m008raw);
const fnBody = (sql, name) => {
  const defs = sql.split(/create or replace function /i).filter((d) => d.startsWith(`public.${name}(`));
  assert.ok(defs.length > 0, `${name} is defined`);
  return defs[defs.length - 1];
};

// ═══ 1. Premium entitlements: expiry, revocation, fail-closed ═══════════════════════════════════
test("entitlements: grant with expiry, no expiry, expired and revoked each map to the right access", async () => {
  const { resolveServerAccess, resolveClientEntitlement, hasPremiumAccess, canUse } = await load("../lib/entitlements.ts");
  const cases = [
    [row("premium", "admin_grant", FUTURE), true],
    [row("premium", "admin_grant", null), true],
    [row("expired", "admin_grant", PAST), false],
    [row("cancelled", "admin_grant", null), false],
    [row("free", "none", null), false],
  ];
  for (const [r, premium] of cases) {
    assert.strictEqual(resolveServerAccess("free", r, null).premium, premium, JSON.stringify(r));
    const c = resolveClientEntitlement("free", r, null);
    assert.strictEqual(c.verified, true);
    assert.strictEqual(hasPremiumAccess({ role: "free", entitlement: c.entitlement }), premium);
    assert.strictEqual(canUse({ role: "free", entitlement: c.entitlement }, "penalty_simulator"), premium);
    assert.strictEqual(canUse({ role: "free", entitlement: c.entitlement }, "basic_checklist"), true, "Free features stay available");
  }
});

test("entitlements: a grant whose expiry passes while the page is open stops counting, on the client AND on the server decision", async () => {
  const { resolveServerAccess, hasPremiumAccess } = await load("../lib/entitlements.ts");
  assert.strictEqual(resolveServerAccess("free", row("premium", "admin_grant", PAST), null).premium, false);
  assert.strictEqual(hasPremiumAccess({ role: "free", entitlement: { status: "premium", source: "admin_grant", expiresAt: PAST } }), false);
});

test("entitlements: the client plan FAILS CLOSED on any lookup failure (WP3)", async () => {
  const { resolveClientEntitlement } = await load("../lib/entitlements.ts");
  const errors = [{ code: "57014", message: "statement timeout" }, { code: "PGRST301", message: "JWT expired" }, { message: "Failed to fetch" }, new Error("network down"), { code: "42501", message: "permission denied for function get_my_entitlement" }, "boom"];
  for (const role of ["free", "premium", "admin"]) {
    for (const err of errors) {
      const r = resolveClientEntitlement(role, null, err);
      assert.strictEqual(r.entitlement.status, "free", `${role} + ${JSON.stringify(err)} must show Free`);
      assert.strictEqual(r.verified, false);
    }
  }
  for (const bad of [null, undefined, [], {}, { status: "gold", source: "none" }, { status: "premium", source: "hacked" }, "premium"]) {
    const r = resolveClientEntitlement("premium", bad, null);
    assert.deepStrictEqual([r.entitlement.status, r.verified], ["free", false], JSON.stringify(bad));
  }
});

test("entitlements: only a genuinely missing function (migration 006 not installed) falls back to the stored role; unrelated errors do not (F-08)", async () => {
  const { isMissingFunction, resolveClientEntitlement, resolveServerAccess } = await load("../lib/entitlements.ts");
  assert.strictEqual(isMissingFunction({ code: "PGRST202" }), true);
  assert.strictEqual(isMissingFunction({ code: "42883" }), true);
  assert.strictEqual(isMissingFunction({ message: "Could not find the function public.get_my_entitlement without parameters in the schema cache" }), true);
  assert.strictEqual(isMissingFunction({ code: "42P01", message: 'relation "public.profiles" does not exist' }), false);
  assert.strictEqual(isMissingFunction({ message: "does not exist" }), false);
  assert.strictEqual(isMissingFunction({ message: "Could not find the function public.some_other_function" }), false);
  assert.strictEqual(isMissingFunction(null), false);
  // rollout fallback (documented): stored role is honoured ONLY in that case
  const missing = { code: "PGRST202", message: "not found" };
  assert.strictEqual(resolveClientEntitlement("premium", null, missing).entitlement.source, "legacy_role");
  assert.strictEqual(resolveClientEntitlement("free", null, missing).entitlement.status, "free");
  assert.deepStrictEqual(resolveServerAccess("premium", null, { code: "42P01", message: 'relation "x" does not exist' }, null), { premium: false, deactivated: false, verified: false });
});

test("entitlements: deactivated accounts never have Premium, whatever the plan row says", async () => {
  const { resolveServerAccess, hasPremiumAccess, canUse } = await load("../lib/entitlements.ts");
  const a = resolveServerAccess("premium", row("premium", "admin_grant", null, PAST), null);
  assert.deepStrictEqual([a.premium, a.deactivated], [false, true]);
  const b = resolveServerAccess("premium", row("premium", "admin_grant", null, null), null, PAST); // profile row says deactivated
  assert.deepStrictEqual([b.premium, b.deactivated], [false, true]);
  const u = { role: "premium", entitlement: { status: "premium", source: "legacy_role", expiresAt: null }, deactivatedAt: PAST };
  assert.strictEqual(hasPremiumAccess(u), false);
  assert.strictEqual(canUse(u, "basic_checklist"), false);
});

test("entitlements: a user cannot make themselves Premium or admin by editing browser state", async () => {
  const { hasPremiumAccess } = await load("../lib/entitlements.ts");
  // An edited role string cannot override the server-decided plan.
  assert.strictEqual(hasPremiumAccess({ role: "admin", entitlement: { status: "free", source: "none", expiresAt: null } }), false);
  assert.strictEqual(hasPremiumAccess({ role: "premium", entitlement: { status: "expired", source: "admin_grant", expiresAt: PAST } }), false);
});

test("no client code writes entitlements, roles or audit rows; only admin_* functions grant Premium, and only from adminUsers.ts", () => {
  for (const f of srcFiles("app", "lib", "components")) {
    const text = fs.readFileSync(f, "utf8");
    const name = rel(f);
    assert.ok(!/\.from\(["']entitlements["']\)\s*\.(insert|update|upsert|delete)/.test(text), `${name} writes entitlements`);
    assert.ok(!/\.from\(["']admin_audit_log["']\)\s*\.(insert|update|upsert|delete)/.test(text), `${name} writes the audit log`);
    assert.ok(!/\.from\(["']profiles["']\)\s*\.(insert|upsert|delete)/.test(text), `${name} writes profiles`);
    assert.ok(!/\.from\(["']profiles["']\)\s*\.update\([^)]*\b(role|is_demo|deactivated)/.test(text), `${name} updates a protected profile column`);
    if (/rpc\(["']admin_(grant|revoke)_premium["']/.test(text)) assert.strictEqual(name, "lib/adminUsers.ts");
    assert.ok(!/upgrade_to_premium_demo/.test(text), `${name} references the removed self-upgrade function`);
  }
});

test("Premium roles in SQL: legacy role keeps access only for accounts that never had an entitlement; grant moves them in; revoke clears them", () => {
  const ef = fnBody(m006, "entitlement_for");
  assert.ok(/prole = 'premium' and not exists \(select 1 from public\.entitlements x where x\.user_id = p_user\)/.test(ef));
  assert.ok(/e\.revoked_at is null and e\.starts_at <= now\(\)/.test(ef) && /e\.expires_at is null or e\.expires_at > now\(\)/.test(ef), "expiry and revocation are evaluated at read time");
  assert.ok(/prole = 'admin' and not coalesce\(pdemo, false\)/.test(ef), "a demo-flagged admin does not get automatic Premium");
  assert.ok(/update public\.profiles set role = 'free'/.test(fnBody(m006, "admin_grant_premium")), "grant moves a legacy account into the entitlement system");
  assert.ok(/update public\.profiles set role = 'free'/.test(fnBody(m006, "admin_revoke_premium")), "revoke clears a legacy role");
});

// ═══ 2. Account deletion (pure handler, fake dependencies) ═══════════════════════════════════════
const T0 = 1_000_000;
function delDeps(over = {}) {
  const calls = [];
  return {
    calls,
    deps: {
      getUserFromToken: async (t) => (t === "good" ? { id: "u1", lastSignInAt: new Date(T0).toISOString() } : null),
      getRole: async () => "free",
      isDemoAccount: async () => false,
      isDeactivatedByAdmin: async () => false,
      recordDeletion: async (id, role) => void calls.push(["record", id, role]),
      deleteAuthUser: async (id) => (calls.push(["delete", id]), { error: null }),
      now: () => T0 + 60_000,
      ...over,
    },
  };
}
const DEL = { confirm: "DELETE" };

test("delete: succeeds only for the caller's own id and writes one minimal record afterwards", async () => {
  const { handleDeleteAccount } = await load("../lib/deleteAccountHandler.ts");
  const a = delDeps();
  const r = await handleDeleteAccount("Bearer good", a.deps, { confirm: "DELETE", userId: "someone-else", user_id: "x", id: "y" });
  assert.deepStrictEqual([r.status, r.body.ok], [200, true]);
  assert.deepStrictEqual(a.calls, [["delete", "u1"], ["record", "u1", "free"]]);
});

test("delete: requires a signed-in caller, the typed word DELETE, and a sign-in within the last 10 minutes", async () => {
  const { handleDeleteAccount, REAUTH_WINDOW_MS } = await load("../lib/deleteAccountHandler.ts");
  assert.strictEqual(REAUTH_WINDOW_MS, 10 * 60 * 1000);
  const a = delDeps();
  assert.strictEqual((await handleDeleteAccount(null, a.deps, DEL)).status, 401);
  assert.strictEqual((await handleDeleteAccount("Bearer ", a.deps, DEL)).status, 401);
  assert.strictEqual((await handleDeleteAccount("Bearer bad", a.deps, DEL)).status, 401);
  for (const confirm of [undefined, "", "delete", "Delete", "DELET", "DELETE ME", 1, null, true]) {
    const r = await handleDeleteAccount("Bearer good", a.deps, { confirm });
    assert.strictEqual(r.body.code, "confirmation_required", String(confirm));
  }
  const edge = delDeps({ now: () => T0 + REAUTH_WINDOW_MS });
  assert.strictEqual((await handleDeleteAccount("Bearer good", edge.deps, DEL)).status, 200, "exactly at the window is still fresh");
  const stale = delDeps({ now: () => T0 + REAUTH_WINDOW_MS + 1 });
  assert.strictEqual((await handleDeleteAccount("Bearer good", stale.deps, DEL)).body.code, "reauth_required");
  const noSignIn = delDeps({ getUserFromToken: async () => ({ id: "u1", lastSignInAt: null }) });
  assert.strictEqual((await handleDeleteAccount("Bearer good", noSignIn.deps, DEL)).body.code, "reauth_required");
  assert.deepStrictEqual([...a.calls, ...stale.calls, ...noSignIn.calls], [], "nothing is deleted or recorded by any refused request");
});

test("delete: admin, demo (browser id and database flag) and admin-deactivated accounts are refused", async () => {
  const { handleDeleteAccount } = await load("../lib/deleteAccountHandler.ts");
  const admin = delDeps({ getRole: async () => "admin" });
  assert.strictEqual((await handleDeleteAccount("Bearer good", admin.deps, DEL)).body.code, "admin_protected");
  const demoId = delDeps({ getUserFromToken: async () => ({ id: "demo-premium", lastSignInAt: new Date(T0).toISOString() }) });
  assert.strictEqual((await handleDeleteAccount("Bearer good", demoId.deps, DEL)).body.code, "demo");
  const demoRow = delDeps({ isDemoAccount: async () => true });
  assert.strictEqual((await handleDeleteAccount("Bearer good", demoRow.deps, DEL)).body.code, "demo");
  const adminDeact = delDeps({ isDeactivatedByAdmin: async () => true });
  const r = await handleDeleteAccount("Bearer good", adminDeact.deps, DEL);
  assert.deepStrictEqual([r.status, r.body.code], [403, "admin_deactivated"]);
  assert.deepStrictEqual([...admin.calls, ...demoId.calls, ...demoRow.calls, ...adminDeact.calls], []);
});

test("delete: a self-deactivated account may still delete itself (only admin-imposed deactivation blocks it)", async () => {
  const { handleDeleteAccount } = await load("../lib/deleteAccountHandler.ts");
  const a = delDeps({ isDeactivatedByAdmin: async () => false });
  assert.strictEqual((await handleDeleteAccount("Bearer good", a.deps, DEL)).status, 200);
});

test("delete: every failed or unreadable lookup refuses with 503 and deletes nothing (F-07, fail closed)", async () => {
  const { handleDeleteAccount } = await load("../lib/deleteAccountHandler.ts");
  const variants = {
    "role unreadable (null)": { getRole: async () => null },
    "role undefined": { getRole: async () => undefined },
    "role lookup throws": { getRole: async () => { throw new Error("db down"); } },
    "demo lookup throws": { isDemoAccount: async () => { throw new Error("db down"); } },
    "deactivation lookup throws": { isDeactivatedByAdmin: async () => { throw new Error("db down"); } },
  };
  for (const [name, over] of Object.entries(variants)) {
    const a = delDeps(over);
    const r = await handleDeleteAccount("Bearer good", a.deps, DEL);
    assert.deepStrictEqual([r.status, r.body.code], [503, "lookup_failed"], name);
    assert.deepStrictEqual(a.calls, [], `${name}: nothing deleted or recorded`);
  }
});

test("delete: a failing auth delete reports failure, keeps the account, and leaves no record", async () => {
  const { handleDeleteAccount } = await load("../lib/deleteAccountHandler.ts");
  const a = delDeps({ deleteAuthUser: async () => ({ error: "boom" }) });
  const r = await handleDeleteAccount("Bearer good", a.deps, DEL);
  assert.deepStrictEqual([r.status, r.body.code], [500, "delete_failed"]);
  assert.deepStrictEqual(a.calls, []);
});

test("delete route: lookups report errors, the service key stays server-side, the record is a hash with no email", () => {
  const route = read("app", "api", "delete-account", "route.ts");
  const between = (a, b) => route.slice(route.indexOf(a), route.indexOf(b));
  for (const [from, to] of [["async getRole", "async isDemoAccount"], ["async isDemoAccount", "async isDeactivatedByAdmin"], ["async isDeactivatedByAdmin", "async deleteAuthUser"]]) {
    assert.ok(/\berror\b/.test(between(from, to).replace(/async \w+\(userId\)/, "")), `${from} inspects error`);
  }
  assert.ok(/isDeactivatedByAdmin[\s\S]*42703/.test(route), "a missing 005 column means 'no such state', not a crash");
  assert.ok(route.includes('createHash("sha256")') && !/email/i.test(route.slice(route.indexOf("async recordDeletion"))));
  assert.ok(route.includes("not_configured") && route.includes("status: 503"));
});

test("deleting an account removes every user-linked table and keeps only the justified minimal records (SQL contract)", () => {
  const all = noComments([read("database", "supabase_setup.sql"), ...fs.readdirSync(path.join(ROOT, "database", "migrations")).filter((f) => f.endsWith(".sql")).sort().map((f) => read("database", "migrations", f))].join("\n"));
  for (const t of ["profiles", "business_profiles", "checklist_progress", "task_progress", "reminder_configs", "sent_emails", "reminder_deliveries", "entitlements"]) {
    const start = all.search(new RegExp(`create table (?:if not exists )?public\\.${t}\\b`, "i"));
    assert.ok(start >= 0, t);
    assert.ok(/references auth\.users \(id\) on delete cascade/i.test(all.slice(start, all.indexOf(");", start))), `${t} cascades`);
  }
  const deletionLog = all.slice(all.search(/create table if not exists public\.account_deletion_log/i), all.search(/create index if not exists idx_account_deletion_log_purge/i));
  assert.ok(!/\b(email|name|password|token|user_id)\b/i.test(deletionLog.replace(/user_ref/g, "")), "the deletion record holds no email, name, password, token or user id");
  assert.ok(/purge_after\s+timestamptz not null default \(now\(\) \+ interval '30 days'\)/.test(deletionLog));
  assert.ok(/revoke all on public\.account_deletion_log from anon, authenticated/i.test(all), "no API role can read the deletion record");
});

// ═══ 3. Admin deactivation, sessions and demo/admin restrictions ═══════════════════════════════════
const UID = "aaaaaaaa-0000-0000-0000-000000000001";
const TARGET = "bbbbbbbb-0000-0000-0000-000000000002";
function stDeps(over = {}) {
  const calls = [];
  return {
    calls,
    deps: {
      getUserFromToken: async (t) => (t === "admin-token" ? { id: UID } : t === "user-token" ? { id: "cccccccc-0000-0000-0000-000000000003" } : null),
      callerIsAdmin: async (t) => t === "admin-token",
      getTargetState: async () => ({ found: true, role: "free", isDemo: false, deactivated: true }),
      setStatusAsCaller: async (t, i) => (calls.push(["rpc", i.deactivate]), { error: null }),
      setAuthBan: async (id, banned) => (calls.push(["ban", id, banned]), { error: null }),
      ...over,
    },
  };
}
const input = (over = {}) => ({ target: TARGET, deactivate: true, reason: "Reported abuse, under review", ...over });

test("admin status: deactivating runs the audited database step first, then blocks the Auth sign-in", async () => {
  const { handleAdminAccountStatus } = await load("../lib/adminAccountStatusHandler.ts");
  const a = stDeps();
  const r = await handleAdminAccountStatus("Bearer admin-token", a.deps, input());
  assert.deepStrictEqual([r.status, r.body.ok, r.body.sessionBlocked], [200, true, true]);
  assert.deepStrictEqual(a.calls, [["rpc", true], ["ban", TARGET, true]]);
});

test("admin status: if the database refuses (admin, demo, self, unknown, bad reason) nothing is banned", async () => {
  const { handleAdminAccountStatus } = await load("../lib/adminAccountStatusHandler.ts");
  for (const [code, message, status] of [["42501", "Admin accounts cannot be deactivated here", 403], ["42501", "Demo accounts cannot be deactivated", 403], ["P0002", "Account not found", 404], ["22023", "A reason of 3–300 characters is required", 400], ["XX000", "boom", 500]]) {
    const a = stDeps({ setStatusAsCaller: async () => ({ error: { code, message } }) });
    const r = await handleAdminAccountStatus("Bearer admin-token", a.deps, input());
    assert.strictEqual(r.status, status, message);
    assert.strictEqual(r.body.error, message);
    assert.deepStrictEqual(a.calls, [], `${message}: no ban`);
  }
});

test("admin status: a failed ban still reports success for the deactivation but warns that sign-in was not blocked", async () => {
  const { handleAdminAccountStatus } = await load("../lib/adminAccountStatusHandler.ts");
  const a = stDeps({ setAuthBan: async () => ({ error: "auth down" }) });
  const r = await handleAdminAccountStatus("Bearer admin-token", a.deps, input());
  assert.deepStrictEqual([r.status, r.body.ok, r.body.sessionBlocked], [200, true, false]);
  assert.ok(/sign-in could not be blocked/.test(r.body.warning));
});

test("admin status: reactivation checks the target, lifts the ban BEFORE the database step, and never touches other accounts", async () => {
  const { handleAdminAccountStatus } = await load("../lib/adminAccountStatusHandler.ts");
  const ok = stDeps();
  const r = await handleAdminAccountStatus("Bearer admin-token", ok.deps, input({ deactivate: false }));
  assert.strictEqual(r.status, 200);
  assert.deepStrictEqual(ok.calls, [["ban", TARGET, false], ["rpc", false]]);
  for (const [state, status, code] of [
    [{ found: false, role: null, isDemo: false, deactivated: false }, 404, "P0002"],
    [{ found: true, role: "admin", isDemo: false, deactivated: true }, 403, "42501"],
    [{ found: true, role: "free", isDemo: true, deactivated: true }, 403, "42501"],
    [{ found: true, role: "free", isDemo: false, deactivated: false }, 409, "not_deactivated"],
  ]) {
    const a = stDeps({ getTargetState: async () => state });
    const res = await handleAdminAccountStatus("Bearer admin-token", a.deps, input({ deactivate: false }));
    assert.deepStrictEqual([res.status, res.body.code], [status, code], JSON.stringify(state));
    assert.deepStrictEqual(a.calls, [], "no unban and no database change for a refused target");
  }
  const lookup = stDeps({ getTargetState: async () => { throw new Error("db down"); } });
  assert.strictEqual((await handleAdminAccountStatus("Bearer admin-token", lookup.deps, input({ deactivate: false }))).status, 503);
  assert.deepStrictEqual(lookup.calls, []);
  const banFail = stDeps({ setAuthBan: async () => ({ error: "auth down" }) });
  const bf = await handleAdminAccountStatus("Bearer admin-token", banFail.deps, input({ deactivate: false }));
  assert.deepStrictEqual([bf.status, bf.body.code], [502, "ban_lift_failed"]);
  assert.deepStrictEqual(banFail.calls, [], "the database step is not run when the ban could not be lifted");
});

test("admin status: only a verified admin may use it (not signed in, ordinary user, failed admin check)", async () => {
  const { handleAdminAccountStatus } = await load("../lib/adminAccountStatusHandler.ts");
  const a = stDeps();
  assert.strictEqual((await handleAdminAccountStatus(null, a.deps, input())).status, 401);
  assert.strictEqual((await handleAdminAccountStatus("Bearer nope", a.deps, input())).status, 401);
  const u = await handleAdminAccountStatus("Bearer user-token", a.deps, input());
  assert.deepStrictEqual([u.status, u.body.error], [403, "Admins only"]);
  const down = stDeps({ callerIsAdmin: async () => { throw new Error("db down"); } });
  assert.strictEqual((await handleAdminAccountStatus("Bearer admin-token", down.deps, input())).status, 503);
  assert.deepStrictEqual([...a.calls, ...down.calls], [], "no database change and no ban for any refused caller");
});

test("admin status: input is validated (uuid target, boolean action, 3–300 character reason, not yourself)", async () => {
  const { handleAdminAccountStatus } = await load("../lib/adminAccountStatusHandler.ts");
  const a = stDeps();
  const bad = [
    [input({ target: "not-a-uuid" }), "invalid_target"], [input({ target: undefined }), "invalid_target"], [input({ target: "1; drop table profiles" }), "invalid_target"],
    [input({ deactivate: "true" }), "invalid_action"], [input({ deactivate: undefined }), "invalid_action"],
    [input({ reason: "" }), "22023"], [input({ reason: "ab" }), "22023"], [input({ reason: "x".repeat(301) }), "22023"], [input({ reason: 5 }), "22023"],
    [input({ target: UID }), "42501"],
  ];
  for (const [i, code] of bad) {
    const r = await handleAdminAccountStatus("Bearer admin-token", a.deps, i);
    assert.ok(r.status >= 400 && r.body.code === code, `${JSON.stringify(i)} -> ${r.status} ${r.body.code}`);
  }
  assert.deepStrictEqual(a.calls, []);
});

test("admin status route and client: service key stays on the server; the client sends no role; sign-in ban is wired", () => {
  const route = read("app", "api", "admin", "account-status", "route.ts");
  assert.ok(!/["']use client["']/.test(route) && !/NEXT_PUBLIC_[A-Z_]*SERVICE/.test(route));
  assert.ok(/ban_duration/.test(route) && /handleAdminAccountStatus/.test(route));
  assert.ok(route.includes('rpc("is_admin")') && route.includes('rpc("admin_set_account_status"'), "admin check and audited change both happen in the database, as the caller");
  assert.ok(route.indexOf('rpc("admin_set_account_status"') < route.indexOf("ban_duration"), "route wires the database step before the ban helper");
  const lib = read("lib", "adminUsers.ts");
  assert.ok(lib.includes('"/api/admin/account-status"') && !/p_role|role:/.test(lib.slice(lib.indexOf("export async function setAccountStatus"), lib.indexOf("export async function fetchAuditLog"))));
  const users = read("app", "admin", "users", "page.tsx");
  assert.ok(/!isAdmin && u\.id !== user\?\.id/.test(users), "no controls for admin rows or your own row");
  assert.ok(/!u\.isDemo && <button[\s\S]*?Grant Premium/.test(users), "no Premium grant control on demo rows");
});

test("a banned (admin-deactivated) sign-in shows a clear message for email and Google sign-in", async () => {
  const { friendlyEmailAuthError, friendlyAuthError } = await load("../lib/authErrors.ts");
  assert.match(friendlyEmailAuthError("User is banned"), /deactivated by an administrator/);
  assert.match(friendlyAuthError("user is banned"), /deactivated by an administrator/);
  assert.match(friendlyEmailAuthError("Invalid login credentials"), /do not match/);
});

test("database restrictions for deactivation, reactivation, demo and admin accounts (SQL contract on 005/006/008)", () => {
  const react = fnBody(m005, "reactivate_my_account");
  assert.ok(/if by_admin then\s*raise exception 'This account was deactivated by an administrator'/.test(react), "admin-deactivated users cannot reactivate themselves");
  const selfDeact = fnBody(m005, "deactivate_my_account");
  assert.ok(/r = 'admin'/.test(selfDeact) && /coalesce\(d, false\)/.test(selfDeact), "admins and demo accounts cannot self-deactivate");
  for (const sql of [fnBody(m005, "admin_set_account_status"), fnBody(m008, "admin_set_account_status")]) {
    assert.ok(/not public\.is_admin\(\)/.test(sql) && /p_target = me/.test(sql) && /trole = 'admin'/.test(sql) && /coalesce\(tdemo, false\)/.test(sql));
    assert.ok(/char_length\(btrim\(p_reason\)\) < 3/.test(sql), "a reason is required");
  }
  for (const sql of [fnBody(m006, "admin_grant_premium"), fnBody(m008, "admin_grant_premium")]) {
    assert.ok(/trole = 'admin'/.test(sql) && /if tdemo then raise exception 'Demo accounts do not use entitlements'/.test(sql) && /p_expires <= now\(\)/.test(sql));
  }
  assert.ok(/not found then raise exception 'Account not found'/.test(fnBody(m008, "admin_revoke_premium").replace(/\s+/g, " ")) || /if not found then raise exception 'Account not found'/.test(fnBody(m008, "admin_revoke_premium")));
  assert.ok(/not p\.is_demo/.test(fnBody(m006, "admin_premium_roster")) && /deactivated_at is null/.test(fnBody(m006, "admin_premium_roster")), "roster excludes demo and deactivated accounts");
  assert.ok(/not is_demo/.test(read("database", "supabase_setup.sql")), "is_admin() ignores demo-flagged admins");
});

test("front-end lifecycle guards: deactivated accounts see only the reactivation screen; demo previews never reach the server", () => {
  assert.ok(/user\.deactivatedAt && !user\.isDemo\) return <DeactivatedNotice/.test(read("components", "AuthGuard.tsx")));
  const auth = read("lib", "auth.tsx");
  const del = auth.slice(auth.indexOf("async function deleteAccount"), auth.indexOf("function lifecycleError"));
  assert.ok(/user\.isDemo \|\| user\.isDemoRecord\) return \{ ok: false/.test(del) && del.indexOf("isDemo") < del.indexOf("/api/delete-account"));
  assert.ok(/confirm\.trim\(\) !== "DELETE"/.test(del) && /signInWithPassword/.test(del), "client re-checks DELETE and re-authenticates with the password");
  const deact = auth.slice(auth.indexOf("async function deactivateAccount"), auth.indexOf("async function reactivateAccount"));
  assert.ok(/isDemo \|\| user\.isDemoRecord\) return \{ ok: false/.test(deact));
  assert.ok(/administrator/.test(auth.slice(auth.indexOf("function lifecycleError"))), "the admin-deactivation message is shown to the user");
  assert.ok(/role === "admin"\) return null/.test(read("components", "DeactivateAccountSection.tsx")) || /user\.role === "admin"/.test(read("components", "DeactivateAccountSection.tsx")));
});

test("loadUser tolerates a missing migration-005 column and an unreadable profile without granting anything (DB-02)", () => {
  const auth = read("lib", "auth.tsx");
  const load = auth.slice(auth.indexOf("async function loadUser"), auth.indexOf("export function AuthProvider"));
  assert.ok(load.includes('"42703"') && /profileError/.test(load), "retries without the new columns, and looks at the error");
  assert.ok(load.includes("resolveClientEntitlement") && !load.includes("entitlementFromRole"), "plan comes only through the fail-closed resolver");
});

// ═══ 4. Signup, login, email confirmation, Google (what can be verified without a browser) ═══════════
test("auth: error wording for login, unconfirmed email, duplicates and weak passwords; confirmation-link failures are classified", async () => {
  const { friendlyEmailAuthError, classifyConfirmationError, friendlyAuthError } = await load("../lib/authErrors.ts");
  assert.match(friendlyEmailAuthError("Invalid login credentials"), /do not match/);
  assert.match(friendlyEmailAuthError("Email not confirmed"), /confirm your email/i);
  assert.match(friendlyEmailAuthError("User already registered"), /already exists/);
  assert.match(friendlyEmailAuthError("Password should be at least 6 characters"), /stronger password/);
  assert.match(friendlyEmailAuthError("email rate limit exceeded"), /Too many attempts/);
  assert.doesNotMatch(friendlyEmailAuthError('{"code":500,"raw":"select * from auth.users"}'), /select|auth\.users|\{/);
  assert.strictEqual(classifyConfirmationError("otp_expired", "Email link is invalid or has expired"), "expired");
  assert.strictEqual(classifyConfirmationError("access_denied", "denied"), "denied");
  assert.strictEqual(classifyConfirmationError(null, null), null);
  assert.match(friendlyAuthError("Unsupported provider: provider is not enabled"), /not switched on/);
});

test("auth: sign-up, login and Google flows are wired to the safe redirect helper and Supabase Auth only", () => {
  const auth = read("lib", "auth.tsx");
  assert.ok(/emailRedirectTo: redirectTo/.test(auth) && /authRedirectUrl\("\/auth\/confirmed"\)/.test(auth), "confirmation link returns to /auth/confirmed");
  assert.ok(/identities\.length === 0/.test(auth), "an already-registered email is detected without leaking account details");
  assert.ok(/signInWithOAuth\(\{\s*provider: "google"/.test(auth) && /authRedirectUrl\("\/login"\)/.test(auth));
  assert.ok(/signInWithPassword\(\{ email, password \}\)/.test(auth));
  const setup = read("database", "supabase_setup.sql");
  const trigger = setup.slice(setup.search(/function public\.handle_new_user/), setup.search(/function public\.handle_new_user/) + 900);
  assert.ok(/insert into public\.profiles \(id, email, name\)/.test(trigger) && !/role/.test(trigger.slice(trigger.indexOf("insert"), trigger.indexOf("values"))), "the signup trigger never takes a role from the request");
  assert.ok(/grant update \(name\) on public\.profiles to authenticated/.test(setup), "profile updates by the user are limited to the name column");
});

// ═══ 5. Admin audit trail ═══════════════════════════════════════════════════════════════════════
test("audit: 008 is prepared but unapplied, never run on its own by the app, and numbered after 007", () => {
  assert.ok(/NOT APPLIED/.test(m008raw.slice(0, 400)));
  assert.ok(/Do NOT re-run 003, 005 or 006/.test(m008raw));
  assert.ok(fs.existsSync(path.join(ROOT, "database", "migrations", "007_admin_overview_computed_plan.sql")));
});

test("audit: every audited operation records actor, target, action, time, reason and the status before/after (SQL contract)", () => {
  const log = fnBody(m008, "log_admin_action");
  assert.ok(/insert into public\.admin_audit_log \(actor_id, action, target_user_id, details, reason, target_ref\)/.test(log));
  assert.ok(/btrim\(p_details ->> 'reason'\)/.test(log) && /sha256\(convert_to\(p_target::text, 'UTF8'\)\)/.test(log));
  assert.ok(/created_at\s+timestamptz not null default now\(\)/.test(noComments(read("database", "migrations", "005_account_lifecycle.sql"))), "timestamp is set by the database, not the caller");
  assert.ok(/check \(reason is not null and char_length\(btrim\(reason\)\) between 3 and 300\) not valid/.test(m008.replace(/\s+/g, " ")), "new rows must have a reason");
  for (const fn of ["admin_set_account_status", "admin_grant_premium", "admin_revoke_premium", "admin_sync_profiles"]) {
    const body = fnBody(m008, fn);
    assert.ok(/public\.log_admin_action\(/.test(body) && /'reason'/.test(body), `${fn} logs a reason`);
    if (fn !== "admin_sync_profiles") assert.ok(/'before'/.test(body) && /'after'/.test(body), `${fn} logs before and after`);
    assert.ok(/set search_path = ''/.test(body) && /security definer/.test(body), `${fn} is a pinned definer function`);
    assert.ok(/not public\.is_admin\(\)/.test(body), `${fn} still checks the caller`);
    assert.ok(new RegExp(`revoke execute on function public\\.${fn}\\([^)]*\\) from public, anon`, "i").test(m008), `${fn} revoked from anon`);
  }
  assert.ok(/'actor_id'|auth\.uid\(\)/.test(fnBody(m008, "admin_set_account_status")), "actor is the signed-in admin, never a parameter");
  for (const fn of ["admin_set_account_status", "admin_grant_premium", "admin_revoke_premium", "admin_sync_profiles"]) {
    assert.ok(!/p_actor|p_admin/.test(fnBody(m008, fn).split(/\)\s*returns/)[0]), `${fn} takes no actor parameter`);
  }
});

test("audit: the log is append-only: update, delete and truncate are refused, except the automatic unlink when an account is deleted", () => {
  assert.ok(/create trigger admin_audit_log_no_update_delete\s+before update or delete on public\.admin_audit_log\s+for each row/.test(m008));
  assert.ok(/create trigger admin_audit_log_no_truncate\s+before truncate on public\.admin_audit_log\s+for each statement/.test(m008));
  const guard = fnBody(m008, "admin_audit_log_guard");
  for (const col of ["id", "action", "details", "created_at", "reason", "target_ref"]) assert.ok(new RegExp(`new\\.${col} is not distinct from old\\.${col}`).test(guard), `${col} must be unchanged`);
  assert.ok(/new\.actor_id is null or new\.actor_id is not distinct from old\.actor_id/.test(guard) && /new\.target_user_id is null or new\.target_user_id is not distinct from old\.target_user_id/.test(guard));
  assert.ok(/tg_op = 'UPDATE'/.test(guard) && /raise exception 'The audit log cannot be changed'/.test(guard));
  assert.ok(/drop trigger if exists admin_audit_log_no_update_delete/.test(m008) && m008.indexOf("drop trigger if exists admin_audit_log_no_update_delete") < m008.indexOf("update public.admin_audit_log"), "triggers are dropped before the backfill so a re-run works");
  assert.ok(/revoke insert, update, delete, truncate on public\.admin_audit_log from service_role/.test(m008));
  assert.ok(/revoke all on public\.admin_audit_log from anon, authenticated;\s*grant select on public\.admin_audit_log to authenticated/.test(m008));
  assert.ok(/foreign key|references auth\.users \(id\) on delete set null/i.test(m005), "FKs unlink with SET NULL, which the guard allows");
  assert.ok(/revoke execute on function public\.admin_audit_log_guard\(\) from public, anon, authenticated/.test(m008));
});

test("audit: only real admins can read the log, and the app has no write path to it", () => {
  const pol = m005.slice(m005.indexOf('create policy "admin_audit_log: admins read"'), m005.indexOf("revoke all on public.admin_audit_log"));
  assert.ok(/for select to authenticated\s+using \(public\.is_admin\(\)\)/.test(pol));
  assert.ok(/not public\.is_admin\(\)/.test(fnBody(m006, "admin_list_audit_log")));
  const page = read("app", "admin", "audit", "page.tsx");
  assert.ok(/details\.before/.test(page) && /details\.after/.test(page) && /cannot be edited or deleted/.test(page));
  assert.ok(!/\.(insert|update|delete|upsert)\(/.test(page));
});

test("revoke only ends grants that are still active, so the logged count is accurate (DB-12)", () => {
  assert.ok(/revoked_at is null and \(expires_at is null or expires_at > now\(\)\)/.test(fnBody(m008, "admin_revoke_premium")));
});

test("the audit screen understands the new before/after details and every action label", () => {
  const page = read("app", "admin", "audit", "page.tsx");
  for (const a of ["grant_premium", "revoke_premium", "deactivate_account", "reactivate_account", "sync_profiles"]) assert.ok(page.includes(`${a}:`), a);
  assert.ok(/plan_status/.test(page) && /deactivated_by_admin/.test(page));
});

test("deleting an account also removes the browser-only profile picture stored under the user's id", () => {
  const auth = read("lib", "auth.tsx");
  const del = auth.slice(auth.indexOf("async function deleteAccount"), auth.indexOf("function lifecycleError"));
  assert.ok(/removeItem\(`gn-avatar-\$\{user\.id\}`\)/.test(del));
  assert.ok(del.indexOf("/api/delete-account") < del.indexOf("gn-avatar-"), "only after the server confirmed the deletion");
});
