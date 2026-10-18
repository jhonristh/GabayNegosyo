# GabayNegosyo v0.15.3 — UX, Feature, and Premium Design Audit

## Executive verdict

GabayNegosyo already has a credible visual foundation: the emerald/forest palette is distinctive, the landing page has a clear editorial tone, the logo treatment is consistent, the hero composition is memorable, and the contrast check passes all 40 defined pairs. The site looks more intentional than a typical academic prototype.

The main gap is **product confidence**. The experience currently asks users to trust a compliance guide while simultaneously exposing a prototype model, incomplete coverage, demo upgrades, placeholder content, local-only persistence, and an onboarding flow that can appear stuck at `Loading…` when the auth service is unavailable. A premium refresh should therefore prioritize clarity, confidence, and a faster path to the user's next useful action—not add more decorative polish.

### Recommended overall priority

1. Make the first-run flow work without waiting on auth, and reduce the perceived effort of the wizard.
2. Reframe the product around a single next action: **build, understand, and finish today's requirement**.
3. Make coverage and verification status impossible to misunderstand.
4. Simplify the signed-in navigation, especially on mobile.
5. Replace prototype-only premium language with a credible plan/product model before any real launch.

## What I reviewed

- Uploaded source archive, product requirements, architecture notes, design system, QA report, progress notes, README, route inventory, and core page/component code.
- Local render of the landing page and login page at desktop size.
- Browser route inspection for `/`, `/login`, and `/wizard`.
- TypeScript check, contrast check, and production build.
- Static scan for prototype/placeholder/demo language and known unfinished areas.

## Current validation status

- `npm run lint`: **PASS** (`tsc --noEmit`).
- `npm run contrast-check`: **PASS**, all 40 pairs.
- `npm run build`: **PASS** with safe local placeholder values; it warns that `NEXT_PUBLIC_CONTACT_EMAIL` is missing.
- `npm test`: **NOT PASS in this sandbox runtime**. The Node built-in test runner tries to import TypeScript modules directly and reports `ERR_UNKNOWN_FILE_EXTENSION` for `.ts` files. The existing project QA report claims 132/132 passed in its prior intended environment, so this should be treated as a test-runner/environment issue to fix or reproduce—not as proof that the product logic is broken.
- Browser inspection: the landing and login render cleanly. `/wizard` remained on `Loading…` in this local run with placeholder Supabase configuration. Even if this is configuration-related, a guest-first wizard should not be blocked by auth initialization or an unavailable network.

## Strengths worth preserving

### Visual identity

- The forest/emerald palette is ownable and appropriate for guidance, growth, and trust.
- Space Grotesk + Inter gives the interface a modern editorial feel without looking like a generic SaaS template.
- The landing hero has a strong visual signature: the roadmap card plus growth arrow creates a memorable brand moment.
- The public page has good hierarchy: promise → how it works → feature value → trust → plan comparison → CTA.
- The login page has a polished split-panel treatment and good whitespace.
- Focus styles, reduced-motion support, text-plus-color status communication, and contrast tokens are already thoughtfully implemented.

### Product foundations

- The guest-first wizard concept is correct for acquisition.
- The rule-engine approach is much stronger than hard-coded requirement screens.
- The dashboard foregrounds progress and an upcoming item instead of only showing a data dump.
- Requirement cards, status filters, agency filters, deadline views, resources, tutorials, and account settings form a reasonable V0 product skeleton.
- Content integrity is handled more honestly than in many prototypes: placeholders and unverified local guidance are acknowledged in code and copy.

## P0 — Fix before showing this as a serious product

### 1. Remove auth as a blocker for the guest-first wizard

**Observed:** `/wizard` stayed on `Loading…` while the public routes rendered. The wizard is explicitly designed to work without an account, but `AuthProvider` initializes through Supabase before downstream UI can render.

**Why it matters:** This is the highest-severity UX issue. A first-time user who clicked the main CTA can see what looks like a broken app before answering a single question.

**Fix:**

