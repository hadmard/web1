import type { Metadata } from "next";
import { CategoryHome } from "@/components/CategoryHome";
import { PublishedContentPanel } from "@/components/PublishedContentPanel";
import { getCategoryWithMetaByHref } from "@/lib/categories";
import { buildCategoryMetadata } from "@/lib/category-metadata";
import { articleOrderByPinnedLatest } from "@/lib/articles";
import { prisma } from "@/lib/prisma";

export const revalidate = 300;

export async function generateMetadata(): Promise<Metadata> {
  return buildCategoryMetadata(
    "/brands",
    "整木市场",
    "整木市场栏目，涵盖整木品牌与整木选购 FAQ，帮助用户完成品牌选择与采购决策。"
  );
}

export default async function BrandsPage() {
  const [category, brands] = await Promise.all([
    getCategoryWithMetaByHref("/brands"),
    prisma.article.findMany({
      where: {
        status: "approved",
        OR: [{ categoryHref: { startsWith: "/brands" } }, { subHref: { startsWith: "/brands" } }],
      },
      orderBy: articleOrderByPinnedLatest,
      take: 8,
      select: { id: true, title: true, slug: true, publishedAt: true, updatedAt: true },
    }),
  ]);

  return (
    <CategoryHome basePath="/brands" category={category} searchHref="/brands/all">
      <PublishedContentPanel
        sectionTitle="品牌发布内容"
        items={brands.map((item) => ({
          id: item.id,
          title: item.title,
          href: `/brands/${item.slug}`,
          meta: `发布时间：${(item.publishedAt ?? item.updatedAt).toLocaleDateString("zh-CN")}`,
        }))}
        categoryHref="/brands/all"
      />
    </CategoryHome>
  );
}

