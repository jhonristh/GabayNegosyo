# GabayNegosyo — five responsive design kits

Open `index.html` in a browser, then choose a sample. No installation, account, network, or build step is needed. Every sample is a separate HTML file and uses the shared `styles.css` plus assets in `assets/`.

| File | Direction | Best use |
|---|---|---|
| `growth-ledger.html` | Growth Ledger | User dashboard: broad overview, progress, and next step |
| `regulatory-atlas.html` | Regulatory Atlas | Marketing landing page and product explanation |
| `command-desk.html` | Command Desk | Admin dashboard and content review queue |
| `pocket-guide.html` | Pocket Guide | Mobile checklist and account experience |
| `night-shift.html` | Night Shift | Optional high-contrast workspace theme |

## Responsive behavior
At <=700px, desktop grids stack or narrow, sidebars collapse, the landing-page hero becomes one column, and the admin table reduces columns. At <=390px, Growth Ledger becomes a single column and smaller controls reflow. `viewport` metadata, fluid widths, `minmax(0, 1fr)`, and text wrapping prevent horizontal overflow. Motion respects reduced-motion settings.

## Project integration
These are **design prototypes**, not replacements for the current Next.js pages. Their figures and task descriptions are illustrative. When implementing a chosen kit in GabayNegosyo, connect cards to the existing rule engine, deadlines, and Supabase profile, preserve Free/Premium access rules, and keep official source and uncertainty labels. The shared stylesheet is intentionally scoped under `#gn-kits` so it can be migrated gradually. Keep the official full client logo in `assets/client-logo.jpg`; the small emblem is a derived display asset.

## Navigation and content
The gallery links work. Text that resembles product navigation inside each mockup is non-interactive visual composition. No edits to the production project or Supabase are included in this package.
