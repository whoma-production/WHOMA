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

## Current Validation Risk (Audit 2026-04-02)

- Public story and route-level CTA behavior are now aligned to the identity-first thesis; the main remaining truth risk is no longer surface copy but missing first-class measurement/logging primitives behind Phase 1 proof claims.
- Phase 1 now exposes a six-objective validation snapshot (qualified density, historic/live logging, collaboration participation, 14-day interaction, monthly engagement) using durable event + profile signals, but still lacks first-class `historic transaction verified` domain state/evidence entities.
- Preview/seed/demo traffic still shares the main runtime data path, so current counters and proof surfaces are vulnerable to synthetic-data contamination unless source tagging/exclusion is added.
- Production auth is hardened, but live verification still lacks a production-safe write-path smoke that does not depend on local/internal preview callback tooling.

## Feature Relationship Map

1. Identity and access

- Sign in (`Google OAuth` when configured, otherwise passwordless email via Supabase Auth) -> role selection (`HOMEOWNER` / `AGENT`) -> gated app routes
- Preview fallback still exists for QA/E2E when `ENABLE_PREVIEW_AUTH=true`, but public auth pages never expose preview-role UI and now prefer live self-serve account access for agents whenever any public auth method is available.

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
- Auth callbacks now resolve through `/auth/callback` with Supabase PKCE exchange and post-auth routing, reducing provider/cookie drift across environments.

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
- Public production auth now runs through Supabase Auth with passwordless email plus optional Google OAuth when the provider is fully configured; preview controls are no longer part of the public auth path.
- Preview auth UI now uses a compact role selector + email input flow (`Continue with Preview Email`) to avoid long-button overflow and support personal-email demo sessions.
- Middleware now validates Supabase sessions and uses an internal access-hint cookie to preserve role/access-state routing without exposing roles publicly.
- Location district pre-generation now avoids build-time database dependency (`generateStaticParams` returns `[]`), preventing remote build failures when DB private networking is unavailable at build time.
- Production build now passes with strict type checks and `next.config.ts` no longer uses `typescript.ignoreBuildErrors`.
- Latest production deploy (`2026-04-08`, Railway deployment `d6398224-4162-46bc-ae9c-8d454853d14f`) includes the AI-first onboarding release (upload-first profile generation UX, pasted-bio extraction path, milestone framing, and publish-gate demotion), alongside GPT-first resume extraction defaults (`gpt-5.4` + `gpt-5.4-mini`) and onboarding UX E2E coverage additions.
- Latest production deploy (`2026-04-12`, Railway deployment `008c5212-7e49-49cf-b762-485e2bb307e7`) includes the public Phase 1 validation dashboard + proof checklist + Phase 2 preview de-emphasis pass, with live `/api/health` confirming `database=up`.

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
- Public auth pages now have two explicit public states: live self-serve account access for estate agents when any public auth method is configured, or a clean support path when none are available.
- `GoogleAuthButton` now supports explicit public vs internal UX modes so preview-role UI remains available for QA/E2E without leaking onto public pages.

18. Supabase auth migration for production readiness (2026-04-08) (new)

- Replaced NextAuth runtime auth/session handling with Supabase Auth (`Google OAuth` + `email magic link`) for a faster, more reliable production path on Railway.
- Removed Apple OAuth and removed public email/password auth flow (`/api/auth/register` deleted).
- Added server/browser/middleware Supabase clients (`src/lib/supabase/*`) and callback exchange route (`/auth/callback`) with explicit failure handling.
- Kept existing server-side authorization model by preserving `auth()` call sites and returning compatible session shape (`user.id`, `user.role`, `user.accessState`).
- Added `/auth/sign-out` and updated shell sign-out behavior to clear Supabase + app access state cleanly.

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
- Public sign-in and sign-up now resolve `next` and `error` on the server and pass them into `GoogleAuthButton`, removing the Suspense-only loading fallback from the auth entry flow.
- `GoogleAuthButton` now surfaces inline sign-in failure states for both Google and preview paths instead of silently resetting to idle.
- Static trust/support routes now expose the concrete support inbox, operating entity/region, response-window expectations, and named operational provider stack (Supabase Auth, Railway/Postgres/Prisma, Resend, optional Upstash, optional OpenAI resume intake).
- `/sitemap` now derives live pilot request-area summaries from the marketplace query layer at request time instead of reading mock data.

21. Logged-in lifecycle dashboards beyond compare (new)

- `/homeowner/instructions` now loads owner-scoped DB summaries (status, offers count, shortlist/chosen counts, offer-window timing) instead of placeholder content.
- `/agent/proposals` now renders a real offer lifecycle board grouped by status (`SUBMITTED`, `SHORTLISTED`, `ACCEPTED`, `REJECTED`) with per-offer context and contact-thread state.
- Both pages degrade safely when `DATABASE_URL` is unavailable and provide non-empty action-driven empty states.

22. Cookie consent controls (T014) (new)

