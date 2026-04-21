# WHOMA Backend Infrastructure Blueprint (Now -> Near Future -> Scale)

## Objective

Build a data-led backend that is robust today, easy for future coding agents to extend, and able to scale without re-platforming the core domain.

## Current Baseline (as of 2026-03-21)

- Auth + RBAC enforced server-side (`next-auth`, middleware, route-level action checks)
- Prisma + Postgres persistence for:
  - Phase 1 identity domain (`AgentProfile` onboarding/publish/verification)
  - Marketplace write boundaries (`POST /api/instructions`, `POST /api/proposals`)
- Marketplace write service layer (`src/server/marketplace/service.ts`) with:
  - transactional instruction creation (`Property + Instruction`)
  - bid-window and status guardrails
  - duplicate proposal protection
  - request-time expiry reconciliation (`LIVE` -> `CLOSED`)
- Structured data capture: `Instruction.mustHaves` persisted as array
- Health endpoint includes DB readiness and degraded response semantics
- Privacy-conscious event emission at write boundaries

## Near Future (next 2-6 weeks)

1. Complete write-path UX integration

- Wire `/homeowner/instructions/new` and `/agent/marketplace/[instructionId]/proposal` to persisted APIs.
- Add user-facing retries and typed API error handling.

2. Replace mock reads with DB-backed query layer

- Marketplace list/detail queries from Prisma (`LIVE` instructions only).
- Proposal list/read models for compare screens.

3. Operational hardening

- Add per-route rate limiting for write APIs.
- Add idempotency keys for instruction/proposal POST endpoints.
- Add structured request logging with correlation IDs.

4. Data quality + observability

- Add audit tables or event sink for durable event history.
- Define minimum dashboard metrics (not product analytics UI):
  - instruction create success rate
  - proposal submit success rate
  - p95 write latency
  - conflict/error rate by code

## Scale Phase (next 2-6 months)

1. Data architecture

- Introduce read-optimized query shapes (materialized summaries or denormalized read tables) for high-traffic marketplace browsing.
- Evaluate partitioning/archival strategy for `Message` and event/audit data.

2. Async processing

- Introduce queue-backed workers for non-blocking jobs:
  - bid-window closure sweeps
  - notification fanout
  - periodic consistency checks
- Move request-time reconciliation logic to scheduled + worker model while keeping safe request-time fallback.

3. Reliability + rollout controls

- Add feature flags for high-risk domain changes.
- Define SLOs and error budgets for core write endpoints.
- Add runbooks for incident response (DB down, elevated conflicts, queue lag).

4. Security posture upgrades

- Add abuse controls (IP + identity level write throttles).
- Enforce stricter auditability on status transitions and admin actions.
- Add periodic secret rotation process and environment drift checks.

## Contract For Future Coding Agents

1. Keep domain logic in service layer, not in route handlers.
2. Treat route handlers as boundary adapters only: auth, validation, service invocation, response mapping.
3. Preserve typed error-code semantics; do not introduce ad-hoc string errors.
4. All writes must be server-validated + authorized + logged/observable.
5. Prefer additive migrations and reversible schema evolution.
6. Update `DEVLOG`, `TASKS`, `PLATFORM_MAP`, and `CHANGELOG.json` every session.

## Immediate Implementation Queue

1. API wiring for homeowner instruction form and agent proposal builder.
2. DB-backed marketplace read APIs (live list, detail, proposals for comparison).
3. Idempotency + rate limiting middleware for marketplace write routes.
4. Durable event/audit persistence (table + ingestion utilities + tests).
