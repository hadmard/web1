import { prisma } from "@/lib/prisma";

export async function getLatestPublishedArticles(limit = 6) {
  return prisma.article.findMany({
    where: {
      status: "approved",
      publishedAt: { not: null },
    },
    orderBy: [{ publishedAt: "desc" }, { updatedAt: "desc" }],
    take: Math.max(1, Math.min(limit, 20)),
    select: {
      id: true,
      title: true,
      slug: true,
      excerpt: true,
      publishedAt: true,
      updatedAt: true,
      subHref: true,
    },
  });
}
