# Whoma Dev Log (append-only)

> Rule: Every development session appends one entry. No rewriting history.
> Keep it crisp, factual, and implementation-oriented.

---

## Session: 2026-02-25 / 13:06 (CET) — Foundation scaffold + docs operating system
**Author:** Codex  
**Context:** Bootstrap the Whoma MVP from an empty workspace and establish a reliable in-repo development log/task/architecture system for future agents.  
**Branch/PR:** `main` (uncommitted working tree)

### Goal
- Create a production-ready foundation scaffold for the lean MVP and add durable project docs so future agents can continue in PR-sized chunks with minimal re-discovery.

### Changes Made
- Bootstrapped a strict Next.js App Router + TypeScript + Tailwind project structure (config files, scripts, lint/format/test scaffolding).
- Added Prisma schema draft for the lean MVP entities only: `User`, `HomeownerProfile`, `AgentProfile`, `Property`, `Instruction`, `Proposal`, `MessageThread`, `Message`.
- Added domain utilities for instruction lifecycle rules, UK postcode helpers, GBP formatting, env parsing, and RBAC permissions.
- Added Zod schemas for instruction creation and structured proposal submission (comparable fields enforced; no freeform-only proposals).
- Added unit tests (instruction lifecycle, postcode helpers, proposal schema) and a Playwright landing-page smoke test scaffold.
- Built branded UI foundation (design tokens + reusable components) and MVP-oriented screen scaffolds:
  - Landing
  - Auth (sign-in / sign-up)
  - Homeowner create instruction
  - Agent marketplace
  - Instruction detail (agent + homeowner compare mode)
  - Proposal builder (stepper + live preview)
  - Proposal comparison table
  - Messages (gated chat concept)
  - Admin verification queue (minimal optional MVP admin)
- Added repo docs operating system: `DEVLOG.md`, `TASKS.md`, `ARCHITECTURE.md`, `CHANGELOG.json`, and repo-level `AGENTS.md` startup rule.

### Files / Modules Touched (high signal only)
- `package.json` — scripts/dependencies for Next, Prisma, Zod, RHF, React Query, Vitest, Playwright
- `prisma/schema.prisma` — lean MVP domain schema draft
- `src/lib/validation/proposal.ts` — structured/comparable proposal schema
- `src/lib/validation/instruction.ts` — instruction/property schema + bid window validation
- `src/lib/auth/rbac.ts` — role/action permission matrix scaffold
- `src/app/page.tsx` — branded public landing with explicit tender mechanics
- `src/app/(app)/agent/marketplace/[instructionId]/proposal/page.tsx` — proposal builder UI scaffold
- `src/app/(app)/homeowner/instructions/[instructionId]/compare/page.tsx` — homeowner comparison-first UI scaffold
- `src/components/proposal-compare-table.tsx` — standardized proposal comparison component
- `docs/DEVLOG.md` — append-only dev log system
- `docs/TASKS.md` — prioritized backlog with acceptance criteria
- `docs/ARCHITECTURE.md` — stable MVP architecture reference
- `docs/CHANGELOG.json` — machine-queryable session changelog
- `AGENTS.md` — startup rule for future agents

### Decisions (and why)
- **Decision:** Keep the domain model lean and exactly scoped to the MVP entity set.
  - **Why:** Reduces complexity and preserves focus on the instruction/proposal/award flow.
  - **Alternatives considered:** Adding referral/analytics/scoring entities now (rejected as premature).
- **Decision:** Build UI-first screen scaffolds before persistence/auth wiring.
  - **Why:** De-risks product flow, information hierarchy, and design system decisions early while enabling fast stakeholder review.
- **Decision:** Enforce structured proposal fields in Zod immediately.
  - **Why:** "Comparable proposals" is a core product differentiator and should be encoded at the boundary from day one.
- **Decision:** Add in-repo operational docs now (not later).
  - **Why:** Future coding agents need reliable context handoff to avoid repeating discovery work.

### Data / Schema Notes
- DB migrations: none yet (schema draft only; no generated migration checked in)
- New/changed Zod schemas:
  - `createInstructionSchema`
  - `proposalSubmissionSchema`
- RBAC changes:
  - Initial permission matrix scaffold for `HOMEOWNER`, `AGENT`, `ADMIN`