- Add a hard timeout around initial session restoration, e.g. 2–4 seconds, then mark the app as signed out and allow guest flows.
- Separate auth hydration from guest UI hydration. Public pages and `/wizard` should render immediately; only signed-in data should wait.
- Show a compact non-blocking status if auth is unavailable: “You can continue as a guest. Sign in later to save your roadmap.”
- Persist wizard answers in `sessionStorage` as currently intended, then offer “Save this roadmap” after generation.
- Add a real error boundary state for auth initialization instead of a perpetual loading state.

**Likely files:** `lib/auth.tsx`, `components/AuthGuard.tsx`, `app/wizard/page.tsx`, `components/ClientProviders.tsx`.

### 2. Reduce wizard perceived effort from 9 steps to a progressive flow

**Observed:** The wizard defines nine steps, including a business name field and a review/generation step. The landing page says “Answer a few questions,” but nine numbered steps can feel much heavier.

**Why it matters:** Users usually want to know “what do I need to do next?” They do not want to complete a government-style questionnaire before seeing value.

**Fix:**

- Group the questions into 3 visible phases: **Business**, **Location**, **Operations**.
- Use a compact progress indicator such as “2 of 3 sections” plus a time estimate: “About 2 minutes.”
- Show one question at a time, but allow Back, Edit, and a summary drawer.
- Move Business Name to an optional post-generation personalization field; it is not needed to determine most obligations.
- Ask only branching questions. If “no employees” is selected, skip employee count entirely.
- Add “Why we ask” microcopy for taxpayer type, lease, and projected sales/expenses.
- On the final screen, show a preview count before account creation: “We found 11 likely requirements for your profile.”

### 3. Clarify what is verified, what is outline content, and what is not covered

**Observed:** The product says “19 sourced BIR requirements,” while the actual dataset also contains placeholder and outline material across agencies. The project notes confirm SSS, PhilHealth, Pag-IBIG, and LGU content remains incomplete or placeholder-level. The landing page does disclose limitations, but the trust model is still easy to misunderstand.

**Why it matters:** Compliance products lose trust faster from one unclear claim than from a less polished UI.

**Fix:**

- Add a persistent content-status legend: **Verified source**, **Reference/outline**, **Needs review**, **Not yet covered**.
- Put the status beside every requirement title, not only deep in the detail screen.
- Change landing-page wording from generic coverage language to explicit scope: “BIR-focused guidance for NCR microbusinesses; other agency coverage is limited.”
- Make the last-verified date a human-readable label and show it per item. Avoid using a single global date as the main trust signal.
- Add a “Coverage by agency” block with counts and status, for example: BIR — sourced; LGU — general guidance; SSS — outline; etc.
- Do not present a premium gate around content that is not yet verified. Premium should add convenience and depth, not imply certainty.

### 4. Fix production-facing placeholder and prototype signals before public launch

**Observed:** The local render footer used `mailto:test@example.com` because the contact environment variable was absent. Static scans also found “prototype,” “demo,” “coming soon,” “Researcher 1,” and placeholder content in multiple user-facing paths.

**Why it matters:** A premium aesthetic collapses instantly when a user sees a test email or unfinished credit names.

**Fix:**

- Make production build fail when `NEXT_PUBLIC_CONTACT_EMAIL` is missing, not only warn in non-production.
- Never ship `test@example.com` even to staging unless the environment visibly says “staging.”
- Replace unnamed credits with a single honest line such as “Project team credits to be published” rather than nine fake researcher cards.
- Put prototype/demo messaging in a dedicated, visually contained banner or staging mode—not mixed into normal product copy.
- Use a single `siteConfig` flag for “prototype mode” so copy and navigation do not drift across routes.

**Likely files:** `scripts/check-env.mjs`, `lib/siteConfig.ts`, `components/Footer.tsx`, `data/credits.json`, `app/credits/page.tsx`, plan/account copy.

## P1 — High-value UX improvements

### 5. Give the dashboard a single dominant job

**Current state:** The dashboard includes progress, up-next, alerts, agency progress, status counts, quick actions, pending items, and completed items. This is capable but dense.

**Risk:** The user may understand their status but still not know what action to take now.

**Recommended dashboard hierarchy:**

1. **Today:** one prominent next action with deadline, agency, and button.
2. **Progress:** one concise completion summary.
3. **Attention:** overdue/due-soon items only.
4. **Roadmap:** agency/stage progress.
5. **Everything else:** secondary links or collapsible sections.

