# GabayNegosyo — FINAL Content Fix Prompt (for Claude Code)

**Before pasting:** put these in the project root (or an `/inputs` folder): `GabayNegosyo_Final_Content_Spec.md`, `GabayNegosyo_Forms_Links_Database_v2.json`, the revised client PDF (with consultant comments), and `GNChangesByConsultant.pdf`. This prompt supersedes `GabayNegosyo_Content_Audit_Prompt.md`.

---

## ROLE
You are a senior engineer and compliance-content editor fixing the GabayNegosyo website so that **every user-facing fact matches the consultant-approved spec**. Accuracy beats speed. If something is not in the spec or database, do not invent it — mark it OPEN, ship a safe placeholder, and list it in your final report.

## SOURCES (priority order)
1. `GabayNegosyo_Final_Content_Spec.md` — authoritative decisions (tiers, wizard, rules, penalties, notes).
2. `GabayNegosyo_Forms_Links_Database_v2.json` — the only allowed source of form/portal/video URLs. Respect each entry's `urlStatus`: never publish a URL whose status is TRUNCATED or that has no URL; show the requirement text without a link instead. Entries marked "From existing website data" are acceptable but must be link-checked.
3. The revised client PDF — for requirement lists, steps, fee tables, and notes the spec points to ("copy verbatim").
4. Consultant changelog — tie-breaker when 1–3 appear to disagree; report the conflict.

## PHASE 0 — ORIENT (do first, report briefly)
- The archive may hold duplicate trees (e.g. a nested `public/` copy of `app/`, `lib/`, `data/`, `components/`, `styles/`, and differing `package.json`/`layout.tsx`). Diff them, decide the canonical tree from the build config and which tree builds, and work **only** there. Never edit the stale copy; recommend deleting it.
- Identify **every place content lives**: `data/*.json`, Google Sheets fallback, Supabase content/seed SQL and migrations, hard-coded strings in `app/**` / `components/**`, `lib/penalty.ts`, `lib/ruleEngine.ts`, tests. The deployed app is a 9-step wizard with Supabase and Vercel; match the real code, not this description.
- Run typecheck, lint, tests, and build to record the **baseline**. Create a git branch `content/consultant-final`.

## PHASE 1 — WIZARD (spec §2)
1. Taxpayer Type: only *Self-Employment or Profession* and *Mixed Income Earner* (remove Purely Compensation and Purely Business everywhere, including types, DB enums, rules, tests; keep old saved profiles working via a safe mapping).
2. Lease step: add **Not applicable**; all three answers enable Continue; rules must treat "Not applicable" like "No lease document needed".
3. Sales step: sales only. Remove expenses from it.
4. Add a **Tax option** step: 8% | Graduated; Graduated reveals OSD | Itemized; ask expenses only for Itemized. Sales ≥ ₱3,000,000: show the note, disable 8%, set graduated automatically, flag VAT. Update the review step, step count, progress indicator, and saved profile schema (+ migration if Supabase).
5. Do **not** apply the ₱250,000 deduction to Mixed Income Earners (OPEN FL-16) — compute for them without it and show "pending accountant confirmation" in code comments and the report.
6. Put the graduated tax table in a data/config file with a clearly marked TODO placeholder until the consultant sends it (OPEN FL-17). Do not hard-code rates from memory.

## PHASE 2 — CONTENT AND RULE ENGINE (spec §3, §8)
- Replace the 8 existing requirements with the full catalog in spec §8 (registration, renewals, post-registration, employer, conditional/event-based, excise, BMBE). Fill each item's description, who it applies to, required documents, step-by-step instructions, deadline, penalty rule, official URL and tutorial from the spec/PDF/database. Remove unsourced items and the placeholder deadlines (Jan 1, Jan 30, Dec 31, Feb 28).
- Fix known wrong content: annual returns **April 15**; 1701-Q **May 15 / Aug 15 / Nov 15**; remove "pay Annual Registration Fee (Form 0605)" and the ₱1,000 COR penalty; BIR registration via ORUS + ₱30 DST + eCOR + BPI/ATP; DTI shows online-application link **plus** requirements; SSS/PhilHealth show requirements **plus** apply-online links; barangay clearance and Mayor's permit renewal Dec 31 / Jan 20 (Jan 1–20).
- Extend the deadline model (fixed date, list of dates, monthly, N days after quarter, window, event-offset, one-time) and the next-due/status computation; add tests for each type.
- Rules: 8% filers → 1701-Q ×3 + annual, no 2551Q; graduated non-VAT → 1701-Q + 2551Q + annual; sales ≥ ₱3M → 2550Q; employees → 1601-C, 2316, SSS/PhilHealth/Pag-IBIG items; EWT, 1706, 1800 and excise as conditional/event items. **Update any test that asserts 8%/graduated exclusivity** (the old assumption is wrong).
- Add DTI and Barangay as agencies (and fix resource `agencyId`s, e.g. the DTI business-name resource tagged as BIR).

