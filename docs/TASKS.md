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
      **Progress (2026-03-23):** Upgraded `/agents/[slug]` with deeper trust/proof modules using existing profile fields (verification badge, response speed, seller rating, profile quality, seller-fit highlights, service-area/specialty chips, achievements/languages, and stronger homeowner CTA block).

- [x] A005 — Public agent directory visibility
      **Acceptance:** `/agents` lists only `VERIFIED` + `PUBLISHED` profiles with filterable fields (location, specialty) and links through to each public profile page.

- [x] A006 — Weekly demo + onboarding-readiness instrumentation
      **Acceptance:** We can demo onboarding -> CV -> public profile -> directory in one flow; basic progress counters exist for onboarding funnel states (started/completed/published/verified).
      **Progress (2026-03-31):** Expanded Phase 1 activation metrics to cover `workEmailVerified`, `publishReady`, and `pendingVerification`, and surfaced a shared activation checklist inside onboarding/CV flows.

- [x] A007 — Prisma migration + DB-backed QA evidence for Phase 1
      **Acceptance:** Prisma migration SQL is checked in and applied to local Postgres; DB-backed tests cover onboarding -> publish -> verification state transitions; Playwright E2E validates onboarding -> CV publish -> admin verification against a running local server.

- [x] A008 — Pilot seed data + weekly demo automation
      **Acceptance:** A repeatable seed command creates/updates pilot real estate agents with mixed publish/verification states; a single weekly demo command runs seed + DB-backed Phase 1 test + E2E flow and prints demo URLs.

- [x] A009 — Trust-gated public visibility hardening
      **Acceptance:** Public directory/profile exposure is restricted to `VERIFIED` + `PUBLISHED` agents; onboarding and publish actions enforce business work-email verification before completion/publish can proceed; material profile edits after verification return the profile to `PENDING` review.

- [ ] A010 — Production verification delivery + anti-abuse controls
      **Acceptance:** Work-email verification codes are sent via production email provider (not `devCode`), resend cooldown and verify-attempt limits are enforced server-side, and onboarding verification actions are rate-limited.
      **Progress (2026-03-22):** Added `AgentProfile` anti-abuse fields (`workEmailVerificationCodeSentAt`, `workEmailVerificationAttemptCount`, `workEmailVerificationLockedUntil`) with checked-in migration `20260322130500_agent_work_email_anti_abuse`; implemented server-side resend cooldown + verify-attempt lockout + onboarding server-action rate limits; added production Resend delivery adapter and mapped new operational error states in onboarding UX. Remaining production step: set Railway `RESEND_API_KEY` and `RESEND_FROM_EMAIL`, then verify end-to-end email delivery in production.

- [x] A011 — Web deployment baseline (shareable staging URL)
      **Acceptance:** App is deployed to a public Railway URL with managed Postgres, startup migrations run automatically, `/api/health` reports `database=up`, and live smoke flow (`sign-in -> create LIVE instruction -> submit proposal`) passes on the deployed URL.
      **Progress (2026-03-31):** Redeployed Railway production after the Phase 1 public repositioning pass; live `/api/health` returned `database=up`, landing smoke passed against the public URL, and `npm run smoke:marketplace` now verifies the live homeowner-create + agent-submit flow through the backend preview callback instead of public preview buttons.

- [x] A012 — AI resume intake (OCR + LLM hybrid) for agent onboarding prefill
      **Acceptance:** `/api/agent/onboarding/resume-suggestions` supports `POST/GET/DELETE` with auth, idempotency, and rate-limit envelopes; scanned/text resumes both produce safe suggestion-only prefill (no auto-save), with heuristic fallback on provider failure and env-flag rollout controls.
      **Progress (2026-03-23):** Added typed resume AI pipeline (`heuristic` / `hybrid` / `llm_only`) with OpenAI extraction + optional OCR fallback in `src/server/agent-profile/resume-ai.ts`; shipped route handlers for `POST/GET/DELETE` using signed cookie storage v2 (`confidence`, `evidence`, `warnings`) and existing `ok/data` + `ok/error` API envelope semantics; integrated onboarding upload flow with mode flags and warning/error UI states; added coverage in `src/server/agent-profile/resume-ai.test.ts` and `src/app/api/agent/onboarding/resume-suggestions/route.test.ts`.

