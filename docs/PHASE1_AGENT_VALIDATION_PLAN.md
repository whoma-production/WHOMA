# Phase 1 Plan: Real Estate Agent Identity Validation

## Validation Hypothesis
Real estate agents will use WHOMA to build professional credibility and a personal brand independent of their agency brand.

## Success Criteria
- 100 agents onboarded into the platform
- >=70% onboarding completion rate from sign-in to published profile
- >=50% of onboarded agents publish a public profile page
- Weekly qualitative feedback from pilot agents confirms profile/CV value proposition

## In Scope (Phase 1)
- Agent onboarding flow (identity + guided profile intake)
- Agent CV builder (structured professional profile)
- Public agent profile pages
- Public agent directory visibility
- Admin verification queue and verification badge states

## Out of Scope (Phase 1)
- Full homeowner instruction/proposal award workflow completion
- Payments and transaction flows
- Advanced analytics dashboarding

## Delivery Milestones
- **2026-03-22**: Data model + architecture map finalized for onboarding/CV/profile/directory
- **2026-03-25**: Guided onboarding flow + server validation + verification queue integration
- **2026-03-27**: CV builder + publish flow + public profile page
- **2026-03-29**: Public directory + end-to-end QA + pilot seed data
- **2026-03-30 (Monday)**: Start onboarding pilot real estate agents

## Weekly Demo Expectations
- Demo 1: sign-in -> role -> onboarding start -> profile bootstrap write
- Demo 2: full CV edit flow -> publish toggle -> public profile URL
- Demo 3: directory browse/filter -> verification status visibility -> admin verification handoff

## Architecture Hygiene Rule
For every implementation update:
1. Update `docs/PLATFORM_MAP.md` with feature dependencies and route/data changes.
2. Update `docs/ARCHITECTURE.md` for structural shifts.
3. Explain feature behavior and interaction boundaries in `docs/DEVLOG.md`.
