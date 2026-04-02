-- G001 trust hardening: classify synthetic actors before public proof/reporting
CREATE TYPE "UserDataOrigin" AS ENUM ('PRODUCTION', 'PREVIEW', 'SEED', 'TEST');

ALTER TABLE "User"
ADD COLUMN "dataOrigin" "UserDataOrigin" NOT NULL DEFAULT 'PRODUCTION';

UPDATE "User"
SET "dataOrigin" = 'SEED'
WHERE email LIKE 'pilot.agent%@whoma.local';

UPDATE "User"
SET "dataOrigin" = 'PREVIEW'
WHERE email LIKE '%@whoma.local'
  AND "dataOrigin" = 'PRODUCTION';

UPDATE "User"
SET "dataOrigin" = 'TEST'
WHERE email LIKE '%@example.test'
  AND "dataOrigin" = 'PRODUCTION';

CREATE INDEX "User_dataOrigin_idx" ON "User"("dataOrigin");
