# Whoma Tasks

## Phase 1 (Priority Now): Real Estate Agent Identity Validation
Goal: onboard first 100 real estate agents and validate personal-brand credibility behavior before expanding homeowner-first workflows.
Target date for onboarding start: Monday, **2026-03-30**.

- [x] A001 — Agent onboarding foundation (auth -> role -> profile bootstrap)
  **Acceptance:** A signed-in user selecting `AGENT` is routed through guided onboarding; baseline `AgentProfile` record is created; required fields are validated server-side; unauthorized writes are denied.

- [x] A002 — Genuine registration controls (real people + traceable identity)
  **Acceptance:** Production onboarding requires Google sign-in, captures real estate agent identity fields (full name, work email, phone, agency), sets `verificationStatus=PENDING` on submission, and exposes entries in admin verification queue.

- [x] A003 — Agent CV builder (structured professional profile)
  **Acceptance:** Real estate agents can create/edit structured CV sections (headline, bio, years experience, specialties, service areas, achievements, contact preference), save draft/published state, and see profile completeness status.

- [x] A004 — Public real estate agent profile pages
  **Acceptance:** Published agent CVs render at `/agents/[slug]` with clean public layout, verification badge state, and SEO metadata; unpublished profiles are not publicly indexable.

- [x] A005 — Public agent directory visibility
  **Acceptance:** `/agents` lists published profiles with filterable/sortable fields (location, specialty, verification status) and links through to each public profile page.

- [x] A006 — Weekly demo + onboarding-readiness instrumentation
  **Acceptance:** We can demo onboarding -> CV -> public profile -> directory in one flow; basic progress counters exist for onboarding funnel states (started/completed/published/verified).

## Phase 1 Milestones (working plan)
- [x] M1 (by 2026-03-22): finalize schema + architecture map for onboarding/CV/profile/directory
- [x] M2 (by 2026-03-25): ship onboarding flow + server-side validation + admin verification queue wiring
- [x] M3 (by 2026-03-27): ship CV builder + publish controls + public profile pages
- [x] M4 (by 2026-03-29): ship directory + QA + seed first pilot agents
- [ ] M5 (2026-03-30): begin real estate agent onboarding pilot

## Phase 2: Marketplace Core (previous sprint priorities, deferred)
- [x] T001 — Auth + RBAC route protection (HOMEOWNER / AGENT / ADMIN)
  **Acceptance:** Unauthenticated users are redirected from protected app routes; authenticated users can only access routes/actions allowed by role; demo signed-cookie session auth is enforced server-side for `POST /api/instructions` and `POST /api/proposals`.

- [ ] T002 — Homeowner create instruction flow (Property + Instruction) with Prisma persistence
  **Acceptance:** Homeowner can create a property and instruction, choose a 24-48h bid window, and saved instruction appears as `LIVE` or `DRAFT` with server-side Zod validation and Prisma write.

- [ ] T003 — Agent proposal submission (structured schema enforced)
  **Acceptance:** Agent can open a LIVE instruction, submit one structured proposal (fee model/value, inclusions, timeline, marketing plan, cancellation terms); duplicate proposal for same instruction/agent is blocked server-side.

- [ ] T004 — Homeowner proposal compare + shortlist/award workflow
  **Acceptance:** Homeowner can view standardized proposal comparison, shortlist/reject proposals, award exactly one proposal, and statuses update consistently (`SUBMITTED` -> `SHORTLISTED`/`REJECTED` -> one `ACCEPTED`).

- [ ] T005 — Gated messaging threads (shortlist/award unlock rule)
  **Acceptance:** Thread exists in `LOCKED` state before unlock; becomes `OPEN` when rule triggers; only homeowner and the relevant agent can read/write messages; unauthorized access is denied.

- [ ] T010 — Real proposal builder form (React Hook Form + Zod) with inline validation + preview sync
  **Acceptance:** Form validates client-side and server-side with matching schema errors; preview updates as inputs change; submit success/error states are visible.

- [ ] T011 — Agent profile + manual verification workflow (MVP trust badges)
  **Acceptance:** Agent can edit agency/profile/service areas; admin can set verification status; verification badge is displayed on marketplace proposals and comparison views.

- [ ] T012 — Loading/empty/error states polish across key flows
  **Acceptance:** All primary MVP screens have non-empty empty states, skeletons for loading, and user-visible error messages with recovery actions.

- [x] T013 — Trust pages + HTML sitemap + browse LIVE Instructions by location (public)
  **Acceptance:** Public routes exist for `/privacy`, `/cookies`, `/terms`, `/complaints`, `/contact`, `/sitemap`, `/locations`, and `/locations/[postcodeDistrict]`; footer links expose trust/support pages; sitemap lists key pages and location routes; location pages list LIVE Instructions (not property listings).

- [ ] T014 — Cookie consent mechanism + preferences control (MVP)
  **Acceptance:** Non-essential cookies remain off until consent; user can review/change preferences; cookies page links to live consent controls and accurately reflects behavior.

## Later
- [ ] T100 — Event tracking (privacy-conscious counts only; no analytics dashboard)
  **Acceptance:** Core events are emitted without storing PII payloads; feature can be disabled via env flag; no dashboard UI added in MVP.

- [ ] T101 — File upload integration for property photos and supporting docs (S3-compatible)
  **Acceptance:** Homeowner can upload optional photos via signed upload flow; URLs persist to `Property.photos`; upload auth/authorization enforced.

- [ ] T102 — Background status transitions for bid window expiry
  **Acceptance:** Instructions move from `LIVE` to `CLOSED` when bid window ends (job or request-time reconciliation), with deterministic behavior and tests.

## Parking Lot (ideas not committed)
- Basic CSV export of awarded instructions for ops/admin
- Invite-only beta onboarding / waitlist gate
- Agent response-time aggregates (future, not in MVP domain)