- Added signed cookie consent storage and parsing (`src/server/consent/cookie-consent.ts`) with tamper detection and fixed schema.
- Added `GET/POST/DELETE /api/consent` for reading/updating/resetting non-essential consent preferences.
- Root layout now mounts a global consent banner (`CookieConsentBanner`) that appears until a consent decision is stored.
- `/cookies` now includes live preference controls (`CookieConsentPanel`) and footer links deep-link to `/cookies#manage-consent`.

23. Public trust-proof cleanup (new, supersedes prior heuristic trust fallback layer)

- Removed heuristic public trust signals and unsupported counters from homepage, public profile, and directory surfaces.
- Public-facing trust modules now stay within substantiated profile facts: verification status, profile completeness, service areas, specialties, experience, and publish visibility.
- Historic transaction, live collaboration, response-speed, seller-fit, and synthetic featured-proof claims are no longer used on public pages pending first-class domain + measurement support.

24. Behavioural-validation audit delta (new)

- The current product is strongest on verified identity onboarding and public trust gating, but still lacks explicit domain primitives for historic/live transaction logging and engagement reporting.
- Public-facing copy now outruns the modeled backend in a few places (`Log your first transactions`, `Historic transactions`, `Live collaborations`), so execution must bring product truth and measurement truth back into sync before calling Phase 1 aligned.
- `/admin/agents` is an activation dashboard, not yet a true behavioural-validation dashboard; it does not report the six client Phase 1 objectives or exclude preview/seed/test actors.
- The highest-sensitivity trust blocker remains preview-auth posture when `ENABLE_PREVIEW_AUTH=true`, because the backend preview callback can remain reachable even when public pages hide preview controls.

25. Public brand reset: profile-first editorial layer (new)

- `/` now leads with a profile-first editorial narrative for independent estate agents instead of a portal-like pilot explainer.
- Shared public proof content lives in `src/lib/public-proof.ts` and now models:
  - why agents join,
  - proof modules,
  - profile journey,
  - collaboration flow,
  - sample profile/comparison records.
- Global public styling now uses the original `Montserrat` family across display and UI/body text, a pure-white site base, flatter shadows, and calmer public section spacing.
- Shared public brand scaffolding (`public-site`, `public-footer`, `logo`) now uses shorter descriptors so homepage/header/footer no longer reintroduce the old internal thesis language.
- `/requests` and `/requests/[postcodeDistrict]` remain available, but now present as a secondary homeowner collaboration pilot rather than the primary public category story.
- `/sign-in`, `/sign-up`, and `/agents` now speak to profile-building, proof, and selective professional presence rather than access mechanics or empty pilot supply.

25. Gate 1 trust hardening (new)

- Added `User.dataOrigin` classification (`PRODUCTION`, `PREVIEW`, `SEED`, `TEST`) with checked-in migration `20260402124000_gate1_trust_data_origin` plus backfill rules for seeded, preview, and test actors.
- Preview credentials are now hard-disabled in production code regardless of `ENABLE_PREVIEW_AUTH`; `src/lib/auth/preview-access.test.ts` covers that contract.
- Public directory/profile reads and admin activation counts now exclude non-production actors in production runtime.
- Public live-instruction reads now exclude non-production homeowner and agent activity in production runtime so public proof counts do not absorb preview or seed traffic.
- Live production verification now confirms no seeded pilot-agent rows exist in the production database and `/agents/pilot-agent-01` resolves to the not-found fallback content instead of a public profile.
- `/agent/marketplace/[instructionId]` no longer renders a hardcoded scaffold and now redirects to the real proposal route.
- `scripts/smoke-marketplace-flow.mjs` now refuses remote preview callback auth unless an explicit internal override is supplied.

26. Launch-language and state cleanup (new)

- Shared app chrome now uses `Onboarding`, `Your Profile`, `Open Instructions`, `My Offers`, and `Messages` so signed-in navigation reads like a finished product rather than an internal workflow map.
- Agent/homeowner execution surfaces now prefer `instruction` and `offer` vocabulary over `sale request`, `seller request`, `proposal builder`, and `marketplace` wording.
- Dead disabled future-feature CTAs were removed from the offer builder, and the remaining primary actions now read as clear, single-path submission flows.
- Public and signed-in recovery states are now branded: `src/app/not-found.tsx`, `src/app/loading.tsx`, and `src/app/error.tsx` provide intentional fallback UX instead of generic framework defaults.
- Local browser QA now depends on same-origin auth callback settings (`PLAYWRIGHT_BASE_URL`, `AUTH_URL`, `NEXT_PUBLIC_APP_URL`) so Supabase callback/session cookies persist during browser runs.
- Local DB migration history for agent work-email verification was reconciled non-destructively by marking `20260321194500_agent_work_email_verification` applied and deploying `20260322130500_agent_work_email_anti_abuse`, which unblocked the agent onboarding route at runtime.

27. Public visual-baseline follow-up (2026-04-04) (new)

