# Design system

The single reference for how GabayNegosyo looks and why. For rules about what contributors may change, see [AGENTS.md](../AGENTS.md).

## 1. Principles

- **Minimalism with one real accent.** Restraint, whitespace and the product's own green. The audience is Philippine micro-entrepreneurs, largely on entry-level Android phones, so dense screens stay solid and light.
- **No decorative gradients.** An early "hybrid glass" draft used blue-to-violet gradients on buttons, the brand mark, chips and the page background, and shipped buttons with no real states. It was rejected against the client's frontend constraints. Treat any gradient reintroduced later as a regression.
- **Glass for shell, solid for data.** Frosted surfaces only on navbars, the Premium upsell card, admin metric tiles and a few dashboard tiles. Requirement rows, checklist items, resource and tutorial cards, wizard questions, requirement detail sections and admin tables stay solid.
- **Meaning never rests on colour alone.** Status uses colour, a distinct shape and a text label. Progress and counts always print numbers.
- **No government seals or agency logos.** Neutral tags and text labels only. Premium styling does not leak into free-tier UI. No icon-font dependency: icons are inline SVG (`components/KitIcon.tsx`, `StatusIcon.tsx`) or CSS shapes.

## 2. Where tokens live

Stylesheets load in this order, each refining the one before: `styles/globals.css` → `styles/kits.css` → `styles/emerald.css`. The `:root` block at the top of `emerald.css` is the **source of truth** for colour, radius, shadow and motion tokens.

### Current palette (Emerald Growth, v0.14/v0.15)

| Token | Value | Use |
|---|---|---|
| `--gn-emerald` | `#064e3b` | Primary actions, nav, headings (`--gn-green` points here) |
| `--gn-green-deep` | `#04382b` | Hover and pressed states |
| `--gn-forest` | `#17352b` | Body text (`--ink`) |
| `--gn-lime` | `#84cc16` | Accent only: arrow, progress highlights, selected details |
| `--gn-mint` | `#e8f5ec` | Selected states, gentle panels (`--surface-soft`) |
| `--gn-canvas` | `#f5f8f5` | Page background |
| `--gn-muted` | `#52665c` | Secondary copy |
| `--gn-line` | `#d3e2d8` | Thin borders |
| `--gn-r-card` / `--gn-r-ctl` | 16px / 10px | Card and control radius |

Functional status colours keep their meaning and are used for status only: completed (teal), due soon (amber), overdue and urgent (clay `#c96a3a`), upcoming (slate blue), Premium (violet, isolated). Clay is reserved for urgency.

### Type, spacing, shape

- Space Grotesk for headings, Inter for interface and body (both bundled locally with Fontsource), Georgia for peso amounts and dates only. Sentence case everywhere. Tabular figures for progress and dates.
- 4px spacing scale as CSS custom properties (`--space-1` 4px through `--space-8` 64px). Use the tokens, not eyeballed margins. Editorial screens max out at 1240px; reading-heavy screens stay narrow.
- Radius 14–20px for controls and cards, 26–28px for large feature surfaces. Shadows come from `--gn-shadow`, `--v06-shadow-rest` and `--v06-shadow-hover`; reserve deep shadows for the PDF dialog. Cards move at most 3px on hover.

## 3. Components

- **Buttons.** Primary is emerald with white text; secondary is a white surface with a border. Every interactive element has default, hover, pressed (`translateY(1px) scale(0.99)`), a global 2px `:focus-visible` outline, disabled and (primary only) loading (`.is-loading`) states. Navigation links lead to real routes or anchors.
- **Status badges.** Completed ✓ (teal), Due soon ● (amber), Overdue ▲ (clay), Upcoming ■ (slate), plus **No fixed date** for items without a calendar date. Tints were lightened so Overdue, Completed and Due today clear 4.5:1 on white and sand.
- **Requirement cards** are linked rows; status information always has text.
- **Lifecycle stepper.** States are *completed* (check, "Visited stage"), *current* (filled number, "You are here", mint panel, ring) and *upcoming* ("Next stages"), always stated in text.
- **Hero.** The growth arrow (`public/images/gabaynegosyo-growth-arrow.webp`, PNG fallback in the same `<picture>`) lives inside `.gn-hero-art`, never as a direct child of `.gn-hero`, so it cannot sit under the headline or CTAs. At 859px and below it becomes its own block above the roadmap card.
- **Auth.** `.auth-shell` is a two-panel layout from 900px (emerald brand panel plus form card); on phones the brand panel collapses to a slim banner. `PasswordField` provides the show/hide control (44px target, `aria-pressed`, label switches between "Show password" and "Hide password") on Log in, Sign up and Reset password.
- **Legal and credits.** `components/LegalPage.tsx` is the only layout for Terms, Privacy and Disclaimer (hero with three key points, sticky "On this page" list that becomes a chip row on phones, numbered section cards, one `tone: "key"` card per page). It adds no wording of its own. `/credits` reads `data/credits.json`.
- **Footer.** Brand block plus Explore and Legal columns; Credits links to `/credits`.
- **Penalty simulator.** `.penalty-sim` is a two-column grid from 960px (inputs left, sticky estimate right); below that the result stacks under the inputs.
- **Forms and media.** Form graphics are abstract document representations, not thumbnails of real forms. Only verified direct PDF URLs on `bir-cdn.bir.gov.ph` open the inline PDF dialog (`FormPreviewCard`, `PdfPreviewButton`). Video previews need direct video IDs; placeholder searches show an unavailable state.
- **Checklist and calendar.** The progress ring pairs colour with numeric text and clickable filter labels. The deadline calendar is a seven-column grid of individually labelled buttons. Account and plan cards collapse to one column below 700px.

## 4. Design-kit layer (v0.11)

