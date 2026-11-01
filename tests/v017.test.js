// v0.17: account lifecycle, entitlements, admin management, PWA hardening.
// Pure logic is exercised directly (Node 22.18+ type stripping, same as v013). Database and UI behaviour that cannot run
// here (no Postgres, no browser) is covered by source-level assertions; those prove the guard is present, NOT that it
// ran against a real database. See docs/QA_REPORT.md for what still needs a manual run.
const test = require("node:test");
const assert = require("node:assert");
const fs = require("node:fs");
const path = require("node:path");

const read = (...p) => fs.readFileSync(path.join(__dirname, "..", ...p), "utf8");
const load = (rel) => import(rel);
const walk = (d) => fs.readdirSync(d, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk(path.join(d, e.name)) : [path.join(d, e.name)]));
const src = (dir) => walk(path.join(__dirname, "..", dir)).filter((f) => /\.(ts|tsx)$/.test(f));

const FUTURE = new Date(Date.now() + 86_400_000).toISOString();
const PAST = new Date(Date.now() - 86_400_000).toISOString();
const ent = (status, source = "admin_grant", expiresAt = null) => ({ status, source, expiresAt });

// ── Entitlements (pure logic) ──────────────────────────────────────────
test("entitlement: free, premium, expired, cancelled and revoked map correctly", async () => {
  const { hasPremiumAccess } = await load("../lib/entitlements.ts");
  assert.strictEqual(hasPremiumAccess({ role: "free", entitlement: ent("free", "none") }), false);
  assert.strictEqual(hasPremiumAccess({ role: "free", entitlement: ent("premium", "admin_grant", FUTURE) }), true);
  assert.strictEqual(hasPremiumAccess({ role: "free", entitlement: ent("premium", "admin_grant", null) }), true);
  assert.strictEqual(hasPremiumAccess({ role: "free", entitlement: ent("expired", "admin_grant", PAST) }), false);
  assert.strictEqual(hasPremiumAccess({ role: "free", entitlement: ent("cancelled", "admin_grant") }), false);
});

test("entitlement: a Premium grant whose expiry has passed since loading falls back to Free", async () => {
  const { hasPremiumAccess, canUse } = await load("../lib/entitlements.ts");
  const stale = { role: "free", entitlement: ent("premium", "admin_grant", PAST) };
  assert.strictEqual(hasPremiumAccess(stale), false);
  assert.strictEqual(canUse(stale, "penalty_simulator"), false);
  assert.strictEqual(canUse(stale, "basic_checklist"), true);
});

test("entitlement: demo Premium is its own source and cannot be confused with a real grant", async () => {
  const { demoEntitlement, hasPremiumAccess, planLabel } = await load("../lib/entitlements.ts");
  assert.strictEqual(demoEntitlement("premium").source, "demo");
  assert.strictEqual(demoEntitlement("free").status, "free");
  const demo = { role: "premium", isDemo: true, entitlement: demoEntitlement("premium") };
  assert.strictEqual(hasPremiumAccess(demo), true);
  assert.strictEqual(planLabel(demo), "Premium (demo)");
});

test("entitlement: admins have access; deactivated accounts and signed-out visitors never do", async () => {
  const { hasPremiumAccess, canUse, entitlementFromRole } = await load("../lib/entitlements.ts");
  assert.strictEqual(hasPremiumAccess({ role: "admin", entitlement: entitlementFromRole("admin") }), true);
  assert.strictEqual(hasPremiumAccess({ role: "premium", entitlement: ent("premium", "legacy_role"), deactivatedAt: PAST }), false);
  assert.strictEqual(canUse({ role: "premium", entitlement: ent("premium"), deactivatedAt: PAST }, "basic_checklist"), false);
  assert.strictEqual(hasPremiumAccess(null), false);
  assert.strictEqual(hasPremiumAccess(undefined), false);
  assert.strictEqual(canUse(null, "basic_checklist"), false);
});

test("entitlement: the server-decided plan wins over a role string the browser could edit", async () => {
  const { hasPremiumAccess } = await load("../lib/entitlements.ts");
  // Someone edits their in-memory role to "admin"; the entitlement from the server still says free.
  assert.strictEqual(hasPremiumAccess({ role: "admin", entitlement: ent("free", "none") }), false);
});

