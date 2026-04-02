# WHOMA Platform Map

## Current Validation Focus (Phase 1)

Primary question:
"Will real estate agents use WHOMA to build personal professional credibility independent of their agency brand?"

Phase 1 delivery focus:

- Real estate agent onboarding ✅
- Agent CV/profile builder ✅
- Public agent profile pages ✅
- Public agent directory ✅
- Public Phase 1 positioning + activation checklist ✅

## Feature Relationship Map

1. Identity and access

- Sign in (`Google OAuth` + preview credentials fallback) -> role selection (`HOMEOWNER` / `AGENT` / `ADMIN`) -> gated app routes
- Preview fallback still exists for QA/E2E when `ENABLE_PREVIEW_AUTH=true`, but public auth pages now hide preview-role UI and instead show a beta gate when Google is unavailable.

2. Agent onboarding and trust

- Real estate agent requests + confirms a business work-email verification code (`/agent/onboarding`) -> completes guided professional onboarding -> profile moves to `verificationStatus=PENDING` for admin trust review
- Verification hardening now enforces resend cooldown, confirm-attempt lockout, and onboarding action rate limits server-side.
- Non-production environments expose a `devCode` for verification QA; production transport uses a Resend adapter once `RESEND_API_KEY` + `RESEND_FROM_EMAIL` are configured in deployment env.

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

- Admin queue (`/admin/agents`) updates verification status and tracks activation metrics (`started`, `workEmailVerified`, `completed`, `publishReady`, `published`, `pendingVerification`, `verified`)
- Verification guardrail: `VERIFIED` status requires `profileStatus=PUBLISHED` and publish-level completeness

8. Marketplace write persistence baseline (new backend infra)

- Homeowner write boundary (`POST /api/instructions`) -> `src/server/marketplace/service.ts` -> transactional `Property + Instruction` persistence with deterministic `DRAFT/LIVE` inference
- Agent write boundary (`POST /api/proposals`) -> service-level eligibility checks (`LIVE` + active bid window + not own instruction) -> unique duplicate protection + request-time expiry reconciliation (`LIVE` -> `CLOSED`)
- Service layer emits privacy-conscious events (`instruction_created`, `instruction_published`, `proposal_submitted`) and returns typed operational error codes for API mapping
- API safety guardrails: write endpoints require `Idempotency-Key` headers and enforce actor-scoped in-memory rate limits before processing

9. Marketplace read views and seller-request area browse

- `/agent/marketplace` and `/requests*` use Prisma-backed LIVE instruction reads mapped into the shared `InstructionCard` model
- Reads include active bid windows only (`bidWindowEndAt > now`) plus proposal counts from the database
- Area summaries group by postcode district using the shared district extraction helper, and both pages degrade to empty states when `DATABASE_URL` is missing
- Legacy `/locations` and `/locations/[postcodeDistrict]` routes now redirect to `/requests` equivalents for backward compatibility

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

13. Message thread lifecycle + access control (T005)

- Proposal submission persistence now guarantees a homeowner-agent `MessageThread` exists in `LOCKED` state for each proposal pair.
- Homeowner decision persistence now atomically unlocks (`LOCKED -> OPEN`) the relevant thread when a proposal is shortlisted or awarded.
- Compare UI now exposes messaging unlock state (`LOCKED` / `OPEN`) and only enables the messages CTA once shortlist/award unlock conditions are met.
- API route `/api/messages/[threadId]` now supports participant-scoped `GET`/`POST` thread access with session auth + RBAC (`thread:view` / `thread:message`), actor-scoped rate limiting, idempotent writes, and locked-thread send denial.
- API route `/api/messages/threads` now returns participant-scoped thread summaries (including counterpart and latest-message metadata) to power live thread discovery in `/messages`.
- `/messages` now consumes live APIs end-to-end (thread list/read/send) and compare CTA deep-links with `?instructionId=` context for faster handoff from shortlist/award decisions.

14. Web deployment baseline (Railway, live)

- Production service is deployed on Railway at `https://whoma-web-production.up.railway.app` with managed Postgres in the same project.
- Runtime start command now runs `prisma migrate deploy` before `next start`, so schema migrations are applied during service boot.
- Auth fallback for staging/demo is env-gated (`ENABLE_PREVIEW_AUTH=true`) while Google remains the production-first auth path.
- Preview auth UI now uses a compact role selector + email input flow (`Continue with Preview Email`) to avoid long-button overflow and support personal-email demo sessions.
- Middleware now reads Auth.js v5 cookie names (`__Secure-authjs.session-token` in production) so authenticated sessions resolve correctly on protected routes.
- Location district pre-generation now avoids build-time database dependency (`generateStaticParams` returns `[]`), preventing remote build failures when DB private networking is unavailable at build time.
- Production build now passes with strict type checks and `next.config.ts` no longer uses `typescript.ignoreBuildErrors`.

