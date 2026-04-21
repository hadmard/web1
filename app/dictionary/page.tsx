import type { Metadata } from "next";
import Link from "next/link";
import { CategoryHome } from "@/components/CategoryHome";
import { getCategoryWithMetaByHref } from "@/lib/categories";
import { buildCategoryMetadata } from "@/lib/category-metadata";
import { articleOrderByPinnedLatest, articleOrderByPinnedPopular } from "@/lib/articles";
import { prisma } from "@/lib/prisma";
import { decodeEscapedUnicode } from "@/lib/text";

export const revalidate = 300;
type Props = { searchParams: Promise<{ q?: string }> };

export async function generateMetadata(): Promise<Metadata> {
  return buildCategoryMetadata(
    "/dictionary",
    "整木词库",
    "整木词库栏目，沉淀整木行业术语、定义与关联知识，方便检索与引用。"
  );
}

export default async function DictionaryPage({ searchParams }: Props) {
  const { q = "" } = await searchParams;
  const keyword = q.trim();
  const category = await getCategoryWithMetaByHref("/dictionary");
  const subcategories = category?.subcategories ?? [];

  const [hotTerms, subcategoryRows, searchTerms] = await Promise.all([
    prisma.article.findMany({
      where: {
        status: "approved",
        OR: [{ categoryHref: { startsWith: "/dictionary" } }, { subHref: { startsWith: "/dictionary" } }],
      },
      orderBy: articleOrderByPinnedPopular,
      take: 10,
      select: { id: true, slug: true, title: true },
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
          select: { id: true, slug: true, title: true },
        })
      )
    ),
    keyword
      ? prisma.article.findMany({
          where: {
            status: "approved",
            AND: [
              {
                OR: [{ categoryHref: { startsWith: "/dictionary" } }, { subHref: { startsWith: "/dictionary" } }],
              },
              {
                OR: [{ title: { contains: keyword } }, { slug: { contains: keyword } }, { excerpt: { contains: keyword } }, { content: { contains: keyword } }],
              },
            ],
          },
          take: 20,
          select: { id: true, slug: true, title: true },
        })
      : Promise.resolve([]),
  ]);

  const subcategoryLatest = subcategories.reduce<Record<string, Array<{ title: string; href: string }>>>((acc, sub, idx) => {
    acc[sub.href] = (subcategoryRows[idx] ?? []).map((item) => ({
      title: decodeEscapedUnicode(item.title),
      href: `/dictionary/${item.slug}`,
    }));
    return acc;
  }, {});

  return (
    <>
      {keyword && (
        <div className="max-w-4xl mx-auto px-4 sm:px-6 pt-6">
          <p className="text-sm text-muted mb-2">{`搜索 “${keyword}”`}</p>
          {searchTerms.length > 0 ? (
            <ul className="flex flex-wrap gap-2 mb-6">
              {searchTerms.map((t) => (
                <li key={t.slug} className="flex items-center gap-2">
                  <Link
                    href={`/dictionary/${t.slug}`}
                    className="text-sm font-medium text-accent hover:underline px-3 py-1.5 rounded border border-border hover:border-accent/50"
                  >
                    {decodeEscapedUnicode(t.title)}
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
      <CategoryHome
        basePath="/dictionary"
        category={category}
        searchHref="/dictionary/all"
        subcategoryLatest={subcategoryLatest}
      >
        <section className="glass-panel p-6 sm:p-7">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="max-w-3xl">
              <p className="text-xs uppercase tracking-[0.24em] text-muted">Whole Wood Wiki</p>
              <h2 className="mt-3 font-serif text-2xl sm:text-3xl font-semibold text-primary">整木行业知识词库</h2>
              <p className="mt-3 text-sm leading-7 text-muted">
                面向整木术语、概念、分类与工艺语境的长期知识沉淀区，支持投稿、补充建议与审核协作，阅读体验更接近百科文档而非普通文章。
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Link
                href="/membership/content/publish?tab=terms"
                className="interactive-lift rounded-full bg-[var(--color-accent)] px-4 py-2 text-sm font-medium text-white hover:brightness-105"
              >
                创建词条
              </Link>
              <Link
                href="/dictionary/all"
                className="rounded-full border border-border px-4 py-2 text-sm text-primary hover:border-accent/40 hover:text-accent"
              >
                进入总览
              </Link>
            </div>
          </div>
        </section>
        <section className="glass-panel p-5 sm:p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="section-label text-primary">热搜词条</h2>
            <Link
              href="/membership/content/publish?tab=terms"
              className="interactive-lift rounded-lg bg-[var(--color-accent)] text-white px-4 py-2 text-sm font-medium hover:brightness-105"
            >
              创建词条
            </Link>
          </div>
          {hotTerms.length === 0 ? (
            <p className="mt-4 text-sm text-muted">暂无热搜词条。</p>
          ) : (
            <ul className="mt-4 grid sm:grid-cols-2 lg:grid-cols-3 gap-2">
              {hotTerms.map((item, idx) => (
                <li key={item.id}>
                  <Link
                    href={`/dictionary/${item.slug}`}
                    className="block rounded-lg border border-border bg-surface px-3 py-2 text-sm text-primary hover:border-accent/45 hover:text-accent"
                  >
                    <span className="mr-2 text-accent font-semibold">{idx + 1}.</span>
                    {decodeEscapedUnicode(item.title)}
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      </CategoryHome>
    </>
  );
}