## PHASE 3 — PENALTIES AND SIMULATOR (spec §4)
- Replace all penalty data/types with the spec table: BIR micro/small 10% + 6% p.a. (+ informational lines), SSS 2%/mo, PhilHealth ≥3%/mo **compounded**, Pag-IBIG **0.1%/day**, LGU 25% + 2%/mo capped at 36 months, DTI +50%. Add the rule types needed (per-day, compounding, capped months). Keep formulas only in the pure calculation module.
- Simulator (Premium): **Option A** (type known tax due) and **Option B** (8% only: max(0,(gross − 250,000) × 8%)). Show the itemized breakdown and the **verbatim Filipino disclaimer** with every result (no result renders without it). Unit-test each agency and both options with worked examples, including zero/negative inputs.

## PHASE 4 — TIERS AND VIDEOS (spec §1)
- Implement the consultant's Free/Premium table exactly; enforce on the server/DB (RLS/API), not only in UI. Move **tutorials to Free**, **resource library to Premium**, deadline status + progress tracking to Premium; checklist (requirement, agency, deadline) and the wizard/tax-option estimate stay Free. Update landing/upgrade/pricing copy, README feature table, and gate components. Add tests that a Free user cannot fetch Premium data via the API.
- Add `Videos are from YouTube and belong to their creators.` next to **every** video (tutorial hub, requirement pages, resource library). Replace YouTube search-URL placeholders with the real videos from the database (`isPlaceholder: false`); entries with no/truncated video show no video. Use the official YouTube embed or a plain link; no copied thumbnails.

## PHASE 5 — FEES, NOTES, RESOURCES (spec §5–§7)
- Add the fee tables (DTI scopes, barangay clearance by city, Mayor's permit and ancillary fees by city, BIR registration costs) **copied verbatim** from the revised PDF, labelled as estimates, with the spec §5 notes. Default tier: Premium (OPEN FL-18).
- Rebuild the resource library from spec §7 using database URLs; add RR 6-2024 and the BIR checklist PDF; keep the "collected" tracker if present.
- Show "last verified" on every checklist item (small text) and set it to today's date only for items you actually re-verified against these documents.

## PHASE 6 — LINKS AND DATA INTEGRITY
- Load every URL from the app data and the database; assert each appears in the database or is removed. Run an HTTP check (HEAD, fall back to GET, follow redirects) and output a table of status codes; if the sandbox has no network, write the script `scripts/check-links.mjs` and say so. Never mark a link "working" without a result.
- Add data-integrity tests: every requirement references a real agency; every URL is in the database; every video block has the attribution; every penalty rule type has a formula; every deadline type computes.
- If content is in Supabase, generate migrations/seed updates and a rollback; do not run destructive SQL against production, and never print secrets.

## RULES
- Do not add features outside this spec. Keep existing working behaviour, PWA, auth, and design system.
- Never invent URLs, rates, fees, deadlines, or form names. Use "OPEN" placeholders.
- Keep language consistent with the app (English UI; the disclaimer stays Filipino).
- Small, reviewable commits per phase with clear messages. After each phase run typecheck, tests, build.

## FINAL REPORT (required)
1. Phase-by-phase summary of changes (files touched).
2. A before/after table for every changed fact (deadline, penalty, fee, tier, step), citing the spec section.
3. Test results (baseline vs final) and the link-check table.
4. **OPEN items still needing the consultant/client** (use spec §9 list, plus anything new).
5. Risks (e.g. mixed-income ₱250k, itemized form choice, interest method) and anything you deliberately did not change.
