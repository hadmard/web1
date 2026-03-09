import Link from "next/link";
import type { Metadata } from "next";
import { Prisma } from "@prisma/client";
import { StructuredSearch } from "@/components/StructuredSearch";
import { articleOrderByPinnedLatest } from "@/lib/articles";
import { prisma } from "@/lib/prisma";
import { buildNoIndexMetadata } from "@/lib/seo";

export const revalidate = 300;
export const metadata: Metadata = buildNoIndexMetadata(
  "站内搜索",
  "站内搜索结果页不参与搜索引擎收录。"
);

type Props = {
  searchParams: Promise<{
    q?: string;
  }>;
};

const T = {
  title: "\u884c\u4e1a\u641c\u7d22",
  hint: "\u8f93\u5165\u5173\u952e\u8bcd\u540e\uff0c\u7ed3\u679c\u5c06\u81ea\u52a8\u6309\u7f51\u7ad9\u5927\u7c7b\u5206\u7ec4\u5c55\u793a\u3002",
  resultTitle: "\u641c\u7d22\u7ed3\u679c",
  keywordPrefix: "\u5173\u952e\u8bcd\uff1a",
  viewAll: "\u67e5\u770b\u5168\u90e8",
  emptyExcerpt: "\u6682\u65e0\u6458\u8981",
  updatedAt: "\u66f4\u65b0\u4e8e ",
  news: "\u8d44\u8baf",
  standards: "\u6807\u51c6",
  dictionary: "\u8bcd\u5e93",
  brands: "\u54c1\u724c",
  awards: "\u8bc4\u9009",
  emptyNews: "\u6682\u65e0\u76f8\u5173\u8d44\u8baf",
  emptyStandards: "\u6682\u65e0\u76f8\u5173\u6807\u51c6",
  emptyDictionary: "\u6682\u65e0\u76f8\u5173\u8bcd\u5e93\u5185\u5bb9",
  emptyBrands: "\u6682\u65e0\u76f8\u5173\u54c1\u724c",
  emptyAwards: "\u6682\u65e0\u76f8\u5173\u8bc4\u9009\u5185\u5bb9",
};

