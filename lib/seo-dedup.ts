import { createHash } from "node:crypto";

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
    .replace(/[？?！!，,。、“”"'（）()：:；;·\-\s]/g, "")
    .trim();
}

export function normalizeSeoTitle(input: string | null | undefined) {
  return String(input || "")
    .replace(/[？?！!]/g, "")
    .replace(/\s+/g, "")
    .trim();
}

export function getSeoLeadParagraph(content: string | null | undefined) {
  const plain = stripHtml(String(content || ""));
  return plain.slice(0, 160).trim();
}

export function buildSeoContentHash(title: string, content: string) {
  return createHash("sha256")
    .update(`${normalizeSeoTitle(title)}\n${stripHtml(content).replace(/\s+/g, " ").trim()}`)
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
  const similarityThreshold = options.similarityThreshold ?? 0.93;

  for (const article of existingArticles) {
    const similarity = getTitleSimilarity(candidate.title, article.title);
    if (normalizeSeoTitle(article.title) === candidateTitle) {
      return `duplicate_title:${article.title}`;
    }
    if (similarity >= similarityThreshold) {
      return `similar_title:${article.title}`;
    }
    if (candidateSlug && article.slug && article.slug.toLowerCase() === candidateSlug) {
      return `duplicate_slug:${article.slug}`;
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
  if (!lead || lead.length < 90) return null;

  const similarityThreshold = options.similarityThreshold ?? 0.985;

  for (const article of existingArticles) {
    const existingLead = normalizeSeoText(getSeoLeadParagraph(article.content));
    if (!existingLead || existingLead.length < 90) continue;
    if (lead === existingLead) return `duplicate_lead:${article.title}`;
    if (getTitleSimilarity(lead, existingLead) >= similarityThreshold) {
      return `similar_lead:${article.title}`;
    }
  }

  return null;
}
