# Testing and verification

## v0.18.1 consultant/client revision

Local validation: all 331 tests passed; TypeScript production build passed (44 prerendered pages); 46 contrast pairs passed. Threshold regression covers ₱2,999,999, ₱3,000,000 and ₱3,000,001. The intended behavior change is eligibility cutoff above, rather than at, ₱3 million.

The cloud browser could not reach the local preview (ERR_CONNECTION_REFUSED). No browser screenshot, mobile rendering, keyboard flow, real audio, third-party video availability or live Supabase verification is claimed.

Acceptance: compare both employee branches of barangay instructions; inspect the registration DST description and both PDF dialogs; enter ₱3 million and ₱3 million + 1 in wizard/calculator; inspect neutral external YouTube cards; review light/night and reduced motion at 360/768/1440px; check onboarding progress and filter resets with keyboard.

## Gates

Run these before shipping:

```bash
npm run lint            # tsc --noEmit (a type check, not a full ESLint setup)
npm test                # node --test tests/*.test.js
npm run contrast-check  # WCAG pairs; rewrites docs/CONTRAST_REPORT.md
npm run build           # runs scripts/check-env.mjs first
```

`npm test` uses Node's built-in runner (Node 22.18+ strips TypeScript types, so tests can import the real `.ts` modules). Some older tests mirror logic inline; prefer tests that import the real code (`tests/engine.real.test.js` is the model). `tests/content.test.js` guards content integrity: every requirement references a real agency, carries a valid `contentSource` and `lastVerified`, every official URL is https on a `.gov.ph` host (no fabricated hosts), tutorials carry a category and an honest `isPlaceholder`, and resources carry a valid type and date.

Release-specific suites: `tests/v012.test.js`, `v013.test.js`, `v0164.test.js`, `kits.test.js`.

## Never verified automatically

These have never been run in the build environments used so far, and should be treated as unverified until someone does them: Playwright or other end-to-end tests, an axe-core scan, Lighthouse, screen-reader walkthroughs, behaviour with a real Supabase project (RLS with two users, guest adoption, `task_progress`), real email delivery (Gmail or Resend), the Vercel Cron run, every YouTube and official link, and a physical-device pass.

## Manual regression checklist

1. Sign up, confirm the email **on a phone**, land in the wizard.
2. Refresh: still logged in. Open an expired or reused confirmation link: the actionable page appears.
3. Google sign-in: success, cancel, provider disabled.
4. Password reset: request the link, open it, set a new password, log in.
5. Wizard for Manila, Makati, Pateros and Quezon City; guest wizard leads to `/preview`, and signing up adopts the answers.
6. Demo Free / Premium / Admin: banner, Reset, Exit; nothing appears in Supabase; a real login after a demo is clean.
7. Checklist: To do before Completed; per-step checking; Premium gate boundary.
8. BIR forms: "Preview form" opens an official PDF; Resource library filters (including DTI).
9. Delete account: wrong password, success, then login fails.
10. Premium upgrade opens `/premium/checkout` in a new tab and takes no payment.
11. Test reminder sends only when a provider is configured, and says so honestly otherwise.
12. 360px landing and credits pages, no horizontal scroll; keyboard through nav and dialogs; reduced motion; Night Shift on every main page.
13. Production build: `check-env` fails without `NEXT_PUBLIC_SITE_URL` and `NEXT_PUBLIC_CONTACT_EMAIL`.


## Entrepreneur's Workspace delivery — November 9, 2026

- TypeScript check: passed.
- Existing test suite: 325 passed, zero failed.
- Explicit color-pair contrast checks: 46 passed, including the new workspace tokens and cream canvas. This is a color-pair check, not a full accessibility audit.
- Next.js optimized build: passed; 44 static pages generated. Production site URL/contact environment values were not supplied, so the existing environment validator warned. No credentials were used.
- Byte comparison: existing lib/, data/, database/ and app/api/ files match the supplied archive.
- Browser preview connection was unavailable; desktop/mobile rendering, keyboard focus, live interactions and OS reduced-motion behavior were not browser-verified.
- Live Supabase authentication, persistence and email delivery were not tested.

Before deployment, configure your own environment and check the landing example checkboxes, Free/Premium dashboard, checklist filters and completion/undo, requirement disclosure, onboarding, and night theme at 360px, 768px, and 1440px. Check Tab/Space/Enter navigation and reduced-motion preferences. Demo mode remains opt-in through NEXT_PUBLIC_ENABLE_DEMO_ACCOUNTS.


## v0.18.0 — Growth arrow and Renewal Focus View

Validation completed November 9, 2026:
- TypeScript: passed.
- Automated suite: 331 passed (325 existing + 6 new renewal behavior tests).
- Explicit text/background contrast pairs: all 46 passed; not a full accessibility audit.
- Next.js optimized build: passed. Existing warnings remain for missing deployment URL/contact configuration and React 18 deprecation. Configure your own environment before deployment.
- Original arrow PNG/WebP, compliance data, SQL, API, authentication, data-access, entitlement and eligibility-engine files were compared byte-for-byte with the prior ZIP and remain unchanged.
- Browser preview could not connect to the local server. No claim is made of verified desktop/mobile appearance, keyboard interaction, actual audio playback, or real Supabase writes.

Manual acceptance checks:
1. Landing: confirm the original green arrow remains visible around the preview at 360, 768 and 1440 pixels; pause/resume the decorative motion. With reduced motion enabled, no floating/highlight/entrance animation should run.
2. Shop: click or press Space/Enter on the storefront. Its window lights up and a short message appears; real checklist counts do not change. Toggle it off again.
3. Sound: confirm initial off state, enable via footer or renewal toolbar, complete/undo a step and finish a requirement; verify quiet cues, remembered preference, immediate silence after disabling, and harmless behavior with blocked storage/unsupported audio.
4. Renewal: use an operating-business Premium demo profile, start a renewal, navigate without checking a step, exit and resume. Navigation must not mark completion. Check/undo in either single-step or expanded view and verify the same task progress on the requirement detail page. Revisit to verify cycle-specific continuation.
5. Check mobile step-menu opening, focus movement, all-step overview, document/source panels, outline labels and the empty-profile/no-applicable-items states. Free users must continue to see the Premium access boundary.
6. Test actual saving with a configured Supabase project. The existing database API updates local state optimistically and reports background failures; the renewal view adds a persistent failed-sync warning. Do not treat its confirmation sound as evidence of server persistence. Known offline real-account changes are disabled.
7. Confirm source catalog overlap between local-permit entries with the content owner; no automatic merging or new government requirements were introduced by this release.
