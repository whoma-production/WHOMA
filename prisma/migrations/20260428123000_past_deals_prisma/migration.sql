CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TYPE "PastDealRole" AS ENUM ('sole_agent', 'multi_agent', 'buyers_agent');

CREATE TYPE "PastDealVerificationStatus" AS ENUM ('unverified', 'pending', 'verified', 'disputed');

CREATE TABLE "PastDeal" (
    "id" TEXT NOT NULL,
    "agentId" TEXT NOT NULL,
    "agentName" TEXT NOT NULL,
    "agentEmail" TEXT NOT NULL,
    "propertyAddress" TEXT NOT NULL,
    "propertyPostcode" TEXT NOT NULL,
    "salePrice" INTEGER,
    "completionDate" DATE,
    "role" "PastDealRole" NOT NULL,
    "sellerEmail" TEXT,
    "sellerName" TEXT,
    "verificationStatus" "PastDealVerificationStatus" NOT NULL DEFAULT 'unverified',
    "verificationToken" UUID NOT NULL DEFAULT gen_random_uuid(),
    "verificationSentAt" TIMESTAMP(3),
    "verifiedAt" TIMESTAMP(3),
    "sellerComment" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PastDeal_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "PastDeal_verificationToken_key" ON "PastDeal"("verificationToken");

CREATE INDEX "PastDeal_agentId_createdAt_idx" ON "PastDeal"("agentId", "createdAt");

CREATE INDEX "PastDeal_verificationStatus_idx" ON "PastDeal"("verificationStatus");

ALTER TABLE "PastDeal"
ADD CONSTRAINT "PastDeal_agentId_fkey"
FOREIGN KEY ("agentId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
