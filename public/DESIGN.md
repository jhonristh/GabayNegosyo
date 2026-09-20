# GabayNegosyo — Design Codes (v2, hybrid glass/solid)

Supersedes the institutional/ledger version. Direction: **glassmorphism on
shell surfaces, solid high-contrast cards on dense data** — resolves the
tradeoff flagged in the design migration prompt: full glass looks strong on
hero/marketing surfaces but loses legibility and gets performance-heavy on
long lists and forms, on the low-end Android hardware this audience
primarily uses.

**Where each treatment applies:**
| Glass (shell) | Solid (dense data) |
|---|---|
| Navbars (public/desktop/mobile/admin) | Requirement rows/cards |
| Dashboard hero/profile card | Checklist items, resource/tutorial cards |
| Quick actions | Wizard question cards |
| Premium upsell card | Requirement detail sections |
| Admin metric tiles | Admin CRUD tables/forms |

Implemented in `styles/globals.css`. Fonts loaded in `app/layout.tsx`.

---

## 1. Color tokens (current)

```css
--gn-blue:#4D7CFE;
--gn-violet:#8B5CF6;
--gn-teal:#2DD4BF;
--gn-amber:#FBBF61;
--gn-red:#FB7185;

--ink:#0F1729;
--ink-muted:rgba(15,23,41,0.62);
--ink-faint:rgba(15,23,41,0.46);

--glass-bg:rgba(255,255,255,0.55);
--glass-bg-strong:rgba(255,255,255,0.75);
--glass-border:rgba(255,255,255,0.6);

--solid-surface:#FFFFFF;
--solid-border:rgba(15,23,41,0.1);
```

Status → color mapping is unchanged from v1: Completed → teal, Due soon →
amber, Overdue → red, Upcoming → blue, Premium → violet. Color always maps
to status/role, never decoration.

**Accessible text-on-tint pairs** (used in badges, tags, icon chips — the
darkest stop from the same hue family, never black/gray on a colored chip):
`--teal-text:#0E7A6C`, `--amber-text:#8A5A1F`, `--red-text:#B03052`,
`--blue-text:#2E4FC4`, `--violet-text:#6D3FD9`.

---

## 2. Typography

| Style | Font | Use |
|---|---|---|
| Display | Space Grotesk, 500–600 | Greetings, page titles, card headers |
| Body | Inter, 400–500 | Instructions, explanations, UI text |
| Numeral (money/dates) | Georgia (serif) | Peso amounts, deadline dates — the one deliberate serif accent, unchanged from v1 |

Two weights per font only. Sentence case everywhere, including buttons and
badges.

---

## 3. Status badge system

Same five states everywhere: dashboard, requirement detail, resource
library, admin panel. Color is paired with a distinct shape via CSS
`content` (no icon-font dependency added) so meaning never rests on color
alone:

| Status | Background | Text | Shape |
|---|---|---|---|
| Completed | teal 18% | `--teal-text` | check (✓) |
| Due soon | amber 24% | `--amber-text` | filled circle |
| Overdue | red 18% | `--red-text` | warning triangle |
| Upcoming | blue 16% | `--blue-text` | filled square |
| Premium | violet family | `--violet-text` | lock (gate cards, not a badge state) |

---

## 4. Core components

**Dashboard hero/profile card** — GLASS. Business name + structure/type
tags, gradient progress bar, next-deadline row in serif numerals.

**Requirement row/card** — SOLID. White surface, hairline border, agency
tag + name + serif due date + status badge. Reused in checklist, resource
library, tutorial hub, deadlines.

**Wizard stepper** — thin segmented bar (not numbered circles), gradient
fill (teal → blue) on completed/active steps, solid-border track otherwise.

**Requirement detail page** — SOLID sections. GabayNegosyo's own
explanation and official government content remain visually distinct per
the v1 product requirement — official/external links carry a muted
"external source" label, never styled as GabayNegosyo's own content.

**Penalty Simulator** — lives in the violet/premium family, GLASS gate
card when locked; SOLID input form once unlocked (it's a dense form).
Output amount in serif numerals with a persistent, non-dismissible
disclaimer line beneath.

**Reminder config** — toggle + radio group, gradient accent for the
active state, disabled/muted when not Premium.

---

## 5. States & accessibility

- Empty states: headline + one-line explanation + verb-first action.
- Errors: state what happened and what to do next, no raw error strings.
- Status meaning is paired with shape, not color alone (see §3).
- Minimum body text 14px on dense screens, 16px on marketing/shell copy;
  never below 11px anywhere.
- Backdrop-filter blur is contained to shell surfaces only — dense screens
  use solid surfaces specifically to protect performance and legibility
  on lower-end Android hardware, this audience's primary device class.

---

## 6. What to avoid

- No blur/glass on dense data screens (checklists, forms, admin tables) —
  this is the hybrid system's core rule, not a style preference.
- No dense terminal/monospace treatment outside the admin JSON editor,
  which is an intentionally technical, admin-only surface.
- No literal government seals, emblems, or agency logos reproduced
  directly — neutral tags + text labels only.
- Don't let Premium violet leak into free-tier UI; it should read as a
  distinct, occasional accent, isolated to gated cards and the upgrade flow.
