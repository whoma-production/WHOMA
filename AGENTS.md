# AGENTS.md

## Startup Rule (required for any coding session)
Before coding:
1. Read `docs/DEVLOG.md`, `docs/TASKS.md`, `docs/ARCHITECTURE.md`, and `docs/PLATFORM_MAP.md`.
2. Summarise the current project state in 10 lines max.
3. Propose the next PR-sized change (scope, files, acceptance criteria).

## Working Rules
- Keep the MVP domain lean: `User`, `HomeownerProfile`, `AgentProfile`, `Property`, `Instruction`, `Proposal`, `MessageThread`, `Message`.
- Preserve the core workflow: `Instruction -> Bid Window -> Proposals -> Shortlist -> Award`.
- Proposals must remain structured/comparable (schema-enforced; no freeform-only submissions).
- Chat is gated and secondary; `Submit Proposal` is the primary agent CTA.
- All writes require server-side validation + authorization.

## End-of-Session Rule (required)
- Append a new entry to `docs/DEVLOG.md` (never rewrite prior entries).
- Update `docs/TASKS.md` statuses and acceptance criteria if scope changed.
- Update `docs/PLATFORM_MAP.md` with architecture and feature-map deltas.
- Append a session object to `docs/CHANGELOG.json`.
