# Whoma Tasks

## Phase 1 (Priority Now): Real Estate Agent Identity Validation

Goal: onboard first 100 real estate agents and validate personal-brand credibility behavior before expanding homeowner-first workflows.
Target date for onboarding start: Monday, **2026-03-30**.

- [x] A001 — Agent onboarding foundation (auth -> role -> profile bootstrap)
      **Acceptance:** A signed-in user selecting `AGENT` is routed through guided onboarding; baseline `AgentProfile` record is created; required fields are validated server-side; unauthorized writes are denied.

- [x] A002 — Genuine registration controls (real people + traceable identity)
      **Acceptance:** Production onboarding requires a real account-auth path (`Google`, `Apple`, or `email/password` when configured), captures real estate agent identity fields (full name, work email, phone, agency), enforces business work-email verification-code confirmation before onboarding completion, sets `verificationStatus=PENDING` on submission, and exposes entries in admin verification queue. (Dev mode currently surfaces `devCode`; preview auth remains backend-only for QA/E2E; production email-delivery integration for work-email verification is tracked separately.)

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
      **Progress (2026-04-02):** Synced local Prisma history non-destructively by marking `20260321194500_agent_work_email_verification` applied and deploying `20260322130500_agent_work_email_anti_abuse`, which unblocked agent onboarding rendering and restored auth-flow browser verification locally. Production email transport setup remains the final open step.

- [x] A011 — Web deployment baseline (shareable staging URL)
      **Acceptance:** App is deployed to a public Railway URL with managed Postgres, startup migrations run automatically, `/api/health` reports `database=up`, and live smoke flow (`sign-in -> create LIVE instruction -> submit proposal`) passes on the deployed URL.
      **Progress (2026-03-31):** Redeployed Railway production after the Phase 1 public repositioning pass; live `/api/health` returned `database=up`, landing smoke passed against the public URL, and `npm run smoke:marketplace` now verifies the live homeowner-create + agent-submit flow through the backend preview callback instead of public preview buttons.
      **Progress (2026-04-02):** Redeployed production with logged-in lifecycle dashboards, consent controls, and trust-signal fallback improvements; verified `/api/health` (`database=up`), `/locations/[district]` compatibility redirect (`307 -> /requests/[district]`), and successful live smoke write flow (`instructionId=cmnhht3f70004ta2mg8svtl15`, `proposalId=cmnhht57c0009ta2mw4qr98js`).
      **Progress (2026-04-03):** Redeployed Railway production with Gate 1 trust hardening from a clean release bundle, verified `/api/health` (`database=up`), verified `/api/auth/providers` returns `{}` in production, confirmed direct preview callback auth now fails with `error=Configuration` and leaves `/api/auth/session` unauthenticated, and confirmed `/agent/marketplace/ins_1` now redirects to sign-in instead of rendering the old scaffold page.

- [x] A012 — AI resume intake (OCR + LLM hybrid) for agent onboarding prefill
      **Acceptance:** `/api/agent/onboarding/resume-suggestions` supports `POST/GET/DELETE` with auth, idempotency, and rate-limit envelopes; scanned/text resumes both produce safe suggestion-only prefill (no auto-save), with heuristic fallback on provider failure and env-flag rollout controls.
      **Progress (2026-03-23):** Added typed resume AI pipeline (`heuristic` / `hybrid` / `llm_only`) with OpenAI extraction + optional OCR fallback in `src/server/agent-profile/resume-ai.ts`; shipped route handlers for `POST/GET/DELETE` using signed cookie storage v2 (`confidence`, `evidence`, `warnings`) and existing `ok/data` + `ok/error` API envelope semantics; integrated onboarding upload flow with mode flags and warning/error UI states; added coverage in `src/server/agent-profile/resume-ai.test.ts` and `src/app/api/agent/onboarding/resume-suggestions/route.test.ts`.

