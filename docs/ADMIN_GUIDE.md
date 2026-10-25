# Admin guide

## Scope

The platform organizes requirements from BIR, SSS, PhilHealth, Pag-IBIG Fund (HDMF) and the city or municipality (LGU) responsible for business permits. Registration or renewal through other agencies is not presented as an in-scope checklist item. DTI business-name and BMBE material is available in the Resource library and the Renewal page only; DTI is not one of the five tracked agencies.

## Workflow

Open **Admin**, review the count of content needing attention, then choose **Agencies**, **Requirements**, **Resources** or **Tutorials**. Each editor shows numbered steps and warnings.

- **Agencies:** fixed to five.
- **Requirements:** form-based editing of description, audience, preparation list, steps and sources.
- **Resources:** title, type, agency, https link, description and "source checked on" date. Use **Preview source** before saving.
- **Tutorials:** a YouTube URL; can stay marked "awaiting verification".
- **Users:** read-only, from Supabase. Change plans in the Supabase SQL editor (the page shows the statement).
- **Dashboard:** account counts and sync status, content health, and "Recent emails (sent or logged)".

Use official sources only, and never paste a link you have not opened.

## Limits to know about

- **Per-browser edits.** Content edits are stored in the browser's `localStorage` (`gn_store_v1`). They are visible only in that browser, disappear if its data is cleared, and are not shared with other visitors or synchronized through Supabase. A shared CMS needs a planned Supabase content migration and server-side authorization.
- **Archive vs. delete.** Archive hides a built-in item. An item you added yourself is deleted permanently, with no undo.
- **Placeholders.** Newly entered requirements are marked as placeholders. The form preserves existing applicability and date fields when editing but does not configure new rule-engine matching. Do not treat a new item as an approved personalized obligation until its conditions and date behavior are reviewed.

## Media previews

A public YouTube video plays in an iframe from its video ID; no API key is needed. The owner can disallow embedding. Inline form previews cover only direct PDFs served from `bir-cdn.bir.gov.ph`; the page always offers a source link when embedding fails. Other hosts need explicit validation and an appropriate Content-Security-Policy before inline preview. Uploads and file hosting are not part of the app.

Filing videos carry an ownership notice: GabayNegosyo does not own them, and "CTTO" means credit to the owner.

## Credits

`/credits` reads `data/credits.json` and states plainly when names are still pending. Confirm names, roles, school, photos and permission to publish before replacing placeholders.