test("entitlement: parseEntitlementRow accepts the server shape and rejects anything else", async () => {
  const { parseEntitlementRow } = await load("../lib/entitlements.ts");
  const ok = parseEntitlementRow([{ status: "premium", source: "admin_grant", expires_at: FUTURE, deactivated_at: null }]);
  assert.deepStrictEqual(ok.entitlement, { status: "premium", source: "admin_grant", expiresAt: FUTURE });
  assert.strictEqual(ok.deactivatedAt, null);
  assert.strictEqual(parseEntitlementRow({ status: "superuser", source: "admin_grant" }), null);
  assert.strictEqual(parseEntitlementRow({ status: "premium", source: "hacked" }), null);
  assert.strictEqual(parseEntitlementRow(null), null);
  assert.strictEqual(parseEntitlementRow("premium"), null);
  assert.strictEqual(parseEntitlementRow([]), null);
});

test("feature map: Free and Premium features match the shipped product; pending items are flagged, not silently moved", async () => {
  const { FEATURE_TIER, PENDING_OWNER_TIERS, canUse } = await load("../lib/entitlements.ts");
  for (const f of ["required_documents", "step_instructions", "penalty_info", "penalty_simulator", "email_reminders"]) assert.strictEqual(FEATURE_TIER[f], "premium", f);
  for (const f of ["wizard_estimate", "basic_checklist", "requirement_info", "agency_info", "deadline_info", "basic_tutorials"]) assert.strictEqual(FEATURE_TIER[f], "free", f);
  assert.deepStrictEqual([...PENDING_OWNER_TIERS].sort(), ["deadline_status", "progress_tracking", "resource_library"]);
  const free = { role: "free", entitlement: ent("free", "none") };
  assert.strictEqual(canUse(free, "email_reminders"), false);
  assert.strictEqual(canUse(free, "wizard_estimate"), true);
});

test("planLabel is honest about expired and revoked Premium", async () => {
  const { planLabel } = await load("../lib/entitlements.ts");
  assert.strictEqual(planLabel({ role: "free", entitlement: ent("expired", "admin_grant", PAST) }), "Free (Premium expired)");
  assert.strictEqual(planLabel({ role: "free", entitlement: ent("cancelled", "admin_grant") }), "Free (Premium ended)");
  assert.strictEqual(planLabel({ role: "free", entitlement: ent("free", "none") }), "Free");
  assert.strictEqual(planLabel({ role: "admin", entitlement: ent("premium", "admin_role") }), "Admin");
});

// ── Server-side access decision (send-email) ───────────────────────────
test("server access: entitlement decides; expired grants and deactivation are refused", async () => {
  const { resolveServerAccess } = await load("../lib/entitlements.ts");
  const row = (o) => [{ status: "premium", source: "admin_grant", expires_at: FUTURE, deactivated_at: null, ...o }];
  assert.deepStrictEqual(resolveServerAccess("free", row({}), null), { premium: true, deactivated: false, verified: true });
  assert.deepStrictEqual(resolveServerAccess("premium", row({ status: "expired", expires_at: PAST }), null), { premium: false, deactivated: false, verified: true });
  assert.strictEqual(resolveServerAccess("free", row({ expires_at: PAST }), null).premium, false);
  assert.deepStrictEqual(resolveServerAccess("premium", row({ source: "legacy_role", expires_at: null, deactivated_at: PAST }), null), { premium: false, deactivated: true, verified: true });
  // the profile's own deactivated_at is honoured even if the entitlement row says active
  assert.strictEqual(resolveServerAccess("free", row({}), null, PAST).deactivated, true);
  assert.strictEqual(resolveServerAccess("free", row({}), null, PAST).premium, false);
});

test("server access FAILS CLOSED when the entitlement cannot be verified (Issue 4)", async () => {
  const { resolveServerAccess } = await load("../lib/entitlements.ts");
  for (const err of [{ code: "XX000", message: "internal error" }, { message: "network down" }, new Error("timeout"), { code: "42501", message: "permission denied" }]) {
    const r = resolveServerAccess("premium", null, err);
    assert.strictEqual(r.premium, false, JSON.stringify(err));
    assert.strictEqual(r.verified, false, JSON.stringify(err));
  }
  // an unexpected-but-successful shape is also unverified, never a role fallback
  assert.deepStrictEqual(resolveServerAccess("premium", "garbage", null), { premium: false, deactivated: false, verified: false });
  assert.deepStrictEqual(resolveServerAccess("premium", [], null), { premium: false, deactivated: false, verified: false });
  // a deactivated profile stays deactivated even when verification fails
  assert.strictEqual(resolveServerAccess("premium", null, { code: "XX000" }, PAST).deactivated, true);
});

