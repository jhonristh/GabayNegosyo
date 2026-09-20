// Content-integrity tests (V0.2 §9, §32).
// Runs on Node's built-in test runner — no extra dependencies.

const test = require("node:test");
const assert = require("node:assert");
const requirements = require("../data/requirements.json");
const agencies = require("../data/agencies.json");
const resources = require("../data/resources.json");
const tutorials = require("../data/tutorials.json");

const VALID_STATUS = ["verified", "review_required", "prototype", "archived"];
const VALID_SOURCE = ["official", "external", "gabaynegosyo"];
const VALID_FREQ = ["one_time", "monthly", "quarterly", "annual"];

test("every requirement references a real agency", () => {
  const ids = new Set(agencies.map((a) => a.id));
  for (const r of requirements) {
    assert.ok(ids.has(r.agencyId), `${r.id} references unknown agency ${r.agencyId}`);
  }
});

test("every requirement carries content-integrity fields", () => {
  for (const r of requirements) {
    assert.ok(VALID_STATUS.includes(r.contentStatus), `${r.id} bad contentStatus`);
    assert.ok(VALID_SOURCE.includes(r.sourceType), `${r.id} bad sourceType`);
    assert.ok(VALID_FREQ.includes(r.frequency), `${r.id} bad frequency`);
    assert.match(r.lastVerified, /^\d{4}-\d{2}-\d{2}$/, `${r.id} bad lastVerified`);
  }
});

test("no requirement is marked verified without a real deadline and source", () => {
  for (const r of requirements.filter((x) => x.contentStatus === "verified")) {
    assert.ok(r.officialUrl && r.officialUrl.startsWith("https://"), `${r.id} verified without https source`);
    assert.ok(r.deadlineDescription.length > 0, `${r.id} verified without a deadline`);
  }
});

test("all official URLs point at government domains (no fabricated hosts)", () => {
  const allowed = [".gov.ph", "dti.gov.ph", "bir.gov.ph", "sss.gov.ph", "philhealth.gov.ph", "pagibigfund.gov.ph", "dilg.gov.ph"];
  const urls = [...requirements.map((r) => r.officialUrl), ...resources.map((r) => r.url)];
  for (const url of urls) {
    assert.ok(url.startsWith("https://"), `${url} is not https`);
    assert.ok(allowed.some((d) => url.includes(d)), `${url} is not a recognised .gov.ph host`);
  }
});

test("tutorials carry steps, difficulty, and honest source labelling", () => {
  for (const t of tutorials) {
    assert.ok(Array.isArray(t.steps) && t.steps.length > 0, `${t.id} has no steps`);
    assert.ok(["beginner", "intermediate"].includes(t.difficulty), `${t.id} bad difficulty`);
    assert.ok(t.estimatedMinutes > 0, `${t.id} bad estimatedMinutes`);
    assert.ok(VALID_SOURCE.includes(t.sourceType), `${t.id} bad sourceType`);
    // Placeholder videos must never be labelled as verified content.
    if (t.isPlaceholder) {
      assert.notStrictEqual(t.contentStatus, "verified", `${t.id} is a placeholder but marked verified`);
    }
  }
});

test("resources carry content-integrity fields", () => {
  for (const r of resources) {
    assert.ok(VALID_STATUS.includes(r.contentStatus), `${r.id} bad contentStatus`);
    assert.ok(VALID_SOURCE.includes(r.sourceType), `${r.id} bad sourceType`);
  }
});
