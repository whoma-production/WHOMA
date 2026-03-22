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

---

## Session: 2026-03-19 / 17:06 (GMT) — Dev preview auth regression fix (no DATABASE_URL fallback)

**Author:** Codex  
**Context:** Live dev logs surfaced a regression: preview credential sign-in failed when `DATABASE_URL` was absent locally because preview auth now attempted Prisma writes.  
**Branch/PR:** `main` (uncommitted working tree)

### Goal

- Restore local preview sign-in reliability while preserving DB-backed preview user upserts when a database is configured.

### Changes Made

- Updated `src/auth.ts` preview credentials provider:
  - If `DATABASE_URL` is not set, fallback to stateless preview user object (no Prisma call).
  - If `DATABASE_URL` exists, keep Prisma `upsert` behavior for persistent preview users.
- Re-ran lint and tests after the fix.

### Files / Modules Touched (high signal only)

- `src/auth.ts` — preview auth now supports both DB-backed and DB-less local development
- `docs/DEVLOG.md` — appended session entry
- `docs/CHANGELOG.json` — appended structured session record

### Decisions (and why)

- **Decision:** Make preview auth dual-mode (DB-backed when available, stateless fallback when not).
  - **Why:** Keeps local onboarding exploration unblocked without forcing DB setup while still supporting persistent preview identities in DB-ready environments.

### Data / Schema Notes

- DB migrations: none
- New/changed Zod schemas: none
- RBAC changes: none

### How to Run / Test

- `npm run lint` — passed
- `npm run test` — passed (13/13)
- Runtime validation: dev server logs no longer show `DATABASE_URL` Prisma init failure after patch compile

### Known Issues / Risks

- Full Prisma-backed onboarding/profile flows still require `DATABASE_URL` and applied migrations for real persistence.

### Next Steps

1. Configure `DATABASE_URL` and run Prisma migration for Phase 1 schema before pilot onboarding.
2. Execute end-to-end QA with real DB-backed sessions and verification updates.

---

## Session: 2026-03-21 / 17:28 (GMT) — Dev preview ADMIN sign-in support

**Author:** Codex  
**Context:** QA requested a dev-only ADMIN preview sign-in path while preserving the existing DB-aware fallback behavior for local development.  
**Branch/PR:** `main` (uncommitted working tree)

### Goal

- Extend preview credentials to allow ADMIN in development and add an explicit admin preview entrypoint in the auth UI.

### Changes Made

- Extended the preview credentials schema in `src/auth.ts` to accept `ADMIN` alongside `HOMEOWNER` and `AGENT`.
- Kept the preview provider development-only and preserved the existing `DATABASE_URL`-aware fallback: DB-backed preview users still upsert when a database is configured, and stateless preview identities still work without `DATABASE_URL`.
- Updated the preview auth UI in `src/components/auth/google-auth-button.tsx` to add "Preview as Admin" and route the admin preview flow to `/admin/agents`.

### Files / Modules Touched (high signal only)

- `src/auth.ts` — preview credentials schema/provider now accepts ADMIN in development
- `src/components/auth/google-auth-button.tsx` — added admin preview button and admin redirect target
- `docs/TASKS.md` — clarified T001 acceptance for dev preview ADMIN support
- `docs/PLATFORM_MAP.md` — documented dev preview credentials support in auth/session flow
- `docs/DEVLOG.md` — appended session entry
- `docs/CHANGELOG.json` — appended structured session record

### Decisions (and why)

- **Decision:** Keep preview auth strictly development-only.
  - **Why:** QA gets a convenient admin preview path without broadening production auth behavior.
- **Decision:** Preserve DB-less preview fallback unchanged.
  - **Why:** Local development should still work even when `DATABASE_URL` is missing.

### Data / Schema Notes

- DB migrations: none
- New/changed Zod schemas:
  - `previewCredentialsSchema` now includes `ADMIN`
- RBAC changes: none

### How to Run / Test

- `npm run lint` — passed
- Manual QA: preview sign-in buttons now include "Preview as Admin" and should land on `/admin/agents`

### Known Issues / Risks

- Preview auth remains non-production and should not be enabled in production builds.

### Next Steps

1. If needed, add a dedicated QA convenience path for other admin preview workflows.
2. Continue with the next PR-sized marketplace/persistence slice.

---

## Session: 2026-03-21 / 17:56 (GMT) — Prisma migration + full DB-backed Phase 1 QA + reliability hardening

**Author:** Codex  
**Context:** Execute the next Phase 1 step end-to-end: apply Prisma migration, validate DB-backed onboarding -> publish -> verification, and strengthen platform reliability before pilot onboarding.  
**Branch/PR:** `main` (uncommitted working tree)

### Goal

- Make Phase 1 operationally reliable with real database persistence and repeatable QA evidence.

### Changes Made

- Added the checked-in migration files:
  - `prisma/migrations/20260321173500_phase1_agent_profile_platform/migration.sql`
  - `prisma/migrations/migration_lock.toml`
- Applied migration SQL to local Postgres (`whoma_dev`) and confirmed schema objects were created.
- Added DB-backed Phase 1 service test: `src/server/agent-profile/phase1-flow.test.ts`.
- Added and stabilized E2E flow test: `tests/e2e/phase1-agent-flow.spec.ts` (onboarding -> CV draft/publish -> admin verify -> verified directory/public profile).
- Updated Playwright config (`playwright.config.ts`) to support both:
  - default local auto-server mode, and
  - attaching to an already running server (`PLAYWRIGHT_SKIP_WEB_SERVER=1`, `PLAYWRIGHT_BASE_URL`, optional `PLAYWRIGHT_WEB_SERVER_COMMAND`).
