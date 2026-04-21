import { createHash } from "node:crypto";
import { prisma } from "./prisma";
import { previewText } from "./text";
import { generateUniqueArticleSlug } from "./slug";
import { syncArticleKeywords } from "./news-keywords-v2";
import { writeOperationLog } from "./operation-log";
import { assertNoDirtyText } from "./article-input-guard";

const DEFAULT_USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36 CNZhengmuNewsImporter/1.0";

const NEWS_SUBCATEGORY_MAP = {
  trends: "/news/trends",
  enterprise: "/news/enterprise",
  tech: "/news/tech",
  events: "/news/events",
} as const;

export type ClassifiedNewsKey = keyof typeof NEWS_SUBCATEGORY_MAP;

export type NewsImportConfig = {
  listUrl: string;
  sourceName?: string | null;
  limit?: number;
  includePatterns?: string[];
  userAgent?: string;
  timeoutMs?: number;
  dryRun?: boolean;
};

export type ImportedNewsCandidate = {
  title: string;
  contentText: string;
  contentHtml: string;
  summary: string;
  originalUrl: string;
  sourceName: string;
  publishedAt: Date;
  subHref: string;
  contentHash: string;
};

export type NewsImportResult = {
  listUrl: string;
  scanned: number;
  imported: Array<{ id?: string; url: string; title: string; subHref: string }>;
  skipped: Array<{ url: string; reason: string }>;
  failed: Array<{ url: string; reason: string }>;
};

function normalizeWhitespace(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function stripTags(value: string) {
  return normalizeWhitespace(
    value
      .replace(/<script[\s\S]*?<\/script>/gi, " ")
      .replace(/<style[\s\S]*?<\/style>/gi, " ")
      .replace(/<noscript[\s\S]*?<\/noscript>/gi, " ")
      .replace(/<br\s*\/?>/gi, "\n")
      .replace(/<\/p>/gi, "\n")
      .replace(/<\/div>/gi, "\n")
      .replace(/<[^>]+>/g, " ")
      .replace(/&nbsp;/gi, " ")
      .replace(/&amp;/gi, "&")
      .replace(/&lt;/gi, "<")
      .replace(/&gt;/gi, ">")
      .replace(/&#39;/gi, "'")
      .replace(/&quot;/gi, '"'),
  );
}

function buildParagraphHtml(text: string) {
  const paragraphs = text
    .split(/\n+/)
    .map((item) => normalizeWhitespace(item))
    .filter(Boolean);

  if (paragraphs.length === 0) {
    return `<p>${escapeHtml(text)}</p>`;
  }

  return paragraphs.map((paragraph) => `<p>${escapeHtml(paragraph)}</p>`).join("\n");
}

function resolveUrl(rawHref: string, baseUrl: string) {
  try {
    return new URL(rawHref, baseUrl).toString();
  } catch {
    return "";
  }
}

function decodeHtmlEntity(value: string) {
  return value
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&#39;/gi, "'")
    .replace(/&quot;/gi, '"');
}

function extractMetaContent(html: string, name: string) {
  const metaRegex = new RegExp(
    `<meta[^>]+(?:name|property)=["']${name}["'][^>]+content=["']([^"']+)["'][^>]*>`,
    "i",
  );
  return decodeHtmlEntity(metaRegex.exec(html)?.[1] ?? "").trim();
}

function extractTitle(html: string) {
  const candidates = [
    extractMetaContent(html, "og:title"),
    decodeHtmlEntity(html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i)?.[1] ?? ""),
    decodeHtmlEntity(html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] ?? ""),
  ]
    .map((item) => stripTags(item))
    .filter(Boolean);

  return candidates[0] ?? "";
}