### How to Run / Test
- `npm install` — install dependencies (pnpm is preferred long-term but not installed on this machine yet)
- `cp .env.example .env` — local env bootstrap
- `npm run prisma:generate` — generate Prisma client
- `npm run dev` — start Next.js app
- `npm run test` — unit tests
- `npm run test:e2e` — Playwright smoke test (requires browser deps + local server)
- Manual checks:
  - [ ] Landing page loads and role CTAs render
  - [ ] Agent marketplace cards render countdown + primary `Submit Proposal` CTA
  - [ ] Proposal compare page renders structured columns and actions

### Known Issues / Risks
- Auth, server-side writes, and route protection are not implemented yet (UI scaffolds only).
- App has not been runtime-validated yet in this environment because dependencies are not installed.
- `pnpm` is not installed locally despite being preferred for team workflow.

### Next Steps
1. Implement auth + RBAC route protection (NextAuth/Clerk or equivalent) with role-aware guards for homeowner/agent routes.
2. Wire instruction create flow to Prisma via server actions/route handlers with server-side Zod validation and status transitions.
3. Wire proposal submission and homeowner shortlist/award actions, then unlock chat thread based on the configured rule.

---

## Session: 2026-02-25 / 13:14 (CET) — Runtime verification + landing parse fix
**Author:** Codex  
**Context:** User asked to continue building and run the app locally for preview.  
**Branch/PR:** `main` (uncommitted working tree)

### Goal
- Install dependencies, start the local dev server, fix any first-render runtime errors, and verify key MVP routes render.

### Changes Made
- Installed project dependencies with `npm install`.
- Fixed Next.js config warning by moving `typedRoutes` out of `experimental`.
- Fixed JSX parse error on the landing page caused by literal `->` text in JSX content.
- Started the Next.js dev server on `http://127.0.0.1:3000` and verified core routes via local HTTP checks.

### Files / Modules Touched (high signal only)
- `next.config.ts` — moved `typedRoutes` to the top-level config key (Next.js 15 warning cleanup)
- `src/app/page.tsx` — replaced literal `->` tender mechanics text with `→` to avoid JSX parse errors
- `docs/DEVLOG.md` — appended runtime verification session entry
- `docs/CHANGELOG.json` — appended structured session record

### Decisions (and why)
- **Decision:** Keep the dev server running after verification.
  - **Why:** User asked to see the app; leaving it live on localhost enables immediate review.
- **Decision:** Fix runtime issues immediately instead of deferring to a later cleanup task.
  - **Why:** Previewability is part of the acceptance for this session.

### Data / Schema Notes
- DB migrations: none
- New/changed Zod schemas: none
- RBAC changes: none

### How to Run / Test
- `npm install` — completed
- `npm run dev -- --hostname 127.0.0.1 --port 3000` — running successfully
- Manual checks:
  - [x] `GET /api/health` returns `{"status":"ok","service":"whoma-mvp"}`
  - [x] `/` renders landing headline + tender mechanics text
  - [x] `/agent/marketplace` renders marketplace shell + `Submit Proposal`
  - [x] `/agent/marketplace/ins_1/proposal` renders proposal builder + live preview

### Known Issues / Risks
- Core routes render, but auth/persistence/workflow writes are still scaffold-only.
- `pnpm` is still not installed locally (npm used for this run).

### Next Steps
1. Implement T001 (auth + RBAC route protection) and wire role-aware route guards.
2. Implement T002/T003 (persist instruction creation + proposal submission with Prisma + server-side validation).

---

## Session: 2026-02-25 / 13:30 (CET) — Auth + RBAC route protection (signed cookie dev auth)
**Author:** Codex  
**Context:** Audit found T001 as the biggest MVP blocker (no route protection, no server-enforced write auth). Implemented a lean auth/RBAC PR-sized slice without adding libraries.  
**Branch/PR:** `main` (uncommitted working tree)

### Goal
- Add server-enforced auth + RBAC route protection for homeowner/agent/admin surfaces and protect business write endpoints with shared Zod validation.

