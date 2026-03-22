# WHOMA Platform Map

## Current Validation Focus (Phase 1)

Primary question:
"Will real estate agents use WHOMA to build personal professional credibility independent of their agency brand?"

Phase 1 delivery focus:

- Real estate agent onboarding ✅
- Agent CV/profile builder ✅
- Public agent profile pages ✅
- Public agent directory ✅

## Feature Relationship Map

1. Identity and access

- Sign in (`Google OAuth` + dev preview credentials) -> role selection (`HOMEOWNER` / `AGENT` / `ADMIN` in dev) -> gated app routes

2. Agent onboarding and trust

- Real estate agent requests + confirms a business work-email verification code (`/agent/onboarding`) -> completes guided professional onboarding -> profile moves to `verificationStatus=PENDING` for admin trust review
- Non-production environments expose a `devCode` for verification QA; production email transport is tracked as a remaining Phase 1 hardening task (`A010`)

3. CV/profile builder

- Structured fields (`agency`, `job title`, `bio`, `specialties`, `service areas`, `experience`, `achievements`, `languages`) -> saved via `/agent/profile/edit` with completeness scoring

4. Public profile generation

- Publish action validates profile threshold + verified work email -> route (`/agents/[slug]`) with SEO metadata + trust indicators
- If a previously `VERIFIED` profile is materially edited, publish status remains `PUBLISHED` but verification returns to `PENDING` until admin re-verifies

5. Agent directory visibility

- Only `VERIFIED` + `PUBLISHED` profiles are visible in the public directory (`/agents`) -> homeowner discovery entrypoint

6. Marketplace and tender workflow (Phase 2+)

- Directory trust layer feeds into instruction/proposal workflow and later shortlist/award conversion
- Homeowner create-instruction page (`/homeowner/instructions/new`) now collects structured property + seller brief + bid window fields and submits them to `POST /api/instructions` with an idempotency key
- Agent proposal builder page (`/agent/marketplace/[instructionId]/proposal`) now keeps structured proposal inputs in sync with the preview card and submits them to `POST /api/proposals` with envelope-driven success/error handling

7. Admin verification and pilot readiness

- Admin queue (`/admin/agents`) updates verification status and tracks onboarding funnel counters (`started/completed/published/verified`)
- Verification guardrail: `VERIFIED` status requires `profileStatus=PUBLISHED` and publish-level completeness

8. Marketplace write persistence baseline (new backend infra)

- Homeowner write boundary (`POST /api/instructions`) -> `src/server/marketplace/service.ts` -> transactional `Property + Instruction` persistence with deterministic `DRAFT/LIVE` inference
- Agent write boundary (`POST /api/proposals`) -> service-level eligibility checks (`LIVE` + active bid window + not own instruction) -> unique duplicate protection + request-time expiry reconciliation (`LIVE` -> `CLOSED`)
- Service layer emits privacy-conscious events (`instruction_created`, `instruction_published`, `proposal_submitted`) and returns typed operational error codes for API mapping
- API safety guardrails: write endpoints require `Idempotency-Key` headers and enforce actor-scoped in-memory rate limits before processing

9. Marketplace read views and location browse

- `/agent/marketplace` and `/locations*` use Prisma-backed LIVE instruction reads mapped into the shared `InstructionCard` model
- Reads include active bid windows only (`bidWindowEndAt > now`) plus proposal counts from the database
- Location summaries group by postcode district using the shared district extraction helper, and both pages degrade to empty states when `DATABASE_URL` is missing

10. Proposal builder client wiring

- Route `/agent/marketplace/[instructionId]/proposal` now owns live client state, runs client-side `proposalSubmissionSchema` validation, and posts structured submissions with an `Idempotency-Key` header.
- Validation feedback stays inline; API envelope errors surface in a status banner and successful submissions confirm the returned proposal id when available.
- Both homeowner and agent form routes now expose `data-form-ready="true"` only after client hydration, so QA automation can wait for interactive state before submission.

11. Auth/session stability guardrails (new)

- Middleware now canonicalizes dev host traffic to `AUTH_URL` origin to avoid `localhost` vs `127.0.0.1` callback/cookie mismatches during preview sign-in.
- NextAuth route handler exports explicit `GET`/`POST` handlers with `runtime=nodejs` and `dynamic=force-dynamic` to reduce dev-time handler instability.

12. Homeowner compare + decision persistence (T004)

