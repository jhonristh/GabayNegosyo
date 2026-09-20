// The mandatory disclaimer is a hard client requirement (§8): exact wording,
// not shortened, not paraphrased, not replaced with English. This test exists
// so a future refactor can't quietly reword it.

const test = require("node:test");
const assert = require("node:assert");
const fs = require("node:fs");
const path = require("node:path");

const EXPECTED =
  "Estimate lang ito para sa awareness. Hindi ito kapalit ng aktwal na computation ng isang accountant o ng BIR para sa opisyal na pag-file.";

const penaltySrc = fs.readFileSync(path.join(__dirname, "..", "lib", "penalty.ts"), "utf8");
const simulatorSrc = fs.readFileSync(
  path.join(__dirname, "..", "app", "premium", "penalty-simulator", "page.tsx"),
  "utf8"
);

test("the exact disclaimer string is defined in lib/penalty.ts", () => {
  assert.ok(penaltySrc.includes(EXPECTED), "MANDATORY_DISCLAIMER does not match the client's exact wording");
});

test("the simulator renders the mandatory disclaimer constant", () => {
  assert.ok(
    simulatorSrc.includes("MANDATORY_DISCLAIMER"),
    "simulator must render the shared constant rather than an inline copy"
  );
});

test("the disclaimer is not replaced by a generic English disclaimer", () => {
  assert.ok(
    !penaltySrc.includes("Penalty estimates are for informational purposes only. Actual penalties may vary"),
    "generic English disclaimer must not replace the client's required Filipino wording"
  );
});
