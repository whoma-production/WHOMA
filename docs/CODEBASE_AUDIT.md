# WHOMA Codebase Audit

Date: 2026-04-20

## Scope

This audit reviewed the production runtime surface, not just folder names:

- App Router entrypoints in `src/app`
- domain services and read queries in `src/server`
- auth/session flow in `src/auth.ts`, `src/middleware.ts`, and `src/lib/auth/*`
- Prisma schema and migration posture
- README/docs drift against the current codebase

## Snapshot

- The platform already has real product depth: agent onboarding, profile publishing, directory visibility, admin verification, homeowner instruction creation, structured offer submission, compare/decision flow, and gated messaging.
- The strongest parts of the codebase are the write boundaries: Zod validation, RBAC, typed service errors, idempotency, rate limiting, and checked-in migrations.
- The biggest risks are now scale and ownership risks on read paths, auth sync, and oversized mixed-responsibility files.
- The root README had fallen behind the codebase and has been refreshed in this session.
- One foundational write-safety issue was addressed in this session: the Prisma idempotency fallback now reserves a pending record before executing the business operation.

## What is working well

- Write APIs are moving through dedicated service modules instead of route-handler-only logic.
- The Prisma schema still reflects the lean MVP domain reasonably well.
- Phase 1 trust logic is explicit in code and docs instead of being hidden in UI copy alone.
- There is meaningful automated coverage across unit, integration, and browser layers.

## Findings

### 1. Public homepage reads are too expensive for a marketing-facing route

Evidence:

- `src/app/page.tsx`
- `src/server/phase1-validation.ts`
- `src/server/marketplace/queries.ts`

Why this matters:

- The homepage is `force-dynamic` and pulls live verification metrics, public agent data, and live-instruction area summaries on request-time public traffic.
- `getPhase1ValidationSnapshot()` performs multiple `count()` and `groupBy()` calls.
- `getLiveInstructionCards()` currently reads full instruction rows plus proposal ids just to derive counts.

Impact:

- Public traffic is coupled directly to operational database work.
- Scale costs will rise before user-facing value does.
- Homepage latency will move with marketplace data volume.

Recommendation:

- Move public proof metrics and area summaries onto cached or materialized read models.
- Keep the homepage on a short revalidation window or feed it from a precomputed summary table.

### 2. Public directory filtering is doing too much work in memory

Evidence:

- `src/server/agent-profile/service.ts`
- `src/app/agents/page.tsx`

Why this matters:

- `listPublicAgentProfiles()` fetches all published + verified profiles, applies specialty filtering in memory, and only slices the result after loading.
- The directory page can call that function twice on one request (`agents` plus fallback featured profile).
- There is no pagination or cursor boundary yet.

Impact:

- Directory cost grows linearly with profile count.
- Filtering behavior will get slower and more memory-hungry as the profile set grows.

Recommendation:

- Add DB-native search fields and pagination.
- Introduce normalized search columns or a dedicated search index for `serviceAreas` and `specialties`.

### 3. Auth session resolution is still too write-heavy and identity is keyed too loosely

Evidence:

- `src/auth.ts`
- `prisma/schema.prisma`

Why this matters:

- `auth()` calls Supabase `getUser()` and then upserts the WHOMA `User` record during session resolution.
- The current sync path keys the local user by `email`, not by a first-class external identity row.

Impact:

- Protected traffic can generate avoidable write load.
- Future provider changes, email changes, or multi-provider identities get harder to reason about safely.

Recommendation:

- Separate "read current session" from "sync identity" work.
- Persist stable provider identity mapping explicitly and make sync idempotent by provider subject, not just email.
- Cache access-state reads where possible.

### 4. Query-boundary discipline is inconsistent

Evidence:

- `src/app/(app)/homeowner/instructions/[instructionId]/compare/page.tsx`
- `src/app/onboarding/role/page.tsx`
- `src/server/marketplace/queries.ts`
- `src/server/agent-profile/service.ts`

Why this matters:

- Some routes/pages already use server query/service helpers, but others still query Prisma directly from App Router pages.

Impact:

- Authorization, caching, and shape reuse become harder to centralize.
- The codebase will be harder to scale once multiple frontends or background jobs need the same read models.

Recommendation:

- Finish a thin repository/query layer and make pages consume that boundary instead of Prisma directly.

### 5. Large mixed-responsibility files are becoming a delivery risk

Evidence:

- `src/app/(app)/agent/onboarding/page.tsx`
- `src/server/agent-profile/service.ts`
- `src/server/marketplace/service.ts`

Why this matters:

- These files mix UI composition, server actions, validation orchestration, persistence, and product rules in very large units.

Impact:

- Change risk and review cost are both rising.
- The next engineer has to reload too much context for small edits.

Recommendation:

- Split by responsibility:
  - onboarding UI sections
  - onboarding server actions
  - agent profile commands vs read models
  - marketplace write commands vs messaging/query helpers

## Resolved in this session

### Prisma idempotency fallback now reserves before execution

Evidence:

- `src/server/http/idempotency.ts`
- `src/server/http/idempotency.test.ts`

Why it mattered:

- The previous Prisma fallback executed the business operation before persisting the idempotency record.
- In concurrent retry scenarios, identical requests could both perform the side effect before one response was replayed.

What changed:

- The Prisma fallback now creates a pending reservation first, runs the operation only after the reservation exists, updates the stored record on success, and clears the reservation on failure.

## Recommended PR order

1. Read-model hardening
   - Cache/materialize homepage proof metrics and public area summaries.
   - Replace proposal-id fanout counts with `_count` or precomputed summaries.

2. Query/repository boundary cleanup
   - Move direct Prisma reads out of App Router pages.
   - Standardize page inputs/outputs around server query helpers.

3. Directory search and pagination
   - Push specialty/service-area filtering into the database.
   - Add cursor pagination and explicit search contracts.

4. Auth identity normalization
   - Introduce stable provider-identity mapping.
   - Reduce per-request sync writes.

5. Large-file decomposition
   - Break onboarding and service modules into command/query slices before new flows expand them further.

## Smallest safe next PR

Title:

`Read-model boundary + cached public summaries`

Acceptance:

- Public homepage no longer computes live dashboard and area-summary aggregates on every request.
- Public directory uses DB-level filtering and pagination rather than in-memory specialty filtering.
- App Router pages consume server query helpers instead of direct Prisma reads for at least the compare and role-onboarding surfaces.
