-- Brand display layer extension for legacy /company migration
ALTER TABLE "brands"
ADD COLUMN "slug" TEXT,
ADD COLUMN "enterpriseId" TEXT,
ADD COLUMN "logoUrl" TEXT,
ADD COLUMN "tagline" TEXT,
ADD COLUMN "region" TEXT,
ADD COLUMN "area" TEXT,
ADD COLUMN "isRecommend" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "isBrandVisible" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN "sortOrder" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "rankingWeight" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "displayTemplate" TEXT,
ADD COLUMN "memberTypeSnapshot" TEXT;

UPDATE "brands"
SET "slug" = lower(
  regexp_replace(
    regexp_replace(coalesce("name", 'brand'), '[^A-Za-z0-9]+', '-', 'g'),
    '(^-+|-+$)',
    '',
    'g'
  )
)
WHERE "slug" IS NULL;

UPDATE "brands"
SET "slug" = 'brand-' || substr("id", 1, 8)
WHERE "slug" IS NULL OR "slug" = '';

ALTER TABLE "brands"
ALTER COLUMN "slug" SET NOT NULL;

CREATE UNIQUE INDEX "brands_slug_key" ON "brands"("slug");
CREATE UNIQUE INDEX "brands_enterpriseId_key" ON "brands"("enterpriseId");
CREATE INDEX "brands_isBrandVisible_isRecommend_sortOrder_idx" ON "brands"("isBrandVisible", "isRecommend", "sortOrder");
CREATE INDEX "brands_region_area_idx" ON "brands"("region", "area");

ALTER TABLE "brands"
ADD CONSTRAINT "brands_enterpriseId_fkey"
FOREIGN KEY ("enterpriseId") REFERENCES "enterprises"("id")
ON DELETE SET NULL
ON UPDATE CASCADE;
