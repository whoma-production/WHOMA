-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('HOMEOWNER', 'AGENT', 'ADMIN');

-- CreateEnum
CREATE TYPE "PreferredContactMethod" AS ENUM ('EMAIL', 'PHONE');

-- CreateEnum
CREATE TYPE "VerificationStatus" AS ENUM ('UNVERIFIED', 'PENDING', 'VERIFIED');

-- CreateEnum
CREATE TYPE "AgentProfileStatus" AS ENUM ('DRAFT', 'PUBLISHED');

-- CreateEnum
CREATE TYPE "PropertyType" AS ENUM ('FLAT', 'TERRACED', 'SEMI_DETACHED', 'DETACHED', 'BUNGALOW', 'OTHER');

-- CreateEnum
CREATE TYPE "TargetTimeline" AS ENUM ('ASAP', 'FOUR_TO_EIGHT_WEEKS', 'FLEXIBLE');

-- CreateEnum
CREATE TYPE "InstructionStatus" AS ENUM ('DRAFT', 'LIVE', 'CLOSED', 'SHORTLIST', 'AWARDED');

-- CreateEnum
CREATE TYPE "FeeModel" AS ENUM ('FIXED', 'PERCENT', 'HYBRID', 'SUCCESS_BANDS');

-- CreateEnum
CREATE TYPE "CurrencyCode" AS ENUM ('GBP');

-- CreateEnum
CREATE TYPE "ServiceInclusion" AS ENUM ('PROFESSIONAL_PHOTOGRAPHY', 'FLOORPLAN', 'PORTAL_LISTINGS', 'HOSTED_VIEWINGS', 'ACCOMPANIED_VIEWINGS', 'SALES_PROGRESSION_SUPPORT', 'EPC_ASSISTANCE');

-- CreateEnum
CREATE TYPE "ProposalStatus" AS ENUM ('SUBMITTED', 'SHORTLISTED', 'REJECTED', 'ACCEPTED');

-- CreateEnum
CREATE TYPE "ThreadStatus" AS ENUM ('LOCKED', 'OPEN');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "role" "UserRole",
    "name" TEXT,
    "email" TEXT NOT NULL,
    "emailVerified" TIMESTAMP(3),
    "image" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Account" (
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "providerAccountId" TEXT NOT NULL,
    "refresh_token" TEXT,
    "access_token" TEXT,
    "expires_at" INTEGER,
    "token_type" TEXT,
    "scope" TEXT,
    "id_token" TEXT,
    "session_state" TEXT,

    CONSTRAINT "Account_pkey" PRIMARY KEY ("provider","providerAccountId")
);

-- CreateTable
CREATE TABLE "Session" (
    "sessionToken" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("sessionToken")
);

-- CreateTable
CREATE TABLE "VerificationToken" (
    "identifier" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL
);

-- CreateTable
CREATE TABLE "HomeownerProfile" (
    "userId" TEXT NOT NULL,
    "phone" TEXT,
    "preferredContactMethod" "PreferredContactMethod" NOT NULL DEFAULT 'EMAIL',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "HomeownerProfile_pkey" PRIMARY KEY ("userId")
);

-- CreateTable
CREATE TABLE "AgentProfile" (
    "userId" TEXT NOT NULL,
    "agencyName" TEXT,
    "jobTitle" TEXT,
    "phone" TEXT,
    "workEmail" TEXT,
    "bio" TEXT,
    "yearsExperience" INTEGER,
    "serviceAreas" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "specialties" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "achievements" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "languages" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "profileSlug" TEXT,
    "profileStatus" "AgentProfileStatus" NOT NULL DEFAULT 'DRAFT',
    "profileCompleteness" INTEGER NOT NULL DEFAULT 0,
    "verificationStatus" "VerificationStatus" NOT NULL DEFAULT 'UNVERIFIED',
    "ratingAggregate" DOUBLE PRECISION,
    "responseTimeMinutes" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "onboardingCompletedAt" TIMESTAMP(3),
    "publishedAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AgentProfile_pkey" PRIMARY KEY ("userId")
);

