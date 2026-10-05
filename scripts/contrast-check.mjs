#!/usr/bin/env node
/**
 * CONTRAST CHECK (T6, D3)
 * ────────────────────────
 * Computes real WCAG relative-luminance contrast ratios for every
 * text/background pair actually used in styles/globals.css, instead of
 * eyeballing it. Run with `npm run contrast-check`; output is also saved
 * to docs/CONTRAST_REPORT.md by this script.
 *
 * Pairs are hand-listed below (matching the color tokens in globals.css)
 * rather than parsed from the CSS automatically — the app's palette is
 * small and stable, and an explicit list is easier to audit than a CSS
 * parser that could silently miss a rule.
 */

function luminance([r, g, b]) {
  const c = (v) => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * c(r) + 0.7152 * c(g) + 0.0722 * c(b);
}

function contrast(a, b) {
  const la = luminance(a);
  const lb = luminance(b);
  const [hi, lo] = la > lb ? [la, lb] : [lb, la];
  return (hi + 0.05) / (lo + 0.05);
}

function blend(fg, bg, alpha) {
  return fg.map((c, i) => Math.round(c * alpha + bg[i] * (1 - alpha)));
}

const white = [255, 255, 255];
const sand = [247, 250, 246];
const ink = [16, 37, 29];
const green = [20, 93, 45];
const greenDeep = [9, 47, 34];
const inkMuted = blend(ink, sand, 0.64);
const inkFaint = blend(ink, sand, 0.66);

// Threshold: 4.5:1 for normal text, 3:1 for large text / UI boundaries.
// Design-kit pairs (styles/kits.css). Night Shift values mirror html[data-theme="night"].
const nightCanvas = [21, 25, 23];
const nightPanel = [32, 39, 32];
const nightInk = [245, 247, 243];
const lime = [160, 237, 89];
const limeText = [196, 242, 143];
const limeOnTint = [43, 58, 37];
const darkOnLime = [16, 34, 24];
const kitCanvas = [237, 241, 234];
const navOnFg = [15, 74, 38];
const navOnBg = [228, 241, 225];

const pairs = [
  { name: "White text on --gn-green (primary button)", fg: white, bg: green, minimum: 4.5 },
  { name: "White text on --gn-green-deep (button hover/press)", fg: white, bg: greenDeep, minimum: 4.5 },
  { name: "--ink on --gn-sand (body text)", fg: ink, bg: sand, minimum: 4.5 },
  { name: "--ink-muted on --gn-sand", fg: inkMuted, bg: sand, minimum: 4.5 },
  { name: "--ink-faint on --gn-sand", fg: inkFaint, bg: sand, minimum: 4.5 },
  { name: "--teal-text on white (badge)", fg: [14, 122, 108], bg: white, minimum: 4.5 },
  { name: "--amber-text on white (badge)", fg: [122, 83, 22], bg: white, minimum: 4.5 },
  { name: "--red-text (clay) on white (badge)", fg: [165, 82, 42], bg: white, minimum: 4.5 },
  { name: "--gn-clay-deep on white (due-today badge)", fg: [165, 82, 42], bg: white, minimum: 4.5 },
  { name: "--blue-text (slate) on white (badge)", fg: [47, 79, 116], bg: white, minimum: 4.5 },
  { name: "--violet-text on white (Premium)", fg: [92, 52, 184], bg: white, minimum: 4.5 },
  { name: "--gn-green as focus-visible outline on --gn-sand (UI boundary)", fg: green, bg: sand, minimum: 3 },
  { name: "--solid-border on white (card/input boundary)", fg: blend(ink, white, 0.5), bg: white, minimum: 3 },
  // Design kits — light
  { name: "Kit: active nav text on active nav background", fg: navOnFg, bg: navOnBg, minimum: 4.5 },
  { name: "Kit: --ink on Growth Ledger canvas", fg: ink, bg: kitCanvas, minimum: 4.5 },
  { name: "Kit: --ink-muted on Growth Ledger canvas", fg: blend(ink, kitCanvas, 0.64), bg: kitCanvas, minimum: 4.5 },
  { name: "Kit: --ink-muted on white panel", fg: blend(ink, white, 0.64), bg: white, minimum: 4.5 },
  // Night Shift
  { name: "Night: body text on canvas", fg: nightInk, bg: nightCanvas, minimum: 4.5 },
  { name: "Night: muted text on canvas", fg: blend(nightInk, nightCanvas, 0.76), bg: nightCanvas, minimum: 4.5 },
  { name: "Night: muted text on panel", fg: blend(nightInk, nightPanel, 0.76), bg: nightPanel, minimum: 4.5 },
  { name: "Night: dark text on lime (primary button, progress card)", fg: darkOnLime, bg: lime, minimum: 4.5 },
  { name: "Night: lime accent text on canvas", fg: lime, bg: nightCanvas, minimum: 4.5 },
  { name: "Night: lime accent text on panel", fg: lime, bg: nightPanel, minimum: 4.5 },
  { name: "Night: active nav text on active nav background", fg: limeText, bg: limeOnTint, minimum: 4.5 },
  { name: "Night: input/card boundary on panel (UI boundary)", fg: blend(nightInk, nightPanel, 0.46), bg: nightPanel, minimum: 3 },
  { name: "Night: lime focus/selected outline on canvas (UI boundary)", fg: lime, bg: nightCanvas, minimum: 3 },
];