Rename “Up next” to an action label such as **Do this next**. Add verbs to buttons: “Open BIR form,” “Review documents,” “Mark as done.”

### 6. Simplify mobile navigation

**Current state:** The mobile bottom bar includes up to six items including Checklist, Register, BIR Forms, Penalties, Renewal, and Account. The desktop sidebar has many numbered lifecycle items plus Resources, Tutorials, Deadlines, and Account.

**Risk:** A six-item bottom bar with labels like “BIR Forms” and “Renewal” is hard to scan and competes with the actual task content. The lifecycle order is logical internally but not necessarily the order users think in.

**Fix:**

- Mobile bottom bar: **Home**, **Checklist**, **Deadlines**, **Learn**, **Account**.
- Put Registration, BIR Forms, Penalties, and Renewal under a single **Guide** or **More** destination.
- Keep the current journey stepper inside the content, not as the primary global navigation.
- Add a clear mobile page title and contextual back link on requirement details.
- Confirm the bottom nav never covers sticky action buttons or form controls with safe-area padding.

### 7. Make search and filters feel like a product tool, not a raw data table

**Current state:** Checklist filters are many horizontal chips: status and agencies, plus a search field.

**Risk:** On narrow screens, filters can become a long horizontal interaction sequence and force users to decode counts.

**Fix:**

- Use one summary row: “11 items · 2 need attention” plus a filter button.
- Move secondary filters into a bottom sheet or disclosure panel on mobile.
- Make the default sort explicitly “Most urgent first.”
- Add clear empty states that tell users whether there are genuinely no items or only no matches.
- Preserve filters in the URL so a shared or refreshed view is stable.

### 8. Add recovery and reassurance to auth

**Observed:** Login has a polished form and password visibility toggle, but the inspected page did not expose a “Forgot password?” path.

**Fix:**

- Add “Forgot password?” below the password field.
- Add clear confirmation and resend states for email verification.
- Keep Google sign-in either fully configured or hide it; do not leave a half-available provider state.
- Add a short privacy reassurance beside account creation: “Your answers are used to build your checklist. We do not file anything for you.”

### 9. Prevent demo/premium ambiguity

**Observed:** Premium is both a feature tier and a demo toggle. The account page can say “Upgrade to Premium (demo),” and the product includes premium-gated guidance that is still partly placeholder-level.

**Fix:**

- Use **Preview Premium** or **Prototype Premium** while no payment exists.
- Remove “Upgrade” language from public acquisition if no real entitlement or payment flow exists.
- State exactly what Premium unlocks, with a status badge for verified vs outline content.
- When billing is introduced, make the plan page a separate, deliberate conversion flow with price, cancellation, and entitlement details.

## P2 — Premium aesthetic upgrades

### 10. Reduce competing visual languages

The site currently combines: glass shell surfaces, emerald growth styling, lime accents, a large arrow illustration, rounded cards, underlined links, status colors, night mode, and multiple “kit” metaphors. Each piece is defensible, but together they can feel like several design concepts layered over time.

**Recommended premium direction:**

- Keep the emerald/forest identity and arrow as the signature.
- Reserve lime for one purpose per screen: progress, selected state, or a key accent—not all three at once.
- Use solid white panels for work and one dark forest panel for emphasis.
- Reduce card count and let whitespace create hierarchy.
- Use fewer border radii: 12px controls, 18px cards, 24px hero surfaces.
- Use shadows only for floating/high-priority surfaces. Most data cards should use border + spacing instead.
- Avoid adding more gradients; the current brand mark and arrow already provide enough energy.

### 11. Improve the landing page conversion hierarchy

The landing page is attractive, but the first screen asks the user to parse a headline, subheadline, two buttons, an audience note, an illustrative roadmap, and a large arrow at once.

**Suggested above-the-fold composition:**

- Eyebrow: “For NCR microbusiness owners”
- Headline: “Know what applies. Do the next step.”
- One supporting sentence
- Primary CTA: “Build my free checklist”
- Secondary text link: “See how it works”
- Small trust row: “BIR-focused · 2-minute setup · No filing on your behalf”
- Keep the roadmap card; reduce the arrow size slightly so it supports rather than competes with the message.