- Fixed a publish action bug in `src/app/(app)/agent/profile/edit/page.tsx` where successful publish redirects were being caught and converted into `publish_blocked`.
- Hardened `src/server/agent-profile/service.ts`:
  - preserve existing slug on onboarding reruns,
  - publish path no longer relies on draft-save side effects,
  - publish completeness is validated before write,
  - specialty filtering is case-insensitive/substring-based for directory UX,
  - verification guardrail requires published + completeness threshold before allowing `VERIFIED`.
- Updated admin verification UX in `src/app/(app)/admin/agents/page.tsx` to show a specific error when verification prerequisites are not met.

### Files / Modules Touched (high signal only)

- `prisma/migrations/20260321173500_phase1_agent_profile_platform/migration.sql`
- `prisma/migrations/migration_lock.toml`
- `src/server/agent-profile/phase1-flow.test.ts`
- `tests/e2e/phase1-agent-flow.spec.ts`
- `playwright.config.ts`
- `src/app/(app)/agent/profile/edit/page.tsx`
- `src/server/agent-profile/service.ts`
- `src/app/(app)/admin/agents/page.tsx`
- `docs/TASKS.md`
- `docs/ARCHITECTURE.md`
- `docs/PLATFORM_MAP.md`
- `docs/DEVLOG.md`
- `docs/CHANGELOG.json`

### Decisions (and why)

- **Decision:** Keep migration SQL checked in and executable even when local Prisma schema engine tooling is unstable.
  - **Why:** Unblocks database-backed validation and keeps migration history explicit for team handoffs.
- **Decision:** Enforce verification readiness (`PUBLISHED` + completeness threshold) in the service layer.
  - **Why:** Trust badges should reflect profile quality and prevent accidental over-verification.
- **Decision:** Add DB-backed automated coverage in both service tests and E2E.
  - **Why:** Phase 1 readiness depends on real persistence transitions, not UI-only checks.

### Data / Schema Notes

- DB migrations:
  - Added and applied: `20260321173500_phase1_agent_profile_platform`
- New/changed Zod schemas: none in this session
- RBAC changes: none in this session (existing checks reused)

### How to Run / Test

- `npm run lint` — passed
- `npm run test` — passed (14/14, includes DB-backed `phase1-flow.test.ts`)
- `PLAYWRIGHT_SKIP_WEB_SERVER=1 PLAYWRIGHT_BASE_URL=http://127.0.0.1:3012 npx playwright test tests/e2e/phase1-agent-flow.spec.ts --project=chromium` — passed

### Known Issues / Risks

- `prisma migrate status`/`prisma migrate dev` may still fail in this local sandbox due schema-engine instability; migration SQL is currently the reliable execution path.
- DB/network checks to localhost may require elevated execution context in this environment.

### Next Steps

1. Seed and onboard pilot real estate agents against the DB-backed flow ahead of Monday 2026-03-30.
2. Begin Phase 2 persistence tasks (`T002`/`T003`) while preserving the Phase 1 trust/profile foundation.

---

## Session: 2026-03-21 / 18:06 (GMT) — Marketplace write infrastructure baseline (data-led backend hardening)

**Author:** Codex  
**Context:** User requested a future-oriented, robust backend foundation for web deployment and scaling, with strong data-led primitives that future coding agents can extend confidently.  
**Branch/PR:** `main` (uncommitted working tree)

### Goal

- Implement a PR-sized backend infrastructure slice that upgrades marketplace writes from validation stubs to durable Prisma persistence with domain guardrails, operational error semantics, and better observability.

### Changes Made

- Added a dedicated marketplace domain service: `src/server/marketplace/service.ts`.
  - `createInstructionForHomeowner(...)`: transactionally persists `Property + Instruction` and infers `DRAFT/LIVE` status.
  - `submitProposalForAgent(...)`: enforces instruction existence, `LIVE` status, active bid window, no self-bidding, duplicate protection, and request-time expiry reconciliation (`LIVE` -> `CLOSED` when window ended).
  - Added typed domain errors (`MarketplaceServiceError`) and HTTP status mapping helper.
- Upgraded `POST /api/instructions` and `POST /api/proposals` from validation-only stubs to persisted write boundaries using the new service layer.
  - Added structured API response envelopes with explicit error codes/messages/details.
- Expanded operational health endpoint:
  - `GET /api/health` now reports DB readiness (`up` / `down` / `unconfigured`), uptime, timestamp, and returns degraded status (`503`) when DB connectivity fails.
- Added structured seller requirement persistence:
  - Prisma schema updated: `Instruction.mustHaves String[] @default([])`.
  - Added migration: `prisma/migrations/20260321184000_marketplace_write_infra/migration.sql`.
- Added infrastructure planning artifact:
  - `docs/BACKEND_INFRA_BLUEPRINT.md` with now/near-future/scale roadmap and explicit coding-agent backend contracts.
- Added new service-level tests:
  - `src/server/marketplace/service.test.ts` for status inference, bid-window guardrails, and error-code HTTP mapping.
- Hardened existing DB-backed Phase 1 test execution ergonomics:
  - `src/server/agent-profile/phase1-flow.test.ts` now runs only when both `DATABASE_URL` is set and `RUN_DB_TESTS=true`.
  - This keeps default `npm run test` deterministic in environments without a running local Postgres.

