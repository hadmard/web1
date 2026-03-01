import type { Metadata } from "next";
import { CategoryHome } from "@/components/CategoryHome";
import { PublishedContentPanel } from "@/components/PublishedContentPanel";
import { getCategoryWithMetaByHref } from "@/lib/categories";
import { buildCategoryMetadata } from "@/lib/category-metadata";
import { prisma } from "@/lib/prisma";

export const revalidate = 300;

export async function generateMetadata(): Promise<Metadata> {
  return buildCategoryMetadata(
    "/brands",
    "整木市场",
    "整木市场栏目，涵盖整木品牌对比与整木选购 FAQ，帮助用户完成品牌选择与采购决策。"
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
      orderBy: [{ publishedAt: "desc" }, { updatedAt: "desc" }],
      take: 8,
      select: { id: true, title: true, slug: true, publishedAt: true, updatedAt: true },
    }),
  ]);

  return (
    <CategoryHome basePath="/brands" category={category}>
      <PublishedContentPanel
        sectionTitle="品牌发布内容"
        sectionDesc="展示已发布的整木品牌内容，支持从栏目页继续进入品牌总览与详情。"
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

