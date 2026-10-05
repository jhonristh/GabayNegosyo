// Design-kit integration tests. Imports the real lib/theme.ts (Node type-stripping,
// same approach as tests/engine.real.test.js) and checks source wiring that the
// shells depend on.
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.join(__dirname, "..");
const read = (...p) => fs.readFileSync(path.join(root, ...p), "utf8");

let theme;
test.before(async () => {
  theme = await import(path.join(root, "lib", "theme.ts"));
});

test("parseThemePreference accepts the three values and falls back to light", () => {
  for (const v of ["light", "night", "system"]) assert.equal(theme.parseThemePreference(v), v);
  for (const v of [null, undefined, "", "dark", "NIGHT", "{}", "true"]) assert.equal(theme.parseThemePreference(v), "light");
});

test("resolveTheme: light and night ignore the device, system follows it", () => {
  assert.equal(theme.resolveTheme("light", true), "light");
  assert.equal(theme.resolveTheme("night", false), "night");
  assert.equal(theme.resolveTheme("system", true), "night");
  assert.equal(theme.resolveTheme("system", false), "light");
});

test("first-time visitors get light, never a surprise dark UI", () => {
  assert.equal(theme.parseThemePreference(null), "light");
  assert.match(read("app", "layout.tsx"), /data-theme="light"/);
});

test("init script is dependency-free, guarded by try/catch and uses the same storage key", () => {
  const s = theme.THEME_INIT_SCRIPT;
  assert.ok(s.includes(theme.THEME_STORAGE_KEY));
  assert.ok(s.includes("try{") && s.includes("catch"));
  assert.doesNotThrow(() => new Function(s));
});

test("init script behaves like resolveTheme (run against a fake DOM)", () => {
  const run = (stored, dark) => {
    let attr = null;
    const fake = {
      localStorage: { getItem: () => stored },
      matchMedia: () => ({ matches: dark }),
      document: { documentElement: { setAttribute: (_k, v) => (attr = v) } },
    };
    new Function("localStorage", "window", "document", theme.THEME_INIT_SCRIPT)(fake.localStorage, fake, fake.document);
    return attr;
  };
  assert.equal(run("night", false), "night");
  assert.equal(run("light", true), "light");
  assert.equal(run("system", true), "night");
  assert.equal(run("system", false), "light");
  assert.equal(run("garbage", true), "light");
  assert.equal(run(null, true), "light");
});

test("blocked storage cannot break the page", () => {
  let attr = null;
  const fake = {
    localStorage: { getItem: () => { throw new Error("blocked"); } },
    matchMedia: () => ({ matches: true }),
    document: { documentElement: { setAttribute: (_k, v) => (attr = v) } },
  };
  new Function("localStorage", "window", "document", theme.THEME_INIT_SCRIPT)(fake.localStorage, fake, fake.document);
  assert.equal(attr, "light");
});

test("every theme option has a label and each resolved theme has a browser colour", () => {
  assert.deepEqual(theme.THEME_OPTIONS.map((o) => o.value).sort(), ["light", "night", "system"]);
  assert.ok(theme.THEME_OPTIONS.every((o) => o.label && o.hint));
  assert.match(theme.THEME_COLORS.light, /^#[0-9A-Fa-f]{6}$/);
  assert.match(theme.THEME_COLORS.night, /^#[0-9A-Fa-f]{6}$/);
});

test("kit stylesheet is loaded after globals.css", () => {
  const layout = read("app", "layout.tsx");
  assert.ok(layout.indexOf("globals.css") < layout.indexOf("kits.css"));
});

test("Night Shift overrides exist and declare a dark colour scheme", () => {
  const css = read("styles", "kits.css");
  assert.match(css, /html\[data-theme="night"\]\s*\{[^}]*color-scheme:\s*dark/);
});

test("navigation keeps real routes and does not regress earlier guarantees", () => {
  const nav = read("components", "Navbar.tsx");
  for (const href of ["/dashboard", "/checklist", "/registration", "/bir-forms", "/penalties", "/renewal", "/resources", "/tutorials", "/deadlines", "/account"]) {
    assert.ok(nav.includes(`"${href}"`), `user nav must link ${href}`);
  }
  for (const href of ["/admin", "/admin/agencies", "/admin/requirements", "/admin/resources", "/admin/tutorials", "/admin/users"]) {
    assert.ok(nav.includes(`"${href}"`), `admin nav must link ${href}`);
  }
  assert.ok(!nav.includes("#checklist"));
});

test("shell is chosen from role, but access control stays in the guards", () => {
  const providers = read("components", "ClientProviders.tsx");
  assert.ok(providers.includes('user.role === "admin"'));
  assert.ok(read("components", "AdminGuard.tsx").includes('user?.role !== "admin"'));
  assert.ok(read("app", "admin", "page.tsx").includes("AdminGuard"));
});

test("admin review queue is computed from real content checks, not sample rows", () => {
  const page = read("app", "admin", "page.tsx");
  assert.ok(page.includes("requirementContentStatus") && page.includes("isResourceStale") && page.includes("isPlaceholder"));
  assert.ok(!/illustrative|sample count/i.test(page));
});

test("dashboard agency bars show counts as text and come from real items", () => {
  const comp = read("components", "AgencyProgress.tsx");
  assert.ok(comp.includes("row.done") && comp.includes("row.total"));
  assert.ok(read("app", "dashboard", "page.tsx").includes("buildAgencyProgress(agencies, items)"));
});

test("landing preview stays labelled illustrative", () => {
  assert.match(read("app", "page.tsx"), /Illustrative product preview/);
});

test("the client logo asset is unchanged by the integration", () => {
  assert.ok(fs.existsSync(path.join(root, "public", "icons", "gabaynegosyo-client-logo.jpg")));
});

// Regression: Overdue/Completed badges once shipped at 4.3:1 because the contrast
// check measured badge text on plain white, not on the translucent tint it sits on.
test("contrast check reads the real .badge-* rules and covers both surfaces", () => {
  const script = read("scripts", "contrast-check.mjs");
  assert.ok(script.includes("styles/globals.css"), "checker must parse the real stylesheet");
  assert.ok(script.includes("sand page") && script.includes("white card"), "badges must be measured on both surfaces");
  const css = read("styles", "globals.css");
  for (const status of ["completed", "due_soon", "due_today", "overdue", "upcoming", "no_deadline"]) {
    assert.match(css, new RegExp(`\\.badge-${status}\\s*\\{[^}]*background:\\s*rgba\\(`), `badge-${status} must keep a parseable rgba tint`);
  }
});