Five kits from the design package are applied as a presentation layer in `styles/kits.css`. The original static prototypes stay untouched in `docs/design-kits-reference/` (open `index.html`) for visual comparison; their figures were illustrative and **nothing from them ships as data**.

| Kit | Used for | Code |
|---|---|---|
| Regulatory Atlas | Signed-out header, landing hero mosaic, numbered feature cards | `Navbar.tsx` (public branch), `app/page.tsx` |
| Growth Ledger | Signed-in Free/Premium desktop shell, dashboard panels | `Navbar.tsx` (sidebar), `app/dashboard/page.tsx`, `AgencyProgress.tsx` |
| Command Desk | Admin shell (icon rail and menu), review queue | `Navbar.tsx` (admin branch), `app/admin/page.tsx` |
| Pocket Guide | Phone bottom bar, checklist progress card, account cards | `Navbar.tsx` (`navbar-mobile`), `app/checklist`, `app/account` |
| Night Shift | Optional high-contrast theme | `lib/theme.ts`, `ThemeControls.tsx` |

How it is wired:

- `app/layout.tsx` imports `kits.css` after `globals.css`; the kit layer refines existing rules rather than replacing them.
- `ClientProviders.tsx` wraps pages in `.kit-shell--public | --ledger | --command` by signed-in role. This only selects layout. **Access control is unchanged:** `AuthGuard`, `AdminGuard` and Supabase RLS decide who sees what.
- Below 860px the sidebar and admin rails hide and the mobile patterns return (brand header plus bottom bar; scrolling admin bar).
- In the app the prototype's `#gn-kits` scope became regular `kit-*` classes and inline SVG icons.
- The signed-in sidebar spans grid rows 1–2 and the demo banner sits in the content column, so the sidebar always starts at the top of the window. `.kit-side-nav` scrolls independently; `.kit-side-foot` (theme toggle) is pinned. Phones use the toggle in `.mobile-brand-head`.

Real data versus prototype content: checklist % and "Up next" come from the rule engine via `db`; progress by agency from `buildAgencyProgress` (each bar prints `done/total`, empty agencies show "None"); "Where things stand" from computed status counts; the admin review queue from `requirementContentStatus`, `tutorial.isPlaceholder` and `isResourceStale` (`lib/contentHealth.ts`, first 8 shown plus a count); the landing mosaic is static copy labelled "Illustrative product preview".

## 5. Night Shift

- `<html data-theme="light|night">` is the only switch. Preference (`light | night | system`) lives in `localStorage["gn-theme"]`; nothing goes to Supabase. New visitors get **light**; bad or blocked storage falls back to light.
- `THEME_INIT_SCRIPT` runs in `<head>` before first paint to avoid a white flash, so `<html>` carries `suppressHydrationWarning`.
- Night Shift remaps tokens under `html[data-theme="night"]` (black canvas, lime accent, lime always paired with dark text). That selector out-specifies `:root`, so **any rule that must change with the theme has to use a token** (`--kit-panel`, `--kit-line`, `--surface-soft`, `--gn-green`, `--gn-green-deep`, `--ink`, `--solid-surface`) rather than a literal colour. Hard-coded `#fff` or `--gn-emerald` text is the usual cause of unreadable Night Shift panels. Note `--kit-mint` does **not** remap; use `--surface-soft` for mint panels.
- If a rule truly needs a literal light colour, add a `html[data-theme="night"]` override in `kits.css`.

## 6. Branding

- The square logo JPEG is the canonical full logo: `public/icons/gabaynegosyo-logo.jpg`. The navigation and hero use a faithfully derived emblem, `public/icons/gabaynegosyo-emblem-master.png`, with plain text for legibility at small sizes. Do not trace or redraw the wordmark, substitute another pictogram or revive the old generic "G" tile.
- The favicon, install icons, social preview and footer reflect the logo. The JPEG has a white background, so place the full logo on white in both themes rather than removing the background in CSS. A client-supplied vector or transparent master is needed for pixel-perfect mark-only assets.
- Earlier palettes (green `#2e5e4e` / sand `#faf7f2`, then forest `#145d2d` / `#092f22`) are superseded by Emerald Growth above.

## 7. Responsive and accessibility

- At 859px, hero and summary columns stack and the authenticated bottom navigation takes over. At 520px, hero actions fill the width and quick actions form a compact grid. At 390px nothing may scroll horizontally.
- Keep comfortable tap targets, visible keyboard focus and `prefers-reduced-motion` support (every new transition must disable under it). Never block zoom: the viewport has no `maximumScale`.
- Contrast is verified, not eyeballed. `npm run contrast-check` applies the WCAG relative-luminance formula to the token pairs, the Night Shift pairs and the real `.badge-*` rules and hero progress track parsed from `styles/globals.css`, and rewrites [CONTRAST_REPORT.md](CONTRAST_REPORT.md). Re-run it after any token change; it fails if a stronger tint would drop below 4.5:1 (3:1 for UI boundaries). History: `--ink-faint` at 46% opacity measured 2.85:1 and was raised; the dashboard hero progress track was darkened from `#668a7a` to `#3f6655` (white label 3.9 to 6.5:1).

## 8. Known follow-ups

- `.v05-preview*` rules in `globals.css` are unused by the landing page; remove when convenient.
- The dashboard "Completed" list and "Quick actions" keep v0.5 styling. Pages not redesigned (wizard, guide, resources, tutorials, deadlines, requirement detail) inherit the shell and Night Shift colours only.
- Not reviewed: Learning Hub layout against the reference, and admin pages in Night Shift.
- React hydration error #418 was seen on the landing page in an early stubbed environment; later builds fixed one cause (dynamic env reads, see ARCHITECTURE.md). Verify against a real deployment.
