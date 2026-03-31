-- AlterTable
ALTER TABLE "AgentProfile"
ADD COLUMN "workEmailVerifiedAt" TIMESTAMP(3),
ADD COLUMN "workEmailVerificationCodeHash" TEXT,
ADD COLUMN "workEmailVerificationCodeExpiresAt" TIMESTAMP(3);