### Changes Made
- Added signed session cookie utilities (`whoma_session`) with HMAC verification and shared Zod schemas for sign-in payload/session payload.
- Added page-level route protection middleware for `/homeowner`, `/agent`, `/admin`, and `/messages` with unauthenticated redirect + cross-role redirect handling.
- Implemented `POST /api/auth/session` (sign-in) + `DELETE /api/auth/session` (sign-out) + `GET /api/auth/session` (session inspect) for development auth flow.
- Implemented protected stub write routes:
  - `POST /api/instructions` (HOMEOWNER only) using `createInstructionSchema`
  - `POST /api/proposals` (AGENT only) using `proposalSubmissionSchema`
- Updated `/sign-in` to submit a role + email form to the server auth route (no client-only auth).
- Added unit tests for auth session signing/verification and page route policy helpers.

### Files / Modules Touched (high signal only)
- `src/lib/auth/session.ts` — signed session cookie auth helpers + page policy helpers
- `src/middleware.ts` — route protection middleware
- `src/app/api/auth/session/route.ts` — dev auth sign-in/sign-out/session endpoints
- `src/app/api/instructions/route.ts` — homeowner-only validated write stub
- `src/app/api/proposals/route.ts` — agent-only validated write stub
- `src/app/(auth)/sign-in/page.tsx` — server-posted role sign-in form
- `src/lib/auth/session.test.ts` — auth/RBAC helper tests
- `docs/TASKS.md` — marked T001 complete

### Decisions (and why)
- **Decision:** Use signed-cookie development auth instead of full NextAuth/Clerk integration in this PR.
  - **Why:** Delivers route protection + server-enforced RBAC in a small, testable PR without expanding scope or adding setup complexity.
  - **Alternatives considered:** NextAuth credentials flow now (heavier integration, more files, less PR-sized for this step).
- **Decision:** Protect page routes in middleware and business writes in route handlers.
  - **Why:** Middleware handles UX redirects; route handlers remain the hard security boundary for writes.

### Data / Schema Notes
- DB migrations: none
- New/changed Zod schemas:
  - `signInSessionSchema` (auth payload)
  - `sessionPayloadSchema` (signed session token payload)
- RBAC changes:
  - Existing RBAC matrix is now enforced by server routes (`instruction:create`, `proposal:submit`)

### How to Run / Test
- `npm run dev -- --hostname 127.0.0.1 --port 3000`
- `npm run test -- src/lib/auth/session.test.ts`
- Manual checks:
  - [x] Unauthenticated `GET /homeowner/instructions/new` redirects to `/sign-in?next=...`
  - [x] AGENT session can access `/agent/marketplace`
  - [x] AGENT session is redirected away from `/homeowner/instructions/new`
  - [x] `POST /api/instructions` rejects AGENT (`403`)
  - [x] `POST /api/proposals` accepts valid AGENT payload (`201`)
  - [x] `POST /api/proposals` rejects invalid payload with Zod errors (`400`)
  - [x] `POST /api/instructions` accepts valid HOMEOWNER payload (`201`)

### Known Issues / Risks
- This is development auth (signed cookie), not a production identity provider integration.
- Protected write routes are validation/authorization stubs only; no Prisma persistence yet.
- Project-wide `npm run typecheck` still fails due pre-existing baseline issues (global `JSX.Element` typings + test typing/alias config) outside this PR scope.

### Next Steps
1. Implement T002 (Prisma-backed homeowner instruction creation) using `POST /api/instructions` as the security/validation boundary.
2. Implement T003 (Prisma-backed proposal submission) using `POST /api/proposals`, preserving duplicate-proposal protection.

---

## Session: 2026-02-25 / 13:35 (CET) — Homepage copy + trust + motion refresh
**Author:** Codex  
**Context:** Refine the public homepage to be more UK real-estate conversion-oriented (benefit-led, trust-forward) while preserving Whoma’s structured tender USP.  
**Branch/PR:** `main` (uncommitted working tree)

### Goal
- Improve homepage conversion copy and trust framing, add the WHOMA subtitle line, and introduce subtle premium motion without adding dependencies.

### Changes Made
- Rewrote the hero copy to be outcome-first and calmer in tone while still explaining the structured tender mechanic.
- Updated CTAs to `Create a homeowner brief` (primary) and `Join as an agent` (secondary).
- Added a trust strip under hero CTAs (`No obligation`, `Comparable proposals`, `Chat gated`).
- Added a `What you compare` section with six comparison cards (fees, inclusions, timeline, terms, local experience, verification).
- Added a `For Homeowners / For Agents` split section with concise value bullets for each side.
- Added an early-access placeholder callout (no fake testimonials / no invented ratings).
- Added logo subtitle support and used `Where Home Owners Meet Agents` in the public header.
- Added subtle CSS-only motion (staggered hero fade-up, tender card slide-in) and hover lift interactions.
- Fixed two lint issues in shared input primitives (`no-empty-object-type`) by converting empty interfaces to type aliases.