- The experimental serif/cream variant was rolled back in production so the site now presents the profile-first brand reset on a cleaner, more familiar baseline.
- `src/app/layout.tsx`, `src/app/globals.css`, and `src/lib/tokens.ts` now restore `Montserrat` across headings and body/UI while keeping the calmer spacing and flatter component feel from the broader brand pass.
- Shared site surfaces now use a pure white base across public and signed-in pages rather than the earlier stone/off-white wash.
- The shared logo lockup in `src/components/brand/logo.tsx` now renders a stacked subtitle again, using `Where homeowners meet estate agents` as the current public brand line.

28. Gate 2 public request-surface split (2026-04-06) (new)

- Shared `InstructionCard` now supports a public presentation mode so `/requests*` can show invited seller-access context without exposing agent-only marketplace actions.
- `/requests` and `/requests/[postcodeDistrict]` now describe seller access as a selective supporting layer, and their area-level CTAs no longer route public visitors into `/agent/marketplace/*`.
- Shared public site summary copy no longer claims `real transaction depth`; the homepage seller-access section now stays within profile-first, collaboration-safe language.
- `tests/e2e/public-routing.spec.ts` now asserts that redirected `/locations*` routes contain no links into `/agent/marketplace`, preventing this trust leak from reappearing silently.

29. Site-wide public visual-system unification (2026-04-07) (new)

- Added `src/components/layout/public-header.tsx` as the shared top navigation shell for public pages, and adopted it on `/`, `/agents`, `/agents/[slug]`, `/requests`, `/requests/[postcodeDistrict]`, `/sign-in`, `/sign-up`, and static trust pages.
- Removed fragmented route-by-route public header variants so navigation, CTA hierarchy, spacing, and header chrome now stay consistent across the public site.
- Updated global visual tokens in `src/app/globals.css` and `src/lib/tokens.ts` toward a neutral/clean baseline (`surface-1`, line color, muted text, accent tuning) to eliminate warm beige drift.
- Flattened shared component chrome for consistency with the target style by removing legacy soft-shadow dependencies from core cards, toasts, and comparison table shells and by simplifying button/form-control interaction treatment.
- Verified route behavior after the visual refactor with `npm run typecheck`, `npm run lint`, and `tests/e2e/public-routing.spec.ts` against the local app host.

30. Phase 1 messaging + contact/onboarding cleanup (2026-04-07) (new)

- Removed business-domain filtering from agent onboarding/profile validation so any valid email address can be verified and used for onboarding/publish flows.
- Updated onboarding/profile activation and error messaging to remove `business work email` phrasing while preserving work-email verification as the identity step.
- Public trust/support surfaces no longer show internal operations framing:
  - removed `Typical response window` language from homepage support copy and footer,
  - removed `Last updated` display from static trust/contact page header,
  - removed `Operating status` section and reduced contact summary card fields to user-relevant support/access information.
- Updated the shared public brand line to `Where Home Owners Meet Agents` across metadata, header logo subtitle, homepage hero, and footer context copy.
- Changed featured-profile fallback content to a realistic sample completed profile so public surfaces feel inhabited before full live profile density.
- Sign-in now clarifies provider readiness by showing that Google/email options appear when live auth credentials are configured, reducing ambiguity when one method is temporarily unavailable.

31. Production auth readiness pass: method-first sign-in + post-auth access states (2026-04-08) (new)

- Public sign-in now prioritizes real authentication methods first: `Continue with Google` and `Continue with email` (magic link).
- `src/auth.ts` now resolves Supabase user identity into WHOMA DB users and preserves role/access-state-aware sessions for existing server routes.
- Public auth UI (`src/components/auth/google-auth-button.tsx`, `/sign-in`, `/sign-up`) now presents only live methods with intentional unavailable/error states; support/request-access is secondary only.
- Auth/session now keeps approval logic after authentication via explicit post-auth states (`APPROVED` / `PENDING` / `DENIED`), with dedicated authenticated review routes:
  - `/access/pending`
  - `/access/denied`
- Middleware enforces post-auth access-state routing for agent surfaces using Supabase session checks plus app access hints.

32. Public language hardening follow-up (2026-04-07) (new)

- Removed homepage internal strategy copy (`Evidence signal`, `Phase 1 behaviour`) and kept the section focused on externally readable product value.
- Updated static contact page account-access copy so it no longer uses conditional internal phrasing (`when enabled`, `as each route is live`) and instead reads as clear product-facing guidance.
- Softened onboarding/profile progress copy (`Profile checklist`, progress tracker, success/error helper lines) so agent-facing pages feel premium and user-centric rather than internal operations-driven.

33. Public FAQ IA layer + utility strip (2026-04-07) (new)

- Added a thin utility strip above the shared public nav in `src/components/layout/public-header.tsx` with high-intent links: `Create profile`, `FAQs`, `Support`.
- Added a dedicated grouped FAQ route at `/faqs` (`src/app/faqs/page.tsx`) using topic sections and collapsible question blocks for fast scanning.
- Added a compact homepage FAQ preview block near the bottom of `/` with a direct `View all FAQs` CTA.
- Consolidated trust/help discovery links by adding `/faqs` to the public footer support section and sitemap page, and by wiring contact-page quick FAQ content from one shared FAQ source (`src/lib/faqs.ts`).

34. FAQ copy approachability pass (2026-04-07) (new)

