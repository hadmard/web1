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
    "/standards",
    "整木标准",
    "整木标准栏目，集中发布材料、工艺、服务等标准与版本信息。"
  );
}

export default async function StandardsPage() {
  const category = await getCategoryWithMetaByHref("/standards");
  const subcategories = category?.subcategories ?? [];
  const [items, subcategoryRows] = await Promise.all([
    prisma.article.findMany({
      where: {
        status: "approved",
        OR: [
          { categoryHref: { startsWith: "/standards" } },
          { subHref: { startsWith: "/standards" } },
        ],
      },
      orderBy: articleOrderByPinnedLatest,
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
      title: item.title,
      href: `/standards/${item.slug}`,
    }));
    return acc;
  }, {});

  const subMap = new Map(
    (category?.subcategories ?? []).map((x) => [x.href, x.label] as const)
  );

  return (
    <CategoryHome
      basePath="/standards"
      category={category}
      searchHref="/standards/all"
      subcategoryLatest={subcategoryLatest}
    >
      <PublishedContentPanel
        sectionTitle="标准发布内容"
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

