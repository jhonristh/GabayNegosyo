// Work Package 2 — database integration and security regression tests.
//
// WHAT THESE ARE: checks of the SQL FILES and of the app code that talks to the database. Pure logic is run directly;
// SQL is checked as text. They prove the guards are WRITTEN and that the app and the schema agree about names.
// WHAT THEY ARE NOT: proof the SQL behaves correctly in Postgres or Supabase. That is what
// database/rehearsal/run_rehearsal.sh is for (local throwaway Postgres only), and neither replaces a run against the
// real Supabase project, which has NOT happened.
//
// Tests marked `todo` describe behaviour that SHOULD hold but does not yet (findings F-07 / F-08 in
// docs/PROTOTYPE_AUDIT_v1.md, to be fixed in WP3). node:test reports them as TODO and they do not fail the suite;
// remove `todo` when the fix lands so they become real guards.
const test = require("node:test");
const assert = require("node:assert");
const fs = require("node:fs");
const path = require("node:path");

const ROOT = path.join(__dirname, "..");
const read = (...p) => fs.readFileSync(path.join(ROOT, ...p), "utf8");
const noComments = (sql) => sql.replace(/--.*$/gm, "");
const load = (rel) => import(rel);
const walk = (d) => fs.readdirSync(d, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk(path.join(d, e.name)) : [path.join(d, e.name)]));
const srcFiles = (...dirs) => dirs.flatMap((d) => walk(path.join(ROOT, d))).filter((f) => /\.(ts|tsx)$/.test(f));

const MIGRATION_DIR = path.join(ROOT, "database", "migrations");
const migrationFiles = fs.readdirSync(MIGRATION_DIR).filter((f) => f.endsWith(".sql")).sort();
const migrations = Object.fromEntries(migrationFiles.map((f) => [f, read("database", "migrations", f)]));
const setupSql = read("database", "supabase_setup.sql");
/** Everything that really creates objects, in apply order: baseline then 001…007. schema.sql and the demo file are excluded on purpose. */
const allSql = noComments([setupSql, ...migrationFiles.map((f) => migrations[f])].join("\n"));

const USER_TABLES = ["business_profiles", "checklist_progress", "task_progress", "reminder_configs", "sent_emails"];

/** Column names of the LAST `returns table (...)` declared for a function (later migrations replace earlier ones). */
function returnColumns(fn) {
  let cols = null;
  const re = new RegExp(`create or replace function public\\.${fn}\\([^)]*\\)\\s*returns table\\s*\\(([\\s\\S]*?)\\)\\s*language`, "gi");
  let m;
  while ((m = re.exec(allSql))) cols = m[1].split(",").map((c) => c.trim().split(/\s+/)[0]).filter(Boolean);
  return cols;
}

// ── Migration set integrity ────────────────────────────────────────────
test("migrations are numbered 001…N with no gaps and no duplicates", () => {
  const nums = migrationFiles.map((f) => Number(f.slice(0, 3)));
  assert.ok(nums.length >= 7, "001–007 present");
  nums.forEach((n, i) => assert.strictEqual(n, i + 1, `expected migration ${i + 1}, found ${migrationFiles[i]}`));
  migrationFiles.forEach((f) => assert.match(f, /^\d{3}_[a-z0-9_]+\.sql$/));
});

test("no SQL that creates objects grants anything to the anon role", () => {
  const grants = allSql.match(/grant[^;]*;/gi) ?? [];
  assert.ok(grants.length > 10);
  for (const g of grants) assert.ok(!/\bto\b[^;]*\banon\b/i.test(g), `grant to anon: ${g}`);
});

test("every table is created with row level security enabled", () => {
  const tables = [...allSql.matchAll(/create table (?:if not exists )?public\.([a-z_]+)/gi)].map((m) => m[1]);
  for (const t of ["profiles", ...USER_TABLES, "reminder_deliveries", "admin_audit_log", "account_deletion_log", "entitlements"]) assert.ok(tables.includes(t), `${t} is created`);
  for (const t of new Set(tables)) assert.ok(new RegExp(`alter table public\\.${t} enable row level security`, "i").test(allSql), `${t} must enable RLS`);
});

test("account deletion cascades from auth.users to every user-owned table; audit tables keep history with SET NULL", () => {
  for (const t of ["profiles", ...USER_TABLES, "reminder_deliveries", "entitlements"]) {
    const start = allSql.search(new RegExp(`create table (?:if not exists )?public\\.${t}\\b`, "i"));
    const block = allSql.slice(start, allSql.indexOf(");", start));
    assert.ok(/references auth\.users \(id\) on delete cascade/i.test(block), `${t} must cascade on user deletion`);
  }
  const audit = allSql.slice(allSql.search(/create table if not exists public\.admin_audit_log/i));
  assert.ok(/actor_id[^,]*on delete set null/i.test(audit) && /target_user_id[^,]*on delete set null/i.test(audit));
});

