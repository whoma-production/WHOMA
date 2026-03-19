# WHOMA MVP (Foundation Scaffold)

This repository contains the initial foundation chunk for the WHOMA MVP:

- Next.js App Router + TypeScript + Tailwind
- Prisma schema draft (Postgres)
- Zod validation + domain utilities
- Vitest + Playwright configuration
- Brand tokens and starter UI primitives
- Branded landing + role-oriented placeholder screens

## Run locally

1. Install Node.js 20+ and npm.
2. Install dependencies:

```bash
npm install
```

3. Copy environment template:

```bash
cp .env.example .env
```

4. Generate Prisma client:

```bash
npm run prisma:generate
```

5. Start the app:

```bash
npm run dev
```

## Test

Unit tests:

```bash
npm run test
```

E2E smoke test (requires app + dependencies installed):

```bash
npm run test:e2e
```

## Delivery sequencing

This commit implements the first chunk plus a design-system-forward UI foundation. Next chunk should wire real authentication, RBAC route protection, and server-side persistence for instructions/proposals.
