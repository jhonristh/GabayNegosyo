// v0.13 tests: NCR scope, safe auth redirects, demo isolation, account deletion.
const test = require("node:test");
const assert = require("node:assert");
const fs = require("node:fs");
const path = require("node:path");

const read = (...p) => fs.readFileSync(path.join(__dirname, "..", ...p), "utf8");
const load = (rel) => import(rel);

// ── NCR ────────────────────────────────────────────────────────────────
test("NCR dataset has the 16 cities and Pateros, with unique ids", async () => {
  const { NCR_LOCALITIES } = await load("../lib/ncr.ts");
  assert.strictEqual(NCR_LOCALITIES.length, 17);
  assert.strictEqual(new Set(NCR_LOCALITIES.map((l) => l.id)).size, 17);
  assert.strictEqual(NCR_LOCALITIES.filter((l) => l.type === "municipality").map((l) => l.name).join(), "Pateros");
  for (const name of ["City of Manila", "Quezon City", "Caloocan", "Las Piñas", "Makati", "Malabon", "Mandaluyong", "Marikina", "Muntinlupa", "Navotas", "Parañaque", "Pasay", "Pasig", "San Juan", "Taguig", "Valenzuela"]) {
    assert.ok(NCR_LOCALITIES.some((l) => l.name === name), `missing ${name}`);
  }
});

test("no locality claims verified LGU guidance without a source", async () => {
  const { NCR_LOCALITIES } = await load("../lib/ncr.ts");
  assert.ok(NCR_LOCALITIES.every((l) => l.lguGuidance === "generic_unverified"));
  assert.ok(NCR_LOCALITIES.filter((l) => l.barangayLookup).every((l) => l.id === "quezon_city"), "barangay→RDO data exists for QC only");
});

test("profiles saved before v0.13 (barangay, no locality) resolve to Quezon City", async () => {
  const { localityIdOf, localityLabel, formatLocation } = await load("../lib/ncr.ts");
  assert.strictEqual(localityIdOf({ barangay: "Aurora" }), "quezon_city");
  assert.strictEqual(localityIdOf({ locality: "makati", barangay: "X" }), "makati");
  assert.strictEqual(localityIdOf({ locality: "nowhere" }), "");
  assert.strictEqual(localityLabel({ locality: "pateros" }), "Pateros");
  assert.strictEqual(formatLocation("Poblacion", "makati"), "Poblacion, Makati");
});

test("national requirements do not depend on locality in the rule engine", () => {
  const engine = read("lib", "ruleEngine.ts");
  assert.ok(!/locality/i.test(engine), "the rule engine must not branch on locality");
});

test("no Quezon City-only copy remains in wizard, account or dashboard", () => {
  for (const f of [["app", "wizard", "page.tsx"], ["app", "account", "page.tsx"], ["app", "dashboard", "page.tsx"]]) {
    const src = read(...f).replace(/\(available for Quezon City only[^)]*\)/, "");
    assert.ok(!/in Quezon City|, Quezon City"|\(Quezon City\)/.test(src), `${f.join("/")} still hard-codes Quezon City`);
  }
});

// ── Auth redirects ─────────────────────────────────────────────────────
test("redirect base prefers the configured site URL and strips paths", async () => {
  const { buildAuthRedirect } = await load("../lib/authRedirect.ts");
  const url = buildAuthRedirect("/auth/confirmed", { siteUrl: "https://app.example.ph/some/path", browserOrigin: "http://localhost:3000", production: true });
  assert.strictEqual(url, "https://app.example.ph/auth/confirmed");
});

test("production never emits a localhost redirect", async () => {
  const { buildAuthRedirect, resolveSiteBase } = await load("../lib/authRedirect.ts");
  assert.strictEqual(buildAuthRedirect("/login", { siteUrl: null, browserOrigin: "http://localhost:3000", production: true }), null);
  assert.strictEqual(resolveSiteBase({ siteUrl: "http://127.0.0.1:3000", browserOrigin: null, production: true }), null);
  assert.strictEqual(buildAuthRedirect("/login", { siteUrl: null, browserOrigin: "http://localhost:3000", production: false }), "http://localhost:3000/login");
});

test("only allow-listed paths and http(s) URLs are accepted", async () => {
  const { buildAuthRedirect, parseSiteUrl } = await load("../lib/authRedirect.ts");
  const env = { siteUrl: "https://app.example.ph", production: true };
  assert.strictEqual(buildAuthRedirect("https://evil.example/steal", env), null);
  assert.strictEqual(buildAuthRedirect("//evil.example", env), null);
  assert.strictEqual(buildAuthRedirect("/admin", env), null);
  assert.strictEqual(parseSiteUrl("javascript:alert(1)"), null);
  assert.strictEqual(parseSiteUrl("not a url"), null);
});