- [x] A013 — Public Phase 1 positioning + auth hardening
      **Acceptance:** Public landing, directory/profile, auth, and trust pages present WHOMA first as a verified estate agent identity platform; `/requests*` stays live as a clearly labeled secondary pilot and is `noindex`; public auth never exposes preview or admin access; agent onboarding/CV surfaces show a visible activation checklist aligned to Phase 1 behaviors.
      **Progress (2026-03-31):** Redeployed and re-verified live production: homepage now leads with verified-profile messaging and Phase 1 sequencing, `/requests` is publicly framed as a secondary pilot with `noindex`, and public sign-in resolves to the beta-gated auth path without exposing preview-role controls.
      **Progress (2026-04-02):** Tightened the public Phase 1 thesis around verified identity, agent-owned reputation, and structured collaboration: homepage CTAs now lead with agent-profile build / transaction logging / limited collaboration-pilot entry, homepage proof now includes a featured verified agent block plus case-study/demo material, and public auth now resolves `next`/`error` server-side so sign-in no longer depends on a client Suspense loading fallback.
      **Progress (2026-04-02):** Live production now also avoids developer-facing OAuth env copy on public sign-in and keeps beta-gated auth messaging trust-safe while preview-role auth remains backend-only for QA and smoke automation.
      **Progress (2026-04-02):** Launch-language cleanup is now live across public/auth/legal/request surfaces and the main signed-in agent/homeowner flows: `Marketplace` is now `Open Instructions`, `sale request`/`seller request` copy has been normalized to `instruction`/`offer`, legal/contact pages no longer read like pilot operating notes, and branded `not-found` / `loading` / `error` states now backstop the public app shell.
      **Progress (2026-04-04):** Follow-up brand tuning is now live in production: the site-wide font baseline reverted to `Montserrat`, the global page base returned to pure white across public and signed-in surfaces, and the stacked logo subtitle now reads `Where homeowners meet estate agents`.
      **Progress (2026-04-06):** Estate-agent account access is now self-serve when the live service is configured for it: public auth supports Google, Apple, and email/password account creation/sign-in for agents, a new `/api/auth/register` path creates DB-backed email/password users, preview-only role access remains hidden from public pages, and contact/privacy pages no longer present end users with an exposed service-provider grid.

## Behavioural Validation Gap Closures (Audit 2026-04-02)

- [ ] BV001 — Phase 1 measurement contract + synthetic-data exclusion
      **Acceptance:** WHOMA defines `qualified agent`, `historic transaction logged`, `historic transaction verified`, `live transaction logged`, `active collaboration listing`, `interaction velocity`, and `monthly active engaged agent` in code/docs; official Phase 1 reporting excludes preview, seed, test, and other synthetic records.

- [ ] BV002 — Durable event spine + Phase 1 ops dashboard
      **Acceptance:** Service-boundary events persist to a durable store with actor/source metadata; admin reporting exposes all six Phase 1 objectives plus key drop-offs and recent-window metrics without relying on console logs.

- [ ] BV003 — Historic/live transaction logging domain
      **Acceptance:** Historic and live transaction logging are modeled explicitly with verification state/evidence, surfaced in agent workflows, and no public trust copy implies transaction proof that the schema does not actually store.

- [x] BV004 — Public narrative truthfulness cleanup
      **Acceptance:** Public CTA routing, homepage proof modules, `/requests*` cards, and public profile trust labels reflect real Phase 1 capabilities only; no public route reuses internal tender-marketplace CTAs or metrics that overstate current transaction depth.
      **Progress (2026-04-02):** Gate 1 trust cleanup removed unsupported public proof from homepage, directory, and public profile surfaces: heuristic response/seller-fit signals, historic/live collaboration counters, synthetic featured-profile proof, and scaffolded public-trust labels are no longer rendered. Remaining Gate 2 work: correct the misleading transaction CTA route, split `/requests*` public cards from internal marketplace cards, and align docs/tests with the truthful public thesis.
      **Progress (2026-04-02):** Public and signed-in launch copy now avoids `pilot`, `preview`, `MVP`, `CV builder`, `real estate agent`, and `marketplace` terminology on user-facing surfaces except where an internal QA-only preview path remains intentionally hidden from production.
      **Progress (2026-04-06):** Closed the remaining Gate 2 public-truth cleanup: shared public-site summary no longer claims `real transaction depth`, `/requests*` now renders public-mode instruction cards with no `/agent/marketplace` links or agent-only CTAs, request-route headings now position seller access as invited supporting context, and public-routing E2E now asserts that redirected `/locations*` pages expose no marketplace links.