### Files / Modules Touched (high signal only)
- `src/app/page.tsx` — homepage copy/layout refresh + trust/compare/split sections
- `src/components/brand/logo.tsx` — optional subtitle line under WHOMA
- `src/app/globals.css` — reduced-motion-safe entry animations + interactive lift utility
- `src/components/ui/button.tsx` — subtle hover lift/shadow transitions for buttons
- `src/components/ui/input.tsx` — lint cleanup (type alias)
- `src/components/ui/textarea.tsx` — lint cleanup (type alias)
- `docs/DEVLOG.md` — appended session entry
- `docs/CHANGELOG.json` — appended structured session record

### Decisions (and why)
- **Decision:** Use CSS animations instead of Framer Motion.
  - **Why:** Meets the motion requirements with minimal overhead and no new dependency.
  - **Alternatives considered:** Framer Motion (rejected for lean MVP scope).
- **Decision:** Keep the tender mechanic visible in the hero side card while making the headline benefit-led.
  - **Why:** Preserves the product differentiator without leading with jargon.

### Data / Schema Notes
- DB migrations: none
- New/changed Zod schemas: none
- RBAC changes: none

### How to Run / Test
- `npm run dev -- --hostname 127.0.0.1 --port 3000`
- `npm run lint`
- `npm run test -- src/lib/auth/session.test.ts`
- `npm run build` (note: can fail in sandbox without network access to Google Fonts)
- Manual checks:
  - [x] Header shows logo subtitle: `Where Home Owners Meet Agents`
  - [x] Hero shows benefit-led H1 + updated CTAs
  - [x] Trust strip renders under hero CTAs
  - [x] `What you compare` section renders six cards
  - [x] `For Homeowners / For Agents` split section renders
  - [x] Hero/tender card entry animations are subtle and non-looping
  - [x] Hover lift on buttons/cards feels restrained

### Known Issues / Risks
- Production build can fail in this sandbox when `next/font` cannot reach `fonts.googleapis.com`.
- Some project-wide typecheck issues remain from earlier scaffold patterns (`JSX.Element` annotations / Vitest alias config), unrelated to this homepage refresh.

### Next Steps
1. Continue with T002/T003 persistence work while keeping the public homepage copy stable.
2. Optionally add a real early-access capture flow (server-side validated) instead of the placeholder CTA loop.

---

## Session: 2026-02-25 / 13:57 (CET) — Trust pages + HTML sitemap + location browse
**Author:** Codex  
**Context:** Add table-stakes trust/support pages and a lean SEO/discovery surface (`/locations`) without turning Whoma into a property portal.  
**Branch/PR:** `main` (uncommitted working tree)

### Goal
- Ship a small, credible public trust/SEO slice: footer links to legal/support pages, a basic HTML sitemap, and browse LIVE Instructions by location (postcode district / city).

### Changes Made
- Added a shared mock LIVE-instruction dataset module and reused it in the agent marketplace to avoid duplicate demo data.
- Added a reusable public footer component with trust/support links (`Privacy`, `Cookies`, `Terms`, `Complaints`, `Contact`, `Sitemap`) and a `Browse Instructions` link.
- Added root-level dynamic static-content routing for:
  - `/privacy`
  - `/cookies`
  - `/terms`
  - `/complaints`
  - `/contact`
  - `/sitemap`
- Added professional placeholder copy for legal/support pages and explicit TODO notices for legal review before launch.
- Implemented `/sitemap` as a basic HTML sitemap listing key public pages and location browse routes.
- Added `/locations` and `/locations/[postcodeDistrict]` public pages that list LIVE Instructions (not properties for sale), grouped by postcode district/city.
- Wired the public footer into the homepage so trust/support links are discoverable from the main landing page.