-- CreateTable
CREATE TABLE "Property" (
    "id" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "addressLine1" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "postcode" TEXT NOT NULL,
    "propertyType" "PropertyType" NOT NULL,
    "bedrooms" INTEGER NOT NULL,
    "bathrooms" INTEGER,
    "shortDescription" TEXT NOT NULL,
    "photos" TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Property_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Instruction" (
    "id" TEXT NOT NULL,
    "propertyId" TEXT NOT NULL,
    "sellerGoals" TEXT NOT NULL,
    "targetTimeline" "TargetTimeline" NOT NULL,
    "bidWindowStartAt" TIMESTAMP(3) NOT NULL,
    "bidWindowEndAt" TIMESTAMP(3) NOT NULL,
    "status" "InstructionStatus" NOT NULL DEFAULT 'DRAFT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Instruction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Proposal" (
    "id" TEXT NOT NULL,
    "instructionId" TEXT NOT NULL,
    "agentId" TEXT NOT NULL,
    "feeModel" "FeeModel" NOT NULL,
    "feeValue" DECIMAL(10,2) NOT NULL,
    "currency" "CurrencyCode" NOT NULL DEFAULT 'GBP',
    "inclusions" "ServiceInclusion"[],
    "marketingPlan" TEXT NOT NULL,
    "timelineDays" INTEGER NOT NULL,
    "cancellationTerms" TEXT NOT NULL,
    "status" "ProposalStatus" NOT NULL DEFAULT 'SUBMITTED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Proposal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MessageThread" (
    "id" TEXT NOT NULL,
    "instructionId" TEXT NOT NULL,
    "homeownerId" TEXT NOT NULL,
    "agentId" TEXT NOT NULL,
    "status" "ThreadStatus" NOT NULL DEFAULT 'LOCKED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MessageThread_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Message" (
    "id" TEXT NOT NULL,
    "threadId" TEXT NOT NULL,
    "senderId" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Message_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "Account_userId_idx" ON "Account"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Session_sessionToken_key" ON "Session"("sessionToken");

-- CreateIndex
CREATE INDEX "Session_userId_idx" ON "Session"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "VerificationToken_token_key" ON "VerificationToken"("token");

-- CreateIndex
CREATE UNIQUE INDEX "VerificationToken_identifier_token_key" ON "VerificationToken"("identifier", "token");

-- CreateIndex
CREATE UNIQUE INDEX "AgentProfile_profileSlug_key" ON "AgentProfile"("profileSlug");

-- CreateIndex
CREATE INDEX "AgentProfile_profileStatus_verificationStatus_idx" ON "AgentProfile"("profileStatus", "verificationStatus");

-- CreateIndex
CREATE INDEX "AgentProfile_verificationStatus_idx" ON "AgentProfile"("verificationStatus");

-- CreateIndex
CREATE INDEX "Property_ownerId_idx" ON "Property"("ownerId");

-- CreateIndex
CREATE INDEX "Property_postcode_idx" ON "Property"("postcode");

-- CreateIndex
CREATE INDEX "Instruction_status_bidWindowEndAt_idx" ON "Instruction"("status", "bidWindowEndAt");

-- CreateIndex
CREATE INDEX "Instruction_propertyId_idx" ON "Instruction"("propertyId");

-- CreateIndex
CREATE INDEX "Proposal_instructionId_status_idx" ON "Proposal"("instructionId", "status");

-- CreateIndex
CREATE INDEX "Proposal_agentId_idx" ON "Proposal"("agentId");

-- CreateIndex
CREATE UNIQUE INDEX "Proposal_instructionId_agentId_key" ON "Proposal"("instructionId", "agentId");

-- CreateIndex
CREATE INDEX "MessageThread_status_idx" ON "MessageThread"("status");

-- CreateIndex
CREATE UNIQUE INDEX "MessageThread_instructionId_homeownerId_agentId_key" ON "MessageThread"("instructionId", "homeownerId", "agentId");

-- CreateIndex
CREATE INDEX "Message_threadId_createdAt_idx" ON "Message"("threadId", "createdAt");

-- AddForeignKey
ALTER TABLE "Account" ADD CONSTRAINT "Account_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HomeownerProfile" ADD CONSTRAINT "HomeownerProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AgentProfile" ADD CONSTRAINT "AgentProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Property" ADD CONSTRAINT "Property_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Instruction" ADD CONSTRAINT "Instruction_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "Property"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Proposal" ADD CONSTRAINT "Proposal_instructionId_fkey" FOREIGN KEY ("instructionId") REFERENCES "Instruction"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Proposal" ADD CONSTRAINT "Proposal_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MessageThread" ADD CONSTRAINT "MessageThread_instructionId_fkey" FOREIGN KEY ("instructionId") REFERENCES "Instruction"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MessageThread" ADD CONSTRAINT "MessageThread_homeownerId_fkey" FOREIGN KEY ("homeownerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MessageThread" ADD CONSTRAINT "MessageThread_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Message" ADD CONSTRAINT "Message_threadId_fkey" FOREIGN KEY ("threadId") REFERENCES "MessageThread"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Message" ADD CONSTRAINT "Message_senderId_fkey" FOREIGN KEY ("senderId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

