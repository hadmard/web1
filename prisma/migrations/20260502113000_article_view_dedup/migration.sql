CREATE TABLE IF NOT EXISTS "article_view_dedup" (
  "id" TEXT NOT NULL,
  "articleId" TEXT NOT NULL,
  "article_slug" TEXT NOT NULL,
  "fingerprint_hash" TEXT NOT NULL,
  "ip_hash" TEXT,
  "ua_hash" TEXT,
  "window_starts_at" TIMESTAMP(3) NOT NULL,
  "expires_at" TIMESTAMP(3) NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "article_view_dedup_pkey" PRIMARY KEY ("id")
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'article_view_dedup_articleId_fkey'
  ) THEN
    ALTER TABLE "article_view_dedup"
      ADD CONSTRAINT "article_view_dedup_articleId_fkey"
      FOREIGN KEY ("articleId")
      REFERENCES "articles"("id")
      ON DELETE CASCADE
      ON UPDATE CASCADE;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS "article_view_dedup_articleId_expires_at_idx"
  ON "article_view_dedup"("articleId", "expires_at");

CREATE INDEX IF NOT EXISTS "article_view_dedup_expires_at_idx"
  ON "article_view_dedup"("expires_at");

CREATE UNIQUE INDEX IF NOT EXISTS "article_view_dedup_articleId_fingerprint_hash_window_starts_at_key"
  ON "article_view_dedup"("articleId", "fingerprint_hash", "window_starts_at");
