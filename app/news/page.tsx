import type { Metadata } from "next";
import { CategoryHome } from "@/components/CategoryHome";
import { PublishedContentPanel } from "@/components/PublishedContentPanel";
import { getCategoryWithMetaByHref } from "@/lib/categories";
import { buildCategoryMetadata } from "@/lib/category-metadata";
import { articleOrderByPinnedLatest } from "@/lib/articles";
import { prisma } from "@/lib/prisma";
import { buildNewsPath } from "@/lib/share-config";
import { decodeEscapedUnicode } from "@/lib/text";

export const revalidate = 300;

export async function generateMetadata(): Promise<Metadata> {
  return buildCategoryMetadata(
    "/news",
    "\u6574\u6728\u8d44\u8baf",
    "\u6574\u6728\u8d44\u8baf\u680f\u76ee\uff0c\u805a\u5408\u884c\u4e1a\u8d8b\u52bf\u3001\u4f01\u4e1a\u52a8\u6001\u3001\u6280\u672f\u53d1\u5c55\u4e0e\u884c\u4e1a\u6d3b\u52a8\u4fe1\u606f\u3002",
    "/api/og/news-default"
  );
}

export default async function NewsPage() {
  const category = await getCategoryWithMetaByHref("/news");
  const subcategories = category?.subcategories ?? [];

  const [articles, subcategoryRows] = await Promise.all([
    prisma.article.findMany({
      where: {
        status: "approved",
        OR: [{ categoryHref: { startsWith: "/news" } }, { subHref: { startsWith: "/news" } }],
      },
      orderBy: articleOrderByPinnedLatest,
      take: 8,
      select: { id: true, title: true, slug: true, publishedAt: true, updatedAt: true },
    }),
    Promise.all(
      subcategories.map((sub) =>
        prisma.article.findMany({
          where: {
            status: "approved",
            OR: [{ subHref: sub.href }, { categoryHref: sub.href }],
          },
          orderBy: articleOrderByPinnedLatest,
          take: 3,
          select: { id: true, title: true, slug: true },
        })
      )
    ),
  ]);

  const subcategoryLatest = subcategories.reduce<Record<string, Array<{ title: string; href: string }>>>((acc, sub, idx) => {
    acc[sub.href] = (subcategoryRows[idx] ?? []).map((item) => ({
      title: decodeEscapedUnicode(item.title),
      href: buildNewsPath(item.id),
    }));
    return acc;
  }, {});

  return (
    <CategoryHome
      basePath="/news"
      category={category}
      variant="editorial"
      searchHref="/news/all"
      subcategoryLatest={subcategoryLatest}
    >
      <PublishedContentPanel
        sectionTitle="\u8d44\u8baf\u901f\u89c8"
        sectionDesc="\u6309\u53d1\u5e03\u65f6\u95f4\u4e0e\u4f18\u5148\u7ea7\u6574\u7406\u6700\u65b0\u8d44\u8baf\uff0c\u65b9\u4fbf\u5feb\u901f\u6d4f\u89c8\u5f53\u4e0b\u503c\u5f97\u5173\u6ce8\u7684\u884c\u4e1a\u5185\u5bb9\u3002"
        items={articles.map((x) => ({
          id: x.id,
          title: decodeEscapedUnicode(x.title),
          href: buildNewsPath(x.id),
          meta: `\u53d1\u5e03\u65f6\u95f4\uff1a${(x.publishedAt ?? x.updatedAt).toLocaleDateString("zh-CN")}`,
        }))}
        categoryHref="/news/all"
        variant="editorial"
      />
    </CategoryHome>
  );
}
