# Design kits — developer guide

Audience: developers. User-facing behaviour is described in `README.md` and `Design-System.md`.

The five prototypes from *GabayNegosyo — five responsive design kits* are integrated as a
presentation layer. The original static prototypes are kept untouched in
`docs/design-kits-reference/` (open `index.html`) for visual comparison. Their figures were
illustrative; **nothing from them is shipped as data**.

## Where each kit lives

| Kit | Used for | Code |
|---|---|---|
| Regulatory Atlas | Signed-out header, landing hero mosaic, numbered feature cards | `components/Navbar.tsx` (public branch), `app/page.tsx`, `styles/kits.css` §3 |
| Growth Ledger | Signed-in Free/Premium desktop shell and dashboard panels | `Navbar.tsx` (sidebar), `app/dashboard/page.tsx`, `components/AgencyProgress.tsx`, §2 and §4 |
| Command Desk | Admin shell (icon rail + menu) and the review queue | `Navbar.tsx` (admin branch), `app/admin/page.tsx`, §5 |
| Pocket Guide | Phone bottom bar, checklist progress card, account cards | `Navbar.tsx` (`navbar-mobile`), `app/checklist`, `app/account`, §6 |
| Night Shift | Optional high-contrast theme | `lib/theme.ts`, `components/ThemeControls.tsx`, `styles/kits.css` §7–8 |

## How it is wired

- `app/layout.tsx` imports `styles/kits.css` **after** `globals.css`. The kit layer refines
  existing rules; it does not replace them, so older pages keep working.
- `components/ClientProviders.tsx` wraps pages in `.kit-shell--public | --ledger | --command`,
  chosen from the signed-in role. This only selects the layout. **Access control is unchanged**:
  `AuthGuard`, `AdminGuard` and Supabase RLS still decide who can see what.
- Below 860px the sidebar and admin rails are hidden and the original mobile patterns return
  (brand header + bottom bar; scrolling admin bar).
- The kit prototypes scoped everything under `#gn-kits` and used Unicode glyphs. In the app
  they are regular classes (`kit-*`) and inline SVG icons (`components/KitIcon.tsx`), which
  render the same on every Android font and add no dependency.

## Real data vs prototype content

| Element | Source |
|---|---|
| Checklist %, "Up next" | existing rule engine via `db` (unchanged) |
| Progress by agency | `buildAgencyProgress(agencies, items)` from the same applicable items; each bar prints `done/total`; agencies with no items show "None" |
| "Where things stand" | counts of the same computed statuses, using `StatusBadge` (shape + color + text) |
| Admin review queue | `requirementContentStatus`, `tutorial.isPlaceholder`, `isResourceStale` (`lib/contentHealth.ts`); shows the first 8 and says how many more exist |
| Landing mosaic | static copy, labelled "Illustrative product preview" |

The prototype's sample numbers (62 %, 5 / 3 / 7 …) were not carried over.

## Night Shift

- `<html data-theme="light|night">` is the only switch. `styles/kits.css` §8 remaps the design
  tokens (`--ink`, `--solid-surface`, `--gn-green` → lime, …) and overrides the handful of rules
  in `globals.css` that hard-code light surfaces.
- Preference (`light | night | system`) lives in `localStorage["gn-theme"]`; nothing goes to
  Supabase. Default for new visitors is **light**. Bad or blocked storage falls back to light.
- `THEME_INIT_SCRIPT` runs in `<head>` before first paint to avoid a white flash. `<html>`
  carries `suppressHydrationWarning` because the attribute changes before React hydrates.
- The client logo JPEG keeps its white background in every theme (see `Design-System.md`).
- **Adding a new component:** use tokens (`var(--solid-surface)`, `var(--ink)`, `var(--kit-panel)`,
  `var(--kit-line)`) instead of hard-coded hex. If a rule needs a literal light color, add a
  `html[data-theme="night"]` override in `kits.css` §8.

## Verification

```
npm run lint && npm test && npm run contrast-check && npm run build
```

`contrast-check` covers the kit and Night Shift pairs and now reads the tinted `.badge-*` rules straight from `styles/globals.css`, measuring each on a white card and on the sand page (38 pairs).
A browser pass with a logged-in session is still needed (see below).

### Checked in a scratch build with a stubbed Supabase client (not shipped)
- Landing, dashboard, checklist, account and admin at 1360px and 390px, light and Night Shift.
- No horizontal scrolling at 390px on those pages.
- Automated text-contrast sweep over 20 routes × 2 widths in both themes. Night Shift had no
  failures other than disabled buttons. The light sweep flagged only pre-existing items: disabled
  buttons, a few tinted badges at 4.3–4.4:1 ("Overdue", "Completed"; since fixed, see V0.11 fixes below), the progress-bar label on the
  dashboard card at 3.8:1 (since fixed), and deadline-reminder buttons shown to Free users. These were not
  introduced by the kits and were left unchanged.

### Not verified
- Real Supabase sessions, Premium/Admin data, email reminders, or a physical device.
- React error #418 (hydration) appears on the landing page in the stubbed environment. It
  appears identically on the unmodified v0.10 build in the same setup, so it is not caused by
  this change; its cause is unknown and worth checking against a real deployment.
- Screen-reader walkthroughs.

## Known follow-ups
- `.v05-preview*` rules in `globals.css` are now unused by the landing page; left in place to avoid
  touching unrelated CSS. Remove when convenient.
- The dashboard "Completed" list and "Quick actions" keep the v0.5 styling.
- Pages not redesigned (wizard, guide, resources, tutorials, deadlines, requirement detail) inherit
  the new shell and Night Shift colors only.


## V0.11 fixes (contrast)
- **Status badges:** Overdue, Completed and Due today measured 4.37 / 4.29 / 4.34:1 (Due today on sand) against the 4.5:1 AA minimum because the old check only tested the text color on plain white. Tints lightened to 0.08 / 0.06 / 0.08 alpha; text colors and brand clay are unchanged. Now 4.68-4.99:1 on both surfaces.
- **Dashboard hero progress label:** bar track darkened `#668a7a` -> `#3f6655` (white label 3.9 -> 6.5:1). Fill contrast is unchanged.
- **Checker:** `scripts/contrast-check.mjs` parses the real badge rules and hero track, so a future stronger tint fails the check instead of shipping. A test in `tests/kits.test.js` guards the wiring.
- Not changed: disabled buttons (exempt under WCAG 1.4.3) and the Free-user reminder buttons, which are disabled.
