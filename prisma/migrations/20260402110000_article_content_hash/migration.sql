ALTER TABLE "articles"
ADD COLUMN "content_hash" TEXT;

CREATE INDEX "articles_content_hash_idx" ON "articles"("content_hash");