test("server access: the role fallback exists ONLY for 'function not installed' and never for deactivated accounts", async () => {
  const { resolveServerAccess } = await load("../lib/entitlements.ts");
  assert.deepStrictEqual(resolveServerAccess("premium", null, { code: "PGRST202" }), { premium: true, deactivated: false, verified: true });
  assert.deepStrictEqual(resolveServerAccess("free", null, { message: "Could not find the function public.get_my_entitlement" }), { premium: false, deactivated: false, verified: true });
  const legacyDeactivated = resolveServerAccess("premium", null, { code: "PGRST202" }, PAST);
  assert.strictEqual(legacyDeactivated.premium, false);
  assert.strictEqual(legacyDeactivated.deactivated, true);
});

test("send-email route uses the server entitlement and refuses deactivated accounts", () => {
  const route = read("app", "api", "send-email", "route.ts");
  assert.ok(route.includes('rpc("get_my_entitlement")') && route.includes("resolveServerAccess") && route.includes("lib/entitlements"));
  assert.ok(route.indexOf("resolveServerAccess(") < route.indexOf("req.json()"), "access is decided before the body is read");
  assert.ok(/deactivated/.test(route));
  assert.ok(route.includes("deactivated_at") && route.includes("profile as { deactivated_at"), "the profile's own deactivation flag is read independently");
  assert.ok(route.includes("!access.verified") && route.includes("status: 503"), "fail closed when the plan cannot be verified");
  assert.ok(route.indexOf("!access.verified") < route.indexOf("!access.premium"));
});

// ── Permanent deletion ─────────────────────────────────────────────────
const deleteDeps = (over = {}) => {
  const calls = [];
  return {
    calls,
    deps: {
      getUserFromToken: async (t) => (t === "good" ? { id: "u1", lastSignInAt: new Date(1_000_000).toISOString() } : null),
      getRole: async () => "free",
      recordDeletion: async (id, role) => void calls.push(["record", id, role]),
      deleteAuthUser: async (id) => (calls.push(["delete", id]), { error: null }),
      now: () => 1_000_000 + 60_000,
      ...over,
    },
  };
};

test("delete: the typed word DELETE is enforced by the server, not just the dialog", async () => {
  const { handleDeleteAccount } = await load("../lib/deleteAccountHandler.ts");
  for (const input of [undefined, {}, { confirm: "" }, { confirm: "delete" }, { confirm: "yes" }, { confirm: 1 }, { confirm: null }]) {
    const a = deleteDeps();
    const r = await handleDeleteAccount("Bearer good", a.deps, input);
    assert.strictEqual(r.status, 400, JSON.stringify(input));
    assert.strictEqual(r.body.code, "confirmation_required");
    assert.deepStrictEqual(a.calls, [], "nothing recorded or deleted without confirmation");
  }
  const ok = deleteDeps();
  assert.strictEqual((await handleDeleteAccount("Bearer good", ok.deps, { confirm: " DELETE " })).status, 200);
});

test("delete: a minimal record is written BEFORE deletion, and a logging failure never blocks the deletion", async () => {
  const { handleDeleteAccount } = await load("../lib/deleteAccountHandler.ts");
  const a = deleteDeps();
  await handleDeleteAccount("Bearer good", a.deps, { confirm: "DELETE" });
  assert.deepStrictEqual(a.calls, [["record", "u1", "free"], ["delete", "u1"]]);
  const b = deleteDeps({ recordDeletion: async () => { throw new Error("table missing"); } });
  const r = await handleDeleteAccount("Bearer good", b.deps, { confirm: "DELETE" });
  assert.strictEqual(r.status, 200);
  assert.deepStrictEqual(b.calls, [["delete", "u1"]]);
});

