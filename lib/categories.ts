import { prisma } from "@/lib/prisma";
import { categories as staticCategories, getCategoryByHref } from "@/lib/site-structure";
import type { Category } from "@/lib/site-structure";

const LEGACY_BRANDS_TITLES = new Set(["整木市场", "整木品牌"]);
const LEGACY_BRANDS_DESCS = new Set(["品牌库与区域筛选", "整木品牌与选购问答入口"]);

function parseRelatedTermSlugs(input?: string | null): string[] {
  if (!input) return [];
  try {
    return JSON.parse(input) as string[];
  } catch {
    return input
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
  }
}

function resolveCategoryTitle(basePath: string, staticTitle: string, dbTitle?: string | null) {
  const next = dbTitle?.trim();
  if (basePath === "/brands" && (!next || LEGACY_BRANDS_TITLES.has(next))) return staticTitle;
  return next || staticTitle;
}

function resolveCategoryDesc(basePath: string, staticDesc: string, dbDesc?: string | null) {
  const next = dbDesc?.trim();
  if (basePath === "/brands" && (!next || LEGACY_BRANDS_DESCS.has(next))) return staticDesc;
  return next || staticDesc;
}

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
 * 数据库存储栏目元信息（标题/简介/定义/版本等）。
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

    const rowMap = new Map(rows.map((row) => [row.href, row]));

    return staticCategories.map((s) => {
      const row = rowMap.get(s.href);
      const relatedTermSlugs = parseRelatedTermSlugs(row?.relatedTermSlugs);
      return {
        ...s,
        title: resolveCategoryTitle(s.href, s.title, row?.title),
        desc: resolveCategoryDesc(s.href, s.desc, row?.desc),
        definitionText: row?.definitionText ?? s.definitionText,
        versionLabel: row?.versionLabel ?? s.versionLabel,
        versionYear: row?.versionYear ?? s.versionYear,
        relatedTermSlugs: relatedTermSlugs.length ? relatedTermSlugs : s.relatedTermSlugs,
        updatedAt: row?.updatedAt?.toISOString?.() ?? undefined,
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

    const relatedTermSlugs = parseRelatedTermSlugs(row.relatedTermSlugs);

    return {
      href: row.href,
      title: resolveCategoryTitle(basePath, staticCat?.title ?? row.title, row.title),
      desc: resolveCategoryDesc(basePath, staticCat?.desc ?? row.desc ?? "", row.desc),
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