### Files / Modules Touched (high signal only)
- `src/lib/mock/live-instructions.ts` — shared mock LIVE Instructions dataset + location summary/filter helpers
- `src/app/(app)/agent/marketplace/page.tsx` — consume shared mock dataset
- `src/components/layout/public-footer.tsx` — public footer with trust/support/sitemap/location links
- `src/app/page.tsx` — add public footer to landing page
- `src/app/[slug]/page.tsx` — dynamic static page handler for legal/support pages + HTML sitemap
- `src/app/locations/page.tsx` — locations index with district cards + LIVE Instruction previews
- `src/app/locations/[postcodeDistrict]/page.tsx` — location-specific LIVE Instruction feed
- `docs/TASKS.md` — mark trust pages/location browse work complete and add cookie-consent follow-up

### Decisions (and why)
- **Decision:** Use a single root dynamic route (`src/app/[slug]/page.tsx`) for legal/support pages + HTML sitemap.
  - **Why:** Keeps the PR small, avoids repetitive boilerplate, and still provides explicit URLs (`/privacy`, `/cookies`, etc.).
  - **Alternatives considered:** One file per route (clear but more boilerplate).
- **Decision:** Reuse the marketplace card shape/data for location pages.
  - **Why:** Ensures consistency and reinforces that Whoma browses LIVE Instructions, not property listings.
- **Decision:** Add placeholder legal copy with visible TODO legal-review notices.
  - **Why:** Provides credible page structure now while avoiding over-claiming legal completeness.

### Data / Schema Notes
- DB migrations: none
- New/changed Zod schemas: none
- RBAC changes: none

### How to Run / Test
- `npm run dev -- --hostname 127.0.0.1 --port 3000`
- `npm run lint` — passed
- `npm run test -- src/lib/auth/session.test.ts` — passed
- `npm run build` — failed in sandbox (`next/font` could not fetch Google Fonts from `fonts.googleapis.com`)
- Manual checks:
  - [x] `/privacy` returns `200` (sequential check on fresh local dev server)
  - [ ] `/cookies`, `/terms`, `/complaints`, `/contact` render placeholder policy/support pages with TODO legal-review notice
  - [x] `/sitemap` returns `200` (sequential check on fresh local dev server)
  - [ ] `/sitemap` visually lists key public pages and `/locations/*` routes
  - [ ] `/locations` shows location cards and LIVE Instruction cards (not property-for-sale wording)
  - [x] `/locations/SW1A` returns `200` (sequential check on fresh local dev server)
  - [ ] `/locations/SW1A` visually filters to only SW1A LIVE Instructions
  - [ ] Landing page footer shows trust/support/sitemap/location links

### Known Issues / Risks
- Legal/support copy is placeholder-only and requires legal/ops review before launch.
- `/sitemap` is HTML only (no XML sitemap metadata route yet).
- Location pages currently use shared mock data and are not backed by Prisma yet.
- Production build remains blocked in this sandbox when `next/font` cannot reach Google Fonts.

### Next Steps
1. Implement T014 cookie consent mechanism and link the live preferences control from `/cookies`.
2. Replace mock location browse data with Prisma-backed LIVE Instructions once T002/T003 persistence is complete.

---

## Session: 2026-02-25 / 14:11 (CET) — Dev preview access for local auth-less exploration
**Author:** Codex  
**Context:** Google OAuth is intentionally configured for production-style auth, but local credentials were not set, blocking the user from entering protected platform routes for review.  
**Branch/PR:** `main` (uncommitted working tree)

### Goal
- Unblock local exploration of the protected app by adding a dev-only preview sign-in path while keeping NextAuth as the single auth system.

### Changes Made
- Added a dev-only NextAuth Credentials provider (`preview`) that accepts a validated `email` + `role` (`HOMEOWNER`/`AGENT`) and issues a JWT session for local preview use.
- Updated the shared Google auth button component to show a `Local preview access` panel when Google OAuth credentials are missing in development.
- Added `Preview as Homeowner` and `Preview as Agent` buttons that sign in through NextAuth and redirect into the correct protected area.
- Preserved production behavior: Google remains the primary/only visible path when OAuth credentials are configured.

### Files / Modules Touched (high signal only)
- `src/auth.ts` — add dev-only NextAuth credentials provider (`preview`) with Zod validation
- `src/components/auth/google-auth-button.tsx` — local preview access UI + NextAuth `signIn("preview")` actions
- `docs/DEVLOG.md` — appended session entry

