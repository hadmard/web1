import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { buildNewsPath } from "@/lib/share-config";
import { PUBLIC_SITE_URL } from "@/lib/public-site-config";

const NEWS_TRENDS_HREF = "/news/trends";
const NEWS_TRENDS_SUMMARY_TITLE_PREFIX = "整木行业趋势观察";
export const NEWS_TRENDS_SUMMARY_TITLE = "整木行业趋势观察：市场变化、消费升级与门店转型";
export const NEWS_TRENDS_SUMMARY_SLUG =
  "zheng-mu-hang-ye-qu-shi-guan-cha-shi-chang-bian-hua-xiao-fei-sheng-ji-yu-men-dia";

function buildNewsTrendsWhere(): Prisma.ArticleWhereInput {
  return {
    OR: [{ categoryHref: NEWS_TRENDS_HREF }, { subHref: NEWS_TRENDS_HREF }],
  };
}

export function isNewsTrendsArticle(article: { categoryHref?: string | null; subHref?: string | null }) {
  return article.categoryHref === NEWS_TRENDS_HREF || article.subHref === NEWS_TRENDS_HREF;
}

export function isNewsTrendsSummaryArticle(article: { slug?: string | null; title?: string | null }) {
  const slug = article.slug?.trim().toLowerCase() ?? "";
  const title = article.title?.trim() ?? "";

  if (slug === NEWS_TRENDS_SUMMARY_SLUG) {
    return true;
  }

  return title === NEWS_TRENDS_SUMMARY_TITLE || title.includes(NEWS_TRENDS_SUMMARY_TITLE_PREFIX);
}

export async function findNewsTrendsSummaryArticle() {
  const exact = await prisma.article.findFirst({
    where: {
      status: "approved",
      publishedAt: { not: null },
      OR: [{ slug: NEWS_TRENDS_SUMMARY_SLUG }, { title: NEWS_TRENDS_SUMMARY_TITLE }],
    },
    orderBy: [{ publishedAt: "desc" }, { createdAt: "desc" }],
    select: {
      id: true,
      title: true,
      slug: true,
      content: true,
      publishedAt: true,
      createdAt: true,
    },
  });

  if (exact) {
    return exact;
  }

  return prisma.article.findFirst({
    where: {
      status: "approved",
      publishedAt: { not: null },
      OR: [
        { slug: NEWS_TRENDS_SUMMARY_SLUG },
        { title: { contains: NEWS_TRENDS_SUMMARY_TITLE_PREFIX } },
      ],
    },
    orderBy: [{ publishedAt: "desc" }, { createdAt: "desc" }],
    select: {
      id: true,
      title: true,
      slug: true,
      content: true,
      publishedAt: true,
      createdAt: true,
    },
  });
}

export async function getNewsTrendsSummaryRelatedArticles(excludeId: string, limit = 50) {
  const items = await prisma.article.findMany({
    where: {
      status: "approved",
      publishedAt: { not: null },
      ...buildNewsTrendsWhere(),
      id: { not: excludeId },
    },
    orderBy: [{ publishedAt: "desc" }, { createdAt: "desc" }],
    take: Math.max(1, Math.min(limit, 50)),
    select: {
      id: true,
      title: true,
      slug: true,
      publishedAt: true,
      createdAt: true,
    },
  });

  return items.filter((item) => !isNewsTrendsSummaryArticle(item));
}

export function hasNewsTrendsArticleLink(html: string | null | undefined, slug: string) {
  const source = html ?? "";
  const trimmedSlug = slug.trim();
  if (!source || !trimmedSlug) {
    return false;
  }

  const encodedPath = buildNewsPath(trimmedSlug);
  const decodedPath = `/news/${trimmedSlug}`;
  const absoluteUrl = `${PUBLIC_SITE_URL}${encodedPath}`;
  const escapedCandidates = [trimmedSlug, encodedPath, decodedPath, absoluteUrl].map((candidate) =>
    candidate.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
  );

  return escapedCandidates.some((candidate) => new RegExp(candidate, "i").test(source));
}

export function hasNewsTrendsSummaryLink(html: string | null | undefined, summarySlug: string) {
  return hasNewsTrendsArticleLink(html, summarySlug);
}
