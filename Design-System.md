# GabayNegosyo — Design System (v0.10)

## Visual direction
Cool off-white background, client green identity, clean white content surfaces and restrained editorial typography. The landing page tells the story; the dashboard uses a wider two-column summary. Preserve readable, content-first treatment in forms and admin screens.

## Foundations
- Colors: `--gn-sand` #f7faf6; `--gn-green` #145d2d; `--gn-green-deep` #092f22; white surfaces; clay #c96a3a for limited accent. Functional status colors retain their semantic meaning.
- Type: Space Grotesk for headings, Inter for interface/body, tabular figures for progress and dates. Fonts are locally bundled with Fontsource.
- Spacing: 4, 8, 12, 16, 24, 32, 48, 64px tokens. The editorial screen max width is 1240px; content-heavy screens remain narrow where reading benefits.
- Radius: 14–20px for controls and cards; 26–28px for large feature surfaces.

## Components
Primary button: client forest green with white text, visible hover/pressed/focus and disabled states. Secondary button: white surface with border. Navigation links lead to real routes or section anchors. Dashboard summary uses a dark progress panel and pale green next-item panel. Requirement cards remain linked rows; status information must use text in addition to color. Preview examples must be labeled illustrative.

## Responsive and accessibility
At 859px, hero and summary columns stack; the authenticated bottom navigation takes over. At 520px, hero actions fill width and quick actions form a compact grid. Keep tap targets comfortable, avoid horizontal overflow, preserve visible keyboard focus, support reduced motion and never remove zoom. The existing contrast-check script is the starting gate for token changes.

## v0.6 surfaces and media
Use the current cool-white/client-green tokens. `--v06-shadow-rest` and `--v06-shadow-hover` define card elevation; reserve deeper shadows for the native PDF dialog. Cards move at most 3px on hover; all new transitions disable under `prefers-reduced-motion`. Form graphics are abstract document representations, not thumbnails of actual forms. Only verified direct PDF URLs from the existing resource data open the inline PDF viewer. Video previews require direct video IDs; placeholder searches show an unavailable state.

## v0.7 views
Progress ring color is paired with numeric completion text and clickable filter labels. The deadline calendar uses a seven-column grid and individual labeled buttons. Account and plan cards collapse to a single column below 700px. Status counts and labels remain visible without relying on color. New controls inherit shared focus outlines and avoid continuous motion.

## v0.10 client branding
The client-supplied square JPEG is the canonical full logo at `public/icons/gabaynegosyo-client-logo.jpg`. The navigation and hero use a faithfully derived emblem at `public/icons/gabaynegosyo-emblem-master.png` with plain text for legibility at small sizes. Do not trace or redraw the wordmark, substitute another pictogram, or use the previous generic G tile. The favicon, install icons, social preview, and footer now reflect the logo. The palette follows dark forest `#092f22`, primary `#145d2d`, a small growth-green accent, and a cool off-white `#f7faf6`. Continue to pair progress and status colors with text labels. The original JPEG has a white background; place the full logo on white rather than trying to remove its background in CSS. Obtain a client-supplied vector or transparent master if pixel-perfect mark-only assets are required.

## v0.11 design kits
Five kits from the design package are applied as a layer in `styles/kits.css`: Regulatory Atlas (public header and landing), Growth Ledger (signed-in sidebar and dashboard panels), Command Desk (admin rail, menu and review queue), Pocket Guide (phone bottom bar and mobile cards) and Night Shift (optional theme). Tokens and colors above still apply; Night Shift remaps them under `html[data-theme="night"]` with a black canvas and a lime accent, and always pairs lime with dark text. Light is the default, the choice is stored only in this browser, and the client logo stays on white in both themes. Agency bars and status counts always print numbers. Developer detail: `docs/DESIGN_KITS.md`.
