# WHOMA Platform Map

## Current Validation Focus (Phase 1)
Primary question:
"Will real estate agents use WHOMA to build personal professional credibility independent of their agency brand?"

Phase 1 delivery focus:
- Real estate agent onboarding
- Agent CV/profile builder
- Public agent profile pages
- Public agent directory

## Feature Relationship Map
1. Identity and access
- Sign in (`Google OAuth`) -> role selection (`AGENT`) -> gated app routes

2. Agent onboarding and trust
- Real estate agent enters guided professional information -> profile completeness checks -> verification state (`UNVERIFIED`/`PENDING`/`VERIFIED`)

3. CV/profile builder
- Structured fields (headline, bio, specialties, service areas, experience, achievements, contact preferences) -> saved to `AgentProfile` and related records

4. Public profile generation
- Structured profile data -> public route (`/agents/[slug]`) with SEO metadata and trust indicators

5. Agent directory visibility
- All publishable agent profiles -> directory (`/agents`) with location/specialty filters -> homeowner discovery entrypoint

6. Marketplace and tender workflow (Phase 2+)
- Directory trust layer feeds into instruction/proposal workflow and later shortlist/award conversion

## Frontend/Backend Map
## Frontend (Next.js App Router)
- Public: `/`, `/agents`, `/agents/[slug]`, trust/legal pages
- Auth: `/sign-in`, `/onboarding/role`
- Agent app: onboarding/profile edit, proposals, marketplace
- Admin app: verification queue

## Backend
- Auth/session: `next-auth` + middleware route guards
- Validation: `zod` at server boundaries
- Persistence: Prisma + Postgres
- Authorization: role-based access checks for all writes

## Data Model Anchors (MVP)
- `User` (identity + role)
- `AgentProfile` (professional identity + verification state)
- `Instruction` + `Proposal` (marketplace flow)
- `MessageThread` + `Message` (post-shortlist communication)

## Phase Dependencies
1. Onboarding must write role and agent profile baseline before public profiles can launch.
2. Public profile route depends on profile completeness + safe publish rules.
3. Directory depends on public profile eligibility and indexable fields (location/specialty).
4. Verification badges depend on admin workflow and `verificationStatus`.

## Update Protocol (required each implementation session)
- Update this file when routes, data models, feature boundaries, or dependencies change.
- Keep "Current Validation Focus" aligned to active business objective.
- Add new feature relationships before implementing cross-feature work.
