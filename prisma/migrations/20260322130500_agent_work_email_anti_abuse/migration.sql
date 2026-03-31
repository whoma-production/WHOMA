-- A010 hardening: resend cooldown + verify-attempt tracking for work-email verification
ALTER TABLE "AgentProfile"
ADD COLUMN "workEmailVerificationCodeSentAt" TIMESTAMP(3),
ADD COLUMN "workEmailVerificationAttemptCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "workEmailVerificationLockedUntil" TIMESTAMP(3);