test("delete: unauthenticated, stale, admin and demo callers are still refused even with the right word", async () => {
  const { handleDeleteAccount } = await load("../lib/deleteAccountHandler.ts");
  const c = { confirm: "DELETE" };
  const un = deleteDeps();
  assert.strictEqual((await handleDeleteAccount(null, un.deps, c)).status, 401);
  assert.strictEqual((await handleDeleteAccount("Bearer bad", un.deps, c)).status, 401);
  const stale = deleteDeps({ now: () => 1_000_000 + 11 * 60_000 });
  assert.strictEqual((await handleDeleteAccount("Bearer good", stale.deps, c)).body.code, "reauth_required");
  const admin = deleteDeps({ getRole: async () => "admin" });
  assert.strictEqual((await handleDeleteAccount("Bearer good", admin.deps, c)).body.code, "admin_protected");
  const demo = deleteDeps({ getUserFromToken: async () => ({ id: "demo-premium", lastSignInAt: new Date(1_000_000).toISOString() }) });
  assert.strictEqual((await handleDeleteAccount("Bearer good", demo.deps, c)).status, 403);
  assert.deepStrictEqual([...un.calls, ...stale.calls, ...admin.calls, ...demo.calls], []);
});

test("delete route: no user id from the client, hashed reference only, service key stays server-side", () => {
  const route = read("app", "api", "delete-account", "route.ts");
  assert.ok(!/body\.(userId|user_id|id)\b|parsed\.(userId|user_id|id)\b/.test(route));
  assert.ok(route.includes('createHash("sha256")'));
  assert.ok(!/email/i.test(route.slice(route.indexOf("recordDeletion"))), "the deletion record must not contain an email");
  assert.ok(!route.includes("NEXT_PUBLIC_SUPABASE_SERVICE"));
});

test("delete UI sends the typed confirmation and restores focus when the dialog closes", () => {
  const auth = read("lib", "auth.tsx");
  const del = auth.slice(auth.indexOf("async function deleteAccount"), auth.indexOf("function lifecycleError"));
  assert.ok(del.includes('confirm.trim() !== "DELETE"') && del.includes("JSON.stringify({ confirm: confirm.trim() })"));
  const section = read("components", "DeleteAccountSection.tsx");
  assert.ok(section.includes("openerRef.current?.focus()") && section.includes("showModal()"));
  assert.ok(section.includes("deleteAccount(confirmText"));
});

// ── Deactivation / reactivation ────────────────────────────────────────
test("deactivation: guard blocks the app, offers reactivation and logout, and the account page offers both actions", () => {
  assert.ok(read("components", "AuthGuard.tsx").includes("user.deactivatedAt && !user.isDemo"));
  const notice = read("components", "DeactivatedNotice.tsx");
  assert.ok(notice.includes("reactivateAccount") && notice.includes("logout"));
  const account = read("app", "account", "page.tsx");
  assert.ok(account.includes("<DeactivateAccountSection />") && account.includes("<DeleteAccountSection />"));
  const section = read("components", "DeactivateAccountSection.tsx");
  assert.ok(section.includes('user.role === "admin"') && section.includes("user.isDemo"), "admin and demo accounts never see Deactivate");
  assert.ok(section.includes("openerRef.current?.focus()") && section.includes("aria-labelledby"));
});

test("deactivation: signs the person out and clears caches; demo never reaches the database", () => {
  const auth = read("lib", "auth.tsx");
  const d = auth.slice(auth.indexOf("async function deactivateAccount"), auth.indexOf("async function reactivateAccount"));
  assert.ok(d.indexOf("user.isDemo") < d.indexOf('rpc("deactivate_my_account")'));
  assert.ok(d.includes("signOut()") && d.includes("purge-runtime-cache"));
  const r = auth.slice(auth.indexOf("async function reactivateAccount"));
  assert.ok(r.indexOf("user.isDemo") < r.indexOf('rpc("reactivate_my_account")'));
});

test("deactivated accounts do not load saved data into the app", () => {
  const auth = read("lib", "auth.tsx");
  assert.ok(auth.includes("if (!user.deactivatedAt) await db.hydrate(user.id)"));
});

// ── SQL migrations (static checks; syntax was parsed with the PostgreSQL parser, not executed) ──
const noComments = (sql) => sql.replace(/--.*$/gm, "");
const m5 = () => read("database", "migrations", "005_account_lifecycle.sql");
const m6 = () => read("database", "migrations", "006_entitlements.sql");