test("auth error messages are friendly and never raw JSON", async () => {
  const { friendlyAuthError, friendlyEmailAuthError, classifyConfirmationError } = await load("../lib/authErrors.ts");
  const raw = '{"code":400,"error_code":"validation_failed","msg":"Unsupported provider: provider is not enabled"}';
  const msg = friendlyAuthError(raw);
  assert.ok(!msg.includes("{") && /not switched on/i.test(msg));
  assert.match(friendlyEmailAuthError("Invalid login credentials"), /do not match/);
  assert.match(friendlyEmailAuthError("Email not confirmed"), /confirm your email/i);
  assert.strictEqual(classifyConfirmationError("otp_expired", "Email link is invalid or has expired"), "expired");
  assert.strictEqual(classifyConfirmationError("access_denied", null), "denied");
  assert.strictEqual(classifyConfirmationError(null, null), null);
});

test("signup and Google use validated redirects, never window.location.origin directly", () => {
  const auth = read("lib", "auth.tsx");
  assert.ok(auth.includes('authRedirectUrl("/auth/confirmed")'));
  assert.ok(auth.includes('authRedirectUrl("/login")'));
  assert.ok(!/redirectTo:\s*`\$\{window\.location\.origin\}/.test(auth));
  assert.ok(!/emailRedirectTo:\s*`\$\{window\.location\.origin\}/.test(auth));
  assert.ok(auth.includes('provider: "google"'));
});