// Tinted status badges, read straight from styles/globals.css so the check
// can never drift from the real rules. Each badge is text on a translucent
// tint, so it is measured on both surfaces it appears on (white cards, sand page).
// (Previously only the text color on plain white was tested, which let the
// Overdue / Completed badges ship at 4.3:1.)
import { readFileSync } from "node:fs";
const css = readFileSync(new URL("../styles/globals.css", import.meta.url), "utf8");
const rootVars = {};
for (const m of css.matchAll(/(--[\w-]+):\s*(#[0-9a-fA-F]{6})\b/g)) rootVars[m[1]] = m[2];
const hex = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
const badgeRules = [...css.matchAll(/\.badge-(\w+)\s*\{[^}]*?background:\s*rgba\(([^)]+)\)[^}]*?color:\s*var\((--[\w-]+)\)/g)];
if (badgeRules.length < 5) {
  console.error(`Expected 5 tinted .badge-* rules in styles/globals.css, found ${badgeRules.length}.`);
  process.exit(1);
}
for (const [, status, rgba, token] of badgeRules) {
  const [r, g, b, a] = rgba.split(",").map((v) => parseFloat(v));
  if (!rootVars[token]) { console.error(`Unresolved token ${token} for .badge-${status}`); process.exit(1); }
  for (const [surfaceName, surface] of [["white card", white], ["sand page", sand]]) {
    pairs.push({
      name: `Badge .badge-${status}: ${token} on its ${a} tint over ${surfaceName}`,
      fg: hex(rootVars[token]),
      bg: blend([r, g, b], surface, a),
      minimum: 4.5,
    });
  }
}
// Dashboard hero progress label (white) on the card and on the bar track.
pairs.push({ name: "Hero progress label (white) on hero card", fg: white, bg: hex("#092f22"), minimum: 4.5 });
const trackMatch = css.match(/\.v05-dash-hero \.progress-bar-track\s*\{\s*background:\s*(#[0-9a-fA-F]{6})/);
if (!trackMatch) { console.error("Could not find .v05-dash-hero .progress-bar-track background."); process.exit(1); }
pairs.push({ name: `Hero progress label (white) on bar track ${trackMatch[1]}`, fg: white, bg: hex(trackMatch[1]), minimum: 4.5 });

let failed = 0;
const rows = pairs.map((p) => {
  const ratio = contrast(p.fg, p.bg);
  const pass = ratio >= p.minimum;
  if (!pass) failed += 1;
  return { ...p, ratio, pass };
});

console.log("Contrast check (WCAG relative luminance)\n");
for (const r of rows) {
  const status = r.pass ? "PASS" : "FAIL";
  console.log(`[${status}] ${r.name}: ${r.ratio.toFixed(2)}:1 (min ${r.minimum}:1)`);
}

const reportLines = [
  "# Contrast Report",
  "",
  "Generated by `scripts/contrast-check.mjs` — computed with the WCAG relative-luminance formula, not eyeballed. Re-run with `npm run contrast-check` after any color token change.",
  "",
  "| Pair | Ratio | Minimum | Result |",
  "|---|---|---|---|",
  ...rows.map((r) => `| ${r.name} | ${r.ratio.toFixed(2)}:1 | ${r.minimum}:1 | ${r.pass ? "Pass" : "**FAIL**"} |`),
];

try {
  const fs = await import("node:fs");
  fs.mkdirSync("docs", { recursive: true });
  fs.writeFileSync("docs/CONTRAST_REPORT.md", reportLines.join("\n") + "\n");
  console.log("\nWrote docs/CONTRAST_REPORT.md");
} catch (err) {
  console.warn("Could not write docs/CONTRAST_REPORT.md:", err.message);
}

if (failed > 0) {
  console.error(`\n${failed} pair(s) failed the minimum contrast ratio.`);
  process.exit(1);
}
console.log(`\nAll ${rows.length} pairs pass.`);