- [x] A013 — Public Phase 1 positioning + auth hardening
      **Acceptance:** Public landing, directory/profile, auth, and trust pages present WHOMA first as a verified estate agent identity platform; `/requests*` stays live as a clearly labeled secondary pilot and is `noindex`; public auth never exposes preview or admin access; agent onboarding/CV surfaces show a visible activation checklist aligned to Phase 1 behaviors.
      **Progress (2026-03-31):** Redeployed and re-verified live production: homepage now leads with verified-profile messaging and Phase 1 sequencing, `/requests` is publicly framed as a secondary pilot with `noindex`, and public sign-in resolves to the beta-gated auth path without exposing preview-role controls.
      **Progress (2026-04-02):** Tightened the public Phase 1 thesis around verified identity, agent-owned reputation, and structured collaboration: homepage CTAs now lead with agent-profile build / transaction logging / limited collaboration-pilot entry, homepage proof now includes a featured verified agent block plus case-study/demo material, and public auth now resolves `next`/`error` server-side so sign-in no longer depends on a client Suspense loading fallback.

## Phase 1 Milestones (working plan)

- [x] M1 (by 2026-03-22): finalize schema + architecture map for onboarding/CV/profile/directory
- [x] M2 (by 2026-03-25): ship onboarding flow + server-side validation + admin verification queue wiring
- [x] M3 (by 2026-03-27): ship CV builder + publish controls + public profile pages
- [x] M4 (by 2026-03-29): ship directory + QA + seed first pilot agents
- [ ] M5 (2026-03-30): begin real estate agent onboarding pilot

## Phase 2: Marketplace Core (previous sprint priorities, deferred)

- [x] T001 — Auth + RBAC route protection (HOMEOWNER / AGENT / ADMIN)
      **Acceptance:** Unauthenticated users are redirected from protected app routes; authenticated users can only access routes/actions allowed by role; NextAuth session auth is enforced server-side for `POST /api/instructions` and `POST /api/proposals`. Dev preview credentials support `HOMEOWNER` / `AGENT` / `ADMIN` in development and stay stateless when `DATABASE_URL` is absent.
      **Progress (2026-03-22):** Sign-in/sign-up preview fallback now supports personal email entry + role selection with stable button layout, so staging users can continue onboarding/demo flows when Google OAuth is not configured and `ENABLE_PREVIEW_AUTH=true`.

- [x] T002 — Homeowner create instruction flow (Property + Instruction) with Prisma persistence
      **Acceptance:** Homeowner can create a property and instruction, choose a 24-48h bid window, and saved instruction appears as `LIVE` or `DRAFT` with server-side Zod validation and Prisma write.
      **Progress (2026-03-21):** `POST /api/instructions` now persists `Property + Instruction` via a Prisma transaction, infers `DRAFT/LIVE` deterministically, stores structured `mustHaves`, and `/homeowner/instructions/new` now posts a structured client-side form payload with idempotency support. Browser smoke on `2026-03-21` confirmed homeowner submission creates a persisted `LIVE` instruction end-to-end.

- [x] T003 — Agent proposal submission (structured schema enforced)
      **Acceptance:** Agent can open a LIVE instruction, submit one structured proposal (fee model/value, inclusions, timeline, marketing plan, cancellation terms); duplicate proposal for same instruction/agent is blocked server-side.
      **Progress (2026-03-21):** `POST /api/proposals` persists submissions through a service-layer guardrail (`LIVE` status, active bid window, no self-bidding), blocks duplicates via unique constraint handling, auto-reconciles expired `LIVE` instructions to `CLOSED`, and the proposal builder now submits structured payloads with inline validation + preview sync. Browser smoke on `2026-03-21` confirmed agent submission creates a persisted `SUBMITTED` proposal for the newly created instruction.

- [x] T015 — Marketplace write infrastructure baseline (data-led backend hardening)
      **Acceptance:** Marketplace write APIs use a dedicated domain service layer with typed operational error codes, structured API responses, privacy-safe event emissions at write boundaries, and health endpoint DB readiness checks.
      **Progress (2026-03-21):** Write boundaries now also enforce idempotency-key semantics and per-route rate limiting for safer rollout. Migration history drift from manual SQL apply was reconciled with `prisma migrate resolve`, and `npm run prisma:migrate:dev` now returns in-sync status. Added `docs/DB_MIGRATION_RUNBOOK.md` and a repeatable smoke gate command (`npm run smoke:marketplace`) to validate homeowner-create + agent-submit end-to-end.
      **Progress (2026-03-22):** Added optional shared Upstash Redis backing for rate limiting and idempotency storage across write endpoints, with automatic in-memory/Prisma fallback when Redis is unconfigured or unavailable.

