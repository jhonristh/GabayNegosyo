# Testing and verification

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
