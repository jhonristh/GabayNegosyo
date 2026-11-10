const test = require("node:test");
const assert = require("node:assert/strict");
const {pathToFileURL} = require("node:url");
const path = require("node:path");
const load = () => import(pathToFileURL(path.resolve(__dirname, "../lib/youtube.ts")).href);
test("YouTube watch and share links preserve their start times", async () => {
  const {youtubeEmbedUrl: embed} = await load();
  assert.equal(embed("https://youtu.be/zyjl55sUXHY?si=tracking"), "https://www.youtube-nocookie.com/embed/zyjl55sUXHY?playsinline=1&rel=0");
  assert.equal(embed("https://www.youtube.com/watch?v=fid9IcKTKnY&t=43s"), "https://www.youtube-nocookie.com/embed/fid9IcKTKnY?playsinline=1&rel=0&start=43");
});
test("YouTube parser rejects truncated IDs, longer IDs and spoofed hosts", async () => {
  const {youtubeEmbedUrl: embed} = await load();
  for (const url of ["https://www.youtube.com/watch?v=-tESIU9ikc", "https://youtu.be/zyjl55sUXHYextra", "https://youtube.com.evil.example/watch?v=zyjl55sUXHY", "http://youtu.be/zyjl55sUXHY", "javascript:alert(1)"]) assert.equal(embed(url), null);
});
test("Published catalog contains the 13 unique supplied videos and no incomplete IDs", async () => {
  const {youtubeEmbedUrl: embed} = await load();
  const catalog = require("../data/tutorials.json").filter(t => !t.archived && !t.isPlaceholder);
  assert.equal(catalog.length, 13);
  assert.equal(new Set(catalog.map(t => embed(t.videoUrl))).size, 13);
  for (const tutorial of catalog) assert.ok(embed(tutorial.videoUrl), tutorial.id);
  for (const agency of ["dti", "bir", "sss", "philhealth", "pagibig", "lgu"]) assert.ok(catalog.some(t => t.agencyId === agency), agency);
});
