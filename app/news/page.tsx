import type { Metadata } from "next";
import { CategoryHome } from "@/components/CategoryHome";
import { PublishedContentPanel } from "@/components/PublishedContentPanel";
import { getCategoryWithMetaByHref } from "@/lib/categories";
import { buildCategoryMetadata } from "@/lib/category-metadata";
import { prisma } from "@/lib/prisma";

export const revalidate = 300;

export async function generateMetadata(): Promise<Metadata> {
  return buildCategoryMetadata(
    "/news",
    "整木资讯",
    "整木资讯栏目，聚合行业趋势、企业动态、技术发展与行业活动信息。"
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
      orderBy: [{ publishedAt: "desc" }, { updatedAt: "desc" }],
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
          orderBy: [{ publishedAt: "desc" }, { updatedAt: "desc" }],
          take: 3,
          select: { id: true, title: true, slug: true },
        })
      )
    ),
  ]);

  const subcategoryLatest = subcategories.reduce<Record<string, Array<{ title: string; href: string }>>>((acc, sub, idx) => {
    acc[sub.href] = (subcategoryRows[idx] ?? []).map((item) => ({
      title: item.title,
      href: `/news/${item.slug}`,
    }));
    return acc;
  }, {});

  return (
    <CategoryHome
      basePath="/news"
      category={category}
      searchHref="/news/all"
      subcategoryLatest={subcategoryLatest}
    >
      <PublishedContentPanel
        sectionTitle="资讯发布内容"
        items={articles.map((x) => ({
          id: x.id,
          title: x.title,
          href: `/news/${x.slug}`,
          meta: `发布时间：${(x.publishedAt ?? x.updatedAt).toLocaleDateString("zh-CN")}`,
        }))}
        categoryHref="/news/all"
      />
    </CategoryHome>
  );
}