### Files / Modules Touched (high signal only)

- `src/server/marketplace/service.ts` — new marketplace persistence/domain guard service
- `src/server/marketplace/service.test.ts` — new tests for domain guard logic
- `src/app/api/instructions/route.ts` — persisted homeowner write boundary + structured errors
- `src/app/api/proposals/route.ts` — persisted agent write boundary + structured errors
- `src/app/api/health/route.ts` — DB readiness + degraded status signal
- `prisma/schema.prisma` — added `Instruction.mustHaves`
- `prisma/migrations/20260321184000_marketplace_write_infra/migration.sql` — migration for `mustHaves`
- `src/server/agent-profile/phase1-flow.test.ts` — DB integration test opt-in guard
- `docs/TASKS.md` — recorded progress on T002/T003 and added T015 completion
- `docs/PLATFORM_MAP.md` — added marketplace write persistence relationships and backend deltas
- `docs/ARCHITECTURE.md` — documented new migration, write boundaries, and health behavior
- `docs/BACKEND_INFRA_BLUEPRINT.md` — added backend scaling blueprint for future implementation slices
- `docs/DEVLOG.md` — appended session entry
- `docs/CHANGELOG.json` — appended structured session record

### Decisions (and why)

- **Decision:** Add a dedicated marketplace service layer before wiring more UI forms.
  - **Why:** Keeps write-path invariants centralized and reusable for future routes/actions/agents.
- **Decision:** Introduce typed error codes mapped to HTTP statuses.
  - **Why:** Improves observability, supportability, and deterministic client behavior.
- **Decision:** Persist `mustHaves` as structured array data now.
  - **Why:** Avoids flattening/lossy storage and keeps instruction intent queryable for future ranking/comparison.
- **Decision:** Gate DB integration tests behind `RUN_DB_TESTS=true`.
  - **Why:** Prevents false-negative local test failures when `DATABASE_URL` exists but DB is offline.

### Data / Schema Notes

- DB migrations:
  - Added: `20260321184000_marketplace_write_infra` (`Instruction.mustHaves` column)
- New/changed Zod schemas: none (reused existing `createInstructionSchema` and `proposalSubmissionSchema`)
- RBAC changes: none (reused existing `instruction:create` and `proposal:submit` checks)

### How to Run / Test

- `npm run prisma:generate` — passed
- `npm run test` — passed (marketplace tests green; DB-backed Phase 1 flow skipped by default unless opt-in)
- `npm run lint` — passed
- Optional DB integration test mode:
  - `RUN_DB_TESTS=true npm run test`

### Known Issues / Risks

- Full project `npm run typecheck` still fails due pre-existing baseline typing issues outside this PR scope.
- Homeowner/agent UI pages for instruction/proposal form submission are still scaffold-level and not fully wired to these APIs.

### Next Steps

1. Wire `/homeowner/instructions/new` and `/agent/marketplace/[instructionId]/proposal` to the persisted APIs with user-facing success/error handling.
2. Replace mock LIVE instruction listing with Prisma-backed marketplace queries.
3. Add rate limiting + idempotency keys on write endpoints ahead of broader external rollout.

---

## Session: 2026-03-21 / 18:10 (GMT) — Homeowner instruction form wiring

**Author:** Codex  
**Context:** User asked to implement only the homeowner instruction form wiring on `/homeowner/instructions/new`, without touching API route handlers.  
**Branch/PR:** `main` (uncommitted working tree)

### Goal

- Convert the homeowner instruction page from a scaffold into a working client-side form that posts a structured instruction payload to `POST /api/instructions`.

### Changes Made

- Reworked `src/app/(app)/homeowner/instructions/new/page.tsx` into a client component with controlled inputs for property details, seller brief, and bid window fields.
- Added native select controls for `propertyType` and `targetTimeline`, plus `datetime-local` inputs for bid window start/end and a synchronized `bidWindowHours` field.
- Parsed comma-separated must-haves into a structured `string[]` and sent `photos: []` to match the create-instruction schema.
- Wired form submission to `fetch("/api/instructions")` with `Content-Type: application/json` and an `Idempotency-Key` header.
- Added success and error envelopes in the UI, including API error details when present.
- Updated the repo docs to reflect the route moving from scaffold to working form wiring.

### Files / Modules Touched (high signal only)

- `src/app/(app)/homeowner/instructions/new/page.tsx` — working client-side instruction form
- `docs/TASKS.md` — marked T002 complete and updated progress notes
- `docs/ARCHITECTURE.md` — updated route surface description
- `docs/PLATFORM_MAP.md` — added form-to-API feature-map delta
- `docs/DEVLOG.md` — appended session entry
- `docs/CHANGELOG.json` — appended structured session record

### Decisions (and why)

- **Decision:** Keep the form self-contained in the page file rather than introducing a new helper component.
  - **Why:** Minimizes diff size and respects the requested ownership/write scope.
- **Decision:** Synchronize bid window fields in the client before submission.
  - **Why:** Reduces accidental schema mismatches and gives users a clearer mental model of the bid window.
- **Decision:** Surface API envelope errors directly in a top-of-form toast.
  - **Why:** Keeps the response state obvious without adding a heavier field-validation system in this slice.

### Data / Schema Notes

- DB migrations: none
- New/changed Zod schemas: none
- RBAC changes: none

### How to Run / Test

