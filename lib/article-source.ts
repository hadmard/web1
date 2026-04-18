export const ARTICLE_SOURCE_TYPES = ["manual", "ai_generated", "imported"] as const;

export type ArticleSourceType = (typeof ARTICLE_SOURCE_TYPES)[number];

export function isArticleSourceType(value: string | null | undefined): value is ArticleSourceType {
  return ARTICLE_SOURCE_TYPES.includes((value || "").trim() as ArticleSourceType);
}

export function resolveArticleSourceType(input: {
  sourceType?: string | null;
  source?: string | null;
  sourceUrl?: string | null;
  authorMemberId?: string | null;
}): ArticleSourceType {
  if (isArticleSourceType(input.sourceType)) return input.sourceType;
  if ((input.source || "").trim() === "auto_seo_generator") return "ai_generated";
  if (!input.authorMemberId && ((input.sourceUrl || "").trim() || (input.source || "").trim())) return "imported";
  return "manual";
}

export function getArticleSourceTypeLabel(sourceType: string | null | undefined) {
  const resolved = resolveArticleSourceType({ sourceType });
  if (resolved === "ai_generated") return "AI生成";
  if (resolved === "imported") return "采集";
  return "人工";
}
