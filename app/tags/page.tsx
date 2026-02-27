import Link from "next/link";
import { getCategories } from "@/lib/categories";
import { prisma } from "@/lib/prisma";

const TAG_TYPES = [
  { key: "industry", label: "行业标签" },
  { key: "tech", label: "技术标签" },
  { key: "style", label: "风格标签" },
  { key: "region", label: "区域标签" },
  { key: "level", label: "等级标签" },
] as const;

async function getTagsByType() {
  try {
    const all = await prisma.tag.findMany({
      orderBy: [{ type: "asc" }, { sortOrder: "asc" }, { label: "asc" }],
      select: { type: true, slug: true, label: true },
    });
    return TAG_TYPES.map((t) => ({
      ...t,
      tags: all.filter((tag) => tag.type === t.key),
    }));
  } catch {
    return TAG_TYPES.map((t) => ({ ...t, tags: [] }));
  }
}

export const metadata = {
  title: "标签",
  description: "中华整木网内容标签：行业、技术、风格、区域、等级。",
};

export default async function TagsPage() {
  const [types, categories] = await Promise.all([getTagsByType(), getCategories()]);
  const categoryList = categories.filter((c) => c.href !== "/membership");

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-12">
      <nav className="mb-6" aria-label="面包屑">
        <Link href="/" className="text-sm text-muted hover:text-accent">首页</Link>
        <span className="text-muted mx-2">/</span>
        <span className="text-primary font-medium">标签</span>
      </nav>
      <h1 className="font-serif text-2xl font-bold text-primary mb-2">全站标签</h1>
      <p className="text-sm text-muted mb-8">按类型浏览内容标签，可访问、可分页、可被搜索引擎抓取。</p>

      <div className="space-y-8">
        {Array.isArray(types) && types.length > 0 ? (
          types.map((t: { key: string; label: string; tags: { slug: string; label: string }[] }) => (
            <section key={t.key}>
              <h2 className="text-lg font-semibold text-primary mb-3">{t.label}</h2>
              {t.tags?.length > 0 ? (
                <ul className="flex flex-wrap gap-2">
                  {t.tags.map((tag) => (
                    <li key={tag.slug}>
                      <Link
                        href={`/tags/${t.key}/${tag.slug}`}
                        className="inline-flex rounded-lg border border-border bg-surface-elevated px-3 py-1.5 text-sm text-primary hover:border-accent/50 hover:text-accent"
                      >
                        {tag.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-muted">暂无标签</p>
              )}
            </section>
          ))
        ) : (
          <p className="text-muted">暂无标签数据。</p>
        )}
      </div>

      <section className="mt-12 pt-8 border-t border-border">
        <h2 className="text-lg font-semibold text-primary mb-3">栏目入口</h2>
        <ul className="flex flex-wrap gap-2">
          {categoryList.map((c) => (
            <li key={c.href}>
              <Link href={c.href} className="text-sm font-medium text-accent hover:underline">
                {c.title}
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
