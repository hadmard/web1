import { createHash } from "node:crypto";
import { SEO_BANNED_TITLE_SUFFIX_PATTERNS } from "./seo-keyword-seeds";

function stripHtml(input: string): string {
  return String(input || "")
    .replace(/<style[\s\S]*?>[\s\S]*?<\/style>/gi, " ")
    .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export type SeoDedupArticleLike = {
  id?: string;
  title: string;
  slug?: string | null;
  content?: string | null;
  sourceUrl?: string | null;
  keywordSeed?: string | null;
  keywordIntent?: string | null;
  categoryHref?: string | null;
  subHref?: string | null;
};

export type SeoTopicCandidateLike = {
  title: string;
  slug?: string | null;
  keywordSeed: string;
  keywordIntent: string;
};

export function normalizeSeoText(input: string | null | undefined) {
  return String(input || "")
    .toLowerCase()
    .replace(/[，。、“”‘’？！；：、（）()【】\[\]\-—_\s]/g, "")
    .trim();
}

export function normalizeSeoTitle(input: string | null | undefined) {
  return String(input || "")
    .replace(/[：:]/g, "：")
    .replace(/\s+/g, "")
    .trim();
}

export function getSeoLeadParagraph(content: string | null | undefined) {
  return stripHtml(String(content || "")).slice(0, 180).trim();
}

export function buildSeoContentHash(title: string, content: string) {
  return createHash("sha256")
    .update(`${normalizeSeoTitle(title)}\n${stripHtml(content)}`)
    .digest("hex");
}

export function levenshteinDistance(a: string, b: string) {
  if (a === b) return 0;
  if (!a) return b.length;
  if (!b) return a.length;

  const matrix = Array.from({ length: a.length + 1 }, () => Array<number>(b.length + 1).fill(0));
  for (let i = 0; i <= a.length; i += 1) matrix[i][0] = i;
  for (let j = 0; j <= b.length; j += 1) matrix[0][j] = j;

  for (let i = 1; i <= a.length; i += 1) {
    for (let j = 1; j <= b.length; j += 1) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,
        matrix[i][j - 1] + 1,
        matrix[i - 1][j - 1] + cost,
      );
    }
  }

  return matrix[a.length][b.length];
}

export function getTitleSimilarity(a: string, b: string) {
  const left = normalizeSeoTitle(a);
  const right = normalizeSeoTitle(b);
  if (!left || !right) return 0;
  if (left === right) return 1;
  if (left.includes(right) || right.includes(left)) {
    return Math.min(left.length, right.length) / Math.max(left.length, right.length);
  }
  const distance = levenshteinDistance(left, right);
  return 1 - distance / Math.max(left.length, right.length);
}

export function splitTitleHalves(title: string) {
  const normalized = title.trim();
  const parts = normalized.split(/[？?]/);
  if (parts.length >= 2 && parts[0]?.trim()) {
    const head = parts[0].trim();
    const tail = parts.slice(1).join("？").trim();
    return { head, tail: tail || head };
  }

  const punctuationIndex = normalized.search(/[，：:]/);
  if (punctuationIndex > 0) {
    return {
      head: normalized.slice(0, punctuationIndex).trim(),
      tail: normalized.slice(punctuationIndex + 1).trim() || normalized,
    };
  }

  const midpoint = Math.max(1, Math.floor(normalized.length / 2));
  return {
    head: normalized.slice(0, midpoint).trim(),
    tail: normalized.slice(midpoint).trim() || normalized,
  };
}

export function normalizeTitleSuffixTemplate(title: string) {
  const { tail } = splitTitleHalves(title);
  return normalizeSeoText(
    tail
      .replace(/\d+/g, "#")
      .replace(/很多|不少|一些|几个|这些/g, "X")
      .replace(/客户|工厂|门店|整木定制|高定木作|定制家具/g, "主题"),
  );
}

export function getTitlePatternKey(title: string) {
  if (/[？?]/.test(title)) {
    const { tail } = splitTitleHalves(title);
    if (tail.includes("很多问题出在")) return "question_scene_reason";
    if (tail.includes("先看")) return "question_then_judge";
    return "direct_question";
  }
  if (title.includes("区别") || title.includes("哪个好")) return "comparison";
  if (title.includes("先把") || title.includes("先看")) return "result_lead";
  if (title.includes("怎么") || title.includes("如何")) return "method";
  if (title.includes("不一定") || title.includes("未必")) return "judgement";
  return "statement";
}

