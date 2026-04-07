ALTER TABLE "User"
ADD COLUMN "passwordHash" TEXT,
ADD COLUMN "passwordSetAt" TIMESTAMP(3);
