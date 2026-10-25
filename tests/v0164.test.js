// v0.16.4 — tax table reference, checklist hierarchy, learning hub links, reminder test-send honesty,
// new-tab Premium checkout, BIR form previews, YouTube ownership note, admin instructions.
const test = require("node:test");
const assert = require("node:assert");
const fs = require("node:fs");
const path = require("node:path");
const { pathToFileURL } = require("node:url");

const read = (p) => fs.readFileSync(path.join(__dirname, "..", p), "utf8");
const json = (p) => JSON.parse(read(p));
const canImportTs = Boolean(process.features && process.features.typescript);
const opts = { skip: canImportTs ? false : "needs Node with TypeScript type stripping (22.18+)" };
const load = (p) => import(pathToFileURL(path.join(__dirname, "..", p)).href);

test("tax table brackets are contiguous and 'plus' amounts match the tax at each boundary", () => {
  const table = json("data/taxTable.json");
  assert.strictEqual(table[0].over, 0);
  assert.strictEqual(table[table.length - 1].notOver, null, "top bracket is open-ended");
  for (let i = 1; i < table.length; i++) {
    const prev = table[i - 1];
    const cur = table[i];
    assert.strictEqual(cur.over, prev.notOver, `bracket ${i} starts where bracket ${i - 1} ends`);
    const taxAtBoundary = prev.plus + prev.rate * (cur.over - prev.over);
    assert.strictEqual(Math.round(cur.plus), Math.round(taxAtBoundary), `plus amount for bracket ${i} matches the tax carried from the bracket below`);
  }
});

test("tax table component formats pesos deterministically", opts, async () => {
  const { peso } = await load("lib/money.ts");
  assert.strictEqual(peso(0), "₱0");
  assert.strictEqual(peso(250000), "₱250,000");
  assert.strictEqual(peso(2202500), "₱2,202,500");
});

test("registration page shows the tax tables reference", () => {
  const page = read("app/registration/page.tsx");
  assert.ok(page.includes("TaxTableReference"), "registration renders the tax table reference");
  assert.ok(read("components/TaxTableReference.tsx").includes("taxTable.json"), "the reference reads data/taxTable.json");
});

test("every requirement tutorialId resolves to a tutorial, and verified tutorials carry a YouTube video id", () => {
  const requirements = json("data/requirements.json");
  const tutorials = json("data/tutorials.json");
  const ids = new Set(tutorials.map((t) => t.id));
  for (const r of requirements) {
    if (r.tutorialId) assert.ok(ids.has(r.tutorialId), `${r.id} points to missing tutorial ${r.tutorialId}`);
  }
  for (const t of tutorials) {
    if (!t.isPlaceholder) {
      assert.match(t.videoUrl, /(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|shorts\/))[\w-]{11}/, `${t.id} is marked verified but has no YouTube video id`);
    }
  }
});

test("checklist separates To do from Completed and nests stages under them", () => {
  const page = read("app/checklist/page.tsx");
  assert.ok(page.includes("openItems") && page.includes("doneItems"), "items are split into open and completed lists");
  assert.ok(page.includes("To do") && page.includes("Completed"), "both sections are labelled");
  assert.ok(page.includes("renderStageGroups(openItems)") && page.includes("renderStageGroups(doneItems)"), "each section is grouped by stage");
  assert.ok(!/<h2>\{stage\}<\/h2>/.test(page), "stage headings are no longer top-level h2");
});

test("Learning hub intro no longer claims a guide for every requirement", () => {
  const page = read("app/tutorials/page.tsx");
  assert.ok(!page.includes("for every requirement"), "the over-claiming intro is gone");
  assert.ok(page.includes("CTTO"), "the hub credits video owners");
});

test("Renewal & Post-Registration videos carry the ownership and CTTO notice", () => {
  const videos = read("components/FilingTutorialVideos.tsx");
  assert.ok(videos.includes("We do not own these YouTube videos"), "ownership notice present");
  assert.ok(videos.includes("CTTO"), "CTTO credit present");
  assert.ok(read("app/renewal/page.tsx").includes("FilingTutorialVideos"), "renewal page renders the videos section");
});

