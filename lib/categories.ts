import { prisma } from "@/lib/prisma";
import { categories as staticCategories, getCategoryByHref } from "@/lib/site-structure";
import type { Category } from "@/lib/site-structure";

async function getLatestCategoryOperationAt(basePath: string): Promise<Date | null> {
  if (basePath === "/news") {
    const row = await prisma.article.findFirst({
      where: {
        OR: [{ categoryHref: { startsWith: "/news" } }, { subHref: { startsWith: "/news" } }],
      },
      orderBy: { updatedAt: "desc" },
      select: { updatedAt: true },
    });
    return row?.updatedAt ?? null;
  }

  if (basePath === "/brands") {
    const row = await prisma.article.findFirst({
      where: {
        status: "approved",
        OR: [{ categoryHref: { startsWith: "/brands" } }, { subHref: { startsWith: "/brands" } }],
      },
      orderBy: { updatedAt: "desc" },
      select: { updatedAt: true },
    });
    return row?.updatedAt ?? null;
  }

  if (basePath === "/dictionary") {
    const row = await prisma.term.findFirst({ orderBy: { updatedAt: "desc" }, select: { updatedAt: true } });
    return row?.updatedAt ?? null;
  }

  if (basePath === "/standards") {
    const row = await prisma.article.findFirst({
      where: {
        status: "approved",
        OR: [{ categoryHref: { startsWith: "/standards" } }, { subHref: { startsWith: "/standards" } }],
      },
      orderBy: { updatedAt: "desc" },
      select: { updatedAt: true },
    });
    return row?.updatedAt ?? null;
  }

  if (basePath === "/awards") {
    const row = await prisma.award.findFirst({ orderBy: { updatedAt: "desc" }, select: { updatedAt: true } });
    return row?.updatedAt ?? null;
  }

  return null;
}

/**
 * 分类结构以静态配置为准（用于顶部导航、栏目页、悬停菜单），
 * 数据库存储栏目元信息（定义/版本等）。
 */
export async function getCategories(): Promise<Category[]> {
  try {
    const rows = await prisma.category.findMany({
      orderBy: { sortOrder: "asc" },
      include: {
        subcategories: { orderBy: { sortOrder: "asc" } },
      },
    });

    if (rows.length === 0) return staticCategories;

    return staticCategories.map((s) => {
      return {
        ...s,
        // Keep frontend taxonomy aligned with static config for nav/hover consistency.
        desc: s.desc,
      };
    });
  } catch {
    return staticCategories;
  }
}

export async function getCategoryByHrefFromDb(href: string): Promise<Category | undefined> {
  const list = await getCategories();
  return list.find((c) => href === c.href || href.startsWith(c.href + "/"));
}

export async function getCategoryWithMetaByHref(href: string): Promise<Category | undefined> {
  try {
    const basePath = "/" + (href.split("/").filter(Boolean)[0] ?? "");
    const staticCat = getCategoryByHref(basePath);

    const row = await prisma.category.findFirst({
      where: { href: basePath },
      include: {
        subcategories: { orderBy: { sortOrder: "asc" } },
      },
    });

    if (!row) return staticCat ?? undefined;

    const latestOperationAt = await getLatestCategoryOperationAt(basePath);
    const latestAt =
      latestOperationAt && latestOperationAt > row.updatedAt ? latestOperationAt : row.updatedAt;

    let relatedTermSlugs: string[] = [];
    if (row.relatedTermSlugs) {
      try {
        relatedTermSlugs = JSON.parse(row.relatedTermSlugs) as string[];
      } catch {
        relatedTermSlugs = row.relatedTermSlugs
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean);
      }
    }

    return {
      href: row.href,
      title: staticCat?.title ?? row.title,
      desc: staticCat?.desc ?? row.desc ?? "",
      definitionText: row.definitionText ?? undefined,
      versionLabel: row.versionLabel ?? undefined,
      versionYear: row.versionYear ?? undefined,
      relatedTermSlugs: relatedTermSlugs.length ? relatedTermSlugs : undefined,
      subcategories:
        staticCat?.subcategories ??
        row.subcategories.map((s) => ({
          href: s.href,
          label: s.label,
          groupLabel: s.groupLabel ?? undefined,
        })),
      updatedAt: latestAt?.toISOString?.() ?? undefined,
    };
  } catch {
    return getCategoryByHref(href) ?? undefined;
  }
}