function extractCandidateContentHtml(html: string) {
  const patterns = [
    /<article\b[^>]*>([\s\S]*?)<\/article>/i,
    /<(div|section)[^>]+(?:class|id)=["'][^"']*(?:article|content|detail|news|post|entry|正文)[^"']*["'][^>]*>([\s\S]*?)<\/\1>/i,
    /<main\b[^>]*>([\s\S]*?)<\/main>/i,
    /<body\b[^>]*>([\s\S]*?)<\/body>/i,
  ];

  for (const pattern of patterns) {
    const match = pattern.exec(html);
    const content = (match?.[2] ?? match?.[1] ?? "").trim();
    if (content) return content;
  }

  return html;
}

function extractContentText(html: string) {
  const candidateHtml = extractCandidateContentHtml(html)
    .replace(/<(nav|header|footer|aside|form)[\s\S]*?<\/\1>/gi, " ")
    .replace(/<figure[\s\S]*?<\/figure>/gi, " ");

  const paragraphMatches = Array.from(candidateHtml.matchAll(/<(p|h2|h3|li)[^>]*>([\s\S]*?)<\/\1>/gi))
    .map((match) => stripTags(match[2] ?? ""))
    .filter((item) => item.length >= 8);

  if (paragraphMatches.length > 0) {
    return paragraphMatches.join("\n");
  }

  return stripTags(candidateHtml);
}

function extractDetailPublishedAt(html: string) {
  const metaDate = [
    extractMetaContent(html, "article:published_time"),
    extractMetaContent(html, "pubdate"),
    extractMetaContent(html, "publishdate"),
  ].find(Boolean);

  const inlineDate =
    html.match(/(20\d{2}[-/.年]\d{1,2}[-/.月]\d{1,2}(?:日)?(?:\s+\d{1,2}:\d{2}(?::\d{2})?)?)/)?.[1] ?? "";
  const raw = normalizeWhitespace(metaDate || inlineDate);
  if (!raw) return new Date();

  const normalized = raw.replace(/年|\/|\./g, "-").replace(/月/g, "-").replace(/日/g, "").trim();
  const date = new Date(normalized);
  return Number.isNaN(date.getTime()) ? new Date() : date;
}

function buildContentHash(title: string, contentText: string) {
  return createHash("sha256")
    .update(normalizeWhitespace(`${title}\n${contentText}`), "utf8")
    .digest("hex");
}

export function classifyNews(title: string, content: string): ClassifiedNewsKey {
  const source = `${title} ${content}`;

  if (/(展会|设计周|论坛|活动)/i.test(source)) return "events";
  if (/(融资|发布|品牌|合作)/i.test(source)) return "enterprise";
  if (/(技术|工艺|AI|设备)/i.test(source)) return "tech";
  return "trends";
}

function extractArticleLinks(html: string, baseUrl: string, includePatterns: string[]) {
  const anchors = Array.from(html.matchAll(/<a\b[^>]*href=["']([^"'#]+)["'][^>]*>/gi))
    .map((match) => resolveUrl(match[1] ?? "", baseUrl))
    .filter(Boolean);

  const deduped = Array.from(new Set(anchors));
  const baseHost = new URL(baseUrl).host;

  return deduped.filter((href) => {
    try {
      const url = new URL(href);
      if (!/^https?:$/i.test(url.protocol)) return false;
      if (url.host !== baseHost && includePatterns.length === 0) return false;
      if (includePatterns.length === 0) return true;
      return includePatterns.some((pattern) => href.includes(pattern));
    } catch {
      return false;
    }
  });
}

async function fetchHtml(url: string, userAgent: string, timeoutMs: number) {
  const response = await fetch(url, {
    headers: {
      "user-agent": userAgent,
      accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      "accept-language": "zh-CN,zh;q=0.9,en;q=0.8",
    },
    signal: AbortSignal.timeout(timeoutMs),
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`抓取失败: HTTP ${response.status}`);
  }

  return await response.text();
}

async function scrapeDetail(url: string, sourceName: string, userAgent: string, timeoutMs: number) {
  const html = await fetchHtml(url, userAgent, timeoutMs);
  const title = extractTitle(html);
  const contentText = extractContentText(html);

  if (!title || !contentText || contentText.length < 30) {
    throw new Error("正文提取失败或内容过短");
  }

  const summary = previewText(contentText, 200);
  const contentHtml = buildParagraphHtml(contentText);
  const categoryKey = classifyNews(title, contentText);

  return {
    title,
    contentText,
    contentHtml,
    summary,
    originalUrl: url,
    sourceName,
    publishedAt: extractDetailPublishedAt(html),
    subHref: NEWS_SUBCATEGORY_MAP[categoryKey],
    contentHash: buildContentHash(title, contentText),
  } satisfies ImportedNewsCandidate;
}

async function findDuplicateArticle(candidate: ImportedNewsCandidate) {
  const [byUrl, byHash] = await Promise.all([
    prisma.article.findFirst({
      where: {
        sourceUrl: candidate.originalUrl,
        OR: [{ categoryHref: { startsWith: "/news" } }, { subHref: { startsWith: "/news" } }],
      },
      select: { id: true },
    }),
    prisma.article.findFirst({
      where: {
        contentHash: candidate.contentHash,
        OR: [{ categoryHref: { startsWith: "/news" } }, { subHref: { startsWith: "/news" } }],
      },
      select: { id: true },
    }),
  ]);

  if (byUrl) return "original_url 已存在";
  if (byHash) return "content_hash 重复";
  return "";
}

async function createImportedArticle(candidate: ImportedNewsCandidate, actor?: { actorId?: string | null; actorEmail?: string | null }) {
  assertNoDirtyText(
    [
      { label: "标题", value: candidate.title },
      { label: "摘要", value: candidate.summary },
      { label: "正文", value: candidate.contentHtml },
      { label: "来源", value: candidate.sourceName },
    ],
    "新闻导入已拦截",
  );
  const slug = await generateUniqueArticleSlug(candidate.title);
  const article = await prisma.article.create({
    data: {
      title: candidate.title,
      slug,
      sourceType: "imported",
      source: candidate.sourceName || null,
      sourceUrl: candidate.originalUrl,
      contentHash: candidate.contentHash,
      excerpt: candidate.summary || null,
      content: candidate.contentHtml,
      categoryHref: "/news",
      subHref: candidate.subHref,
      publishedAt: candidate.publishedAt,
      status: "pending",
      syncToMainSite: false,
    },
    select: {
      id: true,
      title: true,
      subHref: true,
      sourceUrl: true,
    },
  });

  try {
    await syncArticleKeywords({
      articleId: article.id,
      title: candidate.title,
      content: candidate.contentHtml,
      manualKeywords: null,
    });
  } catch (error) {
    console.error("syncArticleKeywords failed for imported news:", error);
  }

  await writeOperationLog({
    actorId: actor?.actorId ?? null,
    actorEmail: actor?.actorEmail ?? null,
    action: "news_import_created",
    targetType: "article",
    targetId: article.id,
    detail: JSON.stringify({ sourceUrl: candidate.originalUrl, subHref: candidate.subHref }),
  });

  return article;
}

export async function importNewsFromList(
  config: NewsImportConfig,
  actor?: { actorId?: string | null; actorEmail?: string | null },
) {
  const listUrl = config.listUrl.trim();
  const sourceName = (config.sourceName || new URL(listUrl).host).trim();
  const limit = Math.max(1, Math.min(30, Number(config.limit || 10)));
  const userAgent = config.userAgent?.trim() || DEFAULT_USER_AGENT;
  const timeoutMs = Math.max(3000, Math.min(30000, Number(config.timeoutMs || 12000)));
  const includePatterns = (config.includePatterns ?? []).map((item) => item.trim()).filter(Boolean);

  const result: NewsImportResult = {
    listUrl,
    scanned: 0,
    imported: [],
    skipped: [],
    failed: [],
  };

  const listHtml = await fetchHtml(listUrl, userAgent, timeoutMs);
  const links = extractArticleLinks(listHtml, listUrl, includePatterns).slice(0, limit);
  result.scanned = links.length;

  for (const link of links) {
    try {
      const candidate = await scrapeDetail(link, sourceName, userAgent, timeoutMs);
      const duplicateReason = await findDuplicateArticle(candidate);
      if (duplicateReason) {
        result.skipped.push({ url: link, reason: duplicateReason });
        continue;
      }

      if (config.dryRun) {
        result.imported.push({ url: link, title: candidate.title, subHref: candidate.subHref });
        continue;
      }

      const article = await createImportedArticle(candidate, actor);
      result.imported.push({
        id: article.id,
        url: link,
        title: article.title,
        subHref: article.subHref || "/news/trends",
      });
    } catch (error) {
      const reason = error instanceof Error ? error.message : "未知错误";
      result.failed.push({ url: link, reason });
    }
  }

  await writeOperationLog({
    actorId: actor?.actorId ?? null,
    actorEmail: actor?.actorEmail ?? null,
    action: "news_import_batch",
    targetType: "article",
    detail: JSON.stringify({
      listUrl,
      scanned: result.scanned,
      imported: result.imported.length,
      skipped: result.skipped.length,
      failed: result.failed.length,
      dryRun: config.dryRun === true,
    }),
  });

  return result;
}