// ── Demo isolation ─────────────────────────────────────────────────────
test("demo mode has no password, no Supabase import and no profile creation", () => {
  const demo = read("lib", "demoAccounts.ts");
  assert.ok(!/supabase/i.test(demo.replace(/\/\*[\s\S]*?\*\//g, "")), "demo module must not touch Supabase");
  assert.ok(!/PASSWORD/.test(demo));
  assert.ok(!read("app", "login", "page.tsx").includes("DEMO_PASSWORD"));
  assert.ok(!read(".env.example").includes("NEXT_PUBLIC_DEMO_PASSWORD="));
});

test("every db write checks demo mode before any Supabase call", () => {
  const src = read("lib", "db.ts");
  const writes = ["saveBusinessProfile", "markComplete", "markIncomplete", "setReminderConfig"];
  for (const fn of writes) {
    const body = src.slice(src.indexOf(`  ${fn}(`));
    const guard = body.indexOf("inDemo()");
    const call = body.indexOf("getSupabase()");
    assert.ok(guard > -1 && call > -1 && guard < call, `${fn} must guard demo before calling Supabase`);
  }
  const task = src.slice(src.indexOf("  setTaskDone("), src.indexOf("  // ---- Guest profile"));
  assert.strictEqual((task.match(/inDemo\(\)/g) || []).length, 2, "both setTaskDone branches guard demo");
  assert.ok(src.includes("if (!currentUserId || inDemo()) return;"), "refreshSentEmails must skip demo");
});

test("demo email, upgrade, logout and admin users never reach real services", () => {
  const email = read("lib", "email.ts");
  assert.ok(email.indexOf("db.isDemo()") > -1 && email.indexOf("db.isDemo()") < email.indexOf('fetch("/api/send-email"'));
  const auth = read("lib", "auth.tsx");
  const up = auth.slice(auth.indexOf("async function upgradeToPremium"));
  assert.ok(up.indexOf("user.isDemo") < up.indexOf('rpc("upgrade_to_premium_demo")'));
  const out = auth.slice(auth.indexOf("async function logout"));
  assert.ok(out.indexOf("user?.isDemo") < out.indexOf("signOut()"), "demo exit must not sign out a real user");
  const del = auth.slice(auth.indexOf("async function deleteAccount"));
  assert.ok(del.indexOf("user.isDemo") < del.indexOf("/api/delete-account"));
  const users = read("app", "admin", "users", "page.tsx");
  assert.ok(users.indexOf("previewOnly") < users.indexOf("getSupabase()"));
});

test("starting a demo is refused while a real user is signed in", () => {
  const auth = read("lib", "auth.tsx");
  assert.match(auth, /if \(!DEMO_ENABLED \|\| currentId\.current\) return;/);
});

// ── Account deletion ───────────────────────────────────────────────────
const deps = (over = {}) => {
  const calls = [];
  return {
    calls,
    deps: {
      getUserFromToken: async (t) => (t === "good" ? { id: "u1", lastSignInAt: new Date(1_000_000).toISOString() } : null),
      getRole: async () => "free",
      deleteAuthUser: async (id) => (calls.push(id), { error: null }),
      now: () => 1_000_000 + 60_000,
      ...over,
    },
  };
};

test("delete: unauthenticated requests are rejected and nothing is deleted", async () => {
  const { handleDeleteAccount } = await load("../lib/deleteAccountHandler.ts");
  const a = deps();
  assert.strictEqual((await handleDeleteAccount(null, a.deps)).status, 401);
  assert.strictEqual((await handleDeleteAccount("Bearer bad", a.deps)).status, 401);
  assert.deepStrictEqual(a.calls, []);
});

test("delete: only the token's own user can be deleted (no target id is accepted)", async () => {
  const { handleDeleteAccount } = await load("../lib/deleteAccountHandler.ts");
  const a = deps();
  const r = await handleDeleteAccount("Bearer good", a.deps);
  assert.strictEqual(r.status, 200);
  assert.deepStrictEqual(a.calls, ["u1"]);
  assert.strictEqual(handleDeleteAccount.length, 2, "signature has no user-id parameter");
  assert.ok(!/userId|user_id/.test(read("app", "api", "delete-account", "route.ts").match(/req\.(json|text|formData)/)?.[0] ?? ""));
});

test("delete: stale sign-in requires re-authentication", async () => {
  const { handleDeleteAccount } = await load("../lib/deleteAccountHandler.ts");
  const a = deps({ now: () => 1_000_000 + 11 * 60_000 });
  const r = await handleDeleteAccount("Bearer good", a.deps);
  assert.strictEqual(r.status, 403);
  assert.strictEqual(r.body.code, "reauth_required");
  assert.deepStrictEqual(a.calls, []);
});

test("delete: admin and demo identities are protected", async () => {
  const { handleDeleteAccount } = await load("../lib/deleteAccountHandler.ts");
  const admin = deps({ getRole: async () => "admin" });
  assert.strictEqual((await handleDeleteAccount("Bearer good", admin.deps)).body.code, "admin_protected");
  const demo = deps({ getUserFromToken: async () => ({ id: "demo-admin", lastSignInAt: new Date(1_000_000).toISOString() }) });
  assert.strictEqual((await handleDeleteAccount("Bearer good", demo.deps)).status, 403);
  assert.deepStrictEqual([...admin.calls, ...demo.calls], []);
});

test("delete: provider failure returns an honest error, not success", async () => {
  const { handleDeleteAccount } = await load("../lib/deleteAccountHandler.ts");
  const a = deps({ deleteAuthUser: async () => ({ error: "boom" }) });
  const r = await handleDeleteAccount("Bearer good", a.deps);
  assert.strictEqual(r.status, 500);
  assert.ok(!r.body.ok && /Nothing was changed/.test(r.body.error));
});

test("service-role key stays server-side only", () => {
  const route = read("app", "api", "delete-account", "route.ts");
  assert.ok(route.includes("SUPABASE_SERVICE_ROLE_KEY"));
  assert.ok(!/NEXT_PUBLIC_[A-Z_]*SERVICE/.test(read(".env.example") + route));
  for (const f of ["lib", "components", "app"]) {
    const walk = (d) => fs.readdirSync(d, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk(path.join(d, e.name)) : [path.join(d, e.name)]));
    for (const file of walk(path.join(__dirname, "..", f))) {
      // v0.16: the only server routes allowed to hold the service-role key (all under app/api, never client code).
      const serverOnly = [["api", "delete-account"], ["api", "cron", "send-reminders"], ["api", "unsubscribe"]].some((seg) => file.includes(path.join(...seg)));
      if (serverOnly) {
        assert.ok(!/["']use client["']/.test(fs.readFileSync(file, "utf8")), `${file} must stay server-only`);
        continue;
      }
      if (!/\.(ts|tsx)$/.test(file)) continue;
      assert.ok(!fs.readFileSync(file, "utf8").includes("SERVICE_ROLE"), `${file} must not reference the service role key`);
    }
  }
});

// ── Credits ────────────────────────────────────────────────────────────
test("credits show exactly 9 researchers and 1 developer with no invented names", () => {
  const credits = JSON.parse(read("data", "credits.json"));
  assert.strictEqual(credits.researchers.length, 9);
  assert.ok(credits.developer && credits.developer.name);
  assert.ok(credits.researchers.every((r) => /^Researcher \d$/.test(r.name)), "names must stay placeholders until confirmed");
});
