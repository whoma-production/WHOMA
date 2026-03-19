# Whoma Architecture (MVP)

## Product
Two-sided tender marketplace:
Homeowner creates Instruction (sell brief) -> bid window -> agents submit structured proposals -> homeowner compares/shortlists/awards -> gated chat.

## Current Build Priority (Phase 1)
Real estate agent identity validation first:
- Agent onboarding
- Agent CV/profile creation
- Public agent profile pages
- Public agent directory visibility

Reference map: `docs/PLATFORM_MAP.md`
Delivery plan: `docs/PHASE1_AGENT_VALIDATION_PLAN.md`

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

## Key Routes / Surfaces (current scaffold)
- `/` — public landing (explainer + role CTAs)
- `/sign-in`, `/sign-up` — auth entry
- `/onboarding/role` — post-auth role assignment
- `/homeowner/instructions/new` — create instruction UI scaffold
- `/homeowner/instructions/[instructionId]/compare` — compare/shortlist/award UI scaffold
- `/agent/marketplace` — LIVE instructions list UI scaffold
- `/agent/marketplace/[instructionId]` — instruction detail (agent/homeowner mode preview)
- `/agent/marketplace/[instructionId]/proposal` — structured proposal builder UI scaffold
- `/messages` — gated messaging UI concept
- `/agents`, `/agents/[slug]` — planned public real estate agent directory/profile pages (Phase 1 priority)

## Tech Stack
- Frontend: Next.js App Router, React, TypeScript, TailwindCSS
- Forms/validation: React Hook Form (to wire), Zod (scaffolded)
- Data fetching: TanStack Query (provider wired)
- Backend: Next Route Handlers / Server Actions (to wire)
- DB: Postgres + Prisma
- Auth: NextAuth (Google OAuth + dev preview credentials provider)
- Tests: Vitest + Playwright

## Running Locally
- Requirements: Node LTS, Postgres, npm (`pnpm` preferred but not installed locally yet)
- Env: see `.env.example`
- Commands:
  - `npm install`
  - `cp .env.example .env`
  - `npm run prisma:generate`
  - `npm run dev`
  - `npm run test`
  - `npm run lint`

## Folder Structure
- `src/app/` — routes + pages
- `src/server/` — server utilities/services (analytics, domain logic, future repositories)
- `src/components/` — UI components
- `src/lib/` — validation + utility helpers + RBAC
- `prisma/` — schema + migrations
- `docs/` — `DEVLOG`, `TASKS`, `ARCHITECTURE`, `CHANGELOG`
