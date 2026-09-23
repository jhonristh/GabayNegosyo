// Content-integrity tests.
//
// Rewritten for V0.3: the previous version of this file (kept under git
// history) asserted a contentStatus/sourceType/frequency schema that was
// never actually implemented — it tested an earlier draft spec, not this
// app. The real content-provenance model is `contentSource` on Requirement
// (see lib/types.ts, CONTENT_AUDIT.md): "flowchart_final_workbook" |
// "registration_wizard_txt" | "prototype_placeholder". That field, plus the
// `not_specified` penalty type and the deadline-approximation flags it
// enables, exist specifically so this content's real provenance is always
// visible — this file now checks THAT, instead of fields nothing sets.
//
// Runs on Node's built-in test runner — no extra dependencies.

const test = require("node:test");
const assert = require("node:assert");
const requirements = require("../data/requirements.json");
const agencies = require("../data/agencies.json");
const resources = require("../data/resources.json");
const tutorials = require("../data/tutorials.json");

const VALID_CONTENT_SOURCE = ["flowchart_final_workbook", "registration_wizard_txt", "prototype_placeholder"];

test("every requirement references a real agency", () => {
  const ids = new Set(agencies.map((a) => a.id));
  for (const r of requirements) {
    assert.ok(ids.has(r.agencyId), `${r.id} references unknown agency ${r.agencyId}`);
  }
});

test("every requirement carries a valid contentSource and lastVerified date", () => {
  for (const r of requirements) {
    assert.ok(VALID_CONTENT_SOURCE.includes(r.contentSource), `${r.id} has an unrecognized contentSource: ${r.contentSource}`);
    assert.match(r.lastVerified, /^\d{4}-\d{2}-\d{2}$/, `${r.id} bad lastVerified`);
  }
});

test("workbook-sourced requirements have a real deadline description and https source", () => {
  const workbookSourced = requirements.filter((r) => r.contentSource !== "prototype_placeholder");
  for (const r of workbookSourced) {
    assert.ok(r.officialUrl && r.officialUrl.startsWith("https://"), `${r.id} workbook-sourced without an https source`);
    assert.ok(r.deadlineDescription && r.deadlineDescription.length > 0, `${r.id} workbook-sourced without a deadline description`);
  }
});

test("all official URLs point at government domains (no fabricated hosts)", () => {
  const allowed = [".gov.ph", "dti.gov.ph", "sec.gov.ph", "cda.gov.ph", "bir.gov.ph", "sss.gov.ph", "philhealth.gov.ph", "pagibigfund.gov.ph", "dilg.gov.ph"];
  const urls = [...requirements.map((r) => r.officialUrl), ...resources.map((r) => r.url)];
  for (const url of urls) {
    assert.ok(url.startsWith("https://"), `${url} is not https`);
    assert.ok(allowed.some((d) => url.includes(d)), `${url} is not a recognised .gov.ph host`);
  }
});

test("tutorials carry a category and an honest isPlaceholder label", () => {
  const validCategories = ["registration", "filing", "payment", "contribution", "renewal", "application"];
  for (const t of tutorials) {
    assert.ok(validCategories.includes(t.category), `${t.id} has an unrecognized category: ${t.category}`);
    assert.strictEqual(typeof t.isPlaceholder, "boolean", `${t.id} isPlaceholder must be a boolean`);
    assert.ok(t.videoUrl, `${t.id} has no videoUrl`);
  }
});

test("resources carry a lastVerified date and a valid resourceType", () => {
  const validTypes = ["form", "guide", "tutorial", "official_website", "requirement", "document"];
  for (const r of resources) {
    assert.ok(validTypes.includes(r.resourceType), `${r.id} has an unrecognized resourceType: ${r.resourceType}`);
    assert.match(r.lastVerified, /^\d{4}-\d{2}-\d{2}$/, `${r.id} bad lastVerified`);
  }
});
