# GabayNegosyo — Design System (v0.5)

## Visual direction
Warm paper background, forest green identity, clean white content surfaces and restrained editorial typography. The landing page tells the story; the dashboard uses a wider two-column summary. Preserve readable, content-first treatment in forms and admin screens.

## Foundations
- Colors: `--gn-sand` #faf7f2; `--gn-green` #2e5e4e; `--gn-green-deep` #1f4438; white surfaces; clay #c96a3a for limited accent. Functional status colors retain their semantic meaning.
- Type: Space Grotesk for headings, Inter for interface/body, tabular figures for progress and dates. Fonts are locally bundled with Fontsource.
- Spacing: 4, 8, 12, 16, 24, 32, 48, 64px tokens. The editorial screen max width is 1240px; content-heavy screens remain narrow where reading benefits.
- Radius: 14–20px for controls and cards; 26–28px for large feature surfaces.

## Components
Primary button: forest green with white text, visible hover/pressed/focus and disabled states. Secondary button: white surface with border. Navigation links lead to real routes or section anchors. Dashboard summary uses a dark progress panel and pale green next-item panel. Requirement cards remain linked rows; status information must use text in addition to color. Preview examples must be labeled illustrative.

## Responsive and accessibility
At 859px, hero and summary columns stack; the authenticated bottom navigation takes over. At 520px, hero actions fill width and quick actions form a compact grid. Keep tap targets comfortable, avoid horizontal overflow, preserve visible keyboard focus, support reduced motion and never remove zoom. The existing contrast-check script is the starting gate for token changes.

## v0.6 surfaces and media
Use the existing cream/forest-green tokens. `--v06-shadow-rest` and `--v06-shadow-hover` define card elevation; reserve deeper shadows for the native PDF dialog. Cards move at most 3px on hover; all new transitions disable under `prefers-reduced-motion`. Form graphics are abstract document representations, not thumbnails of actual forms. Only verified direct PDF URLs from the existing resource data open the inline PDF viewer. Video previews require direct video IDs; placeholder searches show an unavailable state.

## v0.7 views
Progress ring color is paired with numeric completion text and clickable filter labels. The deadline calendar uses a seven-column grid and individual labeled buttons. Account and plan cards collapse to a single column below 700px. Status counts and labels remain visible without relying on color. New controls inherit shared focus outlines and avoid continuous motion.