test("every SECURITY DEFINER function in 003–007 pins an empty search_path and is not executable by anon", () => {
  for (const f of migrationFiles.filter((n) => Number(n.slice(0, 3)) >= 3)) {
    const sql = noComments(migrations[f]);
    for (const fn of sql.split(/create or replace function /i).slice(1)) {
      const name = fn.slice(0, fn.indexOf("(")).trim();
      if (!/security definer/i.test(fn)) continue;
      assert.ok(/set search_path = ''/.test(fn), `${f}: ${name} search_path`);
      assert.ok(new RegExp(`revoke execute on function ${name.replace(".", "\\.")}\\([^)]*\\) from public, anon`, "i").test(sql), `${f}: ${name} revoked from public/anon`);
    }
  }
});

test("every function the browser may call re-checks its caller inside the function", () => {
  const callable = [...allSql.matchAll(/grant\s+execute on function public\.([a-z_]+)\(/gi)].map((m) => m[1]);
  const checks = { is_admin: "baseline", handle_new_user: "baseline" };
  for (const name of new Set(callable)) {
    if (checks[name]) continue;
    const defs = allSql.split(/create or replace function /i).filter((d) => d.startsWith(`public.${name}(`));
    assert.ok(defs.length > 0, `${name} is defined`);
    const body = defs[defs.length - 1];
    const guarded = /public\.is_admin\(\)/.test(body) || /auth\.uid\(\)/.test(body);
    assert.ok(guarded, `${name} is callable by signed-in users, so it must check is_admin() or scope itself to auth.uid()`);
  }
});

test("entitlement_for and log_admin_action are not callable by any API role", () => {
  assert.ok(/revoke execute on function public\.entitlement_for\(uuid\) from public, anon, authenticated/i.test(allSql));
  assert.ok(/revoke execute on function public\.log_admin_action\(uuid, text, uuid, jsonb\) from public, anon, authenticated/i.test(allSql));
  assert.ok(!/grant\s+execute on function public\.(entitlement_for|log_admin_action)/i.test(allSql));
});

test("the self-upgrade function is dropped by 006 and never created by any shipped SQL", () => {
  assert.ok(/drop function if exists public\.upgrade_to_premium_demo\(\)/i.test(allSql));
  assert.ok(!/create (or replace )?function public\.upgrade_to_premium_demo/i.test(allSql));
});

test("API roles can never write role, flags, entitlements or logs (column and table grants)", () => {
  assert.ok(/grant update \(name\) on public\.profiles to authenticated/i.test(allSql));
  assert.ok(!/grant\s+(insert|delete|all)[^;]*on public\.profiles/i.test(allSql));
  for (const t of ["entitlements", "admin_audit_log", "account_deletion_log", "reminder_deliveries"]) {
    assert.ok(!new RegExp(`grant\\s+(insert|update|delete|all)[^;]*on public\\.${t}`, "i").test(allSql), `${t}: no write grant to API roles`);
  }
});

// ── Migration 007 (prepared, not applied) ─────────────────────────────
test("007 changes only admin_account_overview, keeps its columns, and uses the shared plan decision", () => {
  const m7 = noComments(migrations["007_admin_overview_computed_plan.sql"]);
  assert.strictEqual((m7.match(/create or replace function/gi) ?? []).length, 1);
  assert.ok(/create or replace function public\.admin_account_overview\(\)/.test(m7));
  assert.ok(/entitlement_for/.test(m7) && /public\.is_admin\(\)/.test(m7));
  assert.ok(!/\b(drop|alter|truncate|delete|insert|update)\b/i.test(m7.replace(/raise exception[^;]*;/gi, "")), "no data or schema change");
  const original = noComments(migrations["003_sync_profiles.sql"]).match(/admin_account_overview\(\)\s*returns table \(([\s\S]*?)\)\s*language/i)[1];
  const replaced = m7.match(/admin_account_overview\(\)\s*returns table \(([\s\S]*?)\)\s*language/i)[1];
  assert.strictEqual(replaced.replace(/\s+/g, " "), original.replace(/\s+/g, " "), "same output columns, so the app needs no change");
  assert.ok(/Do NOT re-run 003/.test(migrations["007_admin_overview_computed_plan.sql"]));
  assert.ok(/NOT APPLIED/.test(migrations["007_admin_overview_computed_plan.sql"].slice(0, 400)));
});

// ── App ↔ schema contract ─────────────────────────────────────────────
test("every table the app queries exists in the SQL", () => {
  const used = new Set();
  for (const f of srcFiles("app", "lib", "components")) for (const m of fs.readFileSync(f, "utf8").matchAll(/\.from\("([a-z_]+)"\)/g)) used.add(m[1]);
  assert.ok(used.size >= 6);
  for (const t of used) assert.ok(new RegExp(`create table (if not exists )?public\\.${t}\\b`, "i").test(allSql), `table ${t} is used by the app but not created by any migration`);
});

test("every RPC the app calls exists and is executable by signed-in users", () => {
  const used = new Set();
  for (const f of srcFiles("app", "lib", "components")) for (const m of fs.readFileSync(f, "utf8").matchAll(/\.rpc\(\s*"([a-z_]+)"/g)) used.add(m[1]);
  assert.ok(used.size >= 8, `found ${[...used]}`);
  for (const fn of used) {
    assert.ok(new RegExp(`create or replace function public\\.${fn}\\(`, "i").test(allSql), `${fn} is called but never defined`);
    assert.ok(new RegExp(`grant\\s+execute on function public\\.${fn}\\(`, "i").test(allSql), `${fn} is called by the browser but not granted to authenticated`);
  }
});

test("profile columns the app selects exist in the profiles table", () => {
  const sel = read("lib", "auth.tsx").match(/from\("profiles"\)\s*\.select\("([^"]+)"\)/)[1].split(",").map((s) => s.trim());
  const profileDdl = allSql.slice(allSql.search(/create table public\.profiles/i), allSql.indexOf(");", allSql.search(/create table public\.profiles/i)));
  const added = [...allSql.matchAll(/alter table public\.profiles add column if not exists ([a-z_]+)/gi)].map((m) => m[1]);
  for (const c of sel) assert.ok(new RegExp(`\\b${c}\\b`).test(profileDdl) || added.includes(c), `profiles.${c} is selected but not defined`);
});

test("the keys the admin screens read are columns the SQL functions return", () => {
  const readKeys = (file) => new Set([...read(...file.split("/")).matchAll(/\br\.([a-z_0-9]+)/g)].map((m) => m[1]));
  const directory = returnColumns("admin_user_directory");
  const audit = returnColumns("admin_list_audit_log");
  assert.ok(directory && audit);
  const keys = readKeys("lib/adminUsers.ts");
  for (const k of keys) assert.ok(directory.includes(k) || audit.includes(k), `adminUsers.ts reads r.${k}, which no function returns`);
  const overview = returnColumns("admin_account_overview");
  for (const k of ["total", "free_count", "premium_count", "admin_count", "demo_count", "new_7d", "auth_users", "missing_profiles", "orphan_profiles"]) {
    assert.ok(overview.includes(k), `overview must return ${k}`);
    assert.ok(read("lib", "adminAccounts.ts").includes(`r.${k}`), `adminAccounts.ts must read ${k}`);
  }
  const ent = returnColumns("get_my_entitlement");
  for (const k of ["status", "source", "expires_at", "deactivated_at"]) assert.ok(ent.includes(k), `get_my_entitlement returns ${k}`);
  assert.ok(/o\.status/.test(read("lib", "entitlements.ts")) && /o\.expires_at/.test(read("lib", "entitlements.ts")) && /o\.deactivated_at/.test(read("lib", "entitlements.ts")));
});

test("plan values accepted by the app match what entitlement_for can return", async () => {
  const body = allSql.slice(allSql.search(/create or replace function public\.entitlement_for/i), allSql.search(/create or replace function public\.get_my_entitlement/i));
  const statuses = new Set([...body.matchAll(/select '([a-z]+)'::text/g)].map((m) => m[1]));
  const sources = new Set([...body.matchAll(/'([a-z_]+)'::text(?:, null)/g)].map((m) => m[1]));
  const ts = read("lib", "entitlements.ts");
  for (const s of statuses) assert.ok(ts.includes(`"${s}"`), `status ${s} is returned by SQL but unknown to the app`);
  for (const s of ["admin_role", "legacy_role", "none"]) assert.ok(sources.has(s) || ts.includes(`"${s}"`));
  assert.ok(/source in \('admin_grant', 'subscription'\)/.test(allSql) && ts.includes('"admin_grant"') && ts.includes('"subscription"'));
});

// ── Service-role containment ──────────────────────────────────────────
test("the service-role key is used only by trusted server routes and is never exposed to the browser", () => {
  const users = srcFiles("app", "lib", "components").filter((f) => /SUPABASE_SERVICE_ROLE_KEY/.test(fs.readFileSync(f, "utf8"))).map((f) => path.relative(ROOT, f).split(path.sep).join("/")).sort();
  assert.deepStrictEqual(users, ["app/api/cron/send-reminders/route.ts", "app/api/delete-account/route.ts", "app/api/unsubscribe/route.ts"]);
  for (const f of srcFiles("app", "lib", "components")) {
    const text = fs.readFileSync(f, "utf8");
    assert.ok(!/NEXT_PUBLIC_[A-Z_]*SERVICE/.test(text), `${f} must not expose a service key`);
    if (/^["']use client["']/m.test(text.slice(0, 200))) assert.ok(!/SERVICE_ROLE/.test(text), `${f} is a client file`);
  }
  assert.ok(!/NEXT_PUBLIC_[A-Z_]*SERVICE/.test(read(".env.example")));
  assert.ok(/^SUPABASE_SERVICE_ROLE_KEY=/m.test(read(".env.example")));
});

// ── Data-layer write guards (source level) ────────────────────────────
test("db.ts only ever writes rows for the signed-in user and skips Supabase in demo mode", () => {
  const db = read("lib", "db.ts");
  const writes = db.match(/persist\(/g).length - 1; // minus the function declaration
  assert.ok(writes >= 6, `expected the six write paths, found ${writes}`);
  for (const m of db.matchAll(/\buser_id:\s*([A-Za-z.]+)/g)) assert.ok(["currentUserId", "profile.userId"].includes(m[1]), `user_id must come from the session, not input: ${m[1]}`);
  assert.ok(/profile\.userId !== currentUserId\) return/.test(db), "never writes another user's business profile");
  assert.ok(db.match(/if \(inDemo\(\)\)/g).length >= writes - 1, "every write path checks demo mode before calling Supabase");
  for (const m of db.matchAll(/\.eq\("user_id",\s*([A-Za-z.]+)\)/g)) assert.ok(["currentUserId", "userId"].includes(m[1]));
});

test("deactivated accounts skip hydration and the browser fallback never upgrades a role", async () => {
  const auth = read("lib", "auth.tsx");
  assert.ok(/if \(!user\.deactivatedAt\) await db\.hydrate/.test(auth));
  const { entitlementFromRole, FREE_ENTITLEMENT } = await load("../lib/entitlements.ts");
  assert.deepStrictEqual(entitlementFromRole("free"), FREE_ENTITLEMENT);
  assert.deepStrictEqual(entitlementFromRole(undefined), FREE_ENTITLEMENT);
  assert.strictEqual(entitlementFromRole("premium").status, "premium");
});

// ── Fail-closed server access (extra cases beyond v017.test.js) ───────
test("server access: unknown errors, empty or malformed rows are never verified Premium", async () => {
  const { resolveServerAccess } = await load("../lib/entitlements.ts");
  for (const err of [{ code: "57014", message: "canceling statement due to statement timeout" }, { code: "PGRST301", message: "JWT expired" }, { message: "fetch failed" }, "boom"]) {
    const a = resolveServerAccess("premium", null, err);
    assert.deepStrictEqual([a.verified, a.premium], [false, false], JSON.stringify(err));
  }
  for (const row of [null, undefined, [], {}, { status: "gold", source: "none" }, { status: "premium", source: "hacked" }, "premium"]) {
    const a = resolveServerAccess("premium", row, null);
    assert.deepStrictEqual([a.verified, a.premium], [false, false], JSON.stringify(row));
  }
});

test("server access: the server row wins over a stale or forged role, in both directions", async () => {
  const { resolveServerAccess } = await load("../lib/entitlements.ts");
  assert.strictEqual(resolveServerAccess("premium", [{ status: "expired", source: "admin_grant", expires_at: null, deactivated_at: null }], null).premium, false);
  assert.strictEqual(resolveServerAccess("free", [{ status: "premium", source: "admin_grant", expires_at: null, deactivated_at: null }], null).premium, true);
  const d = resolveServerAccess("free", [{ status: "premium", source: "admin_grant", expires_at: null, deactivated_at: "2026-01-01T00:00:00Z" }], null);
  assert.deepStrictEqual([d.premium, d.deactivated, d.verified], [false, true, true]);
});

// ── Known gaps (todo = should hold, does not yet; fix scheduled in WP3) ──
test("F-08: an unrelated 'does not exist' database error must not be mistaken for 'migration 006 not installed'", { todo: "WP3: narrow isMissingFunction to PGRST202 / the function name" }, async () => {
  const { resolveServerAccess } = await load("../lib/entitlements.ts");
  const a = resolveServerAccess("premium", null, { code: "42P01", message: 'relation "public.profiles" does not exist' });
  assert.deepStrictEqual([a.verified, a.premium], [false, false]);
});

test("F-07: deleting an account is refused when the role cannot be read", { todo: "WP3: treat an unreadable role as 'refuse and retry'" }, async () => {
  const { handleDeleteAccount } = await load("../lib/deleteAccountHandler.ts");
  let deleted = false;
  const deps = {
    getUserFromToken: async () => ({ id: "u1", lastSignInAt: new Date().toISOString() }),
    getRole: async () => null, // what the route returns when the profile query errors
    isDemoAccount: async () => false,
    deleteAuthUser: async () => { deleted = true; return { error: null }; },
    now: () => Date.now(),
  };
  const r = await handleDeleteAccount("Bearer t", deps, { confirm: "DELETE" });
  assert.strictEqual(deleted, false);
  assert.ok(r.status >= 400);
});

test("delete handler: a demo lookup that throws never results in a deletion", async () => {
  const { handleDeleteAccount } = await load("../lib/deleteAccountHandler.ts");
  let deleted = false;
  const deps = {
    getUserFromToken: async () => ({ id: "u1", lastSignInAt: new Date().toISOString() }),
    getRole: async () => "free",
    isDemoAccount: async () => { throw new Error("db down"); },
    deleteAuthUser: async () => { deleted = true; return { error: null }; },
    now: () => Date.now(),
  };
  await assert.rejects(() => handleDeleteAccount("Bearer t", deps, { confirm: "DELETE" }));
  assert.strictEqual(deleted, false);
});

test("F-07: the delete route reads the error from its role and demo lookups instead of swallowing it", { todo: "WP3: today both lookups ignore `error`, so a failed query looks like 'not admin, not demo'" }, () => {
  const route = read("app", "api", "delete-account", "route.ts");
  const getRole = route.slice(route.indexOf("async getRole"), route.indexOf("async isDemoAccount"));
  const isDemo = route.slice(route.indexOf("async isDemoAccount"), route.indexOf("async deleteAuthUser"));
  assert.ok(/\berror\b/.test(getRole.replace(/async getRole\(userId\)/, "")), "getRole must inspect error");
  assert.ok(/\berror\b/.test(isDemo.replace(/async isDemoAccount\(userId\)/, "")), "isDemoAccount must inspect error");
});

// ── Upsert targets must match real primary keys (otherwise ON CONFLICT fails at runtime) ──
test("every upsert's onConflict columns equal that table's primary key", () => {
  const db = read("lib", "db.ts");
  const pk = (t) => {
    const start = allSql.search(new RegExp(`create table (?:if not exists )?public\\.${t}\\b`, "i"));
    const block = allSql.slice(start, allSql.indexOf(");", start));
    const inline = block.match(/^\s*([a-z_]+)\s+[a-z]+[^,\n]*primary key/im);
    const composite = block.match(/primary key \(([^)]+)\)/i);
    return (composite ? composite[1] : inline[1]).split(",").map((c) => c.trim()).sort().join(",");
  };
  const upserts = [...db.matchAll(/from\("([a-z_]+)"\)\s*\.upsert\([\s\S]*?onConflict:\s*"([^"]+)"/g)];
  assert.ok(upserts.length === 4, `expected 4 upserts, found ${upserts.length}`);
  for (const [, table, onConflict] of upserts) assert.strictEqual(onConflict.split(",").map((c) => c.trim()).sort().join(","), pk(table), `${table} onConflict must be its primary key`);
});

test("values the app writes satisfy the database CHECK constraints", () => {
  const types = read("lib", "types.ts");
  assert.ok(/daysBefore: 7 \| 3 \| 1/.test(types) && /days_before[^,]*check \(days_before in \(7, 3, 1\)\)/i.test(allSql));
  const statuses = [...allSql.match(/check \(status in \(([^)]*)\)\)/i)[1].matchAll(/'([a-z_]+)'/g)].map((m) => m[1]);
  assert.deepStrictEqual(statuses.sort(), ["completed", "due_soon", "overdue", "upcoming"]);
  const db = read("lib", "db.ts");
  for (const m of db.matchAll(/status:\s*"([a-z_]+)"/g)) assert.ok(statuses.includes(m[1]), `db.ts writes status ${m[1]}`);
});