test("migrations: every SECURITY DEFINER function pins search_path and is revoked from public/anon", () => {
  for (const sql of [m5(), m6()]) {
    const fns = sql.split(/create or replace function /i).slice(1);
    assert.ok(fns.length > 0);
    for (const fn of fns) {
      const name = fn.slice(0, fn.indexOf("(")).trim();
      assert.ok(/security definer/i.test(fn), `${name} security definer`);
      assert.ok(/set search_path = ''/.test(fn), `${name} search_path`);
      assert.ok(new RegExp(`revoke execute on function ${name.replace(".", "\\.")}\\([^)]*\\) from public, anon`, "i").test(sql), `${name} revoked from public/anon`);
    }
  }
});

test("migrations: every admin function checks public.is_admin() before doing anything", () => {
  for (const sql of [m5(), m6()]) {
    const fns = sql.split(/create or replace function /i).slice(1).filter((f) => /^public\.admin_/.test(f));
    assert.ok(fns.length >= 1);
    for (const fn of fns) {
      const name = fn.slice(0, fn.indexOf("(")).trim();
      assert.ok(/if not public\.is_admin\(\)/.test(fn), `${name} must check is_admin`);
      assert.ok(fn.indexOf("is_admin()") < fn.search(/insert into|update public|delete from|return query/i), `${name} checks before acting`);
    }
  }
  assert.ok(/create or replace function public\.purge_expired_deletion_log/.test(m5()));
});

test("migrations: admin changes are audited, need a reason, and cannot target admins or yourself", () => {
  const sql = m5() + m6();
  for (const action of ["grant_premium", "revoke_premium", "deactivate_account", "sync_profiles"]) assert.ok(sql.includes(`'${action}'`), action);
  assert.ok(/char_length\(btrim\(p_reason\)\) < 3/.test(sql));
  assert.ok(/p_target = me/.test(m5()) && /trole = 'admin'/.test(m5()) && /trole = 'admin'/.test(m6()));
  assert.ok(/log_admin_action\(uuid, text, uuid, jsonb\) from public, anon, authenticated/.test(m5()), "the audit helper is not callable from the API");
});

test("migrations: audit and deletion logs and entitlements cannot be written by API roles", () => {
  const five = m5(), six = m6();
  assert.ok(/revoke all on public\.admin_audit_log from anon, authenticated;\s*grant select on public\.admin_audit_log to authenticated;/.test(five));
  assert.ok(/revoke all on public\.account_deletion_log from anon, authenticated;/.test(five));
  assert.ok(!/grant[^;]*account_deletion_log/i.test(five), "no grants at all on the deletion log");
  assert.ok(/revoke all on public\.entitlements from anon, authenticated;\s*grant select on public\.entitlements to authenticated;/.test(six));
  assert.ok(!/grant\s+(insert|update|delete|all)[^;]*entitlements/i.test(six));
  for (const sql of [five, six]) for (const t of ["admin_audit_log", "account_deletion_log", "entitlements"]) if (sql.includes(`create table if not exists public.${t}`)) assert.ok(new RegExp(`alter table public\\.${t} enable row level security`).test(sql), `${t} RLS`);
});

test("migrations: deletion record retains no email or name and purges after 30 days", () => {
  const sql = m5();
  const table = sql.slice(sql.indexOf("create table if not exists public.account_deletion_log"), sql.indexOf("create index if not exists idx_account_deletion_log_purge"));
  assert.ok(!/email|name\b|password|token/i.test(table.replace(/purge_after|user_ref/g, "")));
  assert.ok(/interval '30 days'/.test(table));
});

test("migrations: deactivated accounts lose access to their own data via RESTRICTIVE policies; profiles stay readable", () => {
  const sql = m5();
  for (const t of ["business_profiles", "checklist_progress", "task_progress", "reminder_configs", "sent_emails"]) assert.ok(sql.includes(`'${t}'`), t);
  assert.ok(/as restrictive for all to authenticated using \(public\.is_account_active\(\)\)/.test(sql));
  // profiles gets a restrictive policy for UPDATE only; reading must stay allowed for the reactivation screen
  const profilePolicies = noComments(sql).match(/create policy[^;]*on public\.profiles as restrictive[^;]*/gi) ?? [];
  assert.strictEqual(profilePolicies.length, 1);
  assert.ok(/for update/i.test(profilePolicies[0]) && !/for (select|all)/i.test(profilePolicies[0]));
  assert.ok(/deactivated_by is not null|by_admin is not null/.test(sql) && /deactivated by an administrator/.test(sql));
  assert.ok(/if r = 'admin' then raise exception/.test(sql), "admins cannot self-deactivate");
});

