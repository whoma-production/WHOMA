# Whoma Tasks

## Phase 1 (Priority Now): Real Estate Agent Identity Validation

Goal: onboard first 100 real estate agents and validate personal-brand credibility behavior before expanding homeowner-first workflows.
Target date for onboarding start: Monday, **2026-03-30**.

- [x] A001 — Agent onboarding foundation (auth -> role -> profile bootstrap)
      **Acceptance:** A signed-in user selecting `AGENT` is routed through guided onboarding; baseline `AgentProfile` record is created; required fields are validated server-side; unauthorized writes are denied.

- [x] A002 — Genuine registration controls (real people + traceable identity)
      **Acceptance:** Production onboarding requires Google sign-in, captures real estate agent identity fields (full name, work email, phone, agency), enforces business work-email verification-code confirmation before onboarding completion, sets `verificationStatus=PENDING` on submission, and exposes entries in admin verification queue. (Dev mode currently surfaces `devCode`; production email delivery integration tracked separately.)

- [x] A003 — Agent CV builder (structured professional profile)
      **Acceptance:** Real estate agents can create/edit structured CV sections (bio, years experience, specialties, service areas, achievements, languages, core contact details), save draft/published state, and see profile completeness status.

- [x] A004 — Public real estate agent profile pages
      **Acceptance:** Published agent CVs render at `/agents/[slug]` with clean public layout, verification badge state, and SEO metadata; unpublished profiles are not publicly indexable.

- [x] A005 — Public agent directory visibility
      **Acceptance:** `/agents` lists only `VERIFIED` + `PUBLISHED` profiles with filterable fields (location, specialty) and links through to each public profile page.

- [x] A006 — Weekly demo + onboarding-readiness instrumentation
      **Acceptance:** We can demo onboarding -> CV -> public profile -> directory in one flow; basic progress counters exist for onboarding funnel states (started/completed/published/verified).

- [x] A007 — Prisma migration + DB-backed QA evidence for Phase 1
      **Acceptance:** Prisma migration SQL is checked in and applied to local Postgres; DB-backed tests cover onboarding -> publish -> verification state transitions; Playwright E2E validates onboarding -> CV publish -> admin verification against a running local server.

- [x] A008 — Pilot seed data + weekly demo automation
      **Acceptance:** A repeatable seed command creates/updates pilot real estate agents with mixed publish/verification states; a single weekly demo command runs seed + DB-backed Phase 1 test + E2E flow and prints demo URLs.

- [x] A009 — Trust-gated public visibility hardening
      **Acceptance:** Public directory/profile exposure is restricted to `VERIFIED` + `PUBLISHED` agents; onboarding and publish actions enforce business work-email verification before completion/publish can proceed; material profile edits after verification return the profile to `PENDING` review.

- [ ] A010 — Production verification delivery + anti-abuse controls
      **Acceptance:** Work-email verification codes are sent via production email provider (not `devCode`), resend cooldown and verify-attempt limits are enforced server-side, and onboarding verification actions are rate-limited.

## Phase 1 Milestones (working plan)

- [x] M1 (by 2026-03-22): finalize schema + architecture map for onboarding/CV/profile/directory
- [x] M2 (by 2026-03-25): ship onboarding flow + server-side validation + admin verification queue wiring
- [x] M3 (by 2026-03-27): ship CV builder + publish controls + public profile pages
- [x] M4 (by 2026-03-29): ship directory + QA + seed first pilot agents
- [ ] M5 (2026-03-30): begin real estate agent onboarding pilot

## Phase 2: Marketplace Core (previous sprint priorities, deferred)

- [x] T001 — Auth + RBAC route protection (HOMEOWNER / AGENT / ADMIN)
      **Acceptance:** Unauthenticated users are redirected from protected app routes; authenticated users can only access routes/actions allowed by role; NextAuth session auth is enforced server-side for `POST /api/instructions` and `POST /api/proposals`. Dev preview credentials support `HOMEOWNER` / `AGENT` / `ADMIN` in development and stay stateless when `DATABASE_URL` is absent.

- [x] T002 — Homeowner create instruction flow (Property + Instruction) with Prisma persistence
      **Acceptance:** Homeowner can create a property and instruction, choose a 24-48h bid window, and saved instruction appears as `LIVE` or `DRAFT` with server-side Zod validation and Prisma write.
      **Progress (2026-03-21):** `POST /api/instructions` now persists `Property + Instruction` via a Prisma transaction, infers `DRAFT/LIVE` deterministically, stores structured `mustHaves`, and `/homeowner/instructions/new` now posts a structured client-side form payload with idempotency support. Browser smoke on `2026-03-21` confirmed homeowner submission creates a persisted `LIVE` instruction end-to-end.