export function isDuplicateSeoIntent(
  candidate: Pick<SeoTopicCandidateLike, "keywordSeed" | "keywordIntent">,
  existing: Pick<SeoTopicCandidateLike, "keywordSeed" | "keywordIntent">,
) {
  return (
    normalizeSeoText(candidate.keywordSeed) === normalizeSeoText(existing.keywordSeed) &&
    normalizeSeoText(candidate.keywordIntent) === normalizeSeoText(existing.keywordIntent)
  );
}

export function findSeoDuplicateReason(
  candidate: SeoTopicCandidateLike,
  existingArticles: SeoDedupArticleLike[],
  options: { similarityThreshold?: number } = {},
) {
  const candidateTitle = normalizeSeoTitle(candidate.title);
  const candidateSlug = (candidate.slug || "").trim().toLowerCase();
  const similarityThreshold = options.similarityThreshold ?? 0.9;
  const candidateSuffix = normalizeTitleSuffixTemplate(candidate.title);

  for (const article of existingArticles) {
    if (normalizeSeoTitle(article.title) === candidateTitle) {
      return `duplicate_title:${article.title}`;
    }
    if (getTitleSimilarity(candidate.title, article.title) >= similarityThreshold) {
      return `similar_title:${article.title}`;
    }
    if (candidateSlug && article.slug && article.slug.toLowerCase() === candidateSlug) {
      return `duplicate_slug:${article.slug}`;
    }
    if (
      article.keywordSeed &&
      article.keywordIntent &&
      isDuplicateSeoIntent(candidate, {
        keywordSeed: article.keywordSeed,
        keywordIntent: article.keywordIntent,
      })
    ) {
      return `duplicate_intent:${article.title}`;
    }
    if (candidateSuffix && candidateSuffix === normalizeTitleSuffixTemplate(article.title)) {
      return `duplicate_title_suffix:${article.title}`;
    }
  }

  return null;
}

export function findSeoLeadDuplicateReason(
  content: string,
  existingArticles: SeoDedupArticleLike[],
  options: { similarityThreshold?: number } = {},
) {
  const lead = normalizeSeoText(getSeoLeadParagraph(content));
  if (!lead || lead.length < 80) return null;

  const similarityThreshold = options.similarityThreshold ?? 0.985;
  for (const article of existingArticles) {
    const existingLead = normalizeSeoText(getSeoLeadParagraph(article.content));
    if (!existingLead || existingLead.length < 80) continue;
    if (lead === existingLead) return `duplicate_lead:${article.title}`;
    if (getTitleSimilarity(lead, existingLead) >= similarityThreshold) {
      return `similar_lead:${article.title}`;
    }
  }
  return null;
}

export function getSuffixDupRiskScore(title: string, batchTitles: string[]) {
  const suffix = normalizeTitleSuffixTemplate(title);
  if (!suffix) return 0;
  const duplicates = batchTitles.filter((item) => normalizeTitleSuffixTemplate(item) === suffix).length;
  return Math.min(100, duplicates * 35);
}

export function getTitlePatternDiversityScore(title: string, batchTitles: string[]) {
  const currentPattern = getTitlePatternKey(title);
  const samePattern = batchTitles.filter((item) => getTitlePatternKey(item) === currentPattern).length;
  return Math.max(0, 100 - samePattern * 25);
}

export function titleSuffixDiversityCheck(title: string, batchTitles: string[]) {
  const suffix = normalizeTitleSuffixTemplate(title);
  const sameSuffixCount = batchTitles.filter((item) => normalizeTitleSuffixTemplate(item) === suffix).length;
  if (sameSuffixCount >= 1) {
    return { ok: false, reason: "duplicate_suffix_template" as const };
  }

  const bannedSuffix = SEO_BANNED_TITLE_SUFFIX_PATTERNS.find((item) =>
    normalizeSeoText(title).includes(normalizeSeoText(item)),
  );
  if (bannedSuffix) {
    return { ok: false, reason: "banned_suffix_pattern" as const };
  }

  return { ok: true as const, reason: null };
}
