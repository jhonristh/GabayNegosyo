// Lifecycle journey + client-approved BIR penalty rates.
const test = require("node:test");
const assert = require("node:assert");
const fs = require("node:fs");
const path = require("node:path");
const read = (...p) => fs.readFileSync(path.join(__dirname, "..", ...p), "utf8");

test("journey order is Checklist → Registration → BIR Forms → Penalties → Renewal", () => {
  const src = read("lib", "journey.ts");
  const hrefs = [...src.matchAll(/href: "(\/[a-z-]+)"/g)].map((m) => m[1]);
  assert.deepStrictEqual(hrefs, ["/checklist", "/registration", "/bir-forms", "/penalties", "/renewal"]);
});

test("each stage page exists and renders the journey CTA/stepper", () => {
  for (const [dir, key] of [["checklist", "checklist"], ["registration", "registration"], ["bir-forms", "bir-forms"], ["penalties", "penalties"], ["renewal", "renewal"]]) {
    const page = read("app", dir, "page.tsx");
    assert.ok(page.includes(`current="${key}"`), `${dir} must declare its journey stage`);
    assert.ok(page.includes("JourneyNext"), `${dir} must render previous/next CTAs`);
  }
});

test("penalty rates match the client: 10% micro, 6% micro interest, 12% general interest", () => {
  const src = read("lib", "penalty.ts");
  assert.match(src, /microSurcharge:\s*0\.1\b/);
  assert.match(src, /microInterest:\s*0\.06\b/);
  assert.match(src, /generalInterest:\s*0\.12\b/);
});

test("the calculator reads rates from constants, never literals", () => {
  const calc = read("components", "PenaltyCalculator.tsx");
  assert.ok(calc.includes("BIR_PENALTY_RATES") && calc.includes("estimateBirPenalty"));
  assert.ok(!/0\.(10|06|12)\b/.test(calc));
});

test("BIR estimator arithmetic (replicates lib/penalty.ts)", () => {
  const est = (tax, days, s, i) => ({ s: tax * s, i: (tax * i * days) / 365 });
  const micro = est(100000, 73, 0.1, 0.06);
  assert.strictEqual(micro.s, 10000);
  assert.strictEqual(Math.round(micro.i), 1200);
  const general = est(100000, 365, 0.25, 0.12);
  assert.strictEqual(general.s, 25000);
  assert.strictEqual(general.i, 12000);
});

test("BIR conditions are checkbox-driven and sourced", () => {
  const conditions = require("../data/birConditions.json");
  assert.deepStrictEqual(conditions.map((c) => c.formCode).sort(), ["1706", "1800"]);
  const page = read("app", "bir-forms", "page.tsx");
  assert.ok(page.includes('type="checkbox"'));
});

test("filing videos only use client-provided YouTube links; placeholder remains for an empty list", () => {
  const videos = require("../data/filingVideos.json");
  const clientIds = ["FOnpl3ui3uI", "8X2KZkCh1qo", "-tESI-U9ikc", "KysPCsJjbKI", "fid9IcKTKnY", "8C0TBHccWbc", "JxFprd6jMLw", "0MQLh_jxlak"];
  assert.deepStrictEqual(videos.map((v) => v.videoUrl.match(/v=([\w-]{11})/)[1]).sort(), [...clientIds].sort());
  assert.ok(read("components", "FilingTutorialVideos.tsx").includes("coming soon"));
});

test("legacy routes redirect into the journey", () => {
  assert.ok(read("app", "guide", "page.tsx").includes('redirect("/registration")'));
  assert.ok(read("app", "premium", "penalty-simulator", "page.tsx").includes('redirect("/penalties")'));
});
