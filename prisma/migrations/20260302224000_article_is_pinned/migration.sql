-- Add support for globally pinned article ordering
ALTER TABLE "articles"
ADD COLUMN "isPinned" BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX "articles_status_isPinned_idx" ON "articles"("status", "isPinned");
