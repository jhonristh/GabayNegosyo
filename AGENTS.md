# Working agreement for GabayNegosyo contributors

- For presentation-only work, preserve the Supabase connection, auth, data access, SQL, API routes, eligibility logic and content data unless the task explicitly authorizes changing them.
- Before editing, inspect the affected route and its data dependencies. Never invent requirements, deadlines, government validation, payment completion or coverage claims.
- Keep public links actionable. Use actual routes or anchors; label illustrative content clearly. Maintain separate states for loading, empty, error and access restrictions.
- Use existing design tokens in `styles/globals.css`; test keyboard focus, narrow screens and reduced motion. Avoid inaccessible color-only status information.
- Keep `.env.local` and other secrets out of commits and archives. Use `.env.example` as the public configuration template.
- Run TypeScript, tests, contrast check and build when dependencies and environment permit. State any unverified browser or Supabase behavior honestly.
- Update the matching file in `docs/` (see the index in `README.md`) and add an entry to `CHANGELOG.md` when behavior changes. Do not add per-release status files.

<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
