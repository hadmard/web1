ALTER TABLE "articles"
ADD COLUMN "generation_batch_id" TEXT,
ADD COLUMN "keyword_seed" TEXT,
ADD COLUMN "keyword_intent" TEXT;

CREATE INDEX "articles_generation_batch_id_idx" ON "articles"("generation_batch_id");
CREATE INDEX "articles_keyword_seed_idx" ON "articles"("keyword_seed");
CREATE INDEX "articles_keyword_intent_idx" ON "articles"("keyword_intent");
