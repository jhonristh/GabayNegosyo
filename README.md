# GabayNegosyo

**Version 1.0.0 · Business compliance guidance for Philippine micro-entrepreneurs**

GabayNegosyo is a Progressive Web App (PWA) for online sellers, freelancers, and small business owners in Metro Manila. It uses a business profile to produce a personalized roadmap for registration, filing, deadlines, and renewal. It brings relevant requirements, forms, and learning materials together so users can see what applies to them and what to do next.

The app provides independent information and organization. Actual registration, filing, and payment take place through the relevant agency. Confirm current requirements and calculator assumptions with the issuing agency or a qualified adviser.

## Feasibility study and the problems this build addresses

The [feasibility study’s executive summary](docs/client-sources/GROUP%201%20-%20FEASIB%20CHA%201.pdf) identifies three core tasks: finding applicable obligations, understanding what they require, and tracking them over time. The table maps those needs to the software. It describes what the product provides, rather than measuring its effect on compliance outcomes or market adoption.

| Problem identified in the study | How GabayNegosyo addresses it |
|---|---|
| Guidance is scattered across agencies, each with its own forms, processes, and schedules. | A single workspace brings together requirement details, agency references, BIR forms, the resource library, and registration and renewal guidance. |
| First-time owners struggle to tell which requirements apply to their business. | The wizard collects business stage, taxpayer classification, NCR location, lease, employees, projected sales, tax choices, and optional BMBE information. A rule engine matches the profile against catalog conditions. |
| Instructions and supporting documents are difficult to interpret without prior experience. | Requirement pages explain what an item is, who needs it, and why it appears. Premium adds preparation lists and step-by-step guidance. Tutorial links open the creator’s video on YouTube. |
| Obligations have different dates, triggers, and recurring periods. | The dashboard, checklist, and calendar display dates or timing explanations where supported. Premium adds status and progress tracking. Opted-in users can be included in the administrator’s manual reminder queue. |
| Late compliance can carry financial consequences that are hard to anticipate. | The penalty simulator and tax estimator provide educational estimates within their stated assumptions. Their results require independent confirmation before use in real decisions. |
| Owners often manage a single business from a phone and need tools they can try without paying upfront. | The responsive web app offers a guest preview and a Free checklist. The mobile workspace has direct tabs, a More menu, and swipe and arrow navigation. The PWA can be installed in supported browsers. |

The location selector covers 17 NCR localities. The catalog includes BIR, SSS, PhilHealth, Pag-IBIG, LGU, DTI, and barangay references, with coverage varying by record and module. General local permit guidance does not establish that each LGU’s rules are verified. Barangay-to-RDO matching is partial. Generated roadmaps exclude archived requirements and entries marked as prototype placeholders.

## User and administrator workflows

| Area | Routes and behavior |
|---|---|
| Onboarding | `/wizard` and `/preview` let visitors answer questions, explicitly choose a taxpayer classification, and review answers before generating a roadmap. Guest answers stay in session storage. Signed-in wizard submission waits for profile persistence before opening the checklist. |
| Compliance workspace | `/dashboard`, `/checklist`, `/requirements/[id]`, and `/deadlines` show matching obligations, explanations, calendar dates, and plan-dependent progress or reminder controls. |
| Guidance and estimates | `/registration`, `/bir-forms`, `/renewal`, `/resources`, `/tutorials`, `/tax-calculator`, and `/penalties` cover guides, forms, external video links, and estimates. Renewal offers a Premium focus view for working through steps. |
| Account | Sign-up, email or configured Google sign-in, password recovery, profile and preferences, account lifecycle, and Premium information. |
| Administration | `/admin` links to Agencies, Requirements, Resources, Tutorials, Users, Audit log, and Manual reminders. Administrators can manage account status and Premium, review audit history, and prepare and record external reminder sends. Content edits are saved only in the current browser. |

On mobile, the bottom bar links to Overview, Checklist, Deadlines, Resources, and Tutorials. **More** opens Business Registration, BIR Forms, Penalties, Renewal, Tax Calculator, and Account. Users can select Light, Night Shift, or the device setting. The service worker provides a public offline fallback and caches eligible assets; signed-in pages and account writes require a connection.

### Access and subscriptions

- **Free:** Wizard and basic estimates, personalized checklist, requirement and agency information, basic deadline information, and basic tutorials.
- **Premium:** Adds deadline status, progress tracking, the resource library, supporting documents, detailed steps, penalty features, and manual reminders.
- **Admin:** Uses the assigned administrator role for account and content tools. Administrative Premium grants can have an expiry and can be revoked. Account and entitlement actions are recorded in the audit log.

The advertised Premium price is **₱199/month**. Access is granted manually; this version has no connected billing or automatic renewal. The public demo selector offers browser-only Free and Premium sessions when enabled. It does not offer administrator access or modify real accounts.

For manual reminders, an administrator reviews the eligible queue, copies and sends the message through an approved external process, then records the successful send in GabayNegosyo. The record is an administrative confirmation rather than delivery evidence. Keep automated delivery off for the current release.

## Technical stack and architecture