- [x] T003 — Agent proposal submission (structured schema enforced)
      **Acceptance:** Agent can open a LIVE instruction, submit one structured proposal (fee model/value, inclusions, timeline, marketing plan, cancellation terms); duplicate proposal for same instruction/agent is blocked server-side.
      **Progress (2026-03-21):** `POST /api/proposals` persists submissions through a service-layer guardrail (`LIVE` status, active bid window, no self-bidding), blocks duplicates via unique constraint handling, auto-reconciles expired `LIVE` instructions to `CLOSED`, and the proposal builder now submits structured payloads with inline validation + preview sync. Browser smoke on `2026-03-21` confirmed agent submission creates a persisted `SUBMITTED` proposal for the newly created instruction.

- [x] T015 — Marketplace write infrastructure baseline (data-led backend hardening)
      **Acceptance:** Marketplace write APIs use a dedicated domain service layer with typed operational error codes, structured API responses, privacy-safe event emissions at write boundaries, and health endpoint DB readiness checks.
      **Progress (2026-03-21):** Write boundaries now also enforce idempotency-key semantics and per-route rate limiting for safer rollout. Migration history drift from manual SQL apply was reconciled with `prisma migrate resolve`, and `npm run prisma:migrate:dev` now returns in-sync status. Added `docs/DB_MIGRATION_RUNBOOK.md` and a repeatable smoke gate command (`npm run smoke:marketplace`) to validate homeowner-create + agent-submit end-to-end.

- [x] T004 — Homeowner proposal compare + shortlist/award workflow
      **Acceptance:** Homeowner can view standardized proposal comparison, shortlist/reject proposals, award exactly one proposal, and statuses update consistently (`SUBMITTED` -> `SHORTLISTED`/`REJECTED` -> one `ACCEPTED`).
      **Progress (2026-03-21):** Compare page now loads owner-scoped persisted instruction/proposal data from Prisma, and homeowners can trigger `SHORTLIST`, `REJECT`, and `AWARD` decisions through `PATCH /api/proposals/[proposalId]/decision` with idempotency + rate limiting. Service-layer transactional guards now enforce valid transitions, shortlist-before-award, and exactly one accepted proposal per instruction.

- [ ] T005 — Gated messaging threads (shortlist/award unlock rule)
      **Acceptance:** Thread exists in `LOCKED` state before unlock; becomes `OPEN` when rule triggers; only homeowner and the relevant agent can read/write messages; unauthorized access is denied.

- [ ] T010 — Real proposal builder form (React Hook Form + Zod) with inline validation + preview sync
      **Acceptance:** Form validates client-side and server-side with matching schema errors; preview updates as inputs change; submit success/error states are visible.
      **Progress (2026-03-21):** `/agent/marketplace/[instructionId]/proposal` now validates against `proposalSubmissionSchema`, keeps the preview synced to live field state, and submits structured payloads to `/api/proposals` with idempotency headers. RHF wiring is still pending if we decide to add it later.

- [ ] T011 — Agent profile + manual verification workflow (MVP trust badges)
      **Acceptance:** Agent can edit agency/profile/service areas; admin can set verification status; verification badge is displayed on marketplace proposals and comparison views.

- [ ] T012 — Loading/empty/error states polish across key flows
      **Acceptance:** All primary MVP screens have non-empty empty states, skeletons for loading, and user-visible error messages with recovery actions.

- [x] T013 — Trust pages + HTML sitemap + browse LIVE Instructions by location (public)
      **Acceptance:** Public routes exist for `/privacy`, `/cookies`, `/terms`, `/complaints`, `/contact`, `/sitemap`, `/locations`, and `/locations/[postcodeDistrict]`; footer links expose trust/support pages; sitemap lists key pages and location routes; location pages list LIVE Instructions (not property listings).
      **Progress (2026-03-21):** Marketplace and location browse pages now read Prisma-backed LIVE instructions, include proposal counts from the database, and render empty states when `DATABASE_URL` is missing.

- [ ] T014 — Cookie consent mechanism + preferences control (MVP)
      **Acceptance:** Non-essential cookies remain off until consent; user can review/change preferences; cookies page links to live consent controls and accurately reflects behavior.

## Later

- [ ] T100 — Event tracking (privacy-conscious counts only; no analytics dashboard)
      **Acceptance:** Core events are emitted without storing PII payloads; feature can be disabled via env flag; no dashboard UI added in MVP.
      **Progress (2026-03-21):** Instruction/proposal write boundaries now emit privacy-sanitized events from service-layer persistence paths.

- [ ] T101 — File upload integration for property photos and supporting docs (S3-compatible)
      **Acceptance:** Homeowner can upload optional photos via signed upload flow; URLs persist to `Property.photos`; upload auth/authorization enforced.

- [ ] T102 — Background status transitions for bid window expiry
      **Acceptance:** Instructions move from `LIVE` to `CLOSED` when bid window ends (job or request-time reconciliation), with deterministic behavior and tests.

## Parking Lot (ideas not committed)

- Basic CSV export of awarded instructions for ops/admin
- Invite-only beta onboarding / waitlist gate
- Agent response-time aggregates (future, not in MVP domain)