### Decisions (and why)
- **Decision:** Add a dev-only preview provider inside NextAuth instead of reintroducing a custom auth route.
  - **Why:** Keeps a single auth system, preserves middleware/session integration, and minimizes local setup friction.
  - **Alternatives considered:** Reinstating bespoke signed-cookie auth (rejected as a second auth path).
- **Decision:** Show preview access only when Google credentials are missing and in development.
  - **Why:** Prevents production confusion and keeps the intended OAuth UX primary when configured.

### Data / Schema Notes
- DB migrations: none
- New/changed Zod schemas:
  - `previewCredentialsSchema` (dev-only auth payload validation)
- RBAC changes: none (existing role-based route protection is reused)

### How to Run / Test
- `npm run dev -- --hostname 127.0.0.1 --port 3012`
- `npm run lint` — passed
- Manual checks:
  - [x] `/sign-in` renders `Local preview access`, `Preview as Homeowner`, and `Preview as Agent` when Google env vars are missing
  - [ ] Clicking `Preview as Homeowner` lands in homeowner platform area
  - [ ] Clicking `Preview as Agent` lands in agent marketplace

### Known Issues / Risks
- Preview provider is development-only convenience auth and must not be used as a production identity path.
- Google OAuth still requires `GOOGLE_CLIENT_ID`/`GOOGLE_CLIENT_SECRET` for real end-to-end Google sign-in testing.

### Next Steps
1. Use the local preview buttons to review protected homeowner/agent screens immediately.
2. Configure Google OAuth env vars when ready to validate the production sign-in path.

---

## Session: 2026-03-19 / 16:19 (GMT) — Local launch + GitHub repository setup
**Author:** Codex  
**Context:** User requested launching the site in-browser and creating a GitHub repository to continue feature development.  
**Branch/PR:** `main` (uncommitted working tree)

### Goal
- Relaunch local preview access and establish a remote GitHub repo for ongoing collaboration.

### Changes Made
- Followed startup rule by reading `docs/DEVLOG.md`, `docs/TASKS.md`, and `docs/ARCHITECTURE.md`, then summarized project status and proposed the next PR-sized change (`T002`).
- Started local dev server with `npm run dev -- --hostname 127.0.0.1 --port 3012`.
- Opened `http://127.0.0.1:3012` in the local browser and confirmed live requests in the Next.js server logs.
- Re-authenticated GitHub CLI via device flow and confirmed `gh auth status` is healthy.
- Created private remote repository `https://github.com/hdmurder/WHOMA` and configured it as `origin`.
- Updated `.gitignore` to ignore TypeScript build artifacts (`*.tsbuildinfo`) before first commit.

### Files / Modules Touched (high signal only)
- `.gitignore` — added `*.tsbuildinfo`
- `docs/DEVLOG.md` — appended session entry
- `docs/CHANGELOG.json` — appended structured session record

### Decisions (and why)
- **Decision:** Use a private repository by default.
  - **Why:** Safer default while the product is still evolving quickly.
- **Decision:** Run local preview on `127.0.0.1:3012`.
  - **Why:** Matches recent project dev flow and avoids clashing with other local services.

### Data / Schema Notes
- DB migrations: none
- New/changed Zod schemas: none
- RBAC changes: none

### How to Run / Test
- `npm run dev -- --hostname 127.0.0.1 --port 3012`
- Open: `http://127.0.0.1:3012`
- `gh auth status`
- `git remote -v`

### Known Issues / Risks
- No product-domain implementation changes in this session (environment/repo setup only).

### Next Steps
1. Push the initial commit to `origin/main`.
2. Start `T002` (Prisma-backed homeowner instruction creation flow).

---

## Session: 2026-03-19 / 16:36 (GMT) — Phase 1 pivot to real estate agent identity validation
**Author:** Codex  
**Context:** Product direction clarified: Phase 1 priority is validating real estate agent adoption around personal credibility and identity branding before homeowner-flow expansion.  
**Branch/PR:** `main` (uncommitted working tree)

### Goal
- Re-prioritize delivery plan and codify a living architecture/feature map process for every future update.

### Changes Made
- Added `docs/PLATFORM_MAP.md` as a persistent architecture/feature relationship map covering:
  - onboarding -> CV builder -> public profile -> directory dependencies
  - frontend/backend split and data model anchors
  - mandatory update protocol per implementation session