The current headline is well-written, but “Business compliance, made easier to follow” is descriptive rather than outcome-led. Test a more action-oriented variant.

### 12. Design a stronger requirement detail page

This is likely the most important authenticated screen, because it converts a checklist item into action. It should have a consistent structure:

1. Requirement title + agency + source status.
2. **What this is** in one sentence.
3. **Why it applies to you** based on the profile.
4. **Do this next** with a numbered task list.
5. Documents/forms with clear verified labels.
6. Deadline/timing with an “official source” link.
7. Completion action fixed or strongly visible.
8. Related resources below.

The premium gate should reveal a useful preview of the detail page, not simply block the whole surface.

### 13. Use premium content patterns that communicate value

Premium should feel like better guidance, not just locked paragraphs.

Recommended premium modules:

- “Document pack” checklist.
- “What to prepare before visiting the agency.”
- “Common mistake” callout.
- “Time estimate” for the step.
- “Save this item” or “Add reminder.”
- One-click print/export of a requirement packet.
- A clear “Source and last verified” block.

The most valuable premium feature may be a **personalized filing packet** rather than a penalty simulator, because it directly reduces user effort.

## Content and feature priorities for the next release

### Release A — trust and first success

- Guest wizard renders immediately.
- 2-minute progressive wizard with branching.
- Preview checklist count before sign-up.
- Clear verification/coverage system.
- Real contact, credits, and staging/prototype configuration.
- Forgot-password and email-confirmation recovery.

### Release B — daily usefulness

- Dashboard “Do this next” action card.
- Mobile nav reduced to five destinations.
- URL-persisted filters and urgent-first sorting.
- Better requirement detail structure.
- Print/export a personalized checklist.
- Reminder setup that explains exactly what will happen.

### Release C — monetizable premium

- Real plan/entitlement model.
- Premium document packs and personalized instructions.
- Verified tutorial library.
- Payment and cancellation flow only after content coverage is trustworthy.
- Server-side admin content and audit history.

## Specific copy recommendations

### Hero

Current direction: “Business compliance, made easier to follow.”

Test:

> **Know what applies. Do the next step.**
>
> Build a practical compliance checklist for your NCR business in about two minutes—then keep your next deadline and required documents in view.

### Wizard introduction

> **Let’s build your roadmap.**
>
> Answer a few questions about your business. We’ll show the requirements that are most likely to apply. You can continue as a guest and save your roadmap later.

### Trust note

> GabayNegosyo is an independent guide. It does not file forms or submit transactions for you. Always confirm dates, fees, and requirements with the issuing agency.

### Coverage label

> **BIR-focused guidance**
>
> NCR coverage is strongest for BIR registration and filing requirements. Local permit and other-agency guidance may be general or still under review.

## Technical cleanup recommendations

- Add a test runner that can import TypeScript reliably, such as a compiled test target, `tsx`, or a Node test setup that transpiles `.ts` files. The current `npm test` script is fragile in the inspected environment.
- Add a browser smoke suite for: landing CTA → wizard, guest wizard completion, account creation, login error, mobile nav, requirement completion, premium gate, logout, and offline fallback.
- Add an auth initialization timeout and explicit offline state.
- Make `NEXT_PUBLIC_CONTACT_EMAIL` a production hard requirement.
- Update README engine requirement to match `package.json` (`Node >=22.18.0`), not the older Node 18.18+ note.
- Add route-level metadata review for every major product page, not only the root layout.
- Add analytics events for: wizard_started, wizard_completed, preview_viewed, signup_started, signup_completed, checklist_opened, requirement_opened, requirement_completed, premium_previewed, and reminder_created.
- Add an accessibility audit covering keyboard order, screen-reader labels, focus after route changes, bottom navigation, dialogs, error announcements, and color-independent status meaning.

## Bottom line

Do not spend the next iteration adding more visual decoration. The site is already visually credible. The highest-return work is to make the first useful moment happen immediately, make every compliance claim legible and honest, and reduce the authenticated product to one clear action at a time. Once those are fixed, the existing emerald design language can be pushed into a genuinely premium product with fewer cards, stronger task language, and a more disciplined mobile shell.
