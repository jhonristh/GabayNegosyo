#!/usr/bin/env node
import { readFileSync } from "node:fs";

/**
 * CONTRAST CHECK (T6, D3)
 * ────────────────────────
 * Computes real WCAG relative-luminance contrast ratios for every
 * text/background pair actually used in styles/globals.css, instead of
 * eyeballing it. Run with `npm run contrast-check`; output is also saved
 * to docs/CONTRAST_REPORT.md by this script.
 *
 * The pairs are listed explicitly. Night Shift palette values and status
 * badge declarations are read from the CSS to keep the checks current.
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
const sand = [248, 247, 242]; // Effective workspace canvas, styles/workspace.css
const ink = [16, 37, 29];
const green = [20, 93, 45];
const greenDeep = [9, 47, 34];
const inkMuted = blend(ink, sand, 0.64);
const inkFaint = blend(ink, sand, 0.66);

// Threshold: 4.5:1 for normal text, 3:1 for large text / UI boundaries.
const hex = (value) => [1, 3, 5].map((i) => parseInt(value.slice(i, i + 2), 16));
const kitsCss = readFileSync(new URL("../styles/kits.css", import.meta.url), "utf8");
const nightPalette = kitsCss.match(/html\[data-theme="night"\]\s*\{([^}]+)\}/)?.[1] ?? "";
const nightColors = new Map([...nightPalette.matchAll(/(--[\w-]+):\s*(#[0-9a-f]{6})\b/gi)].map(([, key, value]) => [key, hex(value)]));
function night(token) {
  const color = nightColors.get(token);
  if (!color) throw new Error("Missing Night Shift color " + token);
  return color;
}
const nightCanvas = night("--night-canvas");
const nightPanel = night("--night-panel");
const nightInk = night("--night-ink");
const nightMuted = night("--night-muted");
const mint = night("--night-mint");
const selected = night("--night-selected");
const kitCanvas = [237, 241, 234];
const navOnFg = [15, 74, 38];
const navOnBg = [228, 241, 225];

const pairs = [
  { name: "Workspace: body text on cream", fg: [24,61,48], bg: [248,247,242], minimum: 4.5 },
  { name: "Workspace: muted text on soft green", fg: [82,102,91], bg: [237,242,233], minimum: 4.5 },
  { name: "Workspace: gold label on cream", fg: [137,97,25], bg: [248,247,242], minimum: 4.5 },
  { name: "White text on --gn-green (primary button)", fg: white, bg: green, minimum: 4.5 },
  { name: "White text on --gn-green-deep (button hover/press)", fg: white, bg: greenDeep, minimum: 4.5 },
  { name: "--ink on --gn-sand (body text)", fg: ink, bg: sand, minimum: 4.5 },
  { name: "--ink-muted on --gn-sand", fg: inkMuted, bg: sand, minimum: 4.5 },
  { name: "--ink-faint on --gn-sand", fg: inkFaint, bg: sand, minimum: 4.5 },
  { name: "--teal-text on white (badge)", fg: [13, 116, 103], bg: white, minimum: 4.5 },
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
  { name: "Night: muted text on canvas", fg: nightMuted, bg: nightCanvas, minimum: 4.5 },
  { name: "Night: muted text on raised surface", fg: nightMuted, bg: night("--night-raised"), minimum: 4.5 },
  { name: "Night: input placeholder on rail", fg: night("--night-faint"), bg: night("--night-rail"), minimum: 4.5 },
  { name: "Night: primary action label", fg: night("--night-on-mint"), bg: mint, minimum: 4.5 },
  { name: "Night: mint text on panel", fg: mint, bg: nightPanel, minimum: 4.5 },
  { name: "Night: selected control label", fg: night("--night-mint-hover"), bg: selected, minimum: 4.5 },
  { name: "Night: input border on panel", fg: night("--night-control-line"), bg: nightPanel, minimum: 3 },
  { name: "Night: focus ring on raised surface", fg: mint, bg: night("--night-raised"), minimum: 3 },
  { name: "Night: error text", fg: night("--gn-clay-deep"), bg: night("--night-danger-bg"), minimum: 4.5 },
  { name: "Night: warning text", fg: night("--night-gold"), bg: night("--night-warning-bg"), minimum: 4.5 },
  { name: "Night: progress label on track", fg: nightInk, bg: night("--night-line"), minimum: 4.5 },
];

// Tinted status badges, read straight from styles/globals.css so the check
// can never drift from the real rules. Each badge is text on a translucent
// tint, so it is measured on both surfaces it appears on (white cards, sand page).
// (Previously only the text color on plain white was tested, which let the
// Overdue / Completed badges ship at 4.3:1.)
const css = readFileSync(new URL("../styles/globals.css", import.meta.url), "utf8");
const rootVars = {};
for (const m of css.matchAll(/(--[\w-]+):\s*(#[0-9a-fA-F]{6})\b/g)) rootVars[m[1]] = m[2];
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
