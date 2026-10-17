# GabayNegosyo — Design System (v0.10)

## Visual direction
Cool off-white background, brand green identity, clean white content surfaces and restrained editorial typography. The landing page tells the story; the dashboard uses a wider two-column summary. Preserve readable, content-first treatment in forms and admin screens.

## Foundations
- Colors: `--gn-sand` #f7faf6; `--gn-green` #145d2d; `--gn-green-deep` #092f22; white surfaces; clay #c96a3a for limited accent. Functional status colors retain their semantic meaning.
- Type: Space Grotesk for headings, Inter for interface/body, tabular figures for progress and dates. Fonts are locally bundled with Fontsource.
- Spacing: 4, 8, 12, 16, 24, 32, 48, 64px tokens. The editorial screen max width is 1240px; content-heavy screens remain narrow where reading benefits.
- Radius: 14–20px for controls and cards; 26–28px for large feature surfaces.

## Components
Primary button: brand forest green with white text, visible hover/pressed/focus and disabled states. Secondary button: white surface with border. Navigation links lead to real routes or section anchors. Dashboard summary uses a dark progress panel and pale green next-item panel. Requirement cards remain linked rows; status information must use text in addition to color. Preview examples must be labeled illustrative.

## Responsive and accessibility
At 859px, hero and summary columns stack; the authenticated bottom navigation takes over. At 520px, hero actions fill width and quick actions form a compact grid. Keep tap targets comfortable, avoid horizontal overflow, preserve visible keyboard focus, support reduced motion and never remove zoom. The existing contrast-check script is the starting gate for token changes.

## v0.6 surfaces and media
Use the current cool-white/brand-green tokens. `--v06-shadow-rest` and `--v06-shadow-hover` define card elevation; reserve deeper shadows for the native PDF dialog. Cards move at most 3px on hover; all new transitions disable under `prefers-reduced-motion`. Form graphics are abstract document representations, not thumbnails of actual forms. Only verified direct PDF URLs from the existing resource data open the inline PDF viewer. Video previews require direct video IDs; placeholder searches show an unavailable state.

## v0.7 views
Progress ring color is paired with numeric completion text and clickable filter labels. The deadline calendar uses a seven-column grid and individual labeled buttons. Account and plan cards collapse to a single column below 700px. Status counts and labels remain visible without relying on color. New controls inherit shared focus outlines and avoid continuous motion.

## v0.10 branding
The square logo JPEG is the canonical full logo at `public/icons/gabaynegosyo-logo.jpg`. The navigation and hero use a faithfully derived emblem at `public/icons/gabaynegosyo-emblem-master.png` with plain text for legibility at small sizes. Do not trace or redraw the wordmark, substitute another pictogram, or use the previous generic G tile. The favicon, install icons, social preview, and footer now reflect the logo. The palette follows dark forest `#092f22`, primary `#145d2d`, a small growth-green accent, and a cool off-white `#f7faf6`. Continue to pair progress and status colors with text labels. The original JPEG has a white background; place the full logo on white rather than trying to remove its background in CSS. Obtain a client-supplied vector or transparent master if pixel-perfect mark-only assets are required.

## v0.11 design kits
Five kits from the design package are applied as a layer in `styles/kits.css`: Regulatory Atlas (public header and landing), Growth Ledger (signed-in sidebar and dashboard panels), Command Desk (admin rail, menu and review queue), Pocket Guide (phone bottom bar and mobile cards) and Night Shift (optional theme). Tokens and colors above still apply; Night Shift remaps them under `html[data-theme="night"]` with a black canvas and a lime accent, and always pairs lime with dark text. Light is the default, the choice is stored only in this browser, and the client logo stays on white in both themes. Agency bars and status counts always print numbers. Developer detail: `docs/DESIGN_KITS.md`.

## v0.15 Emerald Growth corrections
Source of truth for colour, radius, shadow and motion tokens is the `:root` block at the top of `styles/emerald.css` (loaded last, after `globals.css` and `kits.css`). Night Shift still remaps tokens under `html[data-theme="night"]`; because that selector out-specifies `:root`, any rule that must change with the theme has to use a token (`--kit-panel`, `--kit-line`, `--kit-mint`, `--gn-green`, `--gn-green-deep`, `--ink`) rather than a literal colour. Hard-coded `#fff` or `--gn-emerald` text is the usual cause of unreadable Night Shift panels.

- **Hero arrow.** `public/images/gabaynegosyo-growth-arrow.webp` (PNG fallback inside the same `<picture>`) lives inside `.gn-hero-art`, never as a direct child of `.gn-hero`, so it cannot sit under the headline, copy or CTAs. At 859px and below it becomes its own block above the roadmap card instead of an overlay.
- **Signed-in shell.** In the Growth Ledger shell the sidebar spans grid rows 1-2 and the demo banner sits in the content column, so the sidebar always starts at the top of the window. `.kit-side-nav` scrolls independently; `.kit-side-foot` (theme toggle) is pinned and always visible. Phones use the toggle in `.mobile-brand-head`.
- **Lifecycle stepper.** States are completed (check mark, "Visited stage"), current (filled number, "You are here", mint panel, ring) and upcoming ("Next stages"). State is always stated in text, never colour alone.
- **Penalty simulator.** `.penalty-sim` is a two-column grid from 960px (inputs left, estimate right, sticky); below that the result stacks under the inputs. The headline figure is the result `h3`; `dl.penalty-summary` rows stay body-sized.
