// Free/Premium boundary tests — client specification §3, §4, §23, §24.
// These are source-level structural checks: the point of §24 is that premium
// content must not be rendered into the DOM and then visually hidden, so we
// verify the code branches on the role rather than overlaying.

const test = require("node:test");
const assert = require("node:assert");
const fs = require("node:fs");
const path = require("node:path");

const read = (...p) => fs.readFileSync(path.join(__dirname, "..", ...p), "utf8");

const detail = read("app", "requirements", "[id]", "page.tsx");
const tutorials = read("app", "tutorials", "page.tsx");
const simulator = read("app", "premium", "penalty-simulator", "page.tsx");
const authorization = read("lib", "authorization.ts");

test("requirement detail branches on premium role before rendering full detail", () => {
  assert.ok(detail.includes("isPremiumRole"), "detail page must check the role");
  assert.ok(detail.includes("isPremium ? ("), "premium content must be conditionally rendered, not overlaid");
});

test("requirement detail does not hide premium content with CSS overlays", () => {
  for (const bad of ["filter: blur", "premium-overlay", "visibility: hidden"]) {
    assert.ok(!detail.includes(bad), `premium content must not be masked with ${bad}`);
  }
});

test("required documents and instructions sit inside the premium branch", () => {
  const premiumBranch = detail.split("isPremium ? (")[1].split("premium-lock")[0];
  assert.ok(premiumBranch.includes("Required Documents"));
  assert.ok(premiumBranch.includes("requirement.instructions"));
  assert.ok(premiumBranch.includes("Curated Tutorial"));
});

test("curated tutorial content is premium-gated in the learning hub", () => {
  assert.ok(tutorials.includes("isPremiumRole"), "tutorials hub must check the role");
  assert.ok(tutorials.includes("isPremium ? ("), "tutorial steps/video must be conditionally rendered");
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

test("free-tier pricing is presented as the client specified", () => {
  const account = read("app", "account", "page.tsx");
  assert.ok(account.includes("₱99–₱199/month"), "account page must show the client's pricing");
});
