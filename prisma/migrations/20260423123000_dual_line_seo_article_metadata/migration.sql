ALTER TABLE "articles"
  ADD COLUMN IF NOT EXISTS "content_line" TEXT,
  ADD COLUMN IF NOT EXISTS "answer_summary" TEXT,
  ADD COLUMN IF NOT EXISTS "section_label" TEXT,
  ADD COLUMN IF NOT EXISTS "category_label" TEXT,
  ADD COLUMN IF NOT EXISTS "sub_category_label" TEXT,
  ADD COLUMN IF NOT EXISTS "faq_pairs_json" TEXT,
  ADD COLUMN IF NOT EXISTS "key_facts_json" TEXT,
  ADD COLUMN IF NOT EXISTS "entity_terms" TEXT,
  ADD COLUMN IF NOT EXISTS "claim_check_hints" TEXT;

CREATE INDEX IF NOT EXISTS "articles_content_line_idx" ON "articles"("content_line");
