ALTER TABLE "articles"
ADD COLUMN "source_type" TEXT NOT NULL DEFAULT 'manual';

UPDATE "articles"
SET "source_type" = 'ai_generated'
WHERE COALESCE("source", '') = 'auto_seo_generator';

UPDATE "articles"
SET "source_type" = 'imported'
WHERE "source_type" = 'manual'
  AND "authorMemberId" IS NULL
  AND (
    "sourceUrl" IS NOT NULL
    OR COALESCE("source", '') <> ''
  );