- [x] BV005 — Production auth posture hardening
      **Acceptance:** Backend preview auth is disabled in public production or protected by a strict internal-only control plane; hidden callback access can no longer create arbitrary homeowner/agent/admin sessions on the live service.
      **Progress (2026-04-02):** Gate 1 trust pass now hard-disables preview auth in production code (`src/lib/auth/preview-access.ts`, `src/auth.ts`) even when `ENABLE_PREVIEW_AUTH=true`; added `User.dataOrigin` (`PRODUCTION` / `PREVIEW` / `SEED` / `TEST`) with checked-in migration `20260402124000_gate1_trust_data_origin`; public directory/profile/admin activation counts and production live-instruction reads now exclude non-production actors; smoke automation now refuses remote preview callback auth unless explicitly overridden.
      **Progress (2026-04-02):** Redeployed Railway production and verified the live auth posture end-to-end: `/api/auth/providers` returns `{}`, `/sign-in` serves the invitation-only access UX, remote `npm run smoke:marketplace` refuses preview-auth against the production URL by design, and a direct POST to `/api/auth/callback/preview` resolves to `error=Configuration` rather than creating a session.
      **Progress (2026-04-03):** Production database verification via Railway Postgres shell shows no seeded pilot agents remain in the live dataset (`User.dataOrigin` counts: `PRODUCTION=2`, `PREVIEW=5`; no `pilot.agent%@whoma.local` rows), and `/agents/pilot-agent-01` now resolves to the not-found fallback content rather than a public agent record.

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
      **Progress (2026-04-02):** Extended homeowner decision E2E coverage to validate sort-mode interactions, ranking-badge visibility, shortlist multi-select behavior, and choose-agent path persistence on reload.

- [x] T005 — Gated messaging threads (shortlist/award unlock rule)
      **Acceptance:** Thread exists in `LOCKED` state before unlock; becomes `OPEN` when rule triggers; only homeowner and the relevant agent can read/write messages; unauthorized access is denied.
      **Progress (2026-03-22):** Proposal submission now persists `MessageThread` rows in `LOCKED`, and homeowner decision actions (`SHORTLIST` / `AWARD`) now atomically open the relevant thread in the same transaction path. Added service-layer participant read/write helpers (`getMessageThreadForParticipant`, `createMessageForParticipant`) with not-found masking for outsiders and locked-thread denial for participants, plus DB-backed coverage in `src/server/marketplace/messages.persistence.test.ts`. Added `GET/POST /api/messages/[threadId]` with session auth, RBAC (`thread:view`/`thread:message`), actor-scoped rate limiting, and idempotent message writes. The `/messages` app route now loads live thread lists via `GET /api/messages/threads`, reads thread messages via `GET /api/messages/[threadId]`, sends messages via `POST /api/messages/[threadId]`, and deep-links from compare using `instructionId` query context.

- [ ] T010 — Real proposal builder form (React Hook Form + Zod) with inline validation + preview sync
      **Acceptance:** Form validates client-side and server-side with matching schema errors; preview updates as inputs change; submit success/error states are visible.
      **Progress (2026-03-21):** `/agent/marketplace/[instructionId]/proposal` now validates against `proposalSubmissionSchema`, keeps the preview synced to live field state, and submits structured payloads to `/api/proposals` with idempotency headers. RHF wiring is still pending if we decide to add it later.
      **Progress (2026-04-02):** Builder copy is now offer-led rather than marketplace/proposal-led, success states now confirm `offer` submission clearly, and dead disabled CTA placeholders were removed so the critical path reads as intentional instead of scaffolded.

