# DB Migration Runbook (Local / Dev)

Use this runbook to keep Prisma migration history and DB schema aligned.

## Normal Path

1. Confirm env points to intended DB:
   - `echo $DATABASE_URL`
2. Check migration status:
   - `npx prisma migrate status`
3. Apply migrations:
   - `npm run prisma:migrate:dev`
4. Re-check:
   - `npx prisma migrate status` should report **up to date**.

## Fallback Path (schema engine unavailable, SQL applied manually)

If `prisma migrate dev` cannot run but migration SQL must be applied directly:

1. Apply checked-in SQL migration files manually.
2. Immediately reconcile Prisma ledger:
   - `npx prisma migrate resolve --applied <migration_name>`
3. Verify:
   - `npx prisma migrate status`
   - `npm run prisma:migrate:dev`

## Guardrails

- Do not run `prisma migrate reset` unless you intentionally want to wipe data.
- Do not leave manual SQL changes untracked in `_prisma_migrations`.
- Use only checked-in migration SQL for manual fallback, never ad-hoc schema edits.
- Before smoke/E2E flows, always run:
  1. `npx prisma migrate status`
  2. `npm run prisma:migrate:dev`