- Route `/homeowner/instructions/[instructionId]/compare` now reads owner-scoped instruction + proposal records from Prisma and renders comparable, standardized proposal data.
- Homeowner decision writes now run through `PATCH /api/proposals/[proposalId]/decision` with required idempotency keys and actor-scoped rate limiting.
- Decision domain guards in `src/server/marketplace/service.ts` enforce valid transitions (`SUBMITTED -> SHORTLISTED/REJECTED`, `SHORTLISTED -> ACCEPTED`), shortlist-before-award, and one accepted proposal per instruction.
- Instruction status is reconciled transactionally during decisions (`SHORTLIST`, `AWARDED`) so compare UI and workflow state remain consistent.

## Frontend/Backend Map

## Frontend (Next.js App Router)

- Public: `/`, `/agents`, `/agents/[slug]`, trust/legal pages
- Auth: `/sign-in`, `/onboarding/role`
- Agent app: `/agent/onboarding`, `/agent/profile/edit`, proposals, marketplace
- Homeowner app: `/homeowner/instructions/new` client-side instruction form with structured payload assembly and bid-window sync
- Location browse: `/locations` and `/locations/[postcodeDistrict]` live instruction feeds grouped by postcode district with resilient empty states
- Admin app: `/admin/agents` verification queue + readiness counters

## Backend

- Auth/session: `next-auth` + middleware route guards + dev-only preview credentials (`HOMEOWNER` / `AGENT` / `ADMIN`, stateless when `DATABASE_URL` is missing)
- Dev host consistency: middleware redirects sign-in/app route traffic to the canonical `AUTH_URL` host in development
- Validation: `zod` at server boundaries
- Service layer: `src/server/agent-profile/service.ts` for onboarding/CV/publish/directory/verification logic (slug stability, publish hardening, verification readiness checks)
- Service layer: `src/server/marketplace/service.ts` for instruction/proposal persistence, bid-window domain guards, duplicate handling, and event emission
- Security helpers: `src/server/http/idempotency.ts` and `src/server/http/rate-limit.ts` for replay-safe writes and request throttling
- Persistence: Prisma + Postgres
- Authorization: role-based access checks for all writes
- Operational health: `/api/health` now reports DB readiness (`up` / `down` / `unconfigured`) with degraded status response on DB failure
- Infrastructure roadmap reference: `docs/BACKEND_INFRA_BLUEPRINT.md`

## Migration + QA Evidence

- Migration: `prisma/migrations/20260321173500_phase1_agent_profile_platform/migration.sql`
- Migration: `prisma/migrations/20260321184000_marketplace_write_infra/migration.sql`
- Migration: `prisma/migrations/20260321190500_api_safety_idempotency/migration.sql`
- Migration: `prisma/migrations/20260321194500_agent_work_email_verification/migration.sql`
- DB-backed service test: `src/server/agent-profile/phase1-flow.test.ts`
- API safety tests: `src/server/http/idempotency.test.ts`, `src/server/http/rate-limit.test.ts`
- T004 decision guard tests: `src/server/marketplace/service.test.ts`
- End-to-end flow test: `tests/e2e/phase1-agent-flow.spec.ts`
- Playwright runtime controls: `PLAYWRIGHT_SKIP_WEB_SERVER=1`, `PLAYWRIGHT_BASE_URL`, `PLAYWRIGHT_WEB_SERVER_COMMAND`
- Marketplace smoke gate: `npm run smoke:marketplace` (UI sign-in -> create LIVE instruction -> submit proposal)
- Pilot seed command: `npm run seed:phase1:pilot`
- Weekly demo command: `npm run demo:phase1:weekly`
- Migration recovery runbook: `docs/DB_MIGRATION_RUNBOOK.md`

## Data Model Anchors (MVP)

- `User` (identity + role)
- `AgentProfile` (professional identity + verification state)
- `Instruction` + `Proposal` (marketplace flow; `Instruction.mustHaves` now persisted as structured array)
- `MessageThread` + `Message` (post-shortlist communication)

## Phase Dependencies

1. Onboarding writes role and baseline `AgentProfile` before profile editing and publish actions.
2. Public profile route depends on `profileStatus=PUBLISHED` + `profileSlug` + `verificationStatus=VERIFIED`.
3. Directory depends on trusted public eligibility (`PUBLISHED` + `VERIFIED`) and indexable fields (`serviceAreas`, `specialties`).
4. Verification badges depend on admin status updates and publish/completeness policy; material post-verification profile edits return status to `PENDING`.
5. Proposal submission depends on both `Instruction.status=LIVE` and bid-window phase being active; expired `LIVE` records are reconciled to `CLOSED` during submission attempts.

## Update Protocol (required each implementation session)

- Update this file when routes, data models, feature boundaries, or dependencies change.
- Keep "Current Validation Focus" aligned to active business objective.
- Add new feature relationships before implementing cross-feature work.
