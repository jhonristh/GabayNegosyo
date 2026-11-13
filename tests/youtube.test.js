const test = require("node:test");
const assert = require("node:assert/strict");
const {pathToFileURL} = require("node:url");
const path = require("node:path");
const load = () => import(pathToFileURL(path.resolve(__dirname, "../lib/youtube.ts")).href);
test("YouTube watch and share links preserve their start times", async () => {
  const {youtubeWatchUrl: watch} = await load();
  assert.equal(watch("https://youtu.be/zyjl55sUXHY?si=tracking"), "https://www.youtube.com/watch?v=zyjl55sUXHY");
  assert.equal(watch("https://www.youtube.com/watch?v=fid9IcKTKnY&t=43s"), "https://www.youtube.com/watch?v=fid9IcKTKnY&t=43");
});
test("YouTube parser rejects truncated IDs, longer IDs and spoofed hosts", async () => {
  const {youtubeWatchUrl: watch} = await load();
  for (const url of ["https://www.youtube.com/watch?v=-tESIU9ikc", "https://youtu.be/zyjl55sUXHYextra", "https://youtube.com.evil.example/watch?v=zyjl55sUXHY", "http://youtu.be/zyjl55sUXHY", "javascript:alert(1)"]) assert.equal(watch(url), null);
});
test("Published catalog contains the 13 unique supplied videos and no incomplete IDs", async () => {
  const {youtubeWatchUrl: watch} = await load();
  const catalog = require("../data/tutorials.json").filter(t => !t.archived && !t.isPlaceholder);
  assert.equal(catalog.length, 13);
  assert.equal(new Set(catalog.map(t => watch(t.videoUrl))).size, 13);
  for (const tutorial of catalog) assert.ok(watch(tutorial.videoUrl), tutorial.id);
  for (const agency of ["dti", "bir", "sss", "philhealth", "pagibig", "lgu"]) assert.ok(catalog.some(t => t.agencyId === agency), agency);
});