- Not run yet in this session after the wiring patch.

### Known Issues / Risks

- The page currently relies on API-side validation for deeper schema feedback; there is no client-side Zod mirroring in this slice.
- The `datetime-local` controls are browser-local by design, so users in different time zones will submit local wall-clock values.

### Next Steps

1. Wire the homeowner proposal compare/shortlist view to the persisted proposal data.
2. Add client-side validation parity if we decide to add another form-focused PR.

---

## Session: 2026-03-21 / 18:09 (UTC) — Agent proposal form wiring

**Author:** Codex  
**Context:** User asked to implement only the agent proposal form wiring on `/agent/marketplace/[instructionId]/proposal`, without touching API route handlers.  
**Branch/PR:** `main` (uncommitted working tree)

### Goal

- Convert the agent proposal builder scaffold into a live client-side submit flow that posts structured payloads to `POST /api/proposals`.

### Changes Made

- Split the route into a server page wrapper plus a local client component for the interactive proposal form.
- Wired controlled inputs for fee model, fee value, timeline, inclusions, marketing plan, and cancellation terms.
- Added client-side schema validation with inline field errors and a status banner for validation, server error, network error, and success states.
- Submitted structured payloads with `fetch("/api/proposals")`, `Content-Type: application/json`, and a generated `Idempotency-Key` header.
- Kept the existing preview card and layout structure, but made the preview card reflect live form state.

### Files / Modules Touched (high signal only)

- `src/app/(app)/agent/marketplace/[instructionId]/proposal/page.tsx`
- `src/app/(app)/agent/marketplace/[instructionId]/proposal/proposal-builder-client.tsx`
- `docs/TASKS.md`
- `docs/PLATFORM_MAP.md`
- `docs/DEVLOG.md`
- `docs/CHANGELOG.json`

### Decisions (and why)

- **Decision:** Keep the page wrapper server-rendered and move interactivity into a route-local client component.
  - **Why:** Preserves the route shape while keeping the diff tightly scoped.
- **Decision:** Reuse the shared proposal submission schema in the browser.
  - **Why:** Keeps client-side and server-side validation aligned on the same structured contract.
- **Decision:** Leave draft/chat secondary buttons disabled in this slice.
  - **Why:** The task only asked for proposal submit wiring, not additional actions or API changes.

### Data / Schema Notes

- DB migrations: none
- New/changed Zod schemas: none
- RBAC changes: none

### How to Run / Test

- Not run yet in this session after the wiring patch.

### Known Issues / Risks

- This slice depends on the existing `/api/proposals` envelope and server validation behavior.
- Draft saving and chat actions remain intentionally unwired.

### Next Steps

1. Wire the compare/shortlist/award flow if needed after proposal submission stabilizes.
2. Add React Hook Form integration only if T010 still needs that last mile.

---

## Session: 2026-03-21 / 18:13 (GMT) — Pilot seed + weekly demo automation and release packaging

**Author:** Codex  
**Context:** User requested a clean Phase 1 DB-backed hardening commit/push and asked to set up seeded pilot agent records plus a repeatable weekly demo script.  
**Branch/PR:** `main` (uncommitted working tree)

### Goal

- Package Phase 1 hardening for release and add repeatable pilot/demo operations commands.

### Changes Made

- Added pilot seeding script:
  - `scripts/seed-phase1-pilot-agents.mjs`
  - Idempotently upserts 8 pilot real estate agents with mixed `PUBLISHED/DRAFT` and `VERIFIED/PENDING/UNVERIFIED` states.
- Added weekly demo automation script:
  - `scripts/run-phase1-weekly-demo.mjs`
  - Runs: pilot seed -> DB-backed Phase 1 service test -> Playwright onboarding/publish/verification flow.
  - Prints demo URLs for directory, admin queue, and onboarding start route.
- Added npm commands:
  - `npm run seed:phase1:pilot`
  - `npm run demo:phase1:weekly`
- Updated architecture/task/platform docs to include the new operational commands and Phase 1 evidence.

### Files / Modules Touched (high signal only)

- `package.json`
- `scripts/seed-phase1-pilot-agents.mjs`
- `scripts/run-phase1-weekly-demo.mjs`
- `docs/TASKS.md`
- `docs/ARCHITECTURE.md`
- `docs/PLATFORM_MAP.md`
- `docs/DEVLOG.md`
- `docs/CHANGELOG.json`

### Decisions (and why)

- **Decision:** Keep seeding idempotent via `upsert` on `User.email` + `AgentProfile.userId`.
  - **Why:** Enables safe reruns before every weekly meeting without duplicate data.
- **Decision:** Bundle seed + DB test + E2E test in one weekly command.
  - **Why:** Gives the team a single repeatable confidence run before live demos.
- **Decision:** Use mixed seed states (published/verified/pending/draft).
  - **Why:** Better reflects real pilot funnel behavior and demonstrates admin verification workflows.

### Data / Schema Notes

- DB migrations: none added in this session
- New/changed Zod schemas: none
- RBAC changes: none

### How to Run / Test

- `npm run seed:phase1:pilot` — passed
- `PLAYWRIGHT_SKIP_WEB_SERVER=1 PLAYWRIGHT_BASE_URL=http://127.0.0.1:3012 npm run demo:phase1:weekly` — passed
- `npm run lint` — passed
- `npm run test` — passed (DB integration remains opt-in via `RUN_DB_TESTS=true`)

### Known Issues / Risks

