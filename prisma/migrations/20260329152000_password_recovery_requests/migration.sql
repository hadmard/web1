CREATE TABLE "password_recovery_requests" (
    "id" TEXT NOT NULL,
    "memberId" TEXT,
    "account" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "requestNote" TEXT,
    "contactInfo" TEXT,
    "recoveryEmailSnapshot" TEXT,
    "adminNote" TEXT,
    "handledById" TEXT,
    "handledAt" TIMESTAMP(3),
    "lastSentAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "password_recovery_requests_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "password_recovery_requests_memberId_status_idx" ON "password_recovery_requests"("memberId", "status");
CREATE INDEX "password_recovery_requests_status_createdAt_idx" ON "password_recovery_requests"("status", "createdAt");
CREATE INDEX "password_recovery_requests_handledById_idx" ON "password_recovery_requests"("handledById");

ALTER TABLE "password_recovery_requests"
ADD CONSTRAINT "password_recovery_requests_memberId_fkey"
FOREIGN KEY ("memberId") REFERENCES "members"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "password_recovery_requests"
ADD CONSTRAINT "password_recovery_requests_handledById_fkey"
FOREIGN KEY ("handledById") REFERENCES "members"("id")
ON DELETE SET NULL ON UPDATE CASCADE;
