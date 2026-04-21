-- AlterTable
ALTER TABLE "Instruction"
ADD COLUMN "mustHaves" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];