- Rewrote all answers in `src/lib/faqs.ts` to be more inviting, less vague, and easier for first-time visitors to understand.
- Kept the existing grouped IA and route structure unchanged while improving clarity and trust tone.
- Preserved product-truth constraints in copy: agent-first positioning, profile trust before broad marketplace behavior, and selective seller access.

35. FAQ freshness hardening (2026-04-07) (new)

- Set `/faqs` to dynamic rendering (`export const dynamic = "force-dynamic"`) so production copy updates are not blocked by long-lived static edge cache.
- This keeps FAQ trust/copy updates immediately visible after deploy, while preserving the same IA and component structure.

36. Agent onboarding UX shift: profile generation workflow (2026-04-08) (new)

- `/agent/onboarding` now leads with one dominant action (`Upload CV / Resume`) and explicitly frames onboarding as profile generation rather than manual form completion.
- Resume extraction output now appears as a generated draft with:
  - visible parse/build state language,
  - extracted field chips,
  - confidence-aware confirmations,
  - missing-fields publish checklist.
- The page now follows a two-track architecture:
  - `Profile preview` surface showing generated identity output (`name`, `agency`, `role`, `areas`, `specialties`, summary, shareable path preview),
  - `Finish your profile` panel prioritizing only remaining inputs plus recommended enrichments.
- Email verification remains enforced by backend policy but is visually demoted to a compact publish-gate module rather than a top-level onboarding block.
- Activation language now uses milestone framing (`draft created`, `core details confirmed`, `public profile live`, `verification completed`) to keep progress tied to user-facing value.

37. Agent onboarding intake + QA hardening (2026-04-08) (new)

- Onboarding extraction intake now supports two first-class inputs through the same server pipeline:
  - uploaded CV/resume/document (`resumeFile`),
  - pasted professional bio (`bioText`).
- AI intake defaults were aligned to GPT-first operation:
  - `ENABLE_RESUME_AI_PREFILL=true`,
  - `RESUME_PREFILL_MODE=llm_only`,
  - default extraction model `gpt-5.4`,
  - default cleanup model `gpt-5.4-mini`,
  - OCR fallback remains optional and disabled by default unless explicitly enabled.
- Upload affordances/messages now include image formats (`PNG/JPG/WEBP`) while preserving explicit OCR-unavailable feedback when image extraction is attempted without OCR fallback.
- Added dedicated onboarding UX E2E coverage:
  - `tests/e2e/agent-onboarding-ux.spec.ts` asserts upload-first hierarchy, publish-gate visibility, and milestone framing,
  - mobile viewport variant ensures hierarchy/readability on small screens,
  - shared auth seeding helper lives in `tests/e2e/support/mock-auth.ts`.

38. Public Phase 1 proof-loop execution pass (2026-04-12) (new)

- Homepage now includes a visible `Phase 1 validation dashboard` backed by `src/server/phase1-validation.ts` so public messaging is tied to measurable objectives and target/status state.
- Added a `Public proof checklist` section that shows the proof-loop steps (`draft`, `historic logs`, `evidence review`, `live activity`, threshold, `shareable identity`) with explicit rollout status labels.
- Featured profile module now uses external-facing verification language (`Verified by WHOMA`) and transparent live-state messaging when the first live verified profile is not yet public.
- Phase 2 homeowner shortlist storytelling is now explicitly optional/de-emphasised:
  - route-level preview gated by `NEXT_PUBLIC_SHOW_PHASE2_PREVIEW`,
  - collaboration copy marked as Phase 2 and illustrative,
  - shortlist example collapsed behind a manual expand control.
- Public FAQs now include an explicit `What exactly is WHOMA validating in Phase 1?` answer to reduce strategy ambiguity on first read.

39. Phase 1 public QA guardrails (2026-04-12) (new)

- Updated Playwright coverage to keep public narrative regressions visible:
  - `tests/e2e/landing.spec.ts` now asserts the behavioural-validation headline and core Phase 1 CTA stack.
  - `tests/e2e/agent-onboarding-ux.spec.ts` keeps upload-first and publish-gate assertions aligned with the profile-generation onboarding surface.
  - `tests/e2e/phase1-agent-flow.spec.ts` selectors were aligned to the current onboarding labels and verification wording (`Verified by WHOMA`).
- Added environment-aware preview-auth guards in onboarding/phase1 E2E flows so tests skip cleanly when preview callback auth is unavailable instead of hard-failing unrelated deploy checks.

40. Public per-agent proof ledger (2026-04-13) (new)

- `/agents/[slug]` now renders a `Proof ledger` section sourced from durable `ProductEvent` rows for the profile owner (read-only; no schema migration).
- Ledger entries include event type, source label, timestamp, and explicit status labels:
  - `Logged signal` for event-level activity,
  - `Verified milestone` for verification-completion events.
- Event mapping currently covers: historic transaction logging, live collaboration logging, structured response submission, interaction received, profile-link sharing, conversation activity, and verification milestone completion.
- Proof copy intentionally avoids claiming verified transaction-evidence state where only logged activity exists, preserving Phase 1 truthfulness while increasing visible proof provenance.