- Weekly demo script requires `DATABASE_URL` and local Postgres availability.
- DB-backed integration test in `phase1-flow.test.ts` is intentionally opt-in (`RUN_DB_TESTS=true`) to keep default test runs deterministic.

### Next Steps

1. Commit and push the scoped Phase 1 hardening + pilot automation files.
2. Use `npm run demo:phase1:weekly` as the pre-meeting runbook for progress demos.

---

## Session: 2026-03-21 / 18:20 (GMT) — Marketplace read queries + location browse live data

**Author:** Codex  
**Context:** User asked to replace mock marketplace/location reads with Prisma-backed LIVE instruction queries while keeping the pages usable when `DATABASE_URL` is missing.  
**Branch/PR:** `main` (uncommitted working tree)

### Goal

- Replace mock instruction reads on the agent marketplace and location browse pages with server-side Prisma queries and resilient empty states.

### Changes Made

- Added `src/server/marketplace/queries.ts` with Prisma-backed LIVE instruction reads mapped into the existing `InstructionCard` model shape.
- Included database proposal counts in the card model and built shared helpers for postcode-district grouping and location params.
- Updated `/agent/marketplace`, `/locations`, and `/locations/[postcodeDistrict]` to read live marketplace data on the server instead of importing mock data.
- Added empty-state cards so all three pages still render cleanly when `DATABASE_URL` is absent or there are no active bid windows.
- Kept the location pages grouped by postcode district using the shared postcode-district normalization helper.
- Updated task, architecture, and platform docs to reflect the read-side marketplace flow.

### Files / Modules Touched (high signal only)

- `src/server/marketplace/queries.ts` — Prisma-backed live read utilities + location grouping helpers
- `src/app/(app)/agent/marketplace/page.tsx` — live marketplace feed with empty state fallback
- `src/app/locations/page.tsx` — live location summaries and live instruction cards
- `src/app/locations/[postcodeDistrict]/page.tsx` — live district feed, params, and empty state fallback
- `docs/TASKS.md` — added progress note for the live read surface
- `docs/PLATFORM_MAP.md` — added marketplace read-view architecture delta
- `docs/DEVLOG.md` — appended session entry
- `docs/CHANGELOG.json` — appended structured session record

### Decisions (and why)

- **Decision:** Centralize marketplace reads in a server query module instead of scattering Prisma calls across pages.
  - **Why:** Keeps the read shape consistent with `InstructionCard` and makes future filtering/sorting easier.
- **Decision:** Force the affected pages to render dynamically.
  - **Why:** Ensures the pages use live database state and don’t get stuck with build-time output.
- **Decision:** Return empty states when the database is unconfigured.
  - **Why:** Preserves a usable UI in local/dev environments without `DATABASE_URL`.

### Data / Schema Notes

- DB migrations: none
- New/changed Zod schemas: none
- RBAC changes: none

### How to Run / Test

- Not run yet in this session after the read-query patch.

### Known Issues / Risks

- The read helper currently treats `UNKNOWN` postcode districts as non-directoryable for location summaries/params.
- I have not yet run the full test or lint suite after this patch.

### Next Steps

1. Add focused tests for the new marketplace read helpers and empty-state behavior.
2. Wire any remaining marketplace surfaces to the same live read module if they still depend on mock data.

---

## Session: 2026-03-21 / 18:18 (GMT) — Integrated rollout: form wiring + live reads + idempotency/rate limits

**Author:** Codex  
**Context:** User requested execution of three concrete rollout items with subagents: wire homeowner/agent forms to persisted APIs, replace mock marketplace reads with Prisma LIVE reads, and add idempotency + rate limiting for safer web rollout.  
**Branch/PR:** `main` (uncommitted working tree)

### Goal

- Deliver an end-to-end backend-integrated marketplace slice that is safer for web rollout and easier for future coding agents to extend.

### Changes Made

- Wired homeowner create-instruction UX to persisted API:
  - `/homeowner/instructions/new` is now a real client-side form posting structured payloads to `POST /api/instructions`.
  - Added bid-window synchronization, must-haves parsing, and envelope-driven success/error messaging.
- Wired agent proposal builder UX to persisted API:
  - `/agent/marketplace/[instructionId]/proposal` now uses a route-local client component with live preview sync.
  - Added schema-aligned client validation and structured submit to `POST /api/proposals`.
- Replaced mock read paths for marketplace/location surfaces:
  - Added `src/server/marketplace/queries.ts` and switched `/agent/marketplace`, `/locations`, and `/locations/[postcodeDistrict]` to Prisma-backed LIVE instruction reads.
  - Added graceful empty states when `DATABASE_URL` is missing or no active LIVE windows exist.
- Added API safety guardrails for rollout:
  - Added actor/route-scoped idempotency persistence model (`IdempotencyKey`) + migration `20260321190500_api_safety_idempotency`.
  - Added `src/server/http/idempotency.ts` and `src/server/http/rate-limit.ts`.
  - `POST /api/instructions` and `POST /api/proposals` now require `Idempotency-Key`, replay safe responses for duplicate keys/payloads, and enforce per-route rate limits with standard headers.
- Added focused tests for new safety/read helpers:
  - `src/server/http/idempotency.test.ts`
  - `src/server/http/rate-limit.test.ts`
  - `src/server/marketplace/queries.test.ts`

### Files / Modules Touched (high signal only)