test("migrations: users cannot write deactivation columns or entitlements directly (column grants unchanged)", () => {
  const setup = read("database", "supabase_setup.sql");
  assert.ok(setup.includes("grant update (name) on public.profiles to authenticated;"));
  const noComments = m5().replace(/--.*$/gm, "");
  assert.ok(!/grant[^;]*(update|insert|all)[^;]*deactivat/i.test(noComments));
  assert.ok(!/grant\s+(update|insert|all)[^;]*on public\.profiles/i.test(noComments));
});

test("self-service upgrade is gone everywhere", () => {
  assert.ok(/drop function if exists public\.upgrade_to_premium_demo\(\)/.test(m6()));
  assert.ok(!/create or replace function public\.upgrade_to_premium_demo/.test(read("database", "supabase_setup.sql")));
  for (const f of [...src("app"), ...src("lib"), ...src("components")]) {
    const text = fs.readFileSync(f, "utf8");
    assert.ok(!text.includes("upgrade_to_premium_demo") && !text.includes("upgradeToPremium"), `${path.relative(path.join(__dirname, ".."), f)} still references the self-upgrade`);
  }
  const checkout = read("app", "premium", "checkout", "page.tsx");
  assert.ok(!/Apply demo upgrade|onClick=\{applyDemoUpgrade\}/.test(checkout));
});

