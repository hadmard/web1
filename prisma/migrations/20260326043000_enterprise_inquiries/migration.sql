CREATE TABLE "enterprise_inquiries" (
    "id" TEXT NOT NULL,
    "enterpriseId" TEXT NOT NULL,
    "visitorName" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "city" TEXT,
    "wechat" TEXT,
    "company" TEXT,
    "demand" TEXT NOT NULL,
    "sourcePage" TEXT,
    "status" TEXT NOT NULL DEFAULT 'new',
    "adminNote" TEXT,
    "handledAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "enterprise_inquiries_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "enterprise_inquiries_enterpriseId_status_idx" ON "enterprise_inquiries"("enterpriseId", "status");
CREATE INDEX "enterprise_inquiries_createdAt_idx" ON "enterprise_inquiries"("createdAt");
CREATE INDEX "enterprise_inquiries_status_idx" ON "enterprise_inquiries"("status");

ALTER TABLE "enterprise_inquiries"
ADD CONSTRAINT "enterprise_inquiries_enterpriseId_fkey"
FOREIGN KEY ("enterpriseId") REFERENCES "enterprises"("id")
ON DELETE CASCADE ON UPDATE CASCADE;
