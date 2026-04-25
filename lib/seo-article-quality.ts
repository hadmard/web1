import { stripHtml } from "@/lib/text";

export type SeoFaqPair = { q: string; a: string };

export type SeoArticleQualityInput = {
  title: string;
  excerpt: string;
  content: string;
  slug: string;
  keywords: string;
  faqPairs: SeoFaqPair[];
  primaryKeyword: string;
};

export type SeoArticleQualityResult = {
  pass: boolean;
  bodyLength: number;
  h2Count: number;
  faqCount: number;
  issues: string[];
};

const INDUSTRY_KEYWORDS = [
  "整木门店",
  "整木工厂",
  "全屋定制",
  "原木定制",
  "木门",
  "护墙板",
  "柜体",
  "楼梯",
  "背景墙",
  "别墅大宅",
  "高端客户",
  "设计师",
  "线上获客",
  "官网内容",
  "案例整理",
  "小红书",
  "抖音",
  "百度搜索",
] as const;

const GENERIC_FILLER_PATTERNS = [
  /非常重要/g,
  /持续提升/g,
  /全面优化/g,
  /显著增强/g,
  /不断升级/g,
] as const;

function getFirstParagraphText(html: string) {
  const match = html.match(/<p>([\s\S]*?)<\/p>/i);
  return stripHtml(match?.[1] || "");
}

function normalizeMatchText(input: string) {
  return stripHtml(input).replace(/\s+/g, "").trim();
}

function countOccurrences(source: string, needle: string) {
  if (!needle) return 0;
  return normalizeMatchText(source).split(normalizeMatchText(needle)).length - 1;
}

export function evaluateSeoArticleQuality(input: SeoArticleQualityInput): SeoArticleQualityResult {
  const plain = stripHtml(input.content);
  const excerpt = stripHtml(input.excerpt);
  const firstParagraph = getFirstParagraphText(input.content);
  const h2Count = (input.content.match(/<h2>/g) || []).length;
  const faqCount = input.faqPairs.length;
  const keywordItems = input.keywords
    .split(/[,\n，、]+/)
    .map((item) => item.trim())
    .filter(Boolean);

  const issues: string[] = [];

  if (!normalizeMatchText(input.title).includes(normalizeMatchText(input.primaryKeyword))) {
    issues.push("title_missing_primary_keyword");
  }

  if (plain.length < 1000) {
    issues.push("body_too_short");
  }

  if (h2Count < 5) {
    issues.push("insufficient_h2_sections");
  }

  if (faqCount < 4) {
    issues.push("insufficient_faq_items");
  }

  if (excerpt.length < 120 || excerpt.length > 160) {
    issues.push("excerpt_length_out_of_range");
  }

  if (excerpt && firstParagraph && excerpt.replace(/\s+/g, "") === firstParagraph.replace(/\s+/g, "")) {
    issues.push("excerpt_duplicates_first_paragraph");
  }

  const industryHitCount = INDUSTRY_KEYWORDS.filter((keyword) => plain.includes(keyword)).length;
  if (industryHitCount < 6) {
    issues.push("insufficient_industry_context");
  }

  if (!/适用场景/.test(plain)) {
    issues.push("missing_applicable_scenarios");
  }

  if (!/风险边界|不适合/.test(plain)) {
    issues.push("missing_risk_boundary");
  }

  if (!/落地步骤|执行步骤/.test(plain)) {
    issues.push("missing_execution_steps");
  }

  if (!/定义[:：]/.test(plain) || !/判断[:：]/.test(plain) || !/步骤[:：]/.test(plain)) {
    issues.push("missing_geo_quote_ready_sentences");
  }

  if (keywordItems.length !== 5) {
    issues.push("keywords_count_not_five");
  }

  if (!/、/.test(input.keywords)) {
    issues.push("keywords_should_use_chinese_delimiter");
  }

  const primaryKeywordCount = countOccurrences(plain, input.primaryKeyword);
  if (primaryKeywordCount < 4 || primaryKeywordCount > 6) {
    issues.push("primary_keyword_frequency_out_of_range");
  }

  if (input.slug.length > 48 || /(?:^|-)do|le|de|zhe(?:-|$)/.test(input.slug)) {
    issues.push("slug_not_canonical_enough");
  }

  const fillerHits = GENERIC_FILLER_PATTERNS.reduce((sum, pattern) => sum + ((plain.match(pattern) || []).length), 0);
  if (fillerHits >= 6) {
    issues.push("generic_filler_detected");
  }

  return {
    pass: issues.length === 0,
    bodyLength: plain.length,
    h2Count,
    faqCount,
    issues,
  };
}
