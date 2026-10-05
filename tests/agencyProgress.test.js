// AgencyProgress.tsx contains JSX, which Node's type-stripping cannot load, so the pure
// counting rule is asserted against the source text plus a faithful copy of the rule.
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const src = fs.readFileSync(path.join(__dirname, "..", "components", "AgencyProgress.tsx"), "utf8");

test("counting rule in source matches expected behaviour", () => {
  assert.match(src, /item\.req\.agencyId === agency\.id/);
  assert.match(src, /item\.status === "completed"/);
  const build = (agencies, items) =>
    agencies.map((a) => {
      const mine = items.filter((i) => i.req.agencyId === a.id);
      return { id: a.id, done: mine.filter((i) => i.status === "completed").length, total: mine.length };
    });
  const out = build(
    [{ id: "bir" }, { id: "sss" }],
    [
      { req: { agencyId: "bir" }, status: "completed" },
      { req: { agencyId: "bir" }, status: "upcoming" },
      { req: { agencyId: "sss" }, status: "overdue" },
    ]
  );
  assert.deepEqual(out, [{ id: "bir", done: 1, total: 2 }, { id: "sss", done: 0, total: 1 }]);
});

test("agencies with no applicable items print 'None' instead of a misleading 0%", () => {
  assert.match(src, /row\.total \? `\$\{row\.done\}\/\$\{row\.total\}` : "None"/);
});
