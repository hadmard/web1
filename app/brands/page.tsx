import { CategoryHome } from "@/components/CategoryHome";
import { PublishedContentPanel } from "@/components/PublishedContentPanel";
import { getCategoryWithMetaByHref } from "@/lib/categories";
import { prisma } from "@/lib/prisma";

export const revalidate = 300;

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
    <CategoryHome basePath="/brands" category={category} hideSubcategories>
      <PublishedContentPanel
        sectionTitle="品牌发布内容"
        sectionDesc="展示已发布的整木品牌资讯与品牌档案内容。"
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
