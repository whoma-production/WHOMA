# WHOMA

WHOMA is a Next.js + Prisma platform for two connected product tracks:

- Phase 1 live focus: verified estate-agent onboarding, public profile quality, directory visibility, and admin trust review.
- Core marketplace workflow: `Instruction -> Bid Window -> Structured Offers -> Shortlist -> Award -> Gated Messages`.

The repo is no longer a foundation scaffold. It already contains live auth, DB-backed writes, public agent profiles, directory flows, admin verification, homeowner instruction creation, structured offer submission, compare/decision flows, and gated messaging infrastructure.

## Current state

- Public auth uses Supabase (`Google OAuth` + email magic link) with WHOMA-side role/access-state checks.
- Server-side validation and authorization exist on the core write boundaries.
- Key write APIs use idempotency and rate limiting; the Prisma fallback now reserves pending idempotency records before executing the operation, which closes a duplicate-write gap when Upstash is unavailable.
- Phase 1 product story is profile-first, but the marketplace domain is still present and partially live behind protected app routes.
- The main engineering risk is no longer missing plumbing; it is keeping read paths, auth boundaries, and service ownership clean as traffic and feature count grow.

## Architecture at a glance

- Public app: `/`, `/agents`, `/agents/[slug]`, `/requests*`, trust/support pages, and auth entry routes.
- Protected app: `/agent/*`, `/homeowner/*`, `/admin/*`, `/messages`.
- Backend: Next App Router route handlers + server actions + service modules under `src/server`.
- Data: Postgres via Prisma.
- Auth: Supabase Auth with middleware-based route protection and WHOMA-side role/access-state resolution.
- Safety: Zod validation, RBAC checks, idempotency keys, rate limiting, health endpoint.

## Repo map

- `src/app` - App Router pages, layouts, route handlers, and server actions.
- `src/server` - domain services, read queries, analytics/events, HTTP safety helpers.
- `src/lib` - shared auth, validation, Prisma client, env, tokens, and utility helpers.
- `src/components` - reusable UI primitives and route-level composition pieces.
- `prisma` - schema plus checked-in migrations.
- `tests/e2e` - Playwright coverage for onboarding, routing, marketplace hydration, and compare flows.
- `docs` - operating system for devlog, tasks, architecture, platform map, runbooks, and audit notes.

## Local development

1. Install dependencies:

```bash
npm install
```

2. Copy envs:

```bash
cp .env.example .env
```

3. Generate Prisma client:

```bash
npm run prisma:generate
```

4. Apply migrations and start the app:

```bash
npm run prisma:migrate:dev
npm run dev
```

## Useful commands

```bash
npm run test
npm run lint
npm run typecheck
npm run smoke:marketplace
npm run seed:phase1:pilot
npm run demo:phase1:weekly
```

## Team workflow

WHOMA now uses a senior-subagent operating model for parallel delivery.

- Collaboration rules and role ownership are defined in `AGENTS.md`.
- Standard roles include architecture, backend reliability, frontend systems, quality/release, docs/changeops, and a worktree integrator.
- Every delegated task must include explicit file ownership, acceptance criteria, validation commands, and a handoff evidence bundle.
- Current recommended execution order is aligned to `T103` (read-model hardening), then auth identity normalization and Phase 1 measurement contracts.

## Technical audit

The latest repo-grounded audit lives in [docs/CODEBASE_AUDIT.md](docs/CODEBASE_AUDIT.md).

Top future-proofing priorities:

1. Move public homepage and directory metrics onto cached/materialized read models instead of recomputing them on request-time public traffic.
2. Push public directory filtering and pagination fully into the database rather than loading large profile sets and filtering in memory.
3. Decouple auth request reads from unconditional DB upserts and stop keying identity sync purely by email.
4. Finish the repository/query-layer split so App Router pages stop reaching for Prisma directly.
5. Break up the largest mixed-responsibility files (`agent/onboarding`, `agent-profile/service`, `marketplace/service`) before more product logic lands there.

## Key docs

- [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)
- [docs/PLATFORM_MAP.md](docs/PLATFORM_MAP.md)
- [docs/TASKS.md](docs/TASKS.md)
- [docs/DEVLOG.md](docs/DEVLOG.md)
- [docs/CHANGELOG.json](docs/CHANGELOG.json)
- [docs/BACKEND_INFRA_BLUEPRINT.md](docs/BACKEND_INFRA_BLUEPRINT.md)
