ALTER TABLE "articles"
ADD COLUMN "keywords" TEXT,
ADD COLUMN "manual_keywords" TEXT,
ADD COLUMN "recommend_ids" TEXT;

CREATE TABLE "industry_whitelist" (
  "id" TEXT NOT NULL,
  "word" TEXT NOT NULL,
  "category" TEXT NOT NULL,
  "sub_category" TEXT,
  "weight" INTEGER NOT NULL DEFAULT 1,
  "synonyms" TEXT,
  "status" BOOLEAN NOT NULL DEFAULT true,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "industry_whitelist_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "industry_whitelist_word_key" ON "industry_whitelist"("word");
CREATE INDEX "industry_whitelist_category_idx" ON "industry_whitelist"("category");
CREATE INDEX "industry_whitelist_weight_idx" ON "industry_whitelist"("weight");

CREATE TABLE "pending_brands" (
  "id" TEXT NOT NULL,
  "brand_name" TEXT NOT NULL,
  "first_news_id" TEXT,
  "occurrence_count" INTEGER NOT NULL DEFAULT 1,
  "last_occurrence" TIMESTAMP(3),
  "source_context" TEXT,
  "status" INTEGER NOT NULL DEFAULT 0,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "pending_brands_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "pending_brands_brand_name_key" ON "pending_brands"("brand_name");
CREATE INDEX "pending_brands_status_idx" ON "pending_brands"("status");

CREATE TABLE "news_keywords" (
  "id" TEXT NOT NULL,
  "news_id" TEXT NOT NULL,
  "keyword" TEXT NOT NULL,
  "weight_score" DECIMAL(10,2),
  "is_manual" BOOLEAN NOT NULL DEFAULT false,
  "sort_order" INTEGER,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "news_keywords_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "news_keywords_news_id_idx" ON "news_keywords"("news_id");
CREATE INDEX "news_keywords_keyword_idx" ON "news_keywords"("keyword");

ALTER TABLE "news_keywords"
ADD CONSTRAINT "news_keywords_news_id_fkey"
FOREIGN KEY ("news_id") REFERENCES "articles"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

CREATE INDEX "articles_keywords_idx" ON "articles"("keywords");
CREATE INDEX "articles_manual_keywords_idx" ON "articles"("manual_keywords");