15. Public-facing copy and empty-state polish

- Public landing, auth, agent directory, location browse, and static policy pages now use clearer outcome-first language (`brief`, `response window`, `responses`) to reduce internal marketplace jargon on public surfaces.
- Empty states on the public location and directory pages now explain the next useful action instead of exposing scaffold/dev-note language.
- No route behavior, data wiring, or domain flow changed in this pass.

16. AI resume intake suggestions (A012)

- Agent onboarding now supports AI-assisted resume prefill via `/api/agent/onboarding/resume-suggestions` with `POST` (upload/extract), `GET` (read suggestion), and `DELETE` (clear suggestion).
- Pipeline modes are env-controlled (`heuristic`, `hybrid`, `llm_only`) with kill-switches and rollout flags in `src/server/agent-profile/resume-flags.ts` (`ENABLE_RESUME_AI_PREFILL`, `RESUME_PREFILL_MODE`, `ENABLE_RESUME_OCR_FALLBACK`, `RESUME_AI_SHADOW_MODE`, confidence/upload limits).
- Extraction flow is deterministic-first: parse text using existing intake heuristics, attempt OpenAI extraction when enabled, apply per-field confidence thresholds, and fall back safely to deterministic suggestions on provider failure.
- OCR fallback is optional and guarded (`ENABLE_RESUME_OCR_FALLBACK`) to support scanned PDFs/images when native text extraction is insufficient.
- Suggestions remain ephemeral and review-first: signed cookie payload v2 (`version`, `suggestionId`, `prefill`, `confidence`, `evidence`, `warnings`) is the source of truth for this phase; no new DB tables or auto-writes were introduced.

17. Public Phase 1 positioning + activation (new)

- Public landing, metadata, footer, auth entry, directory, profile, and legal/support pages now position WHOMA first as a verified estate agent identity platform rather than a broad homeowner tender marketplace.
- Homepage and sign-up paths now lead with work-email verification, structured profile depth, publish readiness, and admin-reviewed trust; homeowner tendering is framed as a controlled secondary pilot.
- `/requests` and `/requests/[postcodeDistrict]` remain live for pilot visibility, but both now use Phase 1 pilot framing and `noindex` metadata.
- Public auth pages now have two explicit public states: Google sign-in when configured, or a clean beta gate/contact path when Google is unavailable.
- `GoogleAuthButton` now supports explicit public vs internal UX modes so preview-role UI remains available for QA/E2E without leaking onto public pages.

18. Activation checklist + stronger Phase 1 counters (new)

- Agent onboarding and CV builder now share a visible five-step activation checklist: work email verified, onboarding completed, profile ready for publish, profile published, admin verified.
- `src/server/agent-profile/service.ts` now exposes richer activation metrics for admin/readiness monitoring instead of only the original four counters.
- Seeded pilot agents now populate existing proof fields such as `responseTimeMinutes` and `ratingAggregate`, giving public proof surfaces stronger non-empty pilot examples.

19. Logged-in compare UX + agent proof module upgrade (new)

- `/homeowner/instructions/[instructionId]/compare` now includes decision-centric UX: sortable comparison (`best value`, `lowest fee`, `most complete service`, `best local fit`, `fastest timeline`), per-offer ranking badges, a shortlist helper (up to 3 submitted offers), and expanded side-by-side evidence rows (`Areas covered`, `Experience`).
- Compare decision UX retains existing domain-safe transitions and API behavior (`PATCH /api/proposals/[proposalId]/decision`), with no change to server decision rules.
- `/agents/[slug]` now exposes deeper public trust/proof modules using existing profile data (`responseTimeMinutes`, `ratingAggregate`, `profileCompleteness`, `serviceAreas`, `specialties`, `achievements`, `languages`, and profile timestamps) without inventing new metrics.
- Public browse IA now anchors on `/requests` while `/locations*` remains compatibility redirects to avoid breaking shared links.

20. Proof-led public pilot layer + auth completion hardening (new)

