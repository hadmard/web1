-- Add password recovery fields for member accounts
ALTER TABLE "members"
ADD COLUMN "recoveryEmail" TEXT,
ADD COLUMN "passwordResetTokenHash" TEXT,
ADD COLUMN "passwordResetExpiresAt" TIMESTAMP(3),
ADD COLUMN "passwordResetRequestedAt" TIMESTAMP(3);

CREATE INDEX "members_recoveryEmail_idx" ON "members"("recoveryEmail");
CREATE INDEX "members_passwordResetTokenHash_idx" ON "members"("passwordResetTokenHash");
