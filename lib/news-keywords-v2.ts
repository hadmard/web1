import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { stripHtml } from "@/lib/text";
import {
  INDUSTRY_WHITELIST_SEED,
  NEWS_BRAND_CONTEXT_PATTERNS,
  NEWS_BRAND_FORBIDDEN_CONTAINS,
  NEWS_BRAND_SUFFIXES,
  NEWS_PENDING_BRAND_BLACKLIST,
  NEWS_STOPWORDS,
} from "@/lib/news-keyword-config-v2";

const AUTO_APPROVE_PENDING_BRANDS = process.env.NEWS_AUTO_APPROVE_PENDING_BRANDS !== "false";
const KEYWORD_MARKETING_TERMS_CN = [
  "\u90fd",
  "\u4e86",
  "\u4e00\u4e2a",
  "\u8fd9\u4e2a",
  "\u90a3\u4e2a",
  "\u95ee\u9898",
  "\u9519\u8bef",
  "\u4e3a\u4ec0\u4e48",
  "\u5982\u4f55",
  "\u4e25\u91cd",
  "\u5343\u4e07\u4e0d\u8981",
  "\u4e00\u5b9a\u8981",
];
const KEYWORD_PUNCTUATION_CN = /[\uFF0C\u3002\uFF1A\uFF1B;!\uFF01\uFF1F?%]/;
const KEYWORD_SENTENCE_LIKE_PATTERNS = [
  /\u906d\u9047/,
  /\u60ca\u9b42/,
  /\u4e00\u523b$/,
  /\u771f\u76f8/,
  /\u59cb\u672b/,
  /\u80cc\u540e/,
  /\u4e3a\u4ec0\u4e48/,
  /\u5982\u4f55/,
  /\u4ec0\u4e48/,
  /\u4e0d\u8981/,
  /\u4e00\u5b9a\u8981/,
  /\u8b66\u60d5/,
  /\u6ce8\u610f/,
  /\u63ed\u79d8/,
  /\u66dd\u5149/,
  /\u5b9e\u5f55/,
  /\u73b0\u573a/,
  /\u6545\u4e8b/,
  /\u56e0\u4e3a/,
  /\u6574\u4e2a/,
  /\u8fd9\u51e0\u5929/,
  /\u5fc5\u987b/,
  /\u4e09\u4ef6\u4e8b/,
];
const KEYWORD_INDUSTRY_SIGNALS = [
  "\u6574\u6728",
  "\u6728\u4f5c",
  "\u5b9a\u5236",
  "\u5bb6\u5c45",
  "\u5bb6\u88c5",
  "\u9ad8\u5b9a",
  "\u5168\u5c4b",
  "\u6574\u5bb6",
  "\u677f\u6750",
  "\u9970\u9762",
  "\u62a4\u5899\u677f",
  "\u6728\u95e8",
  "\u9152\u67dc",
  "\u4e66\u67dc",
  "\u8863\u5e3d\u95f4",
  "\u697c\u68af",
  "\u80cc\u666f\u5899",
  "\u5efa\u535a\u4f1a",
  "\u8bbe\u8ba1\u5468",
  "\u5bb6\u535a\u4f1a",
  "\u534f\u4f1a",
  "\u5de5\u827a",
  "\u6c34\u6027\u6f06",
  "\u5f00\u653e\u6f06",
  "\u70e4\u6f06",
  "\u69ab\u536f",
  "\u539f\u6728",
  "\u6728\u76ae",
  "\u522b\u5885",
  "\u5927\u5b85",
  "\u8c6a\u5b85",
];
const KEYWORD_MULTI_DIGITS = /\d{2,}/;
const KEYWORD_SPLIT_PATTERN_CN = /[\uFF0C\u3002\uFF1A\uFF1B\uFF01\uFF1F\u3001\s()\uFF08\uFF09\u3010\u3011\u300a\u300b\u201c\u201d"'\/\|-]+/;

type WhitelistEntry = {
  word: string;
  category: string;
  weight: number;
  synonyms: string[];
};

type KeywordCandidateSource = "whitelist" | "title" | "ner";

type KeywordCandidate = {
  keyword: string;
  source: KeywordCandidateSource;
  weight: number;
  frequency: number;
  inTitle: boolean;
  inLead: boolean;
  score: number;
  contexts: string[];
  ruleSource?: string;
};

export type ExtractedKeyword = {
  keyword: string;
  score: number;
  weight: number;
  source: KeywordCandidateSource;
};

export type KeywordExtractionResult = {
  keywords: ExtractedKeyword[];
  pendingBrands: Array<{
    brandName: string;
    sourceContext: string;
    frequency: number;
    ruleSource: string;
    triggerReason: string | null;
    confidence: number;
  }>;
};

type ArticleKeywordInput = {
  title: string;
  content: string;
  city?: string | null;
};

function normalizeText(input: string) {
  return stripHtml(input || "")
    .replace(/&nbsp;/gi, " ")
    .replace(/[‘’“”"'`]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeCompact(input: string) {
  return normalizeText(input).replace(/\s+/g, "");
}

function escapeRegExp(input: string) {
  return input.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function unique<T>(items: T[]) {
  return Array.from(new Set(items));
}

function splitSentences(input: string) {
  return normalizeText(input)
    .split(/[\u3002\uFF01\uFF1F\n]/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function normalizeKeywordList(input: string | null | undefined) {
  return unique(
    (input || "")
      .split(/[\uFF0C,\n]+/)
      .map((item) => item.trim())
      .filter((item) => isValidKeywordCandidate(item)), 
  ).slice(0, 5);
}

function clampKeywordLength(input: string) {
  return input.length >= 2 && input.length <= 10;
}

function isNoiseKeyword(input: string) {
  return (
    !input ||
    !/[A-Za-z0-9\u4e00-\u9fa5]/.test(input) ||
    input.length < 2 ||
    NEWS_STOPWORDS.includes(input) ||
    NEWS_PENDING_BRAND_BLACKLIST.includes(input)
  );
}

function countMatchedTerms(input: string, terms: string[]) {
  return terms.reduce((count, term) => count + (input.includes(term) ? 1 : 0), 0);
}

function hasIndustrySignal(input: string) {
  return (
    KEYWORD_INDUSTRY_SIGNALS.some((term) => input.includes(term)) ||
    NEWS_BRAND_SUFFIXES.some((suffix) => input.endsWith(suffix))
  );
}

export function isValidKeywordCandidate(text: string) {
  const input = normalizeText(text);
  if (!input || !clampKeywordLength(input)) return false;
  if (isNoiseKeyword(input)) return false;
  if (KEYWORD_PUNCTUATION_CN.test(input)) return false;
  if (KEYWORD_MULTI_DIGITS.test(input)) return false;
  if (countMatchedTerms(input, KEYWORD_MARKETING_TERMS_CN) >= 2) return false;
  if (/[A-Za-z0-9]+\s+[A-Za-z0-9]+/.test(input)) return false;
  if (KEYWORD_SENTENCE_LIKE_PATTERNS.some((pattern) => pattern.test(input)) && !hasIndustrySignal(input)) return false;
  return /^[A-Za-z0-9\u4e00-\u9fa5]+$/.test(input);
}

function safeParseJsonArray(input: string | null | undefined) {
  if (!input) return [] as string[];
  try {
    const parsed = JSON.parse(input);
    return Array.isArray(parsed) ? parsed.map((item) => String(item).trim()).filter(Boolean) : [];
  } catch {
    return [];
  }
}

async function loadWhitelistEntries() {
  const rows = await prisma.industryWhitelist.findMany({
    where: { status: true },
    select: {
      word: true,
      category: true,
      weight: true,
      synonyms: true,
    },
    orderBy: [{ weight: "desc" }, { word: "asc" }],
  }).catch(() => []);

  const merged = new Map<string, WhitelistEntry>();

  for (const item of INDUSTRY_WHITELIST_SEED) {
    merged.set(item.word, {
      word: item.word,
      category: item.category,
      weight: item.weight,
      synonyms: item.synonyms ?? [],
    });
  }

  for (const row of rows) {
    merged.set(row.word, {
      word: row.word,
      category: row.category,
      weight: row.weight,
      synonyms: safeParseJsonArray(row.synonyms),
    });
  }

  return Array.from(merged.values()).sort((a, b) => b.word.length - a.word.length || b.weight - a.weight);
}

function buildWhitelistLookup(entries: WhitelistEntry[]) {
  const canonicalByAlias = new Map<string, WhitelistEntry>();

  for (const entry of entries) {
    for (const alias of unique([entry.word, ...entry.synonyms])) {
      const key = normalizeCompact(alias);
      if (key) canonicalByAlias.set(key, entry);
    }
  }

  return canonicalByAlias;
}

function getKeywordWeightFromLookup(keyword: string, lookup: Map<string, WhitelistEntry>) {
  return lookup.get(normalizeCompact(keyword))?.weight ?? 1;
}

function collectWhitelistMatches(bodyText: string, title: string, entries: WhitelistEntry[]) {
  const sourceText = normalizeText(bodyText);
  const normalizedTitle = normalizeText(title);
  const lead = sourceText.slice(0, 200);
  const matches = new Map<string, KeywordCandidate>();

  for (const entry of entries) {
    const aliases = unique([entry.word, ...entry.synonyms]).sort((a, b) => b.length - a.length);
    let frequency = 0;
    let inTitle = false;
    let inLead = false;

    for (const alias of aliases) {
      const regex = new RegExp(escapeRegExp(alias), "g");
      const found = sourceText.match(regex);
      if (found) frequency += found.length;
      if (!inTitle && normalizedTitle.includes(alias)) inTitle = true;
      if (!inLead && lead.includes(alias)) inLead = true;
    }

    if (!frequency && !inTitle) continue;

    const frequencyWeight = Math.min(1.5, 1 + Math.log(Math.max(1, frequency || 1)));
    const titleWeight = inTitle ? 1.15 : 1;
    const leadWeight = inLead ? 1.2 : 1;
    const score = entry.weight * titleWeight * leadWeight * frequencyWeight;

    matches.set(entry.word, {
      keyword: entry.word,
      source: inTitle && frequency === 0 ? "title" : "whitelist",
      weight: entry.weight,
      frequency: Math.max(1, frequency),
      inTitle,
      inLead,
      score,
      contexts: [],
    });
  }

  return matches;
}

function isValidBrandCandidate(input: string, whitelistLookup: Map<string, WhitelistEntry>) {
  if (!isValidKeywordCandidate(input)) return false;
  if (/^[A-Za-z]+$/.test(input)) return false;
  if (NEWS_BRAND_FORBIDDEN_CONTAINS.some((item) => input.includes(item))) return false;
  if (["上海","南浔","湖州","南通","杭州","广州","深圳","北京","苏州","南京","成都","重庆","宁波","无锡","东莞","佛山"].includes(input)) return false;
  if (["协会","品牌","企业","集团","公司","行业","负责人"].includes(input)) return false;
  return !whitelistLookup.has(normalizeCompact(input));
}

function collectNerCandidates(text: string, title: string, whitelistLookup: Map<string, WhitelistEntry>) {
  const sourceText = normalizeText(text);
  const titleText = normalizeText(title);
  const lead = sourceText.slice(0, 200);
  const sentences = splitSentences(sourceText);
  const found = new Map<string, KeywordCandidate>();

  const pushCandidate = (rawKeyword: string, context: string, ruleSource: string, inTitle = false) => {
    const keyword = rawKeyword.trim().replace(/[，。！？!?]+$/g, "");
    if (!isValidBrandCandidate(keyword, whitelistLookup)) return;

    const prev = found.get(keyword);
    const frequency = (prev?.frequency ?? 0) + 1;
    const nextInTitle = prev?.inTitle || inTitle || titleText.includes(keyword);
    const inLead = prev?.inLead || lead.includes(keyword);
    const frequencyWeight = Math.min(1.5, 1 + Math.log(Math.max(1, frequency)));
    const score = 1 * (nextInTitle ? 2 : 1) * (inLead ? 1.2 : 1) * frequencyWeight + 0.5;

    found.set(keyword, {
      keyword,
      source: "ner",
      weight: 1,
      frequency,
      inTitle: nextInTitle,
      inLead,
      score,
      contexts: unique([...(prev?.contexts ?? []), context]).slice(0, 3),
      ruleSource: unique([prev?.ruleSource, ruleSource].filter(Boolean) as string[]).join("+"),
    });
  };

  for (const pattern of NEWS_BRAND_CONTEXT_PATTERNS) {
    const regex = new RegExp(pattern);
    let match: RegExpExecArray | null;
    while ((match = regex.exec(sourceText)) !== null) {
      const matchedText = match[0];
      const keyword = match[1]?.trim();
      if (!keyword) continue;
      const sentence = sentences.find((item) => item.includes(matchedText)) ?? matchedText;
      pushCandidate(keyword, sentence, "context");
    }
  }

  const suffixRegex = /([A-Za-z0-9\u4e00-\u9fa5]{2,8}(?:木业|木作|家居|家私|整木|集团|国际))/g;
  let suffixMatch: RegExpExecArray | null;
  while ((suffixMatch = suffixRegex.exec(sourceText)) !== null) {
    const keyword = suffixMatch[1]?.trim();
    if (!keyword) continue;
    const sentence = sentences.find((item) => item.includes(keyword)) ?? keyword;
    pushCandidate(keyword, sentence, "suffix", titleText.includes(keyword));
  }

  const tokens = unique(
    `${titleText} ${sourceText}`
      .split(KEYWORD_SPLIT_PATTERN_CN)
      .map((item) => item.trim())
      .filter(Boolean),
  );

  for (const token of tokens) {
    const sentence = sentences.find((item) => item.includes(token)) ?? token;
    if (NEWS_BRAND_SUFFIXES.some((suffix) => token.endsWith(suffix))) {
      pushCandidate(token, sentence, "suffix", titleText.includes(token));
      continue;
    }

    if (/^[\u4e00-\u9fa5]{2,6}$/.test(token) && titleText.includes(token) && /亮相|参展|发布|签约|升级/.test(sourceText)) {
      pushCandidate(token, sentence, "title", true);
    }
  }

  return found;
}

function buildFallbackKeywords(title: string, entries: WhitelistEntry[]) {
  const titleText = normalizeText(title);
  const fromWhitelist = entries
    .filter((entry) => titleText.includes(entry.word) && isValidKeywordCandidate(entry.word))
    .slice(0, 3)
    .map((entry) => ({
      keyword: entry.word,
      score: entry.weight * 2,
      weight: entry.weight,
      source: "title" as const,
    }));

  if (fromWhitelist.length > 0) return fromWhitelist;

  return unique(
    titleText
      .split(KEYWORD_SPLIT_PATTERN_CN)
      .map((item) => item.trim())
      .filter((item) => isValidKeywordCandidate(item) && hasIndustrySignal(item)), 
  )
    .slice(0, 3)
    .map((keyword) => ({ keyword, score: 1, weight: 1, source: "title" as const }));
}

export async function extractNewsKeywords(input: ArticleKeywordInput): Promise<KeywordExtractionResult> {
  const title = normalizeText(input.title || "");
  const content = normalizeText(`${input.city ? `${input.city} ` : ""}${input.content || ""}`);
  const entries = await loadWhitelistEntries();
  const whitelistLookup = buildWhitelistLookup(entries);
  const whitelistMatches = collectWhitelistMatches(content, title, entries);
  const nerMatches = collectNerCandidates(`${title} ${content}`, title, whitelistLookup);

  for (const [keyword, candidate] of Array.from(nerMatches.entries())) {
    if (!whitelistMatches.has(keyword)) {
      whitelistMatches.set(keyword, candidate);
    }
  }

  const ranked = Array.from(whitelistMatches.values())
    .filter((item) => isValidKeywordCandidate(item.keyword))
    .filter((item) => item.source !== "title" || hasIndustrySignal(item.keyword))
    .sort((a, b) => b.score - a.score || b.weight - a.weight || b.keyword.length - a.keyword.length)
    .slice(0, 5)
    .map((item) => ({
      keyword: item.keyword,
      score: Number(item.score.toFixed(2)),
      weight: item.weight,
      source: item.source,
    }));

  const finalKeywords = ranked.length > 0 ? ranked : buildFallbackKeywords(title, entries);
  const autoApprovedBrands = Array.from(nerMatches.values())
    .filter((item) => {
      const bodyFrequency = content ? content.split(item.keyword).length - 1 : 0;
      return isValidKeywordCandidate(item.keyword) && bodyFrequency > 0;
    })
    .map((item) => ({
      brandName: item.keyword,
      sourceContext: item.contexts[0] ?? item.keyword,
      frequency: item.frequency,
      ruleSource: item.ruleSource || (item.inTitle ? "title" : "context"),
      triggerReason: null,
      confidence: Number(Math.min(0.95, 0.45 + item.frequency * 0.15 + (item.inTitle ? 0.05 : 0) + (item.inLead ? 0.05 : 0)).toFixed(2)),
    }));

  return {
    keywords: finalKeywords.slice(0, Math.max(3, Math.min(5, finalKeywords.length))),
    pendingBrands: autoApprovedBrands,
  };
}

function parseJsonStringArray(input: string | null | undefined) {
  if (!input) return [] as string[];
  try {
    const parsed = JSON.parse(input);
    return Array.isArray(parsed) ? parsed.map((item) => String(item).trim()).filter(Boolean) : [];
  } catch {
    return [];
  }
}

export async function syncArticleKeywords(options: {
  articleId: string;
  title: string;
  content: string;
  manualKeywords?: string | null;
}) {
  const result = await extractNewsKeywords({ title: options.title, content: options.content });
  const autoKeywords = result.keywords.map((item) => item.keyword);
  const manualKeywords = normalizeKeywordList(options.manualKeywords);
  const activeKeywords = manualKeywords.length > 0 ? manualKeywords : autoKeywords;

  await prisma.$transaction(async (tx) => {
    await tx.article.update({
      where: { id: options.articleId },
      data: { keywords: autoKeywords.join(",") },
    });

    await tx.newsKeyword.deleteMany({ where: { newsId: options.articleId } });
    if (activeKeywords.length > 0) {
      await tx.newsKeyword.createMany({
        data: activeKeywords.map((keyword, index) => {
          const auto = result.keywords.find((item) => item.keyword === keyword);
          return {
            newsId: options.articleId,
            keyword,
            weightScore: manualKeywords.includes(keyword) ? String(100 - index) : String(auto?.score ?? 1),
            isManual: manualKeywords.includes(keyword),
            sortOrder: index,
          };
        }),
      });
    }

    for (const brand of result.pendingBrands) {
      if (!isValidKeywordCandidate(brand.brandName)) continue;
      const existing = await tx.pendingBrand.findUnique({ where: { brandName: brand.brandName } });
      const existingArticleIds = parseJsonStringArray(existing?.articleIds);
      const mergedArticleIds = Array.from(new Set([...existingArticleIds, options.articleId]));
      const nextArticleCount = mergedArticleIds.length;
      const nextOccurrenceCount = (existing?.occurrenceCount ?? 0) + brand.frequency;
      const thresholdReached = brand.frequency >= 2 || nextArticleCount >= 2;
      const shouldAutoApprove = AUTO_APPROVE_PENDING_BRANDS && thresholdReached;
      const triggerReason = brand.frequency >= 2 ? "single-article>=2" : nextArticleCount >= 2 ? "cross-article>=2" : null;
      const nextApprovedSource =
        existing?.approvedSource === "manual-admin"
          ? "manual-admin"
          : shouldAutoApprove
            ? "auto-threshold"
            : existing?.approvedSource ?? null;
      const nextStatus = shouldAutoApprove ? 1 : existing?.status ?? 0;

      if (existing) {
        await tx.pendingBrand.update({
          where: { brandName: brand.brandName },
          data: {
            lastNewsId: options.articleId,
            occurrenceCount: nextOccurrenceCount,
            articleCount: nextArticleCount,
            articleIds: JSON.stringify(mergedArticleIds),
            lastOccurrence: new Date(),
            sourceContext: brand.sourceContext,
            ruleSource: brand.ruleSource,
            triggerReason: shouldAutoApprove ? triggerReason : existing?.triggerReason,
            confidence: brand.confidence,
            status: nextStatus,
            approvedSource: nextApprovedSource,
            autoApprovedAt: shouldAutoApprove ? new Date() : existing.autoApprovedAt,
          },
        });
      } else {
        await tx.pendingBrand.create({
          data: {
            brandName: brand.brandName,
            firstNewsId: options.articleId,
            lastNewsId: options.articleId,
            occurrenceCount: brand.frequency,
            articleCount: 1,
            articleIds: JSON.stringify([options.articleId]),
            lastOccurrence: new Date(),
            sourceContext: brand.sourceContext,
            ruleSource: brand.ruleSource,
            triggerReason,
            confidence: brand.confidence,
            status: nextStatus,
            approvedSource: nextApprovedSource,
            autoApprovedAt: shouldAutoApprove ? new Date() : null,
          },
        });
      }

      await tx.operationLog.create({
        data: {
          action: existing ? "news_pending_brand_seen" : "news_pending_brand_created",
          targetType: "pending_brand",
          targetId: existing?.id ?? null,
          detail: JSON.stringify({
            articleId: options.articleId,
            brandName: brand.brandName,
            frequency: brand.frequency,
            occurrenceCount: nextOccurrenceCount,
            articleCount: nextArticleCount,
            thresholdReached,
            autoApproveEnabled: AUTO_APPROVE_PENDING_BRANDS,
            shouldAutoApprove,
            ruleSource: brand.ruleSource,
            triggerReason,
            confidence: brand.confidence,
          }),
        },
      });

      if (shouldAutoApprove) {
        await tx.industryWhitelist.upsert({
          where: { word: brand.brandName },
          update: {
            category: "品牌",
            weight: 1,
            status: true,
          },
          create: {
            word: brand.brandName,
            category: "品牌",
            weight: 1,
            status: true,
          },
        });

        if (!(existing?.status === 1 && existing?.approvedSource)) {
          await tx.operationLog.create({
            data: {
              action: "news_pending_brand_auto_approved",
              targetType: "pending_brand",
              targetId: existing?.id ?? null,
              detail: JSON.stringify({
                articleId: options.articleId,
                brandName: brand.brandName,
                occurrenceCount: nextOccurrenceCount,
                articleCount: nextArticleCount,
                ruleSource: brand.ruleSource,
                triggerReason,
                confidence: brand.confidence,
                whitelistWeight: 1,
              }),
            },
          });
        }
      }
    }
  });

  return { autoKeywords, activeKeywords };
}

type RelatedArticle = {
  id: string;
  title: string;
  excerpt: string | null;
  coverImage: string | null;
  subHref: string | null;
  publishedAt: Date | null;
  updatedAt: Date;
  keywords: string | null;
  manualKeywords: string | null;
};

function parseRecommendIds(input: string | null | undefined) {
  if (!input) return [] as string[];
  try {
    const parsed = JSON.parse(input);
    return Array.isArray(parsed) ? parsed.map((item) => String(item).trim()).filter(Boolean) : [];
  } catch {
    return [];
  }
}

function getArticleKeywordList(article: Pick<RelatedArticle, "keywords" | "manualKeywords">) {
  return normalizeKeywordList(article.manualKeywords || article.keywords);
}

export async function getRecommendedNews(articleId: string, limit = 8) {
  try {
    const current = await prisma.article.findUnique({
      where: { id: articleId },
      select: {
        id: true,
        title: true,
        subHref: true,
        keywords: true,
        manualKeywords: true,
        recommendIds: true,
      },
    });

    if (!current) return [];

    const manualIds = parseRecommendIds(current.recommendIds);
    if (manualIds.length > 0) {
      return prisma.article.findMany({
        where: {
          id: { in: manualIds.filter((id) => id !== articleId) },
          status: "approved",
        },
        take: limit,
        select: {
          id: true,
          title: true,
          excerpt: true,
          coverImage: true,
          subHref: true,
          publishedAt: true,
          updatedAt: true,
          keywords: true,
          manualKeywords: true,
        },
      });
    }

    const entries = await loadWhitelistEntries();
    const lookup = buildWhitelistLookup(entries);
    const currentKeywords = getArticleKeywordList(current);
    const coreKeywords = currentKeywords.slice(0, 3);

    const candidates = await prisma.article.findMany({
      where: {
        status: "approved",
        id: { not: articleId },
      },
      orderBy: [{ publishedAt: "desc" }, { updatedAt: "desc" }],
      take: 80,
      select: {
        id: true,
        title: true,
        excerpt: true,
        coverImage: true,
        subHref: true,
        publishedAt: true,
        updatedAt: true,
        keywords: true,
        manualKeywords: true,
      },
    });

    const scored = candidates
      .map((candidate) => {
        const candidateKeywords = getArticleKeywordList(candidate);
        const overlap = coreKeywords.filter((keyword) => candidateKeywords.includes(keyword));
        const overlapCount = overlap.length;

        let score = overlapCount >= 3 ? 5 : overlapCount === 2 ? 3 : overlapCount === 1 ? 1 : 0;
        score += coreKeywords.filter((keyword) => candidate.title.includes(keyword)).length * 0.5;
        score += overlap.reduce((sum, keyword) => sum + (getKeywordWeightFromLookup(keyword, lookup) === 3 ? 1 : 0), 0);

        return { ...candidate, recommendScore: score };
      })
      .filter((item) => item.recommendScore > 0)
      .sort((a, b) => {
        const timeA = (a.publishedAt ?? a.updatedAt).getTime();
        const timeB = (b.publishedAt ?? b.updatedAt).getTime();
        return b.recommendScore - a.recommendScore || timeB - timeA;
      });

    if (scored.length >= 6) return scored.slice(0, limit);

    const usedIds = new Set(scored.map((item) => item.id));
    const sameSection = candidates.filter((item) => item.subHref && item.subHref === current.subHref && !usedIds.has(item.id));
    const latest = candidates.filter((item) => !usedIds.has(item.id));
    return [...scored, ...sameSection, ...latest]
      .filter((item, index, list) => list.findIndex((row) => row.id === item.id) === index)
      .slice(0, limit);
  } catch {
    return [];
  }
}

export async function resolveCanonicalKeywordName(name: string) {
  const normalized = normalizeCompact(name);
  if (!normalized) return null;
  const entries = await loadWhitelistEntries();
  const lookup = buildWhitelistLookup(entries);
  return lookup.get(normalized)?.word ?? normalizeText(name);
}

export async function getArticlesByKeyword(name: string, limit = 30) {
  const keyword = await resolveCanonicalKeywordName(name);
  if (!keyword || !isValidKeywordCandidate(keyword)) {
    return {
      keyword: keyword ?? normalizeText(name),
      total: 0,
      items: [] as Array<{
        id: string;
        title: string;
        slug: string;
        excerpt: string | null;
        publishedAt: Date | null;
        updatedAt: Date;
      }>,
    };
  }

  const where: Prisma.ArticleWhereInput = {
    status: "approved",
    OR: [
      { keywordItems: { some: { keyword } } },
      { manualKeywords: { contains: keyword } },
      { keywords: { contains: keyword } },
    ],
  };

  const [items, total] = await Promise.all([
    prisma.article.findMany({
      where,
      orderBy: [{ publishedAt: "desc" }, { updatedAt: "desc" }],
      take: limit,
      select: {
        id: true,
        title: true,
        slug: true,
        excerpt: true,
        publishedAt: true,
        updatedAt: true,
      },
    }),
    prisma.article.count({ where }),
  ]);

  return { keyword, total, items };
}

export function formatKeywordCsv(input: string[]) {
  return normalizeKeywordList(input.join(",")).join(",");
}