- `src/app/(app)/homeowner/instructions/new/page.tsx`
- `src/app/(app)/agent/marketplace/[instructionId]/proposal/page.tsx`
- `src/app/(app)/agent/marketplace/[instructionId]/proposal/proposal-builder-client.tsx`
- `src/server/marketplace/queries.ts`
- `src/server/marketplace/queries.test.ts`
- `src/app/(app)/agent/marketplace/page.tsx`
- `src/app/locations/page.tsx`
- `src/app/locations/[postcodeDistrict]/page.tsx`
- `src/server/http/idempotency.ts`
- `src/server/http/idempotency.test.ts`
- `src/server/http/rate-limit.ts`
- `src/server/http/rate-limit.test.ts`
- `src/app/api/instructions/route.ts`
- `src/app/api/proposals/route.ts`
- `prisma/schema.prisma`
- `prisma/migrations/20260321190500_api_safety_idempotency/migration.sql`
- `docs/TASKS.md`
- `docs/PLATFORM_MAP.md`
- `docs/ARCHITECTURE.md`
- `docs/DEVLOG.md`
- `docs/CHANGELOG.json`

### Decisions (and why)

- **Decision:** Keep route handlers as boundary adapters and centralize write/query logic in server modules.
  - **Why:** Improves maintainability for future coding agents and keeps invariants in one place.
- **Decision:** Enforce idempotency keys at the API boundary instead of best-effort client de-duplication only.
  - **Why:** Prevents duplicate writes across retries/replays where it matters most.
- **Decision:** Use in-memory actor-scoped rate limits for immediate rollout safety.
  - **Why:** Provides practical abuse protection now without introducing external infra dependencies in this slice.
- **Decision:** Degrade gracefully to empty states when DB is unavailable for read surfaces.
  - **Why:** Keeps public and app pages stable in local/dev and partial infra scenarios.

### Data / Schema Notes

- DB migrations:
  - Added: `20260321190500_api_safety_idempotency` (`IdempotencyKey` table)
  - Prior `Instruction.mustHaves` persistence from `20260321184000_marketplace_write_infra` remains active
- New/changed Zod schemas: none (reused existing instruction/proposal schemas)
- RBAC changes: none

### How to Run / Test

- `npm run prisma:generate` — passed
- `npm run test` — passed (29 passed, 1 skipped DB opt-in)
- `npm run lint` — passed

### Known Issues / Risks

- Full project `npm run typecheck` still has pre-existing baseline issues outside this session’s scope.
- Current rate limiting is in-memory and per-instance; distributed/global throttling should be added before high-scale multi-instance rollout.

### Next Steps

1. Add homeowner compare/shortlist/award persistence (T004) on top of these write/read contracts.
2. Add durable audit/event persistence for idempotency/rate-limit outcomes and key workflow transitions.
3. Upgrade rate limiting from in-memory to shared-store backed limits (Redis/edge-compatible) before broad production traffic.

---

## Session: 2026-03-21 / 23:08 (GMT) — Stability sprint: auth host consistency + hydration-safe smoke gate

**Author:** Codex  
**Context:** User asked to step back from repeated endpoint loops, prioritize root-cause stabilization, and make execution reliable before T004.
**Branch/PR:** `main` (uncommitted working tree)

### Goal

- Stop recurring auth/hydration/migration loop failures and create one deterministic smoke gate command that future agents can run before feature work.

### Changes Made

- Stabilized auth route behavior and boundaries:
  - Kept explicit NextAuth route exports with `runtime="nodejs"` and `dynamic="force-dynamic"` in `src/app/api/auth/[...nextauth]/route.ts`.
  - Kept `AppShell` fully client-safe to avoid inline server-action compile failures in client contexts.
- Added canonical dev-host enforcement in middleware:
  - Middleware now redirects sign-in/app traffic to the canonical `AUTH_URL` host in development (e.g. `127.0.0.1` -> `localhost`) to prevent callback/cookie mismatch loops.
- Added hydration-ready guardrails for form surfaces:
  - Created `useClientReady` hook.
  - Homeowner and proposal forms now expose `data-form-ready="true"` only after hydration and keep controls disabled until interactive.
  - Prevents false “click does nothing / native form fallback” states in automation.
- Added deterministic smoke gate command:
  - New script: `scripts/smoke-marketplace-flow.mjs`
  - New npm script: `npm run smoke:marketplace`
  - Flow: preview sign-in -> homeowner create LIVE instruction -> agent submit proposal, with JSON output + screenshots.
- Added targeted E2E regression:
  - `tests/e2e/marketplace-hydration.spec.ts` verifies first-load form interactivity after sign-in (reset + submit without manual reload).
- Added DB migration runbook:
  - `docs/DB_MIGRATION_RUNBOOK.md` documents normal path, SQL fallback, and `migrate resolve --applied` reconciliation.

### Files / Modules Touched (high signal only)

- `src/middleware.ts`
- `src/lib/client-ready.ts`
- `src/app/(app)/homeowner/instructions/new/page.tsx`
- `src/app/(app)/agent/marketplace/[instructionId]/proposal/proposal-builder-client.tsx`
- `src/app/api/auth/[...nextauth]/route.ts`
- `src/components/layout/app-shell.tsx`
- `scripts/smoke-marketplace-flow.mjs`
- `tests/e2e/marketplace-hydration.spec.ts`
- `playwright.config.ts`
- `package.json`
- `docs/DB_MIGRATION_RUNBOOK.md`
- `docs/TASKS.md`
- `docs/PLATFORM_MAP.md`
- `docs/ARCHITECTURE.md`
- `docs/DEVLOG.md`
- `docs/CHANGELOG.json`

