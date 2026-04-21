# Whoma Architecture (MVP)

## Product

Core domain remains a two-sided tender marketplace:
Homeowner creates Instruction (sell brief) -> bid window -> agents submit structured proposals -> homeowner compares/shortlists/awards -> gated chat.

Public positioning is intentionally narrower in Phase 1:
verified estate agent identity -> publish-ready profile depth -> admin-reviewed trust -> secondary homeowner pilot access.

## Current Build Priority (Phase 1)

Real estate agent identity validation first:

- Agent onboarding ✅
- Agent CV/profile creation ✅
- Public agent profile pages ✅
- Public agent directory visibility ✅
- Public Phase 1 repositioning + activation checklist ✅

Reference map: `docs/PLATFORM_MAP.md`
Delivery plan: `docs/PHASE1_AGENT_VALIDATION_PLAN.md`
Backend scale blueprint: `docs/BACKEND_INFRA_BLUEPRINT.md`
Migration + QA evidence:

- `prisma/migrations/20260321173500_phase1_agent_profile_platform/migration.sql`
- `prisma/migrations/20260321184000_marketplace_write_infra/migration.sql`
- `prisma/migrations/20260321190500_api_safety_idempotency/migration.sql`
- `prisma/migrations/20260321194500_agent_work_email_verification/migration.sql`
- `prisma/migrations/20260322130500_agent_work_email_anti_abuse/migration.sql`
- `prisma/migrations/20260406183000_email_password_auth/migration.sql`
- `src/server/agent-profile/phase1-flow.test.ts`
- `tests/e2e/phase1-agent-flow.spec.ts`

## Roles (RBAC)

- `HOMEOWNER`: create/manage own properties + instructions; view/compare proposals on own instructions; shortlist/reject/award; message shortlisted/awarded agents.
- `AGENT` (real estate agent): browse LIVE instructions; submit proposals; view own proposal statuses; message if shortlisted/awarded.
- `ADMIN` (optional/minimal): verify agents; moderate.

## Domain (MVP entities)

- `User`
- `HomeownerProfile`
- `AgentProfile`
- `Property`
- `Instruction`
- `Proposal`
- `MessageThread`
- `Message`

## Key Rules

- Proposal schema is enforced (`Zod` + server validation). No freeform-only bids.
- Bid window is time-boxed (24-48h configurable via env).
- Chat is locked until shortlist/award (configurable rule).
- All writes require server-side auth + authorization.
- Marketplace write APIs use service-layer domain guards and typed operational error codes.
- Marketplace write APIs require idempotency keys and apply route-level rate limits.
- Public agent visibility is trust-gated to `PUBLISHED` + `VERIFIED`; material profile edits after verification return status to `PENDING`.
- Public auth supports Google OAuth and email magic-link sign-in through Supabase Auth; approval gating remains post-auth and preview auth is no longer part of the public sign-in surface.
- Phase 1 activation metrics track `started`, `workEmailVerified`, `completed`, `publishReady`, `published`, `pendingVerification`, and `verified`.
- Work-email verification uses one-time code checks in onboarding with server-side resend cooldown, verification-attempt lockout, and onboarding verification rate limits; non-production surfaces `devCode`, while production delivery requires configured Resend credentials.
- UK-ready defaults: GBP formatting, postcode handling.
- No payments in MVP.
- No analytics dashboard / referral system / complex scoring in MVP.

## Data Flow (MVP)

1. Homeowner creates `Property` + `Instruction` (`DRAFT` or `LIVE`).
2. Agents browse `LIVE` instructions in marketplace.
3. Agent submits one structured `Proposal` per instruction.
4. Homeowner compares proposals in standardized layout and updates statuses.
5. Homeowner awards one proposal; instruction enters `AWARDED`.
6. `MessageThread` unlocks (`LOCKED` -> `OPEN`) when shortlist/award rule triggers.
7. Homeowner/agent exchange `Message` entries in unlocked thread.

## Data Flow (Phase 1 Real Estate Agent Identity)

1. User signs in with Google OAuth or email magic link and selects `AGENT`.
2. Agent verifies business work email with a one-time code in onboarding.
3. Agent completes onboarding (`agency`, `job title`, `work email`, `phone`, `service areas`, `specialties`, `bio`).
4. Server validates and persists onboarding details to `AgentProfile`, sets verification to `PENDING`.
5. Agent refines profile in CV builder (`achievements`, `languages`, profile completeness).
6. Agent publishes profile when completeness threshold is met.
7. Admin verification queue updates `verificationStatus` and tracks activation metrics across verification, completion, and publish readiness.
8. Public directory (`/agents`) and public profile page (`/agents/[slug]`) only expose `PUBLISHED` + `VERIFIED` agents.
9. If a verified agent materially edits profile claims, status returns to `PENDING` until re-verified.
10. Public auth and landing copy lead with agent identity first; `/requests*` stays live as a noindex secondary pilot path.