| Layer | Technology and responsibility |
|---|---|
| Web application | Next.js 16.4.3 series with App Router and Turbopack, React and React DOM 18.3.1, TypeScript 5.5.4. Server routes handle sensitive operations such as account status and deletion. |
| Interface | Custom CSS, Inter and Space Grotesk via Fontsource, reusable React components, responsive navigation, theme tokens, focus states, and reduced-motion support. |
| Authentication and data | Supabase Auth, Supabase JS, and PostgreSQL. SQL migrations define tables, triggers, Row Level Security (RLS), administrative functions, entitlements, audit events, and reminder records. |
| Compliance logic | Versioned JSON catalogs and typed code under `lib/` for applicability, deadline resolution, eligibility and estimates. Official-source URLs and review metadata travel with catalog records. |
| Browser storage | Guest wizard answers use session storage. Theme preferences, demo state, and content-editor overrides are browser-local. The signed-in data layer hydrates from Supabase and uses an in-memory cache while the session is active. |
| Hosting and integrations | Vercel hosts the Next.js build and server routes. Vercel Analytics is available as an integration. Google OAuth depends on provider configuration. Video playback takes place on YouTube. |
| Tooling | Node.js 22.18.0 or later, npm with `package-lock.json`, Node’s built-in test runner, TypeScript checks, and a contrast-check script. |

The main data flow is **wizard answers → business profile → applicability and timing rules → roadmap and calendar → saved progress**. Real account data and administrative records use Supabase; the reference catalog ships with the source. Premium UI gates control what the app displays. Bundled reference content should be treated as public, while user data and privileged operations rely on database policies and server authorization.

| Directory | Contents |
|---|---|
| `app/` | Public, workspace, and admin routes plus server API endpoints |
| `components/`, `styles/` | Navigation, guards, editors, cards, forms, and design styles |
| `lib/` | Authentication, database access, entitlements, rules, dates, calculators, and admin functions |
| `data/` | Agencies, requirements, forms, resources, tutorials, and NCR location data |
| `database/` | Supabase setup SQL, migrations, verification queries, and local rehearsal |
| `public/` | PWA manifest, service worker, icons, and application assets |
| `scripts/`, `tests/`, `docs/` | Build checks, automated tests, setup, operations, and product documentation |

## Set up and run

From the project root, install the locked dependencies and create a local environment file:

```powershell
npm ci
Copy-Item .env.example .env.local
```

On macOS or Linux, use `cp .env.example .env.local` in place of `Copy-Item`. Fill in the relevant settings, then run `npm run dev` and open [http://localhost:3000](http://localhost:3000). For a local demo, set `NEXT_PUBLIC_ENABLE_DEMO_ACCOUNTS=true`, restart the dev server, and open Log in.

| Setting | When to configure |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Connect authentication and signed-in data to the intended Supabase project. |
| `SUPABASE_SERVICE_ROLE_KEY` | Server-only credential for privileged routes that need it. Keep it out of public variables, source control, and shared archives. |
| `NEXT_PUBLIC_SITE_URL`, `NEXT_PUBLIC_CONTACT_EMAIL` | Set the deployed URL and support address. The production environment check requires both. |
| `NEXT_PUBLIC_ENABLE_DEMO_ACCOUNTS` | Enable local sample sessions for preview or QA. The default is off. |
| `REMINDERS_MODE` | Keep `off` for this release. The current administrator workflow uses manual sends. |

For connected environments, follow [Supabase setup](docs/SETUP.md) and [account and access setup](docs/ACCOUNT_AND_ACCESS.md). Start with `database/supabase_setup.sql` on a fresh project and reconcile the numbered migrations `001` through `009` against the target schema. On an existing project, review the applied history and use the [verification SQL](database/verification) before applying pending migrations in order. Configure the site URL and allowed redirects for confirmation, recovery, and optional [Google OAuth](docs/GOOGLE_OAUTH_SETUP.md). Assign the administrator role through the documented project setup.

For Vercel, deploy the intended source revision with matching environment settings and test against the corresponding Supabase environment. Deploying application code does not apply or reverse database migrations. Keep production and staging configuration separate and retain a tested database recovery procedure.

## Build, test, and release status

| Command | Purpose |
|---|---|
| `npm run dev` | Start the local development server |
| `npm run lint` | Run TypeScript checks with `tsc --noEmit` |
| `npm test` | Run the automated tests |
| `npm run contrast-check` | Check defined contrast pairs and regenerate the [contrast report](docs/CONTRAST_REPORT.md) |
| `npm run build` | Run the environment check and create the production build |
| `npm run start` | Serve the completed production build locally |

The v1.0.0 source checks recorded **334 passing tests**, **46 passing contrast pairs**, and a successful local production build. Public and demo routes were checked in desktop and mobile browser layouts. A read-only check reached the configured Supabase Auth endpoint and found email and Google sign-in enabled. This confirms endpoint reachability and provider settings only.

Before signing off on a deployment, verify the deployed revision and migrations. Use staging accounts to test sign-up, OAuth redirects, recovery, cross-device saves, isolation between two users, Premium grant/expiry/revocation, deactivation/reactivation, audit records, and manual reminder recording. Physical-device PWA and accessibility checks, independent calculator and eligibility review, and full recurring-period history remain open. See [testing guidance](docs/TESTING.md) and [open items](docs/OPEN_ITEMS.md).

## Documentation and maintenance

| Reference | Use it for |
|---|---|
| [Administrator guide](docs/ADMIN_GUIDE.md) | Content editors, users, account sync, Premium, and troubleshooting |
| [Manual reminder operations](docs/ADMIN_AND_MANUAL_REMINDERS.md) | Consent, queue eligibility, external sending, and recording |
| [Architecture](docs/ARCHITECTURE.md) and [account lifecycle](docs/ACCOUNT_AND_ACCESS.md) | Code, data, session, entitlement, and authorization boundaries |
| [Design](docs/DESIGN.md) and [NCR dataset report](data/ncr-barangays/README_REPORT.md) | Theme and responsive patterns, plus locality and RDO coverage |
| [Changelog](CHANGELOG.md) and [contributor instructions](AGENTS.md) | Release changes and repository conventions |

When changing a requirement, check the official source and record when it was reviewed. Check form and video links periodically. To publish an approved catalog change for all users, update the maintained source and deploy it. Browser-local admin edits remain on the device where they were saved.
