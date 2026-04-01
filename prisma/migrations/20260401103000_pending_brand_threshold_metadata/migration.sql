ALTER TABLE "pending_brands"
ADD COLUMN "last_news_id" TEXT,
ADD COLUMN "article_count" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN "article_ids" TEXT,
ADD COLUMN "rule_source" TEXT,
ADD COLUMN "confidence" DOUBLE PRECISION,
ADD COLUMN "approved_source" TEXT,
ADD COLUMN "auto_approved_at" TIMESTAMP(3);