function stripHtml(value: string | null | undefined) {
  return (value ?? "")
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function excerpt(value: string | null | undefined, max = 90) {
  const plain = stripHtml(value);
  if (!plain) return T.emptyExcerpt;
  return plain.length > max ? `${plain.slice(0, max)}...` : plain;
}

function buildArticleSearchWhere(prefix: string, keyword: string): Prisma.ArticleWhereInput {
  return {
    AND: [
      {
        status: "approved",
        OR: [{ categoryHref: { startsWith: prefix } }, { subHref: { startsWith: prefix } }],
      },
      {
        OR: [
          { title: { contains: keyword } },
          { excerpt: { contains: keyword } },
          { content: { contains: keyword } },
        ],
      },
    ],
  };
}

export default async function SearchPage({ searchParams }: Props) {
  const { q = "" } = await searchParams;
  const keyword = q.trim();

  if (!keyword) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
        <article className="glass-panel p-6 sm:p-8">
          <h1 className="font-serif text-2xl font-semibold text-primary sm:text-3xl">{T.title}</h1>
          <p className="mt-2 text-sm text-muted">{T.hint}</p>
          <div className="mt-6">
            <StructuredSearch />
          </div>
        </article>
      </div>
    );
  }

  const encodedKeyword = encodeURIComponent(keyword);
  const [news, standards, dictionary, brands, awards] = await Promise.all([
    prisma.article.findMany({
      where: buildArticleSearchWhere("/news", keyword),
      orderBy: articleOrderByPinnedLatest,
      take: 10,
      select: {
        id: true,
        title: true,
        slug: true,
        excerpt: true,
        updatedAt: true,
      },
    }),
    prisma.article.findMany({
      where: buildArticleSearchWhere("/standards", keyword),
      orderBy: articleOrderByPinnedLatest,
      take: 10,
      select: {
        id: true,
        title: true,
        slug: true,
        excerpt: true,
        updatedAt: true,
      },
    }),
    prisma.article.findMany({
      where: buildArticleSearchWhere("/dictionary", keyword),
      orderBy: articleOrderByPinnedLatest,
      take: 10,
      select: {
        id: true,
        title: true,
        slug: true,
        excerpt: true,
        updatedAt: true,
      },
    }),
    prisma.article.findMany({
      where: buildArticleSearchWhere("/brands", keyword),
      orderBy: articleOrderByPinnedLatest,
      take: 10,
      select: {
        id: true,
        title: true,
        slug: true,
        excerpt: true,
        updatedAt: true,
      },
    }),
    prisma.award.findMany({
      where: {
        OR: [{ title: { contains: keyword } }, { description: { contains: keyword } }],
      },
      orderBy: [{ year: "desc" }, { updatedAt: "desc" }],
      take: 10,
      select: {
        id: true,
        title: true,
        slug: true,
        description: true,
        updatedAt: true,
      },
    }),
  ]);

  const summary = [
    { label: T.news, value: news.length, href: `/news/all?q=${encodedKeyword}` },
    { label: T.standards, value: standards.length, href: `/standards/all?q=${encodedKeyword}` },
    { label: T.dictionary, value: dictionary.length, href: `/dictionary/all?q=${encodedKeyword}` },
    { label: T.brands, value: brands.length, href: `/brands/all?q=${encodedKeyword}` },
    { label: T.awards, value: awards.length, href: `/awards?q=${encodedKeyword}` },
  ];

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-10">
      <article className="glass-panel p-5 sm:p-6">
        <h1 className="font-serif text-2xl font-semibold text-primary sm:text-3xl">{T.resultTitle}</h1>
        <p className="mt-2 text-sm text-muted">
          {T.keywordPrefix}
          {keyword}
        </p>
        <div className="mt-4">
          <StructuredSearch />
        </div>
        <div className="mt-4 flex flex-wrap gap-2.5 text-sm">
          {summary.map((item) => (
            <Link
              key={item.label}
              href={item.href}
              className="rounded-full border border-border bg-surface-elevated px-3 py-1.5 text-primary hover:border-accent/45 hover:text-accent"
            >
              {item.label} {item.value}
            </Link>
          ))}
        </div>
      </article>

      <section className="mt-6 grid gap-4 lg:grid-cols-2">
        <article className="glass-panel p-5">
          <div className="mb-3 flex items-center justify-between gap-3">
            <h2 className="text-lg font-semibold text-primary">{T.news}</h2>
            <Link href={`/news/all?q=${encodedKeyword}`} className="text-sm text-accent hover:underline">
              {T.viewAll}
            </Link>
          </div>
          {news.length === 0 ? (
            <p className="text-sm text-muted">{T.emptyNews}</p>
          ) : (
            <ul className="space-y-3">
              {news.map((item) => (
                <li key={item.id} className="rounded-xl border border-border bg-surface-elevated p-3">
                  <Link href={`/news/${item.slug || item.id}`} className="font-medium text-primary hover:text-accent">
                    {item.title}
                  </Link>
                  <p className="mt-1 text-sm text-muted">{excerpt(item.excerpt)}</p>
                  <p className="mt-2 text-xs text-muted">
                    {T.updatedAt}
                    {item.updatedAt.toLocaleDateString("zh-CN")}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </article>

        <article className="glass-panel p-5">
          <div className="mb-3 flex items-center justify-between gap-3">
            <h2 className="text-lg font-semibold text-primary">{T.standards}</h2>
            <Link href={`/standards/all?q=${encodedKeyword}`} className="text-sm text-accent hover:underline">
              {T.viewAll}
            </Link>
          </div>
          {standards.length === 0 ? (
            <p className="text-sm text-muted">{T.emptyStandards}</p>
          ) : (
            <ul className="space-y-3">
              {standards.map((item) => (
                <li key={item.id} className="rounded-xl border border-border bg-surface-elevated p-3">
                  <Link href={`/standards/${item.slug || item.id}`} className="font-medium text-primary hover:text-accent">
                    {item.title}
                  </Link>
                  <p className="mt-1 text-sm text-muted">{excerpt(item.excerpt)}</p>
                  <p className="mt-2 text-xs text-muted">
                    {T.updatedAt}
                    {item.updatedAt.toLocaleDateString("zh-CN")}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </article>

        <article className="glass-panel p-5">
          <div className="mb-3 flex items-center justify-between gap-3">
            <h2 className="text-lg font-semibold text-primary">{T.dictionary}</h2>
            <Link href={`/dictionary/all?q=${encodedKeyword}`} className="text-sm text-accent hover:underline">
              {T.viewAll}
            </Link>
          </div>
          {dictionary.length === 0 ? (
            <p className="text-sm text-muted">{T.emptyDictionary}</p>
          ) : (
            <ul className="space-y-3">
              {dictionary.map((item) => (
                <li key={item.id} className="rounded-xl border border-border bg-surface-elevated p-3">
                  <Link href={`/dictionary/${item.slug || item.id}`} className="font-medium text-primary hover:text-accent">
                    {item.title}
                  </Link>
                  <p className="mt-1 text-sm text-muted">{excerpt(item.excerpt)}</p>
                  <p className="mt-2 text-xs text-muted">
                    {T.updatedAt}
                    {item.updatedAt.toLocaleDateString("zh-CN")}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </article>

        <article className="glass-panel p-5">
          <div className="mb-3 flex items-center justify-between gap-3">
            <h2 className="text-lg font-semibold text-primary">{T.brands}</h2>
            <Link href={`/brands/all?q=${encodedKeyword}`} className="text-sm text-accent hover:underline">
              {T.viewAll}
            </Link>
          </div>
          {brands.length === 0 ? (
            <p className="text-sm text-muted">{T.emptyBrands}</p>
          ) : (
            <ul className="space-y-3">
              {brands.map((item) => (
                <li key={item.id} className="rounded-xl border border-border bg-surface-elevated p-3">
                  <Link href={`/brands/${item.slug || item.id}`} className="font-medium text-primary hover:text-accent">
                    {item.title}
                  </Link>
                  <p className="mt-1 text-sm text-muted">{excerpt(item.excerpt)}</p>
                  <p className="mt-2 text-xs text-muted">
                    {T.updatedAt}
                    {item.updatedAt.toLocaleDateString("zh-CN")}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </article>

        <article className="glass-panel p-5 lg:col-span-2">
          <div className="mb-3 flex items-center justify-between gap-3">
            <h2 className="text-lg font-semibold text-primary">{T.awards}</h2>
            <Link href={`/awards?q=${encodedKeyword}`} className="text-sm text-accent hover:underline">
              {T.viewAll}
            </Link>
          </div>
          {awards.length === 0 ? (
            <p className="text-sm text-muted">{T.emptyAwards}</p>
          ) : (
            <ul className="space-y-3">
              {awards.map((item) => (
                <li key={item.id} className="rounded-xl border border-border bg-surface-elevated p-3">
                  <Link href={`/awards/${item.slug || item.id}`} className="font-medium text-primary hover:text-accent">
                    {item.title}
                  </Link>
                  <p className="mt-1 text-sm text-muted">{excerpt(item.description)}</p>
                  <p className="mt-2 text-xs text-muted">
                    {T.updatedAt}
                    {item.updatedAt.toLocaleDateString("zh-CN")}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </article>
      </section>
    </div>
  );
}