## Key Routes / Surfaces (current scaffold)

- `/` — public Phase 1 landing (verified identity first, tendering secondary)
- `/sign-in`, `/sign-up` — public auth entry with Google + email magic-link states for estate agents and support-routed homeowner access
- `/onboarding/role` — post-auth role assignment
- `/agent/onboarding` — guided real estate agent onboarding flow
- `/agent/profile/edit` — agent CV builder with draft/publish actions (requires completed onboarding)
- `/agents` — public real estate agent directory
- `/agents/[slug]` — public real estate agent profile page
- `/requests` — secondary noindex homeowner pilot browse index
- `/requests/[postcodeDistrict]` — secondary noindex homeowner pilot feed by postcode district
- `/locations` and `/locations/[postcodeDistrict]` — compatibility redirects to `/requests*`
- `/homeowner/instructions/new` — working client-side homeowner instruction form that posts structured payloads to `/api/instructions` and exposes hydration-ready state for reliable automation (`data-form-ready`)
- `/homeowner/instructions/[instructionId]/compare` — compare/shortlist/award UI scaffold
- `/agent/marketplace` — LIVE instructions list with Prisma-backed reads + query-param filters
- `/agent/marketplace/[instructionId]` — instruction detail (agent/homeowner mode preview)
- `/agent/marketplace/[instructionId]/proposal` — structured proposal builder with client-side submit wiring + live preview + hydration-ready marker for automation (`data-form-ready`)
- `/api/instructions` — persisted homeowner write boundary (`Property + Instruction` transaction + `DRAFT/LIVE` inference)
- `/api/proposals` — persisted agent write boundary (eligibility checks + duplicate guard + request-time expiry reconciliation)
- `/api/health` — operational health endpoint with DB readiness checks
- `/api/messages/threads` — participant-scoped thread list read boundary (optional instruction filter)
- `/api/messages/[threadId]` — participant-scoped thread read + idempotent message write boundary
- `/messages` — live participant-scoped messaging workspace (thread list, thread detail, and send actions)
- `/admin/agents` — live verification queue + expanded Phase 1 activation metrics

## Tech Stack

- Frontend: Next.js App Router, React, TypeScript, TailwindCSS
- Forms/validation: React Hook Form (to wire), Zod (scaffolded)
- Data fetching: TanStack Query (provider wired)
- Backend: Next Route Handlers + Server Actions + service layers (`src/server/agent-profile/service.ts`, `src/server/marketplace/service.ts`)
- API safety: idempotency + rate-limiting helpers (`src/server/http/idempotency.ts`, `src/server/http/rate-limit.ts`) with optional Upstash Redis shared backing and fallback local stores
- DB: Postgres + Prisma
- Auth: Supabase Auth (Google OAuth + email magic link) with a WHOMA server compatibility layer for role/access-state checks
- Public auth pages now present live self-serve account access when any public auth method is configured and never expose preview roles.
- Dev auth host rule: use one canonical dev origin (from `AUTH_URL`) to avoid callback/cookie mismatches
- Tests: Vitest + Playwright

## Running Locally

- Requirements: Node LTS, Postgres, npm (`pnpm` preferred but not installed locally yet)
- Env: see `.env.example`
- Commands:
  - `npm install`
  - `cp .env.example .env`
  - `npm run prisma:generate`
  - `npm run prisma:migrate:dev` (or apply checked-in migration SQL if Prisma schema engine is unavailable in local sandbox)
  - `npm run smoke:marketplace` (backend preview callback auth + homeowner create LIVE instruction + agent submit proposal)
  - `npm run dev`
  - `npm run seed:phase1:pilot`
  - `npm run demo:phase1:weekly`
  - `npm run test`
  - `RUN_DB_TESTS=true npm run test` (to execute DB-backed integration tests when Postgres is running)
  - `PLAYWRIGHT_SKIP_WEB_SERVER=1 PLAYWRIGHT_BASE_URL=http://127.0.0.1:3012 npx playwright test tests/e2e/phase1-agent-flow.spec.ts --project=chromium`
  - `npm run lint`
- Migration fallback/recovery reference: `docs/DB_MIGRATION_RUNBOOK.md`

## Folder Structure

- `src/app/` — routes + pages
- `src/server/` — server utilities/services (analytics, domain logic, future repositories)
- `src/components/` — UI components
- `src/lib/` — validation + utility helpers + RBAC
- `prisma/` — schema + migrations
- `docs/` — `DEVLOG`, `TASKS`, `ARCHITECTURE`, `CHANGELOG`