// ── Central access control: no scattered role checks ────────────────────
test("pages and components use the central helper instead of comparing roles for Premium", () => {
  const allowed = new Set(["lib/entitlements.ts", "lib/authorization.ts", "lib/auth.tsx", "app/api/delete-account/route.ts", "lib/deleteAccountHandler.ts"]);
  const offenders = [];
  for (const f of [...src("app"), ...src("components"), ...src("lib")]) {
    const rel = path.relative(path.join(__dirname, ".."), f).split(path.sep).join("/");
    if (allowed.has(rel)) continue;
    const text = fs.readFileSync(f, "utf8");
    if (/role === "premium"|role !== "premium"|isPremiumRole\(/.test(text)) offenders.push(rel);
  }
  assert.deepStrictEqual(offenders, []);
});

test("Resource library goes through the central feature map (currently Free, as shipped)", () => {
  assert.ok(read("app", "resources", "page.tsx").includes('<FeatureGate feature="resource_library">'));
});

// ── Admin ─────────────────────────────────────────────────────────────
test("admin pages are behind AdminGuard and the preview never calls Supabase", () => {
  for (const f of [["app", "admin", "users", "page.tsx"], ["app", "admin", "audit", "page.tsx"]]) {
    const text = read(...f);
    assert.ok(text.includes("<AdminGuard>"), f.join("/"));
  }
  const users = read("app", "admin", "users", "page.tsx");
  assert.ok(users.indexOf("previewOnly") < users.indexOf("getSupabase()"));
  assert.ok(users.includes("if (!panel || busy || previewOnly) return;"));
  assert.ok(read("components", "Navbar.tsx").includes('"/admin/audit"'));
});

test("admin client never sends a role or an admin flag; every action goes through a server function", () => {
  const lib = read("lib", "adminUsers.ts");
  for (const rpc of ["admin_user_directory", "admin_grant_premium", "admin_revoke_premium", "admin_set_account_status", "admin_list_audit_log"]) assert.ok(lib.includes(`rpc("${rpc}"`), rpc);
  assert.ok(!/\.from\("profiles"\)\.(update|upsert|insert)|\.from\("entitlements"\)\.(insert|update|upsert|delete)/.test(lib + read("app", "admin", "users", "page.tsx")));
  assert.ok(!/p_role:\s*["'](admin|premium)["']/.test(lib));
});

test("admin helpers: expiry dates are validated and friendly errors never leak raw SQL", async () => {
  const { expiryFromDate, friendlyAdminError } = await load("../lib/adminActions.ts");
  assert.strictEqual(expiryFromDate(""), null);
  assert.strictEqual(expiryFromDate("2030-01-31"), "2030-01-31T15:59:59.000Z");
  assert.throws(() => expiryFromDate("31/01/2030"));
  assert.throws(() => expiryFromDate("2030-13-45"));
  assert.ok(friendlyAdminError("Admins only", "42501").message.includes("real admin"));
  assert.ok(friendlyAdminError("function public.admin_grant_premium does not exist", "PGRST202").missingMigration);
  assert.ok(!/select|relation|pg_/i.test(friendlyAdminError('relation "x" violates something').message));
});

// ── PWA / offline ──────────────────────────────────────────────────────
test("manifest is installable on Android and desktop and is not locked to portrait", () => {
  const m = JSON.parse(read("public", "manifest.json"));
  assert.strictEqual(m.display, "standalone");
  assert.strictEqual(m.id, "/");
  assert.strictEqual(m.scope, "/");
  assert.strictEqual(m.name, "GabayNegosyo");
  assert.notStrictEqual(m.orientation, "portrait");
  assert.ok(m.icons.some((i) => i.sizes === "192x192") && m.icons.some((i) => i.sizes === "512x512") && m.icons.some((i) => i.purpose === "maskable"));
  for (const i of m.icons) assert.ok(fs.existsSync(path.join(__dirname, "..", "public", i.src)), i.src);
});

test("service worker still never caches API, cross-origin, authorization or RSC requests, and purges on logout/deactivate", () => {
  const sw = read("public", "sw.js");
  for (const needle of ['startsWith("/api/")', "!isSameOrigin(url)", 'headers.has("authorization")', "_rsc", "purge-runtime-cache"]) assert.ok(sw.includes(needle), needle);
  assert.ok(!/PRECACHE_URLS = \[[^\]]*(dashboard|account|checklist|admin)/.test(sw), "no authenticated route is precached");
});

test("offline banner announces connection changes politely and is mounted app-wide", () => {
  const b = read("components", "OfflineBanner.tsx");
  assert.ok(b.includes('role="status"') && b.includes('aria-live="polite"'));
  assert.ok(b.includes('"offline"') && b.includes('"online"'));
  assert.ok(read("components", "ClientProviders.tsx").includes("<OfflineBanner />"));
});

// ── Guardrails for out-of-scope work ───────────────────────────────────
test("reminders and payments stay deferred", () => {
  const cron = read("app", "api", "cron", "send-reminders", "route.ts");
  assert.ok(cron.includes('process.env.REMINDERS_MODE ?? "off"'));
  assert.ok(!/NEXT_PUBLIC_REMINDERS_LIVE\s*=\s*true/i.test(read(".env.example")));
  const all = [...src("app"), ...src("lib"), ...src("components")].map((f) => fs.readFileSync(f, "utf8")).join("\n");
  assert.ok(!/(stripe|paymongo|xendit|paymaya|gcash)\.(com|js)|from ["'](stripe|@stripe)/i.test(all), "no payment SDK or gateway");
});

test("client-facing content datasets keep their shape (this release changes behaviour, not content)", () => {
  const requirements = require("../data/requirements.json");
  assert.strictEqual(requirements.length, 24);
  assert.ok(require("../data/resources.json").length > 0 && require("../data/tutorials.json").length > 0);
});

// ── Review fixes: Issues 1–5 ───────────────────────────────────────────
const fnBody = (sql, name) => {
  const start = sql.indexOf(`create or replace function public.${name}(`);
  assert.ok(start > -1, `${name} exists`);
  return noComments(sql.slice(start, sql.indexOf("$$;", sql.indexOf("as $$", start)) + 3));
};

test("Issue 1: the admin directory filters on the COMPUTED plan, not profiles.role", () => {
  const body = fnBody(m6(), "admin_user_directory");
  assert.ok(!/p\.role\s*=\s*p_role/.test(body), "no filter against the stored role");
  assert.ok(body.includes("public.entitlement_for(p.id)"));
  assert.ok(/p_role = 'premium' and b_role <> 'admin' and b_status = 'premium'/.test(body));
  assert.ok(/p_role = 'free'\s+and b_role <> 'admin' and b_status <> 'premium'/.test(body));
  assert.ok(/p_role = 'admin'\s+and b_role = 'admin'/.test(body));
  assert.ok(body.includes("(select count(*) from filtered)"), "the total reflects the filter");
});

test("Issue 2: legacy role='premium' cannot outlive an expiring grant", () => {
  const ef = fnBody(m6(), "entitlement_for");
  assert.ok(/prole = 'premium' and not exists \(select 1 from public\.entitlements x where x\.user_id = p_user\)/.test(ef), "legacy fallback only for accounts never placed under entitlements");
  const grant = fnBody(m6(), "admin_grant_premium");
  assert.ok(/if trole = 'premium' then\s+update public\.profiles set role = 'free' where id = p_target/.test(grant), "granting moves a legacy account into the entitlement system");
  assert.ok(grant.includes("legacy_role_migrated"), "the migration is audited");
  const revoke = fnBody(m6(), "admin_revoke_premium");
  assert.ok(/update public\.profiles set role = 'free'/.test(revoke));
});

test("Issue 3: demo accounts are refused by the database functions, not just the UI", () => {
  const five = m5();
  assert.ok(/select role, is_demo into r, d from public\.profiles/.test(fnBody(five, "deactivate_my_account")));
  assert.ok(/if coalesce\(d, false\) then raise exception 'Demo accounts cannot be deactivated'/.test(fnBody(five, "deactivate_my_account")));
  assert.ok(/if coalesce\(tdemo, false\) then raise exception 'Demo accounts cannot be deactivated'/.test(fnBody(five, "admin_set_account_status")));
  assert.ok(/Demo accounts do not use entitlements/.test(fnBody(m6(), "admin_grant_premium")));
});

test("Issue 3: the app loads is_demo and hides lifecycle actions; the delete route refuses flagged accounts", async () => {
  const auth = read("lib", "auth.tsx");
  assert.ok(auth.includes('"id, email, name, role, created_at, deactivated_at, is_demo"') && auth.includes("isDemoRecord"));
  assert.ok(read("components", "DeactivateAccountSection.tsx").includes("user.isDemoRecord"));
  assert.ok(read("components", "DeleteAccountSection.tsx").includes("user.isDemoRecord"));
  assert.ok(read("app", "api", "delete-account", "route.ts").includes("isDemoAccount"));
  const { handleDeleteAccount } = await load("../lib/deleteAccountHandler.ts");
  const a = deleteDeps({ isDemoAccount: async () => true });
  const r = await handleDeleteAccount("Bearer good", a.deps, { confirm: "DELETE" });
  assert.strictEqual(r.status, 403);
  assert.strictEqual(r.body.code, "demo");
  assert.deepStrictEqual(a.calls, [], "no record written and nothing deleted");
});

test("Issue 5: admin-imposed deactivation is a stored fact, independent of the admin's account", () => {
  const five = m5();
  assert.ok(/add column if not exists deactivated_by_admin boolean not null default false/.test(five));
  const react = fnBody(five, "reactivate_my_account");
  assert.ok(react.includes("deactivated_by_admin") && !/by_admin uuid|if by_admin is not null/.test(react), "reactivation reads the flag, not the clearable foreign key");
  assert.ok(/deactivated_by_admin = true/.test(fnBody(five, "admin_set_account_status")));
  assert.ok(/deactivated_by_admin = false/.test(fnBody(five, "deactivate_my_account")));
  assert.ok(/update public\.profiles set deactivated_by_admin = true\s+where deactivated_at is not null and deactivated_by is not null/.test(noComments(five)), "additive backfill of existing admin deactivations");
});

test("a deactivated account cannot edit its own profile row either", () => {
  assert.ok(/create policy "profiles: active account only \(update\)"\s+on public\.profiles as restrictive for update/.test(m5()));
});

test("manual reminder audience comes from the entitlement, and the automated path stays off", () => {
  const roster = fnBody(m6(), "admin_premium_roster");
  assert.ok(roster.includes("entitlement_for(p.id)") && roster.includes("ef.status = 'premium'"));
  assert.ok(/not p\.is_demo/.test(roster) && /p\.deactivated_at is null/.test(roster) && /reminders_unsubscribed_at is null/.test(roster) && /p\.role <> 'admin'/.test(roster));
  assert.ok(/if not public\.is_admin\(\)/.test(roster));
  assert.ok(read("app", "api", "cron", "send-reminders", "route.ts").includes('process.env.REMINDERS_MODE ?? "off"'));
});
