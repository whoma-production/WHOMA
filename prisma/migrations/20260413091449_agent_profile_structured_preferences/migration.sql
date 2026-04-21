-- CreateEnum
CREATE TYPE "AgentFeePreference" AS ENUM ('FIXED_FEE', 'PERCENTAGE', 'HYBRID', 'CASE_BY_CASE');

-- CreateEnum
CREATE TYPE "AgentTransactionBand" AS ENUM ('UNDER_250K', 'FROM_250K_TO_500K', 'FROM_500K_TO_1M', 'FROM_1M_TO_2M', 'OVER_2M');

-- CreateEnum
CREATE TYPE "CollaborationPreference" AS ENUM ('JV_OR_REFERRALS', 'REFERRALS_ONLY', 'SELECTIVE', 'NOT_OPEN');

-- AlterTable
ALTER TABLE "AgentProfile" ADD COLUMN     "collaborationPreference" "CollaborationPreference",
ADD COLUMN     "feePreference" "AgentFeePreference",
ADD COLUMN     "transactionBand" "AgentTransactionBand";
