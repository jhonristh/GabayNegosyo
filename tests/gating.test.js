// Free/Premium boundary tests.
//
// Rewritten for V0.3: the previous version of this file expected an inline
// `isPremium ? (` ternary and expected the tutorials hub itself to be
// premium-gated. Neither matches this app's actual, documented free/
// premium split (see README.md's Free vs. Premium table, unchanged since
// the original MVP): the Learning Hub *list* is free tier; what's actually
// gated is full requirement detail (via the <PremiumGate> wrapper
// component), the penalty simulator, and email reminders. These tests now
// check for that real boundary — same underlying security property the
// old assertions were after (role is checked before rendering, not masked
// with CSS), just matching the component-composition pattern actually used
// instead of a specific inline-ternary string.

const test = require("node:test");
const assert = require("node:assert");
const fs = require("node:fs");
const path = require("node:path");

const read = (...p) => fs.readFileSync(path.join(__dirname, "..", ...p), "utf8");

const detail = read("app", "requirements", "[id]", "page.tsx");
const tutorials = read("app", "tutorials", "page.tsx");
const simulator = read("app", "premium", "penalty-simulator", "page.tsx");
const authorization = read("lib", "authorization.ts");
const premiumGate = read("components", "PremiumGate.tsx");

test("requirement detail branches on premium role before rendering full detail", () => {
  assert.ok(detail.includes("PremiumGate"), "detail page must gate full detail behind the PremiumGate component");
  assert.ok(premiumGate.includes("isPremium"), "PremiumGate must check the role before deciding what to render");
});

test("PremiumGate does not hide premium content with CSS overlays", () => {
  for (const bad of ["filter: blur", "premium-overlay", "visibility: hidden"]) {
    assert.ok(!premiumGate.includes(bad) && !detail.includes(bad), `premium content must not be masked with ${bad}`);
  }
});

test("PremiumGate returns the gate card instead of children when not premium (conditional render, not overlay)", () => {
  assert.ok(premiumGate.includes("if (isPremium) return"), "PremiumGate must return early with children when premium, not render both");
});

test("required documents and instructions sit inside the PremiumGate-wrapped section", () => {
  const gated = detail.split("<PremiumGate>")[1];
  assert.ok(gated, "requirement detail must wrap content in <PremiumGate>");
  assert.ok(gated.includes("Required Documents"));
  assert.ok(gated.includes("requirement.instructions"));
});

test("the Learning Hub list itself is free tier (matches README's Free vs. Premium table)", () => {
  assert.ok(!tutorials.includes("assertPremium"), "the tutorials list page must not require Premium to view");
});

test("simulator enforces premium at the service layer, not only the UI", () => {
  assert.ok(simulator.includes("assertPremium"), "simulator must call the service-layer assertion");
  assert.ok(simulator.includes("PremiumGate"), "simulator must also carry the UI gate");
});

test("authorization helpers deny free users and undefined roles", () => {
  assert.ok(authorization.includes("isPremiumRole"));
  assert.ok(authorization.includes("assertPremium"));
  assert.ok(authorization.includes("assertAdmin"));
});

test("no page hardcodes an unconfirmed Premium price (client rule: no invented pricing)", () => {
  const account = read("app", "account", "page.tsx");
  assert.ok(!/₱\d+[–-]₱?\d+\s*\/\s*month/.test(account), "account page must not hardcode a specific unconfirmed price");
});

test("send-email route enforces a server-side rate limit and logs sends itself (B2)", () => {
  const fs = require("node:fs");
  const path = require("node:path");
  const route = fs.readFileSync(path.join(__dirname, "..", "app", "api", "send-email", "route.ts"), "utf8");
  assert.ok(route.includes("RATE_LIMIT_MAX_PER_HOUR"), "route must define a rate limit");
  assert.ok(route.includes('gte("sent_at"'), "route must count recent rows before sending");
  assert.ok(route.includes("429"), "route must reject over-limit callers with 429");
  assert.ok(route.includes('.insert('), "route must write its own log row (not rely on the client)");
});

test("client no longer double-logs sent emails (B2)", () => {
  const fs = require("node:fs");
  const path = require("node:path");
  const emailLib = fs.readFileSync(path.join(__dirname, "..", "lib", "email.ts"), "utf8");
  assert.ok(!emailLib.includes("appendSentEmail"), "client must not write its own sent_emails row anymore");
});

test("nav Checklist link points at a real route, not a dashboard hash anchor (K10)", () => {
  const fs = require("node:fs");
  const path = require("node:path");
  const navbar = fs.readFileSync(path.join(__dirname, "..", "components", "Navbar.tsx"), "utf8");
  assert.ok(!navbar.includes("#checklist"), "Navbar must not link to a hash anchor for Checklist");
  assert.ok(navbar.includes('"/checklist"'), "Navbar must link to the real /checklist route");
  assert.ok(fs.existsSync(path.join(__dirname, "..", "app", "checklist", "page.tsx")), "/checklist route must exist");
});

test("next.config.js sets a CSP and baseline security headers (B2/B5)", () => {
  const fs = require("node:fs");
  const path = require("node:path");
  const config = fs.readFileSync(path.join(__dirname, "..", "next.config.js"), "utf8");
  for (const header of ["Content-Security-Policy", "X-Content-Type-Options", "X-Frame-Options", "Referrer-Policy", "Strict-Transport-Security", "Permissions-Policy"]) {
    assert.ok(config.includes(header), `next.config.js missing ${header}`);
  }
  assert.ok(config.includes("frame-ancestors 'none'"), "CSP must set frame-ancestors 'none'");
});
