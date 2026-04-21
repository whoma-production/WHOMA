# AGENTS.md

## Startup Rule (required for any coding session)
Before coding:
1. Read `docs/DEVLOG.md`, `docs/TASKS.md`, `docs/ARCHITECTURE.md`, and `docs/PLATFORM_MAP.md`.
2. Summarize the current project state in 10 lines max.
3. Propose the next PR-sized change (scope, files, acceptance criteria).

## Product Guardrails (always-on)
- Keep the MVP domain lean: `User`, `HomeownerProfile`, `AgentProfile`, `Property`, `Instruction`, `Proposal`, `MessageThread`, `Message`.
- Preserve the core workflow: `Instruction -> Bid Window -> Proposals -> Shortlist -> Award`.
- Proposals must remain structured and comparable (schema-enforced, no freeform-only submissions).
- Chat is gated and secondary; `Submit Proposal` remains the primary agent CTA.
- All writes require server-side validation and authorization.

## Subagent Operating Model (WHOMA standard)
This repo uses multi-agent execution for speed, but only when work can be decomposed cleanly.

### Delegation principles
- Start each PR with a control-plane kickoff: one target task, owned paths, out-of-bounds paths, and done criteria.
- Use single-agent execution first for tightly coupled or critical-path tasks.
- Delegate only bounded tasks with explicit outputs and disjoint ownership.
- Keep each delegated task small enough to review quickly (target: one PR-sized slice).
- Treat prompts like GitHub issues: include file paths, constraints, acceptance criteria, and validation commands.
- Require evidence from each subagent: changed files, test output, and unresolved risks.
- Integrate centrally: one lead agent resolves conflicts and keeps the final architecture coherent.
- In a dirty worktree, subagents hand off patch/evidence bundles; one integrator applies and reconciles.

### When to parallelize
- Parallelize independent slices across different write sets.
- Keep urgent blockers on the main path unless a handoff materially reduces risk.
- Do not delegate two agents to overlapping write scopes unless one is read-only.
- Avoid "delegation loops" where agents repeatedly re-plan the same work.

### Senior role designations
- `Principal Architect` (`explorer`):
  - Mission: map impact, define boundaries, de-risk sequencing.
  - Ownership: architecture, dependency tracing, integration plan.
  - Handoff contract: risk map, scope recommendations, ordered execution plan.
  - Success metric: fewer merge conflicts and fewer cross-module regressions.
- `Worktree Integrator` (`worker`):
  - Mission: merge parallel outputs safely in non-clean branches.
  - Ownership: final patch assembly, conflict reconciliation, changed-file audit.
  - Handoff contract: integrated diff, conflict notes, final verification report.
  - Success metric: zero accidental regressions from merge collisions.
- `Senior Backend Reliability` (`worker`):
  - Mission: harden service/API/data boundaries.
  - Ownership: `src/server/*`, `src/app/api/*`, `prisma/*`, migration-safe changes.
  - Handoff contract: passing tests, migration notes, operational error mapping.
  - Success metric: lower write-path risk, clearer invariants, stable contracts.
- `Senior Frontend Systems` (`worker`):
  - Mission: implement UI flows against stable contracts without regressing UX.
  - Ownership: `src/app/*` pages, `src/components/*`, client interaction states.
  - Handoff contract: screenshots or behavior notes plus route-level verification.
  - Success metric: lower UI regressions and improved completion flow clarity.
- `Senior Quality and Release` (`explorer` or `worker`):
  - Mission: validate behavior, test depth, and deploy readiness.
  - Ownership: `tests/*`, smoke scripts, runbooks, release checks.
  - Handoff contract: failing and passing checks, gaps, recommended gates.
  - Success metric: catch regressions before integration and deployment.
- `Senior Docs and ChangeOps` (`worker`):
  - Mission: keep operational docs and changelog truthful and current.
  - Ownership: `docs/DEVLOG.md`, `docs/TASKS.md`, `docs/PLATFORM_MAP.md`, `docs/CHANGELOG.json`, `README.md`.
  - Handoff contract: append-only updates with exact deltas and next steps.
  - Success metric: zero stale handoff docs after each session.

