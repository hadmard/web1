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
    "\u6574\u6728\u8bcd\u5e93",
    "\u6574\u6728\u8bcd\u5e93\u680f\u76ee\uff0c\u6c89\u6dc0\u6574\u6728\u884c\u4e1a\u672f\u8bed\u3001\u5b9a\u4e49\u4e0e\u5173\u8054\u77e5\u8bc6\uff0c\u65b9\u4fbf\u68c0\u7d22\u4e0e\u5f15\u7528\u3002"
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
          <p className="text-sm text-muted mb-2">{`\u641c\u7d22 \u201c${keyword}\u201d`}</p>
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
                    {"\u63d0\u51fa\u4fee\u6539"}
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted mb-6">{"\u672a\u627e\u5230\u5339\u914d\u8bcd\u6761\uff0c\u8bf7\u5c1d\u8bd5\u5176\u4ed6\u5173\u952e\u8bcd\u6216\u6d4f\u89c8\u4e0b\u65b9\u5b50\u680f\u76ee\u3002"}</p>
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
              <h2 className="mt-3 font-serif text-2xl sm:text-3xl font-semibold text-primary">{"\u6574\u6728\u884c\u4e1a\u77e5\u8bc6\u8bcd\u5e93"}</h2>
              <p className="mt-3 text-sm leading-7 text-muted">
                {"\u9762\u5411\u6574\u6728\u672f\u8bed\u3001\u6982\u5ff5\u3001\u5206\u7c7b\u4e0e\u5de5\u827a\u8bed\u5883\u7684\u957f\u671f\u77e5\u8bc6\u6c89\u6dc0\u533a\uff0c\u652f\u6301\u6295\u7a3f\u3001\u8865\u5145\u5efa\u8bae\u4e0e\u5ba1\u6838\u534f\u4f5c\uff0c\u9605\u8bfb\u4f53\u9a8c\u66f4\u63a5\u8fd1\u767e\u79d1\u6587\u6863\u800c\u975e\u666e\u901a\u6587\u7ae0\u3002"}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Link
                href="/membership/content/publish?tab=terms"
                className="interactive-lift rounded-full bg-[var(--color-accent)] px-4 py-2 text-sm font-medium text-white hover:brightness-105"
              >
                {"\u521b\u5efa\u8bcd\u6761"}
              </Link>
              <Link
                href="/dictionary/all"
                className="rounded-full border border-border px-4 py-2 text-sm text-primary hover:border-accent/40 hover:text-accent"
              >
                {"\u8fdb\u5165\u603b\u89c8"}
              </Link>
            </div>
          </div>
        </section>
        <section className="glass-panel p-5 sm:p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="section-label text-primary">{"\u70ed\u641c\u8bcd\u6761"}</h2>
            <Link
              href="/membership/content/publish?tab=terms"
              className="interactive-lift rounded-lg bg-[var(--color-accent)] text-white px-4 py-2 text-sm font-medium hover:brightness-105"
            >
              {"\u521b\u5efa\u8bcd\u6761"}
            </Link>
          </div>
          {hotTerms.length === 0 ? (
            <p className="mt-4 text-sm text-muted">{"\u6682\u65e0\u70ed\u641c\u8bcd\u6761\u3002"}</p>
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
