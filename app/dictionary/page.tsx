import Link from "next/link";
import { CategoryHome } from "@/components/CategoryHome";
import { PublishedContentPanel } from "@/components/PublishedContentPanel";
import { getCategoryWithMetaByHref } from "@/lib/categories";
import { prisma } from "@/lib/prisma";
export const revalidate = 300;


type Props = { searchParams: Promise<{ q?: string }> };

export default async function DictionaryPage({ searchParams }: Props) {
  const { q } = await searchParams;
  const [category, latestTerms] = await Promise.all([
    getCategoryWithMetaByHref("/dictionary"),
    prisma.article.findMany({
      where: {
        status: "approved",
        OR: [{ categoryHref: { startsWith: "/dictionary" } }, { subHref: { startsWith: "/dictionary" } }],
      },
      orderBy: { updatedAt: "desc" },
      take: 8,
      select: { id: true, slug: true, title: true, updatedAt: true },
    }),
  ]);
  let searchTerms: { id: string; slug: string; title: string }[] = [];
  if (q?.trim()) {
    try {
      const list = await prisma.article.findMany({
        where: {
          status: "approved",
          AND: [
            {
              OR: [{ categoryHref: { startsWith: "/dictionary" } }, { subHref: { startsWith: "/dictionary" } }],
            },
            {
              OR: [{ title: { contains: q.trim() } }, { slug: { contains: q.trim() } }, { excerpt: { contains: q.trim() } }, { content: { contains: q.trim() } }],
            },
          ],
        },
        take: 20,
        select: { id: true, slug: true, title: true },
      });
      searchTerms = list;
    } catch {
      searchTerms = [];
    }
  }

  return (
    <>
      {q?.trim() && (
        <div className="max-w-4xl mx-auto px-4 sm:px-6 pt-6">
          <p className="text-sm text-muted mb-2">搜索“{q.trim()}”</p>
          {searchTerms.length > 0 ? (
            <ul className="flex flex-wrap gap-2 mb-6">
              {searchTerms.map((t) => (
                <li key={t.slug} className="flex items-center gap-2">
                  <Link
                    href={`/dictionary/${t.slug}`}
                    className="text-sm font-medium text-accent hover:underline px-3 py-1.5 rounded border border-border hover:border-accent/50"
                  >
                    {t.title}
                  </Link>
                  <Link
                    href={`/dictionary/edit/${t.id}`}
                    className="text-xs px-2 py-1 rounded border border-border text-muted hover:text-accent hover:border-accent/40"
                  >
                    提出修改
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted mb-6">未找到匹配词条，请尝试其他关键词或浏览下方子栏目。</p>
          )}
        </div>
      )}
      <CategoryHome basePath="/dictionary" category={category}>
        <PublishedContentPanel
          sectionTitle="词库更新内容"
          sectionDesc="展示最新更新词条，支持词条独立页面与知识关联。"
          items={latestTerms.map((x) => ({
            id: x.slug,
            title: x.title,
            href: `/dictionary/${x.slug}`,
            editHref: `/dictionary/edit/${x.id}`,
            meta: `更新于 ${x.updatedAt.toLocaleDateString("zh-CN")}`,
          }))}
          categoryHref="/dictionary/all"
        />
      </CategoryHome>
    </>
  );
}