- Added `docs/PHASE1_AGENT_VALIDATION_PLAN.md` with:
  - validation hypothesis
  - in-scope/out-of-scope boundaries
  - dated milestones through onboarding launch on Monday 2026-03-30
  - weekly demo expectations
- Updated `docs/TASKS.md` to make Phase 1 real estate agent identity validation the active priority (A001-A006), with explicit milestone dates and deferred Phase 2 marketplace items.
- Updated `docs/ARCHITECTURE.md` to reflect current build priority and link both map/plan docs.
- Updated `AGENTS.md` startup/end-of-session rules so all coding sessions read and maintain `docs/PLATFORM_MAP.md`.

### Files / Modules Touched (high signal only)
- `AGENTS.md` — governance rules now include `docs/PLATFORM_MAP.md`
- `docs/TASKS.md` — new Phase 1 priority track and milestone plan
- `docs/ARCHITECTURE.md` — current build priority + plan/map references
- `docs/PLATFORM_MAP.md` — new cross-feature architecture map
- `docs/PHASE1_AGENT_VALIDATION_PLAN.md` — new execution plan for March 30 onboarding target
- `docs/DEVLOG.md` — appended session entry
- `docs/CHANGELOG.json` — appended structured session record

### Decisions (and why)
- **Decision:** Prioritize agent-side identity features ahead of homeowner workflow completion.
  - **Why:** This directly tests the core adoption hypothesis with fastest path to real-world signal.
- **Decision:** Introduce mandatory architecture-map updates each session.
  - **Why:** Reduces architecture drift and keeps feature relationships explicit as scope grows.
- **Decision:** Use dated milestones ending on 2026-03-30 for onboarding launch readiness.
  - **Why:** Aligns build execution with weekly demo cadence and operational planning.

### Data / Schema Notes
- DB migrations: none in this planning/session doc update
- New/changed Zod schemas: none
- RBAC changes: none

### How to Run / Test
- `npm run dev -- --hostname 127.0.0.1 --port 3012`
- Review docs:
  - `docs/PLATFORM_MAP.md`
  - `docs/PHASE1_AGENT_VALIDATION_PLAN.md`
  - `docs/TASKS.md`
  - `docs/ARCHITECTURE.md`

### Known Issues / Risks
- Timeline is feasible only if Phase 1 remains tightly scoped to onboarding/CV/public profile/directory and avoids Phase 2 marketplace expansion during this window.
- "Genuine registration" may require stronger verification (beyond Google sign-in + manual review) in a later increment if abuse appears.

### Next Steps
1. Implement A001 (agent onboarding foundation + server-side profile bootstrap write).
2. Expand `AgentProfile` schema for structured CV fields and public profile publishing flags.
3. Build `/agents/[slug]` and `/agents` with publish eligibility filters.

---

## Session: 2026-03-19 / 17:04 (GMT) — Phase 1 implementation: onboarding, CV builder, public profiles, directory
**Author:** Codex  
**Context:** User requested full Phase 1 implementation with step-by-step delivery and stronger scalable foundations, plus language/copy refinement.  
**Branch/PR:** `main` (uncommitted working tree)

### Goal
- Implement all scoped Phase 1 real estate agent identity features end-to-end and align platform copy to the new positioning.

### Changes Made
- Extended Prisma `AgentProfile` model for Phase 1 identity workflows:
  - Added fields for `jobTitle`, `workEmail`, `phone`, `bio`, `yearsExperience`, `achievements`, `languages`, `profileSlug`, `profileStatus`, `profileCompleteness`, `onboardingCompletedAt`, `publishedAt`, `updatedAt`.
  - Added `AgentProfileStatus` enum (`DRAFT`, `PUBLISHED`) and indexes for profile/verification queries.
- Added shared validation module `src/lib/validation/agent-profile.ts`:
  - onboarding schema
  - CV draft schema
  - publish schema with stricter checks
  - CSV list parsing helper for server actions
- Added scalable domain service layer `src/server/agent-profile/service.ts`:
  - onboarding completion
  - draft save
  - publish with completeness guardrail (70% threshold)
  - public profile/directory queries
  - admin verification updates
  - onboarding funnel counters
- Implemented real estate agent onboarding UI flow:
  - new `/agent/onboarding` page with guided professional information capture
  - server-side validation and persistence
  - verification status set to `PENDING` on onboarding completion
