# GabayNegosyo — Design System v3 (Minimalism, brand-restored)

Supersedes an earlier "hybrid glass" direction (v2) that was rejected —
see §0. Built against the frontend constraints in the client-provided
`Before writing any UI For C.txt` (hard rules, not style suggestions);
every decision below is traceable to a specific rule in it.

## 0. Why v2 was rejected

A v2 draft existed that used blue→violet gradients on every primary
button, the brand mark, filter chips, and the page background (a
radial-gradient "aurora" mesh). That is precisely the "obviously
AI-generated" pattern the constraints doc rules out in §1 ("Purple-to-
blue gradient backgrounds"). It also shipped buttons with no real
interactive states beyond a static background — another explicit §1
violation ("hover fade only" — v2 had not even that).

v3 keeps v2's sound *structural* ideas (glass reserved for shell
surfaces only, solid cards for dense data, shape+color status badges,
serif numerals for money/dates) and replaces the color system and
button mechanics entirely.

## 1. Chosen design language: Minimalism

Per §3 of the constraints doc, restraint + one real accent color +
generous whitespace is "the safe default for content-heavy or
low-bandwidth/low-end-device audiences." That's this product's actual
audience: Philippine micro-entrepreneurs, largely on entry-level
Android hardware (the same reasoning the earlier "hybrid glass" v2
draft used to justify keeping dense screens glass-free — v3 extends
that same audience logic to the whole color system, not just blur
usage).

The one real accent color is the product's own established brand
green (`#2E5E4E`), not a generic SaaS blue/violet pairing.

## 2. Color tokens (current)

```css
--gn-green: #2e5e4e;      /* primary accent — the one real color */
--gn-green-deep: #1f4438; /* hover/active state */
--gn-clay: #c96a3a;       /* reserved for urgency (overdue) per brand spec */
--gn-clay-deep: #a5522a;
--gn-sand: #faf7f2;       /* page background — flat, no gradient/noise */

--gn-teal: #0e7a6c;       /* functional — "completed" only */
--gn-amber: #b3801f;      /* functional — "due soon" only */
--gn-slate-blue: #3b5f8a; /* functional — "upcoming" only */
--gn-violet: #6d3fd9;     /* isolated to Premium; never combined in a gradient */

--ink: #16211c;
--ink-muted: rgba(22, 33, 28, 0.64);
--ink-faint: rgba(22, 33, 28, 0.66); /* WCAG AA verified 4.5:1+ on --gn-sand */
```

No color is ever used decoratively. Status colors map to status only;
brand green is the only "personality" color, used for CTAs, active
states, and links.

**Contrast, verified (not eyeballed) with the WCAG relative-luminance
formula** — see the table below. Every text/background pair in active
use clears 4.5:1 (normal text) or better:

| Pair | Ratio |
|---|---|
| White text on `--gn-green` (primary button) | 7.43:1 |
| `--ink` on `--gn-sand` (body text) | 15.49:1 |
| `--ink-muted` on `--gn-sand` | 4.88:1 |
| `--ink-faint` on `--gn-sand` | 5.18:1 |
| `--teal-text` on white (badge) | 5.23:1 |
| `--amber-text` on white (badge) | 6.83:1 |
| `--red-text` (clay) on white (badge) | 5.47:1 |
| `--blue-text` (slate) on white (badge) | 8.43:1 |
| `--violet-text` on white (Premium) | 7.96:1 |

An earlier `--ink-faint` value (46% opacity) measured 2.85:1 and was
raised before shipping — flagged here so the next person touching
this file re-checks contrast before lowering opacity again, rather
than eyeballing it.

## 3. Typography

| Style | Font | Use |
|---|---|---|
| Display | Space Grotesk, 500–600 | Greetings, page titles, card headers |
| Body | Inter, 400–500 | Instructions, explanations, UI text |
| Numeral (money/dates) | Georgia (serif) | Peso amounts, deadline dates — the one deliberate serif accent |

This is explicitly **not** the Space Grotesk + Instrument Serif pairing
the constraints doc names as its own cliché (§1) — the serif accent
here is Georgia, used only for numerals, not display type. Two weights
per font, sentence case everywhere including buttons and badges.

## 4. Where glass vs. solid applies

| Glass (shell) | Solid (dense data) |
|---|---|
| Navbars (public/desktop/mobile/admin) | Requirement rows/cards |
| Premium upsell card | Checklist items, resource/tutorial cards |
| | Wizard question cards |
| | Requirement detail sections |
| | Admin CRUD tables/forms |

Per §1 of the constraints doc ("Glassmorphism applied indiscriminately
to every card... is not a default for every container"), glass is
scoped to shell surfaces only, using a neutral frosted-sand tint (not
a colored/tinted blur) — no glass on any dense data screen.

## 5. Status badge system

Unchanged from earlier drafts (this part was already correct): color
paired with a distinct shape via CSS `content`, so meaning never rests
on color alone.

| Status | Text color | Shape |
|---|---|---|
| Completed | `--teal-text` | check (✓) |
| Due soon | `--amber-text` | filled circle |
| Overdue | `--red-text` (clay) | warning triangle |
| Upcoming | `--blue-text` (slate) | filled square |
| Premium | `--violet-text` | lock (gate cards, not a badge state) |

## 6. Interactive states (§1 compliance)

Every interactive element in this system has four real states, not
just a hover fade:

- **Default**
- **Hover** — background darkens (buttons) or border strengthens (cards/chips)
- **Active/press** — `translateY(1px) scale(0.99)` + darker background, so pressing something is visibly felt
- **Focus-visible** — a real 2px outline in brand green, global, not per-component
- **Disabled** — desaturated background, `cursor: not-allowed`, no press transform
- **Loading** (primary buttons only, via `.is-loading`) — text hides, a spinner renders in its place

## 7. Spacing scale

4px base unit, held consistently: `--space-1` (4px) through `--space-8`
(64px), defined as CSS custom properties in `:root`. New components
should reference these tokens rather than eyeballing margins (§1).

## 8. What to avoid (carried forward, still binding)

- No gradients anywhere in this system — not on buttons, not on
  backgrounds, not on the brand mark. This was the single biggest
  violation in the rejected v2 draft; treat any gradient reintroduced
  later as a regression, not a style choice.
- No blur/glass on dense data screens.
- No literal government seals, emblems, or agency logos — neutral tags
  + text labels only.
- Don't let Premium violet leak into free-tier UI.
- No icon-font/icon-library dependency was added — status shapes are
  pure CSS `content`, keeping bundle size down for low-end devices.

## 9. Production-readiness pass (§2 of the constraints doc)

Addressed this round: custom 404 page (`app/not-found.tsx`), per-page
metadata + Open Graph image + favicon set (`app/layout.tsx`,
`public/favicon.ico`, `public/icons/og-image.png`), `robots.txt` and a
dynamic `sitemap.ts`, real button loading/error states, alt text on
existing images.

**Explicitly out of scope this round** (this is a client-demo
prototype with a localStorage-backed demo auth layer, not a deployed
service — see `PROGRESS.md`): analytics installation, rate limiting,
server-side input validation beyond what the demo service layer
already does, DB indexing/scale planning, error tracking/monitoring,
and backup/rollback strategy. These all assume a real backend and
production deployment that don't exist yet in this prototype; listing
them here rather than faking them is intentional, per the same
"don't invent" principle applied to the earlier content migration.
The placeholder domain `gabaynegosyo.example` used in `sitemap.ts`,
`robots.txt`, and Open Graph metadata needs to be replaced with the
real production domain at deploy time.
