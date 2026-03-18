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
      <section className="glass-panel p-6 sm:p-7">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="max-w-3xl">
            <p className="text-xs uppercase tracking-[0.24em] text-muted">Whole Wood Standards</p>
            <h2 className="mt-3 font-serif text-2xl sm:text-3xl font-semibold text-primary">整木行业标准文档库</h2>
            <p className="mt-3 text-sm leading-7 text-muted">
              面向材料、工艺、服务与流程规范的长期标准沉淀区，支持版本记录、共建参与、持续更新和标准化阅读体验。
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <a
              href="/membership/content/publish?tab=standards"
              className="interactive-lift rounded-full bg-[var(--color-accent)] px-4 py-2 text-sm font-medium text-white hover:brightness-105"
            >
              创建标准
            </a>
            <a
              href="/standards/all"
              className="rounded-full border border-border px-4 py-2 text-sm text-primary hover:border-accent/40 hover:text-accent"
            >
              浏览标准库
            </a>
          </div>
        </div>
      </section>
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