41. Agent onboarding IA simplification pass (2026-04-13) (new)

- `/agent/onboarding` now behaves like a 6-step guided flow instead of a dense form surface:
  - `Import`,
  - `Draft preview`,
  - `Confirm details`,
  - `Quick interview`,
  - `Verify email`,
  - `Profile ready`.
- Import now accepts:
  - uploaded CV/resume document,
  - pasted professional bio,
  - optional LinkedIn URL as supplemental extraction context for the resume AI pipeline.
- Review choreography is now split intentionally:
  - a draft-preview surface that shows the imported profile as something close to publishable,
  - a confirmation layer that separates `detected and ready`, `needs confirmation`, and `still missing`,
  - a quick-interview form that only exposes missing/low-confidence fields plus optional trust enrichments.
- The onboarding write path now accepts optional `achievements` and `languages`, so those profile-strengthening fields can be captured before the user reaches `/agent/profile/edit`.
- Post-onboarding handoff now explicitly points to the first trust-building action (`log one past deal`) in the profile workspace instead of ending on a generic saved-state message.

42. Structured onboarding gap-fill + auth-enabled QA/deploy follow-up (2026-04-13) (new)

- `AgentProfile` now stores four additional structured working-style signals:
  - `feePreference`,
  - `transactionBand`,
  - `collaborationPreference`,
  - `responseTimeMinutes`.
- Checked-in migration: `prisma/migrations/20260413091449_agent_profile_structured_preferences/migration.sql`.
- Those fields now flow through:
  - `/agent/onboarding` quick interview and draft preview,
  - `/agent/profile/edit` draft/publish form,
  - `/agents/[slug]` public `Working style` presentation card,
  - completeness scoring in `src/server/agent-profile/service.ts`.
- Quick-interview prioritization now spends the 7-question budget on higher-value profile signals first (`service areas`, `specialties`, `bio`, and the four new structured working-style questions) before pushing lower-signal operational fields into the collapsible manual editor.
- Local onboarding E2E no longer depends on the retired preview callback auth path:
  - `tests/e2e/support/mock-supabase-server.mjs` provides a minimal Supabase-compatible mock auth service,
  - `tests/e2e/support/mock-auth.ts` seeds the auth cookie + DB role state,
  - `tests/e2e/agent-onboarding-ux.spec.ts` now executes and passes against the real onboarding UI instead of skipping.
- Railway production deploy `87401dd1-6409-486f-91e5-2dff076f4f27` is live on `https://whoma-web-production.up.railway.app`; `/api/health` reports `database=up`, and protected `/agent/onboarding` + `/agent/profile/edit` routes redirect correctly when unauthenticated.
- Production auth follow-up still remains: live Supabase magic-link emails are currently embedding `redirect_to=http://localhost:3000`, which blocks a full signed-in production onboarding/profile verification pass until Supabase Site URL / redirect target settings are corrected.

43. Supabase callback-origin hardening for production reliability (2026-04-13) (new)

- Added `src/lib/auth/callback-origin.ts` as the canonical callback origin resolver shared by public sign-in and `/auth/callback`.
- Callback origin precedence is now explicit and environment-safe:
  - `NEXT_PUBLIC_AUTH_CALLBACK_ORIGIN`,
  - fallback `NEXT_PUBLIC_APP_URL`,
  - fallback `AUTH_URL`,
  - runtime request/browser origin fallback when needed.
- Production safety guard now prevents localhost callback origins from being preferred when a public runtime origin is available, reducing accidental magic-link redirect drift.
- `GoogleAuthButton` now builds both OAuth and magic-link callback URLs through the shared resolver instead of relying only on `window.location.origin`.
- Added focused tests in `src/lib/auth/callback-origin.test.ts` to lock callback-origin precedence and localhost-guard behavior.

44. Public auth recovery + host-drift hardening (2026-04-20) (new)

- `whoma_access_hint` now stores both the WHOMA DB user id and the Supabase auth user id so middleware can bind access hints to the same identity-provider session instead of comparing mismatched id namespaces.
- Middleware now allows authenticated requests with missing/stale access hints to continue so server-rendered pages can rebuild access-state cookies from the live Supabase session rather than bouncing users back to `/sign-in`.
- Public routes `/`, `/sign-in`, and `/sign-up` now recover stray Supabase auth returns (`code`, `token_hash`, provider error params) by redirecting them into `/auth/callback` before rendering normal page content.
- `/sign-in` and `/sign-up` now self-heal partially authenticated sessions by calling `auth()` server-side and forwarding authenticated users to `/onboarding/role`, `/access/pending`, `/access/denied`, or their role-default route instead of trapping them on the auth form.
- Added `GET /api/auth/providers/google` to preflight the Supabase Google authorize endpoint before launching OAuth so a disabled Google provider now fails inside WHOMA with an email fallback message rather than exposing the raw Supabase JSON error page.
- Production callback-origin resolution now prefers the active public request/browser host whenever it differs from a configured production host, reducing Railway/custom-domain cookie splits.
- Live host audit also showed that `https://whoma.co.uk/` currently serves a static redirect page to `https://app.whoma.co.uk/`, `https://whoma.co.uk/sign-in` returns `404`, and `https://app.whoma.co.uk` does not resolve externally; canonical public-host alignment remains an external configuration follow-up.

