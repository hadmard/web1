import { prisma } from "@/lib/prisma";
import { isValidKeywordCandidate } from "@/lib/news-keywords-v2";
import { findNewsArticleBySegment } from "@/lib/news-sharing";
import { buildNewsPath, getArticleSegment } from "@/lib/share-config";

export type ArticleLinkTarget = {
  title: string;
  href: string;
  anchorText: string;
};

export type BrokenInternalLink = {
  href: string;
  reason: string;
};

const STATIC_INTERNAL_PATHS = new Set([
  "/news",
  "/news/all",
  "/news/trends",
  "/news/enterprise",
  "/news/tech",
  "/news/events",
  "/dictionary",
  "/dictionary",
  "/brands",
  "/brands/all",
  "/brands/buying",
  "/standards",
  "/standards/all",
  "/market",
]);

export function buildCanonicalNewsHref(article: { id: string; slug?: string | null }) {
  return buildNewsPath(getArticleSegment(article));
}

export function extractInternalHrefs(html: string) {
  const matches = Array.from(html.matchAll(/<a\b[^>]*href=(["'])(.*?)\1[^>]*>/gi));
  return matches
    .map((match) => String(match[2] || "").trim())
    .filter((href) => href.startsWith("/"));
}

export function buildSeoStaticInternalLinks(contentLine: "buying" | "trend" | "tech") {
  const shared: ArticleLinkTarget[] = [
    { title: "整木词库", href: "/dictionary", anchorText: "整木词库页" },
    { title: "整木选购", href: "/brands/buying", anchorText: "整木选购专题" },
    { title: "整木标准", href: "/standards", anchorText: "整木标准栏目" },
  ];

  if (contentLine === "buying") {
    return [
      { title: "整木资讯", href: "/news", anchorText: "整木资讯栏目" },
      ...shared,
    ].slice(0, 4);
  }

  if (contentLine === "tech") {
    return [
      { title: "技术发展", href: "/news/tech", anchorText: "技术发展栏目" },
      ...shared,
    ].slice(0, 4);
  }

  return [
    { title: "整木资讯", href: "/news", anchorText: "整木资讯栏目" },
    { title: "行业趋势", href: "/news/trends", anchorText: "行业趋势栏目" },
    ...shared,
  ].slice(0, 4);
}

export async function resolvePublishedInternalLinks(options: {
  contentLine: "buying" | "trend" | "tech";
  keyword: string;
  limit?: number;
}) {
  const take = Math.max(0, Math.min(2, options.limit ?? 1));
  if (take === 0) return [] as ArticleLinkTarget[];

  const where =
    options.contentLine === "buying"
      ? {
          status: "approved",
          OR: [{ categoryHref: { startsWith: "/brands/buying" } }, { subHref: { startsWith: "/brands/buying" } }],
        }
      : {
          status: "approved",
          OR: [{ categoryHref: { startsWith: "/news" } }, { subHref: { startsWith: "/news" } }],
        };

  const rows = await prisma.article.findMany({
    where,
    orderBy: [{ publishedAt: "desc" }, { updatedAt: "desc" }],
    take: 24,
    select: {
      id: true,
      title: true,
      slug: true,
      keywords: true,
      manualKeywords: true,
    },
  });

  const keyword = options.keyword.trim();
  return rows
    .filter((row) => {
      const keywordSource = `${row.manualKeywords || ""},${row.keywords || ""},${row.title || ""}`;
      return keyword ? keywordSource.includes(keyword) : true;
    })
    .slice(0, take)
    .map((row) => ({
      title: row.title,
      href: buildCanonicalNewsHref(row),
      anchorText: row.title,
    }));
}

async function resolveNewsPath(pathname: string) {
  const segment = decodeURIComponent(pathname.replace(/^\/news\//, "").trim());
  if (!segment) return null;
  return findNewsArticleBySegment(segment);
}

async function resolveDictionaryPath(pathname: string) {
  if (STATIC_INTERNAL_PATHS.has(pathname)) return true;
  const slug = decodeURIComponent(pathname.replace(/^\/dictionary\//, "").trim());
  if (!slug) return false;

  const [term, article] = await Promise.all([
    prisma.term.findUnique({ where: { slug }, select: { slug: true } }).catch(() => null),
    prisma.article.findFirst({
      where: {
        status: "approved",
        slug,
        OR: [{ categoryHref: { startsWith: "/dictionary" } }, { subHref: { startsWith: "/dictionary" } }],
      },
      select: { id: true },
    }).catch(() => null),
  ]);

  return Boolean(term || article);
}

export async function isResolvableInternalPath(pathname: string) {
  const path = pathname.trim();
  if (!path.startsWith("/")) return false;
  if (STATIC_INTERNAL_PATHS.has(path)) return true;

  if (/^\/news\/[^/]+$/i.test(path)) {
    return Boolean(await resolveNewsPath(path));
  }

  if (/^\/keyword\/[^/]+$/i.test(path)) {
    const keyword = decodeURIComponent(path.replace(/^\/keyword\//, "").trim());
    return isValidKeywordCandidate(keyword);
  }

  if (/^\/dictionary\/[^/]+$/i.test(path)) {
    return resolveDictionaryPath(path);
  }

  if (/^\/standards\/[^/]+$/i.test(path)) {
    const value = decodeURIComponent(path.replace(/^\/standards\//, "").trim());
    if (!value) return false;
    const [standard, article] = await Promise.all([
      prisma.standard.findUnique({ where: { id: value }, select: { id: true } }).catch(() => null),
      prisma.article.findFirst({
        where: {
          status: "approved",
          slug: value,
          OR: [{ categoryHref: { startsWith: "/standards" } }, { subHref: { startsWith: "/standards" } }],
        },
        select: { id: true },
      }).catch(() => null),
    ]);
    return Boolean(standard || article);
  }

  if (/^\/brands\/buying\/[^/]+$/i.test(path)) {
    const segment = decodeURIComponent(path.replace(/^\/brands\/buying\//, "").trim());
    if (!segment) return false;
    const row = await prisma.article.findFirst({
      where: {
        status: "approved",
        OR: [{ slug: segment }, { id: segment }],
        AND: [{ OR: [{ categoryHref: { startsWith: "/brands/buying" } }, { subHref: { startsWith: "/brands/buying" } }] }],
      },
      select: { id: true },
    }).catch(() => null);
    return Boolean(row);
  }

  if (/^\/brands\/[^/]+$/i.test(path)) {
    const slug = decodeURIComponent(path.replace(/^\/brands\//, "").trim());
    if (!slug) return false;
    const row = await prisma.brand.findUnique({ where: { slug }, select: { id: true } }).catch(() => null);
    return Boolean(row);
  }

  return false;
}

export async function validateInternalLinks(input: { html?: string | null; keywordCsv?: string | null }) {
  const hrefs = input.html ? extractInternalHrefs(input.html) : [];
  const broken: BrokenInternalLink[] = [];

  for (const href of hrefs) {
    const isOk = await isResolvableInternalPath(href);
    if (!isOk) {
      broken.push({ href, reason: "unresolvable_internal_path" });
    }
  }

  const keywordValues = `${input.keywordCsv || ""}`
    .split(/[,\n，、]+/)
    .map((item) => item.trim())
    .filter(Boolean);

  for (const keyword of keywordValues) {
    if (!isValidKeywordCandidate(keyword)) {
      broken.push({ href: `/keyword/${encodeURIComponent(keyword)}`, reason: "invalid_keyword_route" });
    }
  }

  return {
    ok: broken.length === 0,
    broken,
  };
}