### Task brief template (required for every delegated task)
- Objective:
- Why now:
- Owned files/modules:
- Must not change:
- Acceptance criteria:
- Validation commands:
- Deliverables required in handoff:

### Review protocol before merge
- Confirm acceptance criteria are met.
- Re-run relevant tests and type/lint checks.
- Verify ownership boundaries were respected.
- Resolve conflicts in favor of domain guardrails and data integrity.
- Record final changes in project docs.

### Anti-patterns to avoid
- Delegating vague "improve X" tasks with no file boundaries.
- Parallel workers editing the same module family.
- Letting subagents bypass validation commands.
- Merging generated code without human review.
- Expanding scope during integration without updating acceptance criteria.

## Recommended Senior Subagent Workstreams (current)
These are the default high-leverage assignments until superseded by `docs/TASKS.md`.

1. `Read-model hardening for public traffic` (priority: highest)
- Lead: `Senior Backend Reliability`
- Scope: cache or materialize homepage and directory summary reads.
- Initial files: `src/server/phase1-validation.ts`, `src/server/marketplace/queries.ts`, homepage/directory loaders.
- Acceptance: public routes avoid heavy request-time aggregation on every hit.

2. `Directory search and pagination`
- Lead: `Senior Backend Reliability` + `Senior Frontend Systems`
- Scope: DB-native specialty and area filtering with cursor/page controls.
- Initial files: `src/server/agent-profile/service.ts`, `src/app/agents/page.tsx`.
- Acceptance: no full-set in-memory filtering for public directory results.

3. `Read-boundary cleanup`
- Lead: `Principal Architect` then `Senior Backend Reliability`
- Scope: remove raw Prisma access from App Router pages into query/repository boundaries.
- Initial files: `/homeowner/.../compare/page.tsx`, `/onboarding/role/page.tsx`, related query modules.
- Acceptance: pages call shared server query helpers instead of direct Prisma.

4. `Auth identity normalization`
- Lead: `Senior Backend Reliability`
- Scope: separate session read from identity sync and move toward stable provider identity mapping.
- Initial files: `src/auth.ts`, related auth model and migration files.
- Acceptance: reduced request-path write amplification and safer identity joins.

5. `Large-file decomposition`
- Lead: `Principal Architect` + domain workers
- Scope: split oversized mixed-responsibility files into command/query and UI/action slices.
- Initial files: `src/app/(app)/agent/onboarding/page.tsx`, `src/server/agent-profile/service.ts`, `src/server/marketplace/service.ts`.
- Acceptance: smaller modules with clear ownership and lower merge-risk.

6. `Production verification delivery closure` (`A010`)
- Lead: `Senior Backend Reliability` + `Senior Quality and Release`
- Scope: complete production verification code delivery and live validation evidence.
- Initial files: `src/server/agent-profile/work-email-delivery.ts`, deployment docs and runbooks.
- Acceptance: live end-to-end verification flow proven with cooldown and attempt-lock rules intact.

7. `Phase 1 measurement and evidence domain` (`BV001`-`BV003`)
- Lead: `Principal Architect` + `Senior Backend Reliability`
- Scope: codify objective measurement contracts and replace event-only trust proxies with first-class evidence entities.
- Initial files: `src/server/phase1-validation.ts`, `src/server/product-events.ts`, `src/app/(app)/admin/agents/page.tsx`, `prisma/schema.prisma`.
- Acceptance: dashboard and public proof surfaces are backed by explicit, source-truth domain data.

## End-of-Session Rule (required)
- Append a new entry to `docs/DEVLOG.md` (never rewrite prior entries).
- Update `docs/TASKS.md` statuses and acceptance criteria if scope changed.
- Update `docs/PLATFORM_MAP.md` with architecture and feature-map deltas.
- Append a session object to `docs/CHANGELOG.json`.

## External references used in this refresh (2026-04-20)
- OpenAI: "How OpenAI uses Codex"
- OpenAI: "A practical guide to building agents"
- OpenAI: "Introducing Codex"
