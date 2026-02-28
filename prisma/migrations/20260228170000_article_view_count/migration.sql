ALTER TABLE "articles"
ADD COLUMN "viewCount" INTEGER NOT NULL DEFAULT 0;

CREATE INDEX "articles_status_viewCount_idx" ON "articles"("status", "viewCount");