45. Runtime audit + write-safety hardening (2026-04-20) (new)

- Refreshed the root `README.md` so it now reflects the real platform state instead of the original foundation-scaffold snapshot.
- Added `docs/CODEBASE_AUDIT.md` with a repo-grounded future-proofing audit covering runtime boundaries, scale risks, and recommended PR order.
- The highest-value scale findings from the audit are:
  - public homepage reads are still too expensive for a marketing route because request-time traffic fans into live dashboard aggregation plus location-summary queries,
  - public agent directory filtering still does too much work in memory and needs DB-native pagination/search,
  - session resolution still syncs identity too eagerly on request paths and needs a clearer provider-identity boundary,
  - some App Router pages still read Prisma directly rather than consuming shared query/repository helpers.
- `src/server/http/idempotency.ts` now reserves a pending Prisma idempotency record before running the write operation and clears that reservation on failure, so environments without Upstash no longer risk duplicate side effects under concurrent retries.

46. Temporary Railway-host auth stabilization rollout (2026-04-20) (new)

- Earlier on 2026-04-20, WHOMA temporarily pointed matched auth/protected routes at `https://whoma-production.up.railway.app` to keep public auth usable while branded-domain settings were still drifting.
- That same-day mitigation was superseded later on 2026-04-20 by the branded-host recovery rollout in item 48 below.
- Google stayed hidden throughout the temporary mitigation because the live Supabase provider still returned an unsupported-provider error.

47. Senior subagent operating-model refresh (2026-04-20) (new)

- `AGENTS.md` now defines a formal WHOMA multi-agent operating model instead of only minimal startup/end-session rules.
- The refreshed model adds:
  - delegation guardrails (`single-agent first` for critical-path work, bounded/disjoint ownership for delegation),
  - explicit senior role designations (`Principal Architect`, `Worktree Integrator`, `Senior Backend Reliability`, `Senior Frontend Systems`, `Senior Quality and Release`, `Senior Docs and ChangeOps`),
  - required task-brief and handoff contracts,
  - anti-patterns and merge-review protocol for dirty worktrees,
  - prioritized subagent workstreams aligned to `T103`, `A010`, and `BV001`-`BV003`.

48. Branded auth-host recovery on `www.whoma.co.uk` (2026-04-20) (new)

- Railway production env now aligns public auth host config on the branded domain:
  - `AUTH_URL=https://www.whoma.co.uk`
  - `NEXT_PUBLIC_APP_URL=https://www.whoma.co.uk`
  - `NEXT_PUBLIC_AUTH_CALLBACK_ORIGIN=https://www.whoma.co.uk`
  - `SUPABASE_GOOGLE_AUTH_ENABLED=false`
  - `SUPABASE_EMAIL_AUTH_METHOD=magic-link`
- Middleware now matches `/auth/sign-out` in addition to `/auth/callback`, `/sign-in`, and `/sign-up`, so logout is covered by the same host-canonicalization rules as login/callback entry points.
- `src/app/auth/sign-out/route.ts` now resolves post-logout redirects through the shared callback-origin resolver with request-origin fallback, instead of constructing logout redirects from env-only host selection.
- `src/lib/auth/provider-config.ts` now treats email auth as available only when `SUPABASE_EMAIL_AUTH_METHOD` is explicitly valid in production, preventing silent drift back to magic-link under broken config.
- Public sign-up messaging now reflects the real email-only posture when Google is disabled, instead of continuing to promise Google on an email-only surface.
- Live verification after deploy `cacc227b-c87d-4873-afa3-9b9d411ec87a`:
  - `GET https://www.whoma.co.uk/sign-in` -> `200`
  - `GET https://www.whoma.co.uk/auth/sign-out` -> `307 Location: https://www.whoma.co.uk/sign-in`
  - `GET https://www.whoma.co.uk/api/auth/providers/google` -> friendly WHOMA `503` JSON fallback
- The OTP-capable email-code UI path is now present in the auth component, but production still runs on magic links until the Supabase hosted email template is switched from `{{ .ConfirmationURL }}` to `{{ .Token }}`.
- External guidance for this refresh was sourced from OpenAI references on Codex and agent orchestration and translated into repo-specific operating rules.

49. Passwordless auth guardrails + live sign-in clarification (2026-04-21) (new)

- Railway production deploy `4788a46d-fde1-410c-9892-6fa5323d1287` is live on `https://www.whoma.co.uk`.
- `/sign-in` and `/sign-up?role=AGENT` now state the current live truth explicitly:
  - no password is required,
  - email auth is passwordless,
  - Google stays hidden until the Supabase provider is actually enabled.
