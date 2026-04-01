import { prisma } from "@/lib/prisma";
import { stripHtml } from "@/lib/text";
import {
  INDUSTRY_WHITELIST_SEED,
  NEWS_BRAND_CONTEXT_PATTERNS,
  NEWS_BRAND_SUFFIXES,
  NEWS_PENDING_BRAND_BLACKLIST,
  NEWS_STOPWORDS,
} from "@/lib/news-keyword-config";

type WhitelistEntry = {
  word: string;
  category: string;
  weight: number;
  synonyms: string[];
};

type KeywordCandidate = {
  keyword: string;
  source: "whitelist" | "title" | "brand";
  weight: number;
  frequency: number;
  inTitle: boolean;
  inLead: boolean;
  score: number;
  contexts: string[];
};

export type ExtractedKeyword = {
  keyword: string;
  score: number;
  weight: number;
  source: KeywordCandidate["source"];
};

export type KeywordExtractionResult = {
  keywords: ExtractedKeyword[];
  pendingBrands: Array<{ brandName: string; sourceContext: string }>;
};

type ArticleKeywordInput = {
  title: string;
  content: string;
  city?: string | null;
};

function normalizeText(input: string) {
  return stripHtml(input)
    .replace(/&nbsp;/gi, " ")
    .replace(/[“”"']/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeCompact(input: string) {
  return normalizeText(input).replace(/\s+/g, "");
}

function unique<T>(items: T[]) {
  return Array.from(new Set(items));
}

function clampKeywordLength(input: string) {
  return input.length >= 2 && input.length <= 8;
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

function splitSentences(input: string) {
  return normalizeText(input)
    .split(/(?<=[。！？!?\n])/)
    .map((item) => item.trim())
    .filter(Boolean);
}

async function loadWhitelistEntries() {
  const rows = await prisma.industryWhitelist.findMany({
    where: { status: true },
    orderBy: [{ weight: "desc" }, { word: "desc" }],
  }).catch(() => []);

  const source = rows.length > 0
    ? rows.map((row) => ({
        word: row.word,
        category: row.category,
        weight: row.weight,
        synonyms: safeParseJsonArray(row.synonyms),
      }))
    : INDUSTRY_WHITELIST_SEED.map((item) => ({
        word: item.word,
        category: item.category,
        weight: item.weight,
        synonyms: item.synonyms ?? [],
      }));

  return source.sort((a, b) => b.word.length - a.word.length || b.weight - a.weight);
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

function collectWhitelistMatches(text: string, title: string, entries: WhitelistEntry[]) {
  const sourceText = normalizeText(text);
  const normalizedTitle = normalizeText(title);
  const lead = sourceText.slice(0, 200);
  const matches = new Map<string, KeywordCandidate>();

  for (const entry of entries) {
    const aliases = unique([entry.word, ...entry.synonyms]).sort((a, b) => b.length - a.length);
    let frequency = 0;
    let inTitle = false;
    let inLead = false;

    for (const alias of aliases) {
      const escaped = alias.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const regex = new RegExp(escaped, "g");
      const found = sourceText.match(regex);
      if (found) frequency += found.length;
      if (!inTitle && normalizedTitle.includes(alias)) inTitle = true;
      if (!inLead && lead.includes(alias)) inLead = true;
    }

    if (!frequency && !inTitle) continue;

    const frequencyWeight = Math.min(1.5, 1 + Math.log(Math.max(1, frequency || 1)));
    const positionWeight = inLead ? 1.2 : 1;
    const titleWeight = inTitle ? 2 : 1;
    const score = entry.weight * titleWeight * positionWeight * frequencyWeight;

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

function collectBrandCandidates(text: string, title: string, whitelistLookup: Map<string, WhitelistEntry>) {
  const sourceText = normalizeText(text);
  const titleText = normalizeText(title);
  const sentences = splitSentences(sourceText);
  const found = new Map<string, KeywordCandidate>();

  const pushBrand = (rawBrand: string, source: KeywordCandidate["source"], context: string, inTitle = false) => {
    const brand = rawBrand.trim().replace(/[：:，,。.!！？]+$/g, "");
    if (!isValidPendingBrand(brand, whitelistLookup)) return;

    const prev = found.get(brand);
    const frequency = (prev?.frequency ?? 0) + 1;
    const nextInTitle = prev?.inTitle || inTitle || titleText.includes(brand);
    const inLead = prev?.inLead || sourceText.slice(0, 200).includes(brand);
    const frequencyWeight = Math.min(1.5, 1 + Math.log(Math.max(1, frequency)));
    const score = 1 * (nextInTitle ? 2 : 1) * (inLead ? 1.2 : 1) * frequencyWeight + 0.5;

    found.set(brand, {
      keyword: brand,
      source,
      weight: 1,
      frequency,
      inTitle: nextInTitle,
      inLead,
      score,
      contexts: unique([...(prev?.contexts ?? []), context]).slice(0, 3),
    });
  };

  for (const pattern of NEWS_BRAND_CONTEXT_PATTERNS) {
    const regex = new RegExp(pattern);
    let match: RegExpExecArray | null;
    while ((match = regex.exec(sourceText)) !== null) {
      const matchedText = match[0];
      const brand = match[1]?.trim();
      if (!brand) continue;
      const sentence = sentences.find((item) => item.includes(matchedText)) ?? matchedText;
      pushBrand(brand, "brand", sentence);
    }
  }

  const suffixRegex = /([A-Za-z0-9\u4e00-\u9fa5]{2,8}(?:木业|木作|家居|家私|整木|集团|国际))/g;
  let suffixMatch: RegExpExecArray | null;
  while ((suffixMatch = suffixRegex.exec(sourceText)) !== null) {
    const brand = suffixMatch[1]?.trim();
    if (!brand) continue;
    const sentence = sentences.find((item) => item.includes(brand)) ?? brand;
    pushBrand(brand, "brand", sentence, titleText.includes(brand));
  }

  const tokens = unique(
    `${titleText} ${sourceText}`
      .split(/[，,。；;：:\s()（）【】《》“”"'‘’、/\\|-]+/)
      .map((item) => item.trim())
      .filter(Boolean)
  );

  for (const token of tokens) {
    if (!NEWS_BRAND_SUFFIXES.some((suffix) => token.endsWith(suffix))) continue;
    const sentence = sentences.find((item) => item.includes(token)) ?? token;
    pushBrand(token, "brand", sentence, titleText.includes(token));
  }

  return found;
}

function isValidPendingBrand(input: string, whitelistLookup: Map<string, WhitelistEntry>) {
  if (!input || input.length < 2 || input.length > 10) return false;
  if (isNoiseKeyword(input)) return false;
  if (/^[A-Za-z]+$/.test(input)) return false;
  if (/^(上海|杭州|广州|深圳|北京|苏州|南京|成都|重庆|宁波|无锡|东莞|佛山)$/.test(input)) return false;
  if (/^(协会|品牌|企业|集团|公司|行业|负责人)$/.test(input)) return false;
  return !whitelistLookup.has(normalizeCompact(input));
}

function buildFallbackKeywords(title: string, entries: WhitelistEntry[]) {
  const titleText = normalizeText(title);
  const fallback = entries
    .filter((entry) => titleText.includes(entry.word))
    .slice(0, 3)
    .map((entry) => ({
      keyword: entry.word,
      score: entry.weight * 2,
      weight: entry.weight,
      source: "title" as const,
    }));

  if (fallback.length > 0) return fallback;

  return unique(
    titleText
      .split(/[，,。；;：:\s()（）【】《》“”"'‘’、/\\|-]+/)
      .map((item) => item.trim())
      .filter((item) => clampKeywordLength(item) && !isNoiseKeyword(item))
  )
    .slice(0, 3)
    .map((keyword) => ({ keyword, score: 1, weight: 1, source: "title" as const }));
}

export async function extractNewsKeywords(input: ArticleKeywordInput): Promise<KeywordExtractionResult> {
  const title = normalizeText(input.title || "");
  const content = normalizeText(`${input.city ? `${input.city} ` : ""}${input.content || ""}`);
  const entries = await loadWhitelistEntries();
  const whitelistLookup = buildWhitelistLookup(entries);
  const whitelistMatches = collectWhitelistMatches(`${title} ${content}`, title, entries);
  const brandMatches = collectBrandCandidates(`${title} ${content}`, title, whitelistLookup);

  for (const [keyword, brand] of Array.from(brandMatches.entries())) {
    if (!whitelistMatches.has(keyword)) {
      whitelistMatches.set(keyword, brand);
    }
  }

  const keywords = Array.from(whitelistMatches.values())
    .filter((item) => clampKeywordLength(item.keyword) && !isNoiseKeyword(item.keyword))
    .sort((a, b) => b.score - a.score || b.keyword.length - a.keyword.length)
    .slice(0, 5)
    .map((item) => ({
      keyword: item.keyword,
      score: Number(item.score.toFixed(2)),
      weight: item.weight,
      source: item.source,
    }));

  const finalKeywords = keywords.length > 0 ? keywords : buildFallbackKeywords(title, entries);
  const pendingBrands = Array.from(brandMatches.values())
    .filter((item) => !whitelistMatches.has(item.keyword) || item.source === "brand")
    .map((item) => ({
      brandName: item.keyword,
      sourceContext: item.contexts[0] ?? item.keyword,
    }));

  return {
    keywords: finalKeywords.slice(0, Math.max(3, Math.min(5, finalKeywords.length))),
    pendingBrands,
  };
}

function normalizeKeywordList(input: string | null | undefined) {
  return unique(
    (input || "")
      .split(/[,\n，]+/)
      .map((item) => item.trim())
      .filter((item) => clampKeywordLength(item) && !isNoiseKeyword(item))
  ).slice(0, 5);
}

function parseRecommendIds(input: string | null | undefined) {
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
      data: {
        keywords: autoKeywords.join(","),
      },
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
      const existing = await tx.pendingBrand.findUnique({ where: { brandName: brand.brandName } });
      if (existing) {
        await tx.pendingBrand.update({
          where: { brandName: brand.brandName },
          data: {
            occurrenceCount: { increment: 1 },
            lastOccurrence: new Date(),
            sourceContext: brand.sourceContext,
          },
        });
      } else {
        await tx.pendingBrand.create({
          data: {
            brandName: brand.brandName,
            firstNewsId: options.articleId,
            lastOccurrence: new Date(),
            sourceContext: brand.sourceContext,
          },
        });
      }
    }
  });

  return {
    autoKeywords,
    activeKeywords,
  };
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

function getArticleKeywordList(article: Pick<RelatedArticle, "keywords" | "manualKeywords">) {
  return normalizeKeywordList(article.manualKeywords || article.keywords);
}

export async function getRecommendedNews(articleId: string, limit = 8) {
  const current = await prisma.article.findUnique({
    where: { id: articleId },
    select: {
      id: true,
      title: true,
      subHref: true,
      categoryHref: true,
      keywords: true,
      manualKeywords: true,
      recommendIds: true,
    },
  });

  if (!current) return [];

  const manualIds = parseRecommendIds(current.recommendIds);
  if (manualIds.length > 0) {
    const manualItems = await prisma.article.findMany({
      where: {
        id: { in: manualIds.filter((id) => id !== articleId) },
        status: "approved",
      },
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
    return manualItems.slice(0, limit);
  }

  const activeKeywords = normalizeKeywordList(current.manualKeywords || current.keywords);
  const coreKeywords = activeKeywords.slice(0, 3);

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

      const titleHits = coreKeywords.filter((keyword) => candidate.title.includes(keyword)).length;
      score += titleHits * 0.5;

      const currentKeywords = normalizeKeywordList(current.manualKeywords || current.keywords);
      for (const keyword of overlap) {
        if (currentKeywords.includes(keyword)) {
          score += 1;
        }
      }

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
  return [...scored, ...sameSection, ...latest].filter((item, index, list) => list.findIndex((row) => row.id === item.id) === index).slice(0, limit);
}

export function formatKeywordCsv(input: string[]) {
  return normalizeKeywordList(input.join(",")).join(",");
}