- Homepage CTAs now lead with the current Phase 1 priorities: `Build your verified profile`, `Log your first transactions`, and a clearly labeled limited collaboration-pilot route.
- Homepage proof now includes a featured verified-agent block sourced from public profiles when available, a sample case-study narrative, and a workflow demo showing instruction -> structured proposals -> shortlist -> messaging.
- Public directory and `/requests*` empty states now explain rollout stage, show one concrete proof/example element, and offer one strong next-step CTA instead of placeholder emptiness.
- Public sign-in and sign-up now resolve `next` and `error` on the server and pass them into `GoogleAuthButton`, removing the Suspense-only loading fallback from the auth entry flow while keeping the same NextAuth backend architecture.
- `GoogleAuthButton` now surfaces inline sign-in failure states for both Google and preview paths instead of silently resetting to idle.
- Static trust/support routes now expose the concrete support inbox, operating entity/region, response-window expectations, and named operational provider stack (Auth.js/Google, Railway/Postgres/Prisma, Resend, optional Upstash, optional OpenAI resume intake).
- `/sitemap` now derives live pilot request-area summaries from the marketplace query layer at request time instead of reading mock data.

## Frontend/Backend Map

## Frontend (Next.js App Router)

- Public: `/`, `/agents`, `/agents/[slug]`, trust/legal pages
- Public landing now includes proof-led modules (featured verified profile, pilot case-study narrative, workflow demo) instead of relying on strategy copy alone.
- Public homeowner-collaboration browse: `/requests`, `/requests/[postcodeDistrict]` as a secondary noindex pilot surface (with `/locations*` compatibility redirects)
- Auth: `/sign-in`, `/sign-up`, `/onboarding/role` with server-resolved public auth state and backend-only preview controls reserved for QA/E2E
- Agent app: `/agent/onboarding`, `/agent/profile/edit`, proposals, marketplace
- Homeowner app: `/homeowner/instructions/new` client-side instruction form with structured payload assembly and bid-window sync
- Admin app: `/admin/agents` verification queue + expanded activation counters

## Backend

- Auth/session: `next-auth` + middleware route guards + preview credentials (`HOMEOWNER` / `AGENT` / `ADMIN`) reserved for QA/E2E and direct callback flows
- Dev host consistency: middleware redirects sign-in/app route traffic to the canonical `AUTH_URL` host in development
- Validation: `zod` at server boundaries
- Service layer: `src/server/agent-profile/service.ts` for onboarding/CV/publish/directory/verification logic (slug stability, publish hardening, verification readiness checks)
- Service layer: `src/server/marketplace/service.ts` for instruction/proposal persistence, bid-window domain guards, duplicate handling, and event emission
- Security helpers: `src/server/http/idempotency.ts` and `src/server/http/rate-limit.ts` for replay-safe writes and request throttling, now backed by optional Upstash Redis shared storage with fallback to Prisma/in-memory when unconfigured
- Persistence: Prisma + Postgres
- Authorization: role-based access checks for all writes
- Operational health: `/api/health` now reports DB readiness (`up` / `down` / `unconfigured`) with degraded status response on DB failure
- Infrastructure roadmap reference: `docs/BACKEND_INFRA_BLUEPRINT.md`

## Migration + QA Evidence

- Migration: `prisma/migrations/20260321173500_phase1_agent_profile_platform/migration.sql`
- Migration: `prisma/migrations/20260321184000_marketplace_write_infra/migration.sql`
- Migration: `prisma/migrations/20260321190500_api_safety_idempotency/migration.sql`
- Migration: `prisma/migrations/20260321194500_agent_work_email_verification/migration.sql`
- Migration: `prisma/migrations/20260322130500_agent_work_email_anti_abuse/migration.sql`
- DB-backed service test: `src/server/agent-profile/phase1-flow.test.ts`
- API safety tests: `src/server/http/idempotency.test.ts`, `src/server/http/rate-limit.test.ts`
- T004 decision guard tests: `src/server/marketplace/service.test.ts`
- T005 persistence tests: `src/server/marketplace/service.persistence.test.ts`, `src/server/marketplace/messages.persistence.test.ts`
- End-to-end flow test: `tests/e2e/phase1-agent-flow.spec.ts`
- Homeowner decision flow E2E: `tests/e2e/homeowner-compare-decision.spec.ts`
- Playwright runtime controls: `PLAYWRIGHT_SKIP_WEB_SERVER=1`, `PLAYWRIGHT_BASE_URL`, `PLAYWRIGHT_WEB_SERVER_COMMAND`
- Marketplace smoke gate: `npm run smoke:marketplace` (direct preview callback auth -> create LIVE instruction -> submit proposal), keeping deployment verification compatible with hidden public preview UI
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
