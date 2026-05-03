import type { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { buildBuyingPath } from "@/lib/share-config";
import { PUBLIC_SITE_URL } from "@/lib/public-site-config";

const BUYING_SUMMARY_TITLE_PREFIX =
  "\u6574\u6728\u5b9a\u5236\u9009\u8d2d\u5e38\u89c1\u95ee\u9898\u6c47\u603b";
export const BUYING_SUMMARY_TITLE =
  "\u6574\u6728\u5b9a\u5236\u9009\u8d2d\u5e38\u89c1\u95ee\u9898\u6c47\u603b\uff1a\u4ef7\u683c\u3001\u6d41\u7a0b\u3001\u5468\u671f\u548c\u9884\u7b97\u6307\u5357";
export const BUYING_SUMMARY_SLUG =
  "zheng-mu-ding-zhi-xuan-gou-chang-jian-wen-ti-hui-zong-jia-ge-liu-cheng-zhou-qi-h";

function buildBuyingSectionWhere(): Prisma.ArticleWhereInput {
  return {
    OR: [{ categoryHref: { startsWith: "/brands/buying" } }, { subHref: { startsWith: "/brands/buying" } }],
  };
}

export type BuyingSummaryArticle = {
  id: string;
  title: string;
  slug: string;
  content?: string;
  publishedAt?: Date | null;
  createdAt?: Date;
};

export function isBuyingSummaryArticle(article: { slug?: string | null; title?: string | null }) {
  const slug = article.slug?.trim().toLowerCase() ?? "";
  const title = article.title?.trim() ?? "";

  if (slug === BUYING_SUMMARY_SLUG) {
    return true;
  }

  return title.includes(BUYING_SUMMARY_TITLE_PREFIX);
}

export async function findBuyingSummaryArticle() {
  const exact = await prisma.article.findFirst({
    where: {
      status: "approved",
      publishedAt: { not: null },
      ...buildBuyingSectionWhere(),
      slug: BUYING_SUMMARY_SLUG,
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
    return exact satisfies BuyingSummaryArticle;
  }

  const fallback = await prisma.article.findFirst({
    where: {
      status: "approved",
      publishedAt: { not: null },
      ...buildBuyingSectionWhere(),
      title: { contains: BUYING_SUMMARY_TITLE_PREFIX },
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

  return fallback satisfies BuyingSummaryArticle | null;
}

export async function getBuyingSummaryRelatedArticles(excludeId: string, limit = 50) {
  const items = await prisma.article.findMany({
    where: {
      status: "approved",
      publishedAt: { not: null },
      ...buildBuyingSectionWhere(),
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

  return items.filter((item) => !isBuyingSummaryArticle(item));
}

export function hasBuyingArticleLink(html: string | null | undefined, slug: string) {
  const source = html ?? "";
  const trimmedSlug = slug.trim();
  if (!source || !trimmedSlug) {
    return false;
  }

  const encodedPath = buildBuyingPath(trimmedSlug);
  const decodedPath = `/brands/buying/${trimmedSlug}`;
  const absoluteUrl = `${PUBLIC_SITE_URL}${encodedPath}`;
  const escapedCandidates = [trimmedSlug, encodedPath, decodedPath, absoluteUrl].map((candidate) =>
    candidate.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
  );

  return escapedCandidates.some((candidate) => new RegExp(candidate, "i").test(source));
}

export function hasBuyingSummaryLink(html: string | null | undefined, summarySlug: string) {
  return hasBuyingArticleLink(html, summarySlug);
}

export async function revalidateBuyingArticlePaths(article: {
  id?: string | null;
  slug?: string | null;
  title?: string | null;
}) {
  const segment = (article.slug || article.title || "").trim();

  revalidatePath("/brands");
  revalidatePath("/brands/buying");
  revalidatePath("/sitemap.xml");

  if (article.id) {
    revalidatePath(buildBuyingPath(article.id));
  }
  if (segment) {
    revalidatePath(buildBuyingPath(segment));
  }

  revalidatePath(buildBuyingPath(BUYING_SUMMARY_SLUG));

  const summaryArticle = await findBuyingSummaryArticle();
  if (summaryArticle?.slug && summaryArticle.slug !== BUYING_SUMMARY_SLUG) {
    revalidatePath(buildBuyingPath(summaryArticle.slug));
  }
}