test("PDF preview is limited to official BIR-hosted PDFs", opts, async () => {
  const { isPreviewablePdf } = await load("lib/pdfPreview.ts");
  assert.strictEqual(isPreviewablePdf("https://bir-cdn.bir.gov.ph/local/pdf/1701A%20Jan%202018%20v5%20with%20rates.pdf"), true);
  assert.strictEqual(isPreviewablePdf("https://www.bir.gov.ph/registration-requirements"), false, "web pages are not previewed");
  assert.strictEqual(isPreviewablePdf("http://bir-cdn.bir.gov.ph/local/pdf/x.pdf"), false, "http is not previewed");
  assert.strictEqual(isPreviewablePdf("https://evil.example.com/x.pdf"), false, "other hosts are not previewed");
  assert.strictEqual(isPreviewablePdf(undefined), false);
});

test("BIR forms page offers previews for its forms", () => {
  const page = read("app/bir-forms/page.tsx");
  assert.ok(page.includes("PdfPreviewButton"), "BIR forms page renders preview buttons");
  const count = (page.match(/<PdfPreviewButton/g) || []).length;
  assert.ok(count >= 3, `expected preview buttons for conditions, requirements and the forms list (found ${count})`);
});

test("send-email route sends through the same provider as the digest, and reports mode honestly", () => {
  const route = read("app/api/send-email/route.ts");
  assert.ok(route.includes("sendMail") && route.includes("mailerConfigured"), "route uses lib/mailer.ts");
  assert.ok(!route.includes("api.resend.com"), "route no longer calls Resend directly");
  assert.ok(route.includes('mode: "sent"') && route.includes('mode: "mock"'), "route reports whether anything was sent");
});

test("client send result exposes mode, and the reminder page does not claim a send that did not happen", () => {
  const email = read("lib/email.ts");
  assert.ok(email.includes("mode: result.mode === \"sent\""), "client maps the server mode");
  const deadlines = read("app/deadlines/page.tsx");
  assert.ok(deadlines.includes('result.mode === "sent"'), "success message only when the provider accepted the email");
  assert.ok(deadlines.includes("No email was sent"), "non-sent case says so");
});

test("Premium checkout opens in a new tab, collects no payment details, and is labelled as not connected", () => {
  const account = read("app/account/page.tsx");
  assert.ok(account.includes('href="/premium/checkout"') && account.includes('target="_blank"'), "account upgrade opens checkout in a new tab");
  assert.ok(!account.includes("handleUpgrade"), "account no longer runs the inline demo upgrade");
  const checkout = read("app/premium/checkout/page.tsx");
  assert.ok(!/cvv|card number|cardnumber|expiry|gcash|maya|bank account/i.test(checkout), "checkout must not collect payment details");
  assert.ok(checkout.includes("Payments are not connected yet"), "checkout states payments are not connected");
  assert.ok(checkout.includes("no payment") || checkout.includes("takes no payment") || checkout.includes("Nothing is charged"), "checkout says nothing is charged");
});

test("every admin editor shows numbered instructions and warnings", () => {
  for (const p of ["app/admin/agencies/page.tsx", "app/admin/requirements/page.tsx", "app/admin/resources/page.tsx", "app/admin/tutorials/page.tsx", "app/admin/users/page.tsx", "app/admin/page.tsx"]) {
    const src = read(p);
    assert.ok(src.includes("AdminHelp"), `${p} uses AdminHelp`);
    assert.ok(src.includes("steps={["), `${p} gives numbered steps`);
  }
});

test("admin archive confirmations explain that user-added items are deleted", () => {
  for (const p of ["app/admin/resources/page.tsx", "app/admin/tutorials/page.tsx"]) {
    assert.ok(read(p).includes("deleted permanently"), `${p} warns before archive/delete`);
  }
});