- `src/components/auth/google-auth-button.tsx` now separates sign-in from sign-up for email auth (`shouldCreateUser=false` on sign-in, `true` on sign-up), which prevents accidental account creation attempts from the sign-in surface.
- The client now applies a 60-second resend cooldown before asking Supabase for another email attempt, reducing how quickly users run back into rate-limit errors during onboarding QA.
- The remaining cloud-side gap is unchanged: live email auth is still `magic-link` until the hosted Supabase template is changed from `{{ .ConfirmationURL }}` to `{{ .Token }}` and production env is switched to `SUPABASE_EMAIL_AUTH_METHOD=otp`.

50. Mainline merge + README workflow refresh (2026-04-21) (new)

- `codex/phase1-proofloop-narrative-hardening` was fast-forward merged into `main` after a clean typecheck and worktree reconciliation.
- `README.md` now includes a `Team workflow` section pointing contributors to the senior-subagent model and recommended execution order.
- This merge-completion pass introduced no additional runtime architecture changes; it is operational and documentation-focused.

51. Password auth + OAuth callback/session persistence hardening (2026-04-21) (new)

- Public auth now uses email/password end to end:
  - sign-in: `supabase.auth.signInWithPassword`,
  - sign-up: `supabase.auth.signUp` with password confirmation and inline validation.
- Public auth redirects now default to `/dashboard` unless a safe `next` path is supplied.
- Added `/dashboard` as the post-auth hub route, which routes authenticated users to role/access-state destinations (`/onboarding/role`, `/access/pending`, `/access/denied`, or their role default).
- Google OAuth launch now calls Supabase directly from the client and is only rendered when `NEXT_PUBLIC_GOOGLE_OAUTH_ENABLED=true`.
- `/auth/callback` now exchanges OAuth `code` for a Supabase session and redirects to `next` (or `/dashboard`); failures route to `/auth/error`.
- Middleware now uses Supabase SSR cookie adapters plus request-time `auth.getUser()` refresh on every matched route to prevent logout-on-reload/session-drop regressions.
- Added explicit Supabase helper split:
  - `src/lib/supabase/client.ts` for browser client creation,
  - `src/lib/supabase/server.ts` for server/route-handler cookie-backed clients.
- User-menu sign-out now calls `supabase.auth.signOut()` in the client and redirects to `/`.

52. Sign-up confirmation outcome hardening + dual-entry sign-in UI (2026-04-22) (new)

- `src/components/auth/google-auth-button.tsx` now branches sign-up outcomes by actual Supabase response shape instead of assuming every successful `signUp` means a confirmation email was sent.
- Sign-up behavior now resolves into three explicit paths:
  - immediate session returned -> redirect to `/dashboard` (or safe `next`),
  - confirmation required -> show confirmation notice tied to the submitted email,
  - obfuscated existing-account response (`identities` empty) -> show inline `account already exists` guidance.
- Added inline `Resend confirmation email` support using `supabase.auth.resend({ type: "signup" })`.
- Both sign-up and resend now pass callback-aware `emailRedirectTo` so confirmation links route through `/auth/callback` with `next` support.
- `/sign-in` now includes explicit in-card dual entry actions (`Sign in` and `Create account`) rather than relying on a low-prominence footer-only account-creation link.
- `/sign-up` entry language now aligns to profile-first framing (`Build your verified profile`) while keeping existing WHOMA visual tokens and shell structure.

53. Canonical callback-origin enforcement for signup/resend emails (2026-04-22) (new)

- Client callback URL generation now prefers `NEXT_PUBLIC_AUTH_CALLBACK_ORIGIN` over runtime browser origin for email signup/resend redirects.
- `src/components/auth/google-auth-button.tsx` now parses and validates the env origin, then builds `https://.../auth/callback?next=...` from that canonical host.
- Runtime `window.location.origin` is now only a fallback when env origin is missing or invalid.
- This prevents non-canonical browser hosts (for example local/dev origins) from leaking into Supabase confirmation-link redirects during production account creation.

54. Unified callback token handling for email confirmation + OAuth (2026-04-22) (new)

- `src/app/auth/callback/route.ts` now handles both Supabase callback contracts:
  - email confirmation tokens (`token_hash` + `type`) through `supabase.auth.verifyOtp`,
  - OAuth returns (`code`) through `supabase.auth.exchangeCodeForSession`.
- Callback redirect behavior is now consistent across both flows: safe `next` path when present, otherwise `/dashboard`, with `/auth/error` fallback only when exchange/verification fails.
- Added route-level regression coverage in `src/app/auth/callback/route.test.ts` so token and code callback behavior stays locked through future auth changes.

55. Proxy-safe callback redirect origin resolution (2026-04-22) (new)

- Live production probes showed callback requests can resolve to internal runtime origins (for example `https://localhost:8080`) behind Railway proxying.
- `src/app/auth/callback/route.ts` now resolves redirect host via `resolveAuthOrigin({ fallbackOrigin })` instead of directly trusting `request.url.origin`.
- This keeps callback redirects on the canonical public host (`https://www.whoma.co.uk`) for both successful session exchange and `/auth/error` fallback paths.
- Regression coverage now includes a production-mode internal-host callback request to ensure redirects still resolve to the configured public origin.