- [ ] T011 — Agent profile + manual verification workflow (MVP trust badges)
      **Acceptance:** Agent can edit agency/profile/service areas; admin can set verification status; verification badge is displayed on marketplace proposals and comparison views.

- [ ] T012 — Loading/empty/error states polish across key flows
      **Acceptance:** All primary MVP screens have non-empty empty states, skeletons for loading, and user-visible error messages with recovery actions.
      **Progress (2026-04-02):** Public auth now resolves sign-in `next`/`error` state server-side so the page no longer depends on a Suspense placeholder; public directory/request zero states now include rollout explanation, proof/example content, and one clear CTA instead of placeholder emptiness. App-wide skeleton/loading polish is still pending on the logged-in surfaces.
      **Progress (2026-04-02):** Replaced logged-in placeholder pages with DB-backed lifecycle surfaces for homeowners (`/homeowner/instructions`) and agents (`/agent/proposals`) including non-empty empty states, status cards, and direct recovery actions.
      **Progress (2026-04-02):** Public auth, directory, and request zero-state copy now reads as selective and launch-ready rather than empty or mechanics-heavy; homeowner activity remains secondary while support and recovery actions stay visible.
      **Progress (2026-04-02):** Added branded global `not-found`, `loading`, and `error` routes plus calmer empty-state language across messages, instructions, offers, and compare flows, reducing prototype-style dead ends in both public and signed-in journeys.
      **Progress (2026-04-06):** Sign-in and sign-up now surface real public auth choices and direct failure recovery for agents instead of falling back to request-access copy when Google is unavailable; email/password registration now provides a working self-serve path, while homeowner access stays intentionally support-routed.

- [x] T013 — Trust pages + HTML sitemap + browse LIVE Instructions by location (public)
      **Acceptance:** Public routes exist for `/privacy`, `/cookies`, `/terms`, `/complaints`, `/contact`, `/sitemap`, `/locations`, and `/locations/[postcodeDistrict]`; footer links expose trust/support pages; sitemap lists key pages and location routes; location pages list LIVE Instructions (not property listings).
      **Progress (2026-03-21):** Marketplace and location browse pages now read Prisma-backed LIVE instructions, include proposal counts from the database, and render empty states when `DATABASE_URL` is missing.
      **Progress (2026-03-23):** Public-facing IA/copy was aligned to outcome-first positioning (`Agents compete for your listing. You choose the deal.`) across homepage, `/agents`, `/locations*`, auth entry pages, footer, and legal/support pages; user-facing labels now prefer `sale request`/`offer` language and remove placeholder/trust-friction messaging on public pages.
      **Progress (2026-03-23):** Public IA now uses `/requests` as the primary seller-request browse route (`/requests`, `/requests/[postcodeDistrict]`), while `/locations*` remains as compatibility redirects to preserve existing external links.
      **Progress (2026-04-02):** Legal/support pages now surface a concrete support inbox, operating entity/region, response-window language, and named operational providers; public zero states now include rollout-stage explanation plus a proof/example block and one strong CTA instead of empty placeholder copy.
      **Progress (2026-04-02):** Public brand language was reset around profile-first positioning for independent estate agents: homepage now leads with featured profiles and proof modules, footer/support scaffolding uses calmer descriptors, and `/requests*` now reads as a secondary homeowner collaboration pilot rather than the product's main category story.
      **Progress (2026-04-02):** `/requests*` and static trust pages now use launch-ready instruction/support language (`open instructions`, `seller access`, `Contact`, `Access by invitation`) instead of fee-comparison or rollout-heavy framing; sitemap emphasis now sits on core pages rather than seller-access merchandising.

- [x] T014 — Cookie consent mechanism + preferences control (MVP)
      **Acceptance:** Non-essential cookies remain off until consent; user can review/change preferences; cookies page links to live consent controls and accurately reflects behavior.
      **Progress (2026-04-02):** Added signed consent preference cookie handling (`/api/consent` GET/POST/DELETE), global consent banner with essential-only/accept-all/custom paths, and live `/cookies#manage-consent` controls for review/change/reset; footer now links directly to consent controls.

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