- [x] T004 — Homeowner proposal compare + shortlist/award workflow
      **Acceptance:** Homeowner can view standardized proposal comparison, shortlist/reject proposals, award exactly one proposal, and statuses update consistently (`SUBMITTED` -> `SHORTLISTED`/`REJECTED` -> one `ACCEPTED`).
      **Progress (2026-03-21):** Compare page now loads owner-scoped persisted instruction/proposal data from Prisma, and homeowners can trigger `SHORTLIST`, `REJECT`, and `AWARD` decisions through `PATCH /api/proposals/[proposalId]/decision` with idempotency + rate limiting. Service-layer transactional guards now enforce valid transitions, shortlist-before-award, and exactly one accepted proposal per instruction.
      **Progress (2026-03-23):** Logged-in compare UX now includes homeowner decision ergonomics requested in the redesign pass: sort modes (`best value`, `lowest fee`, `most complete service`, `best local fit`, `fastest timeline`), per-offer ranking badges, decision-highlight strip, shortlist multi-select helper (up to 3 submitted offers), expanded side-by-side rows (areas covered + experience), and updated action language (`Choose agent`, `Chosen`).

- [x] T005 — Gated messaging threads (shortlist/award unlock rule)
      **Acceptance:** Thread exists in `LOCKED` state before unlock; becomes `OPEN` when rule triggers; only homeowner and the relevant agent can read/write messages; unauthorized access is denied.
      **Progress (2026-03-22):** Proposal submission now persists `MessageThread` rows in `LOCKED`, and homeowner decision actions (`SHORTLIST` / `AWARD`) now atomically open the relevant thread in the same transaction path. Added service-layer participant read/write helpers (`getMessageThreadForParticipant`, `createMessageForParticipant`) with not-found masking for outsiders and locked-thread denial for participants, plus DB-backed coverage in `src/server/marketplace/messages.persistence.test.ts`. Added `GET/POST /api/messages/[threadId]` with session auth, RBAC (`thread:view`/`thread:message`), actor-scoped rate limiting, and idempotent message writes. The `/messages` app route now loads live thread lists via `GET /api/messages/threads`, reads thread messages via `GET /api/messages/[threadId]`, sends messages via `POST /api/messages/[threadId]`, and deep-links from compare using `instructionId` query context.

- [ ] T010 — Real proposal builder form (React Hook Form + Zod) with inline validation + preview sync
      **Acceptance:** Form validates client-side and server-side with matching schema errors; preview updates as inputs change; submit success/error states are visible.
      **Progress (2026-03-21):** `/agent/marketplace/[instructionId]/proposal` now validates against `proposalSubmissionSchema`, keeps the preview synced to live field state, and submits structured payloads to `/api/proposals` with idempotency headers. RHF wiring is still pending if we decide to add it later.

- [ ] T011 — Agent profile + manual verification workflow (MVP trust badges)
      **Acceptance:** Agent can edit agency/profile/service areas; admin can set verification status; verification badge is displayed on marketplace proposals and comparison views.

- [ ] T012 — Loading/empty/error states polish across key flows
      **Acceptance:** All primary MVP screens have non-empty empty states, skeletons for loading, and user-visible error messages with recovery actions.
      **Progress (2026-04-02):** Public auth now resolves sign-in `next`/`error` state server-side so the page no longer depends on a Suspense placeholder; public directory/request zero states now include rollout explanation, proof/example content, and one clear CTA instead of placeholder emptiness. App-wide skeleton/loading polish is still pending on the logged-in surfaces.

- [x] T013 — Trust pages + HTML sitemap + browse LIVE Instructions by location (public)
      **Acceptance:** Public routes exist for `/privacy`, `/cookies`, `/terms`, `/complaints`, `/contact`, `/sitemap`, `/locations`, and `/locations/[postcodeDistrict]`; footer links expose trust/support pages; sitemap lists key pages and location routes; location pages list LIVE Instructions (not property listings).
      **Progress (2026-03-21):** Marketplace and location browse pages now read Prisma-backed LIVE instructions, include proposal counts from the database, and render empty states when `DATABASE_URL` is missing.
      **Progress (2026-03-23):** Public-facing IA/copy was aligned to outcome-first positioning (`Agents compete for your listing. You choose the deal.`) across homepage, `/agents`, `/locations*`, auth entry pages, footer, and legal/support pages; user-facing labels now prefer `sale request`/`offer` language and remove placeholder/trust-friction messaging on public pages.
      **Progress (2026-03-23):** Public IA now uses `/requests` as the primary seller-request browse route (`/requests`, `/requests/[postcodeDistrict]`), while `/locations*` remains as compatibility redirects to preserve existing external links.
      **Progress (2026-04-02):** Legal/support pages now surface a concrete support inbox, operating entity/region, response-window language, and named operational providers; public zero states now include rollout-stage explanation plus a proof/example block and one strong CTA instead of empty placeholder copy.

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