56. Premium progressive auth flow refresh (2026-04-22) (new)

- Public `/sign-up` now runs as a single-page, no-full-reload, 3-step flow inside one client component:
  - Step 1: role selection cards (`HOMEOWNER` / `AGENT`)
  - Step 2: credentials creation with inline validation + Supabase error banner
  - Step 3: confirmation state with in-flow resend action.
- Step transitions now use CSS-only timing/state choreography (`opacity` + `translateX`) with explicit out/in durations and bezier easing; no animation library was added.
- Signup calls now pass role metadata from step selection via `supabase.auth.signUp(... options.data.role ...)`, preserving role intent from the first interaction.
- Public `/sign-in` now uses the same split-shell layout language (dark fixed left panel + centered right form), with inline field errors and Supabase error banner handling aligned to sign-up.
- Added `/auth/login` alias routing to `/sign-in` so confirmation-step back-link UX remains stable without changing existing sign-in route ownership.

## Frontend/Backend Map

## Frontend (Next.js App Router)

- Public: `/`, `/faqs`, `/agents`, `/agents/[slug]`, trust/legal pages
- Shared public header now includes a utility strip above the main nav (`Create profile`, `FAQs`, `Support`) so help/access links are discoverable without cluttering primary navigation.
- Public trust page `/cookies` now includes live consent controls (`#manage-consent`) backed by `/api/consent`.
- Public landing now includes proof-led modules (featured verified profile, pilot case-study narrative, workflow demo) instead of relying on strategy copy alone.
- Public homeowner-collaboration browse: `/requests`, `/requests/[postcodeDistrict]` as a secondary noindex pilot surface (with `/locations*` compatibility redirects)
- Auth: `/sign-in`, `/sign-up`, `/onboarding/role` with server-resolved public auth state and backend-only preview controls reserved for QA/E2E
- Auth entry routes now also recover misrouted Supabase callback params and forward already-authenticated users out of the public auth form.
- Agent app: `/agent/onboarding`, `/agent/profile/edit`, proposals, marketplace
- Homeowner app: `/homeowner/instructions/new` client-side instruction form with structured payload assembly and bid-window sync
- Admin app: `/admin/agents` verification queue + expanded activation counters

## Backend

- Auth/session: Supabase Auth (email/password plus optional Google OAuth) + middleware route guards + DB-backed role/access-state authorization in server routes
- Access-state cookies are bound to Supabase user ids, and middleware now refreshes Supabase session cookies on matched requests via `auth.getUser()`.
- Dev host consistency: middleware redirects sign-in/app route traffic to the canonical `AUTH_URL` host in development
- Validation: `zod` at server boundaries
- Service layer: `src/server/agent-profile/service.ts` for onboarding/CV/publish/directory/verification logic (slug stability, publish hardening, verification readiness checks)
- Service layer: `src/server/marketplace/service.ts` for instruction/proposal persistence, bid-window domain guards, duplicate handling, and event emission
- Consent layer: `src/server/consent/cookie-consent.ts` for signed preference cookies + `/api/consent` route for user-managed non-essential cookie consent
- Security helpers: `src/server/http/idempotency.ts` and `src/server/http/rate-limit.ts` for replay-safe writes and request throttling, now backed by optional Upstash Redis shared storage with fallback to Prisma/in-memory when unconfigured; the Prisma idempotency path now reserves a pending record before executing the write so fallback mode stays concurrency-safe.
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
- Migration: `prisma/migrations/20260402124000_gate1_trust_data_origin/migration.sql`
- Migration: `prisma/migrations/20260406183000_email_password_auth/migration.sql`
- Migration: `prisma/migrations/20260407170500_phase1_event_spine_support_inquiries/migration.sql`
- Migration: `prisma/migrations/20260407183500_agent_verification_rejected_state/migration.sql`
- DB-backed service test: `src/server/agent-profile/phase1-flow.test.ts`
- API safety tests: `src/server/http/idempotency.test.ts`, `src/server/http/rate-limit.test.ts`
- Gate 1 auth contract test: `src/lib/auth/preview-access.test.ts`
- Auth UI tests: `src/components/auth/google-auth-button.test.tsx`, `src/lib/auth/password-auth.test.ts`
- T004 decision guard tests: `src/server/marketplace/service.test.ts`
- T005 persistence tests: `src/server/marketplace/service.persistence.test.ts`, `src/server/marketplace/messages.persistence.test.ts`
- End-to-end flow test: `tests/e2e/phase1-agent-flow.spec.ts`
- Homeowner decision flow E2E: `tests/e2e/homeowner-compare-decision.spec.ts`
- Playwright runtime controls: `PLAYWRIGHT_SKIP_WEB_SERVER=1`, `PLAYWRIGHT_BASE_URL`, `PLAYWRIGHT_WEB_SERVER_COMMAND`
- Marketplace smoke gate: `npm run smoke:marketplace` (direct preview callback auth -> create LIVE instruction -> submit proposal) is now local/internal only; live production verification must use health/public-route/auth-hardening checks instead of remote preview callback auth
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