### Decisions (and why)

- **Decision:** Canonicalize dev host through middleware instead of relying on manual URL discipline.
  - **Why:** Eliminates host drift (`localhost` vs `127.0.0.1`) that causes session/callback mismatches.
- **Decision:** Add hydration-ready markers and disable controls until hydrated.
  - **Why:** Gives deterministic interactive readiness for both users and automation after auth redirects.
- **Decision:** Productize smoke validation into one scripted command.
  - **Why:** Replaces ad hoc debugging loops with a repeatable gate before feature expansion.
- **Decision:** Keep migration runbook in-repo.
  - **Why:** Prevents recurrence of manual-SQL drift by making fallback + reconcile explicit.

### Data / Schema Notes

- DB schema unchanged in this session.
- Migration health verified:
  - `npx prisma migrate status` -> up to date
  - `npm run prisma:migrate:dev` -> already in sync

### How to Run / Test

- `npm run lint` — passed
- `npm run test` — passed
- `npm run smoke:marketplace` — passed (created LIVE instruction + SUBMITTED proposal)
- `PLAYWRIGHT_SKIP_WEB_SERVER=1 PLAYWRIGHT_BASE_URL=http://localhost:3012 npx playwright test tests/e2e/marketplace-hydration.spec.ts --project=chromium` — passed

### Known Issues / Risks

- Full project `npm run typecheck` still has pre-existing baseline issues outside this stabilization slice.
- Rate limiting remains in-memory and per-instance; distributed limits are still future work.

### Next Steps

1. Begin T004 (compare/shortlist/award persistence) on top of this stabilized auth/hydration/migration base.
2. Optionally add a CI job that runs `npm run smoke:marketplace` against ephemeral local infra before merge.

---

## Session: 2026-03-21 / 23:34 (GMT) — T004 compare + shortlist/award persistence integrated and validated

**Author:** Codex  
**Context:** User asked to step back from repeated endpoint loops, spawn focused subagents, and prioritize robust backend-forward delivery with clear next steps.  
**Branch/PR:** `main` (uncommitted working tree)

### Goal

- Complete T004 end-to-end by wiring homeowner compare UI to persisted data and shipping shortlist/reject/award persistence with strong server-side guardrails.

### Changes Made

- Integrated frontend compare flow on persisted data:
  - `/homeowner/instructions/[instructionId]/compare` now loads owner-scoped instruction/proposal data from Prisma.
  - Added client compare controller (`compare-client.tsx`) with optimistic decision updates, rollback on failure, and inline status feedback.
  - Extended `ProposalCompareTable` with decision callbacks, proposal status display, and pending/terminal disabled states.
- Integrated backend decision infrastructure:
  - Added homeowner-only `PATCH /api/proposals/[proposalId]/decision` route with Zod validation, idempotency, and rate limiting.
  - Added transactional service guardrails for status transitions and award exclusivity:
    - `SUBMITTED -> SHORTLISTED`
    - `SUBMITTED|SHORTLISTED -> REJECTED`
    - `SHORTLISTED -> ACCEPTED`
  - Enforced shortlist-before-award and one accepted proposal per instruction.
  - Instruction status updates now reconcile to `SHORTLIST` and `AWARDED` during decision flow.
- Strengthened local implementation quality:
  - Fixed an `exactOptionalPropertyTypes` regression in compare-client payload parsing (`status` omitted unless present).

### Files / Modules Touched (high signal only)

- `src/app/(app)/homeowner/instructions/[instructionId]/compare/page.tsx`
- `src/app/(app)/homeowner/instructions/[instructionId]/compare/compare-client.tsx`
- `src/components/proposal-compare-table.tsx`
- `src/app/api/proposals/[proposalId]/decision/route.ts`
- `src/server/marketplace/service.ts`
- `src/server/marketplace/service.test.ts`
- `docs/TASKS.md`
- `docs/PLATFORM_MAP.md`
- `docs/DEVLOG.md`
- `docs/CHANGELOG.json`

### Decisions (and why)

- **Decision:** Keep decision invariants in service layer and make API route an adapter.
  - **Why:** Preserves one authoritative place for transitions/exclusivity and improves future agent maintainability.
- **Decision:** Reuse idempotency + rate-limit boundary pattern for decision writes.
  - **Why:** Keeps write endpoint behavior consistent and replay-safe across the marketplace API surface.
- **Decision:** Keep compare UI optimistic, but rollback on API failure.
  - **Why:** Gives responsive UX while preserving consistency with server truth.

### Data / Schema Notes

- DB schema unchanged in this session.
- No new migration required for T004 implementation.

### How to Run / Test

- `npm run lint` — passed
- `npm run test` — passed
- `npm exec vitest run src/server/marketplace/service.test.ts` — passed
- `SMOKE_BASE_URL=http://127.0.0.1:3012 npm run smoke:marketplace` — passed (instruction + proposal persisted)
- Authenticated decision API smoke against live local app:
  - `PATCH /api/proposals/{proposalId}/decision` with `SHORTLIST` -> `200` (`proposal=SHORTLISTED`, `instruction=SHORTLIST`)
  - `PATCH /api/proposals/{proposalId}/decision` with `AWARD` -> `200` (`proposal=ACCEPTED`, `instruction=AWARDED`)
  - Replayed `AWARD` with same idempotency key -> `200` + `Idempotency-Replayed: true`

