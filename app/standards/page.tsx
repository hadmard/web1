import { CategoryHome } from "@/components/CategoryHome";
import { PublishedContentPanel } from "@/components/PublishedContentPanel";
import { getCategoryWithMetaByHref } from "@/lib/categories";
import { prisma } from "@/lib/prisma";

export default async function StandardsPage() {
  const [category, items] = await Promise.all([
    getCategoryWithMetaByHref("/standards"),
    prisma.article.findMany({
      where: {
        status: "approved",
        OR: [
          { categoryHref: { startsWith: "/standards" } },
          { subHref: { startsWith: "/standards" } },
        ],
      },
      orderBy: [{ publishedAt: "desc" }, { updatedAt: "desc" }],
      take: 8,
      select: {
        id: true,
        title: true,
        slug: true,
        subHref: true,
        versionLabel: true,
        updatedAt: true,
      },
    }),
  ]);

  const subMap = new Map(
    (category?.subcategories ?? []).map((x) => [x.href, x.label] as const)
  );

  return (
    <CategoryHome basePath="/standards" category={category}>
      <PublishedContentPanel
        sectionTitle="标准发布内容"
        sectionDesc="展示材料、工艺、服务与共建标准的最新版本。"
        items={items.map((x) => ({
          id: x.id,
          title: x.title,
          href: `/standards/${x.slug}`,
          meta: `${subMap.get(x.subHref ?? "") ?? "标准内容"}${x.versionLabel ? ` · ${x.versionLabel}` : ""} · 更新于 ${x.updatedAt.toLocaleDateString("zh-CN")}`,
        }))}
        categoryHref="/standards/all"
      />
    </CategoryHome>
  );
}
