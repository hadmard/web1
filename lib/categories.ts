import { prisma } from "@/lib/prisma";
import { categories as staticCategories, getCategoryByHref } from "@/lib/site-structure";
import type { Category } from "@/lib/site-structure";

/**
 * 从数据库读取大类与小类（含 groupLabel）。
 * 若数据库无数据则回退到静态配置。
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
    return rows.map((c) => ({
      href: c.href,
      title: c.title,
      desc: c.desc ?? "",
      subcategories: c.subcategories.map((s) => ({
        href: s.href,
        label: s.label,
        groupLabel: s.groupLabel ?? undefined,
      })),
    }));
  } catch {
    return staticCategories;
  }
}

export async function getCategoryByHrefFromDb(href: string): Promise<Category | undefined> {
  const list = await getCategories();
  return list.find((c) => href === c.href || href.startsWith(c.href + "/"));
}

/**
 * 栏目首页用：拉取单栏目完整信息（定义、版本、FAQ、相关词条、子栏目含分组）
 */
export async function getCategoryWithMetaByHref(href: string): Promise<Category | undefined> {
  try {
    const basePath = "/" + (href.split("/").filter(Boolean)[0] ?? "");
    const row = await prisma.category.findFirst({
      where: { href: basePath },
      include: {
        subcategories: { orderBy: { sortOrder: "asc" } },
        faqs: { orderBy: { sortOrder: "asc" } },
      },
    });
    if (!row) return getCategoryByHref(href) ?? undefined;
    let relatedTermSlugs: string[] = [];
    if (row.relatedTermSlugs) {
      try {
        relatedTermSlugs = JSON.parse(row.relatedTermSlugs) as string[];
      } catch {
        relatedTermSlugs = row.relatedTermSlugs.split(",").map((s) => s.trim()).filter(Boolean);
      }
    }
    return {
      href: row.href,
      title: row.title,
      desc: row.desc ?? "",
      definitionText: row.definitionText ?? undefined,
      versionLabel: row.versionLabel ?? undefined,
      versionYear: row.versionYear ?? undefined,
      relatedTermSlugs: relatedTermSlugs.length ? relatedTermSlugs : undefined,
      faqs: row.faqs.length ? row.faqs.map((f) => ({ question: f.question, answer: f.answer })) : undefined,
      subcategories: row.subcategories.map((s) => ({
        href: s.href,
        label: s.label,
        groupLabel: s.groupLabel ?? undefined,
      })),
    };
  } catch {
    return getCategoryByHref(href) ?? undefined;
  }
}