### Known Issues / Risks

- Full repository `npm run typecheck` still has pre-existing baseline issues outside this T004 slice (global JSX/test typing and existing agent-profile type strictness debt).
- Rate limiting remains in-memory and per-instance; shared/distributed enforcement is still pending for scale-out production.

### Next Steps

1. Implement T005 thread unlock rules (`LOCKED -> OPEN`) off shortlist/award status changes.
2. Add focused e2e coverage for homeowner compare decision UI (button actions + status reconciliation).
3. Move rate limiting and idempotency retention strategy toward shared infra for multi-instance rollout.

---

## Session: 2026-03-22 / 11:02 (GMT) — Phase 1 trust revalidation hardening + docs consistency sweep

**Author:** Codex  
**Context:** User requested we pick up where we left off, verify Phase 1 real estate agent identity readiness, and keep architecture/docs synchronized with the latest trust controls.  
**Branch/PR:** `main` (uncommitted working tree)

### Goal

- Strengthen trust continuity for Phase 1 public agent visibility, remove flow bypasses, and reconcile project docs with implemented behavior.

### Changes Made

- Hardened verified-profile trust lifecycle in `src/server/agent-profile/service.ts`:
  - Added material-change detection (`hasMaterialProfileChanges`) across public/profile claim fields.
  - Added automatic re-review behavior: when a previously `VERIFIED` profile is materially edited, `verificationStatus` is reset to `PENDING`.
  - Enforced this behavior on both draft-save and publish paths.
- Added onboarding-first guardrail for CV builder:
  - `/agent/profile/edit` now redirects to `/agent/onboarding?error=complete_onboarding_first` when onboarding is incomplete.
  - Onboarding page now surfaces a clear banner for this state.
- Improved user-facing trust copy:
  - Updated publish success messaging to clarify that public visibility is tied to `VERIFIED` status.
- Removed a misleading no-op filter from public directory UI:
  - `/agents` now explicitly communicates that only admin-verified + published profiles are shown.
- Extended DB-backed trust test coverage:
  - `src/server/agent-profile/phase1-flow.test.ts` now verifies that post-verification material edits de-list the public profile until re-verification.
- Stabilized the Phase 1 e2e assertion shape:
  - Updated brittle text assertion and removed sign-out redirect dependency from `tests/e2e/phase1-agent-flow.spec.ts`.
  - Replaced post-verification `reload()` with direct `goto()` for reliable fresh fetch.
- Reconciled docs to current truth:
  - `docs/TASKS.md`: clarified A002/A003/A005/A009 acceptance wording; added A010 for production verification delivery + anti-abuse controls.
  - `docs/PLATFORM_MAP.md`: corrected onboarding->verification sequencing, trust-gated public visibility rules, and migration evidence list.
  - `docs/ARCHITECTURE.md`: added explicit re-verification-on-edit trust rule, onboarding gate dependency, and current email-verification delivery caveat.

### Files / Modules Touched (high signal only)

- `src/server/agent-profile/service.ts`
- `src/server/agent-profile/phase1-flow.test.ts`
- `src/app/(app)/agent/profile/edit/page.tsx`
- `src/app/(app)/agent/onboarding/page.tsx`
- `src/app/agents/page.tsx`
- `tests/e2e/phase1-agent-flow.spec.ts`
- `docs/TASKS.md`
- `docs/PLATFORM_MAP.md`
- `docs/ARCHITECTURE.md`
- `docs/DEVLOG.md`
- `docs/CHANGELOG.json`

### Decisions (and why)

- **Decision:** Reset `verificationStatus` to `PENDING` on material profile edits after prior verification.
  - **Why:** Preserves trust signal integrity so public visibility cannot remain permanently verified after substantive claim changes.
- **Decision:** Gate CV builder access on completed onboarding.
  - **Why:** Prevents bypassing the guided onboarding + work-email verification sequence.
- **Decision:** Remove misleading verified checkbox from public directory UI.
  - **Why:** Directory is intentionally trust-gated to `PUBLISHED + VERIFIED`; exposing a toggle implied behavior we do not support.

### Data / Schema Notes

- No new schema migration in this session.
- Existing work-email verification migration remains current:
  - `prisma/migrations/20260321194500_agent_work_email_verification/migration.sql`

### How to Run / Test

- `npm run lint` — passed.
- `RUN_DB_TESTS=true npm run test -- src/server/agent-profile/phase1-flow.test.ts` — passed (run with sandbox escalation due local DB/socket restrictions).
- `npm run test -- src/server/agent-profile/phase1-flow.test.ts` — passes with DB test skipped when `RUN_DB_TESTS` is not set.
- `env PLAYWRIGHT_BASE_URL=http://localhost:3012 npx playwright test tests/e2e/phase1-agent-flow.spec.ts --project=chromium` — passed (Playwright-managed web server; stale listeners on `3012` were cleared before run).

### Known Issues / Risks

- A010 remains open: production email delivery for verification codes plus resend/attempt abuse controls are still pending.
- Playwright QA in this environment is sensitive to stale listeners on `localhost:3012`; clear port conflicts before rerunning to keep checks deterministic.

### Next Steps

1. Implement A010 (production verification delivery + resend/attempt throttles) to close the remaining genuine-registration gap.
2. Add one deterministic script to boot/check local web server before Playwright phase-1 flow execution.
3. Package these trust-hardening + docs-alignment updates as the next clean commit after final QA confirmation.
