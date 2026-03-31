-- Support enterprise-owned news aggregation for admin-published articles
ALTER TABLE "articles"
ADD COLUMN "ownedEnterpriseId" TEXT;

CREATE INDEX "articles_ownedEnterpriseId_idx" ON "articles"("ownedEnterpriseId");

ALTER TABLE "articles"
ADD CONSTRAINT "articles_ownedEnterpriseId_fkey"
FOREIGN KEY ("ownedEnterpriseId") REFERENCES "enterprises"("id")
ON DELETE SET NULL
ON UPDATE CASCADE;