- Implemented CV builder flow:
  - new `/agent/profile/edit` page with draft + publish actions
  - profile readiness display and public profile preview link
  - new `/agent/profile` redirect route
- Implemented public directory surfaces:
  - new `/agents` directory with `area`, `specialty`, and `verified` filters
  - new `/agents/[slug]` public profile page with SEO metadata and trust/coverage sections
- Replaced admin verification placeholder with live queue:
  - `/admin/agents` now reads real profiles, supports verification updates, and shows funnel counters (`started`, `completed`, `published`, `verified`)
- Updated auth/routing foundations:
  - `defaultRouteForRole("AGENT")` now routes to `/agent/onboarding`
  - preview credentials provider now upserts preview users in Prisma for reliable local flow testing
  - RBAC action set expanded for onboarding/edit/publish/directory actions
- Refined platform copy across key surfaces to explicitly use “Real Estate Agent” terminology and added public directory visibility in navigation/footer/header.
- Fixed pre-existing Vitest alias configuration so `@/` imports resolve in tests.

### Files / Modules Touched (high signal only)
- `prisma/schema.prisma` — expanded `AgentProfile` + new `AgentProfileStatus`
- `src/lib/validation/agent-profile.ts` — new Phase 1 validation boundary
- `src/server/agent-profile/service.ts` — new domain service layer for profile/onboarding workflows
- `src/app/(app)/agent/onboarding/page.tsx` — guided onboarding flow
- `src/app/(app)/agent/profile/edit/page.tsx` — CV builder + draft/publish actions
- `src/app/agents/page.tsx` — public directory
- `src/app/agents/[slug]/page.tsx` — public profile page
- `src/app/(app)/admin/agents/page.tsx` — live verification queue + counters
- `src/components/layout/app-shell.tsx` — role nav updates and role labeling
- `src/auth.ts` — preview provider persistence updates
- `src/lib/auth/session.ts` — AGENT default route updated
- `src/lib/auth/rbac.ts` — new agent-profile action permissions
- `src/components/layout/public-footer.tsx`, `src/app/page.tsx`, auth/location/static pages — copy/language updates
- `vitest.config.ts` — alias resolution fix
- `docs/TASKS.md` — Phase 1 tasks/milestones marked complete
- `docs/ARCHITECTURE.md`, `docs/PLATFORM_MAP.md`, `docs/PHASE1_AGENT_VALIDATION_PLAN.md` — architecture map and delivery docs updated
- `docs/DEVLOG.md`, `docs/CHANGELOG.json` — session records appended

### Decisions (and why)
- **Decision:** Introduce a dedicated profile domain service layer now.
  - **Why:** Keeps onboarding/CV/publish/directory logic centralized, reusable, and easier to scale.
- **Decision:** Gate profile publishing with server-enforced completeness threshold.
  - **Why:** Ensures minimum profile quality for public directory trust.
- **Decision:** Route agents to onboarding as their default post-role destination.
  - **Why:** Aligns product flow to Phase 1 validation objective.

### Data / Schema Notes
- DB migrations: schema updated, but no migration file generated in this session.
- New/changed Zod schemas:
  - `agentOnboardingSchema`
  - `agentProfileDraftSchema`
  - `agentProfilePublishSchema`
- RBAC changes:
  - Added `agent:profile:onboard`, `agent:profile:edit`, `agent:profile:publish`, `agent:directory:view`

### How to Run / Test
- `npm run prisma:generate` — passed
- `npm run lint` — passed
- `npm run test` — passed (13/13)
- `npm run typecheck` — still fails due pre-existing project-wide baseline typing issues outside this session’s scope (`JSX` namespace typing, typed-routes strictness, historical NextAuth adapter typing)

### Known Issues / Risks
- Prisma schema has changed but DB migration is still pending (`prisma migrate dev` needed against target database).
- Production onboarding still depends on valid Google OAuth env configuration.
- Full project `typecheck` baseline remains unresolved and should be addressed in a dedicated hardening pass.

### Next Steps
1. Generate/apply Prisma migration for the new `AgentProfile` fields and enums.
2. Run end-to-end manual QA of onboarding -> CV -> publish -> directory -> admin verification with real auth sessions.
3. Start controlled onboarding pilot operations toward Monday 2026-03-30 launch.
