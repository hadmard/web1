-- Enterprise profile extension fields
ALTER TABLE "enterprises" ADD COLUMN "companyName" TEXT;
ALTER TABLE "enterprises" ADD COLUMN "companyShortName" TEXT;
ALTER TABLE "enterprises" ADD COLUMN "contactPerson" TEXT;
ALTER TABLE "enterprises" ADD COLUMN "website" TEXT;
ALTER TABLE "enterprises" ADD COLUMN "address" TEXT;
ALTER TABLE "enterprises" ADD COLUMN "licenseCode" TEXT;
ALTER TABLE "enterprises" ADD COLUMN "foundedAt" TEXT;
ALTER TABLE "enterprises" ADD COLUMN "registeredCapital" TEXT;
ALTER TABLE "enterprises" ADD COLUMN "verificationStatus" TEXT NOT NULL DEFAULT 'approved';
ALTER TABLE "enterprises" ADD COLUMN "verifiedAt" DATETIME;
ALTER TABLE "enterprises" ADD COLUMN "sourceVerificationId" TEXT;

-- Verification request table
CREATE TABLE "enterprise_verifications" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "memberId" TEXT NOT NULL,
    "companyName" TEXT NOT NULL,
    "companyShortName" TEXT,
    "accountName" TEXT NOT NULL,
    "accountPassword" TEXT NOT NULL,
    "contactPerson" TEXT NOT NULL,
    "contactPhone" TEXT NOT NULL,
    "contactEmail" TEXT,
    "logoUrl" TEXT,
    "licenseImageUrl" TEXT NOT NULL,
    "licenseCode" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "foundedAt" TEXT,
    "registeredCapital" TEXT,
    "website" TEXT,
    "intro" TEXT,
    "businessScope" TEXT,
    "productSystem" TEXT,
    "coreAdvantages" TEXT,
    "attachmentsJson" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "reviewNote" TEXT,
    "reviewedAt" DATETIME,
    "reviewedById" TEXT,
    "approvedEnterpriseId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "enterprise_verifications_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "members" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "enterprise_verifications_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "members" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE INDEX "enterprise_verifications_memberId_status_idx" ON "enterprise_verifications"("memberId", "status");
CREATE INDEX "enterprise_verifications_status_idx" ON "enterprise_verifications"("status");
CREATE INDEX "enterprise_verifications_reviewedById_idx" ON "enterprise_verifications"("reviewedById");
