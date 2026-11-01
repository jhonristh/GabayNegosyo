// v0.16.5 assessment fixes. Node built-in runner, no extra dependencies.
const test = require("node:test");
const assert = require("node:assert");
const fs = require("node:fs");
const path = require("node:path");

const root = path.join(__dirname, "..");
const read = (f) => fs.readFileSync(path.join(root, f), "utf8");
const requirements = require("../data/requirements.json");
const credits = require("../data/credits.json");

test("package.json and package-lock.json agree on 0.16.5", () => {
  const pkg = JSON.parse(read("package.json"));
  const lock = JSON.parse(read("package-lock.json"));
  assert.strictEqual(pkg.version, "0.16.5");
  assert.strictEqual(lock.version, "0.16.5");
  assert.strictEqual(lock.packages[""].version, "0.16.5");
});

test("CHANGELOG starts with the v0.16.5 entry", () => {
  const first = read("CHANGELOG.md").split("\n").find((l) => l.startsWith("## "));
  assert.strictEqual(first, "## v0.16.5");
});

test("landing BIR count is computed by agency, not across all agencies", () => {
  const src = read("app/page.tsx");
  assert.ok(/agencyId === "bir" && r\.contentSource !== "prototype_placeholder"/.test(src));
});

test("the sourced BIR count is the BIR-only figure (excludes LGU and placeholders)", () => {
  const bir = requirements.filter((r) => r.agencyId === "bir" && r.contentSource !== "prototype_placeholder").length;
  const all = requirements.filter((r) => r.contentSource !== "prototype_placeholder").length;
  assert.ok(bir > 0);
  assert.ok(bir <= all);
  assert.strictEqual(bir, requirements.filter((r) => r.agencyId === "bir").length);
});

test("landing and metadata both call the non-BIR agencies outline content", () => {
  assert.ok(/outline content/.test(read("app/page.tsx")));
  assert.ok(/outline content/.test(read("app/layout.tsx")));
});

test("footer Contact is a mailto link rendered only when an address is configured", () => {
  const src = read("components/Footer.tsx");
  assert.ok(/siteConfig\.contactEmail && <a href=\{`mailto:\$\{siteConfig\.contactEmail\}`\}>Contact<\/a>/.test(src));
});

test("credits contain no placeholder names", () => {
  for (const r of credits.researchers) assert.ok(!/^Researcher \d+$/.test(r.name), r.name);
  assert.ok(!/^Web developer$/i.test(credits.developer.name));
  assert.strictEqual(credits.researchers.length, 9);
});

test("open items mention the dataset refresh and the contact variable", () => {
  const s = read("docs/OPEN_ITEMS.md");
  assert.ok(/Dataset refresh/.test(s) && /NEXT_PUBLIC_CONTACT_EMAIL/.test(s));
});
