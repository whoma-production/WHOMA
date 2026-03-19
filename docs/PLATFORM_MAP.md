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
- Sign in (`Google OAuth`) -> role selection (`AGENT`) -> gated app routes

2. Agent onboarding and trust
- Real estate agent enters guided professional information (`/agent/onboarding`) -> profile baseline persisted -> verification state set to `PENDING`

3. CV/profile builder
- Structured fields (`agency`, `job title`, `bio`, `specialties`, `service areas`, `experience`, `achievements`, `languages`) -> saved via `/agent/profile/edit` with completeness scoring

4. Public profile generation
- Publish action validates profile threshold -> route (`/agents/[slug]`) with SEO metadata + trust indicators

5. Agent directory visibility
- Published profiles -> directory (`/agents`) with `area/specialty/verified` filters -> homeowner discovery entrypoint

6. Marketplace and tender workflow (Phase 2+)
- Directory trust layer feeds into instruction/proposal workflow and later shortlist/award conversion

7. Admin verification and pilot readiness
- Admin queue (`/admin/agents`) updates verification status and tracks onboarding funnel counters (`started/completed/published/verified`)

## Frontend/Backend Map
## Frontend (Next.js App Router)
- Public: `/`, `/agents`, `/agents/[slug]`, trust/legal pages
- Auth: `/sign-in`, `/onboarding/role`
- Agent app: `/agent/onboarding`, `/agent/profile/edit`, proposals, marketplace
- Admin app: `/admin/agents` verification queue + readiness counters

## Backend
- Auth/session: `next-auth` + middleware route guards
- Validation: `zod` at server boundaries
- Service layer: `src/server/agent-profile/service.ts` for onboarding/CV/publish/directory/verification logic
- Persistence: Prisma + Postgres
- Authorization: role-based access checks for all writes

## Data Model Anchors (MVP)
- `User` (identity + role)
- `AgentProfile` (professional identity + verification state)
- `Instruction` + `Proposal` (marketplace flow)
- `MessageThread` + `Message` (post-shortlist communication)

## Phase Dependencies
1. Onboarding writes role and baseline `AgentProfile` before profile editing and publish actions.
2. Public profile route depends on `profileStatus=PUBLISHED` + `profileSlug`.
3. Directory depends on publish eligibility and indexable profile fields (`serviceAreas`, `specialties`, `verificationStatus`).
4. Verification badges depend on admin status updates and should remain independent from publish state.

## Update Protocol (required each implementation session)
- Update this file when routes, data models, feature boundaries, or dependencies change.
- Keep "Current Validation Focus" aligned to active business objective.
- Add new feature relationships before implementing cross-feature work.
