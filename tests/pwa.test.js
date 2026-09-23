// PWA configuration tests (V0.2 §32).
const test = require("node:test");
const assert = require("node:assert");
const fs = require("node:fs");
const path = require("node:path");

const root = path.join(__dirname, "..");
const manifest = require("../public/manifest.json");

test("manifest declares the fields required for installability", () => {
  assert.ok(manifest.name && manifest.short_name);
  assert.strictEqual(manifest.display, "standalone");
  assert.ok(manifest.start_url);
  assert.ok(manifest.theme_color && manifest.background_color);
});

test("manifest icons exist on disk at the declared sizes", () => {
  const sizes = manifest.icons.map((i) => i.sizes);
  assert.ok(sizes.includes("192x192"));
  assert.ok(sizes.includes("512x512"));
  for (const icon of manifest.icons) {
    const file = path.join(root, "public", icon.src.replace(/^\//, ""));
    assert.ok(fs.existsSync(file), `missing icon file: ${icon.src}`);
  }
});

test("a maskable icon is provided", () => {
  assert.ok(manifest.icons.some((i) => i.purpose === "maskable"));
});

test("service worker exists and defines install/activate/fetch handlers", () => {
  const sw = fs.readFileSync(path.join(root, "public", "sw.js"), "utf8");
  for (const evt of ["install", "activate", "fetch"]) {
    assert.ok(sw.includes(`addEventListener("${evt}"`), `sw.js missing ${evt} handler`);
  }
});

test("service worker never intercepts cross-origin, /api/*, or Authorization-bearing requests (K3 fix)", () => {
  const sw = fs.readFileSync(path.join(root, "public", "sw.js"), "utf8");
  assert.ok(sw.includes('startsWith("/api/")'), "must bypass /api/* routes");
  assert.ok(sw.includes("isSameOrigin"), "must check same-origin before caching");
  assert.ok(sw.includes('has("authorization")'), "must bypass requests carrying an Authorization header");
});

test("service worker does not precache authenticated routes", () => {
  const sw = fs.readFileSync(path.join(root, "public", "sw.js"), "utf8");
  for (const authedRoute of ['"/dashboard"', '"/account"', '"/deadlines"']) {
    assert.ok(!sw.includes(authedRoute), `sw.js must not precache ${authedRoute}`);
  }
});
