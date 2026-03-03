import Link from "next/link";
import { Prisma } from "@prisma/client";
import { StructuredSearch } from "@/components/StructuredSearch";
import { prisma } from "@/lib/prisma";
import { articleOrderByPinnedLatest } from "@/lib/articles";

export const revalidate = 300;

type Props = {
  searchParams: Promise<{
    q?: string;
  }>;
};

function stripHtml(value: string | null | undefined) {
  return (value ?? "")
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function excerpt(value: string | null | undefined, max = 88) {
  const plain = stripHtml(value);
  if (!plain) return "暂无摘要";
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
          <h1 className="font-serif text-2xl font-semibold text-primary sm:text-3xl">行业搜索</h1>
          <p className="mt-2 text-sm text-muted">输入关键词后，结果将自动按标准、术语、榜单和品牌分类展示。</p>
          <div className="mt-6">
            <StructuredSearch />
          </div>
        </article>
      </div>
    );
  }

  const [standards, terms, awards, brands] = await Promise.all([
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
  ]);

  const summary = [
    { label: "标准", value: standards.length, href: `/standards/all?q=${encodeURIComponent(keyword)}` },
    { label: "术语", value: terms.length, href: `/dictionary/all?q=${encodeURIComponent(keyword)}` },
    { label: "榜单", value: awards.length, href: `/awards?q=${encodeURIComponent(keyword)}` },
    { label: "品牌", value: brands.length, href: `/brands/all?q=${encodeURIComponent(keyword)}` },
  ];

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-10">
      <article className="glass-panel p-5 sm:p-6">
        <h1 className="font-serif text-2xl font-semibold text-primary sm:text-3xl">搜索结果</h1>
        <p className="mt-2 text-sm text-muted">关键词：{keyword}</p>
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
            <h2 className="text-lg font-semibold text-primary">标准</h2>
            <Link href={`/standards/all?q=${encodeURIComponent(keyword)}`} className="text-sm text-accent hover:underline">
              查看全部
            </Link>
          </div>
          {standards.length === 0 ? (
            <p className="text-sm text-muted">暂无相关标准</p>
          ) : (
            <ul className="space-y-3">
              {standards.map((item) => (
                <li key={item.id} className="rounded-xl border border-border bg-surface-elevated p-3">
                  <Link href={`/standards/${item.slug || item.id}`} className="font-medium text-primary hover:text-accent">
                    {item.title}
                  </Link>
                  <p className="mt-1 text-sm text-muted">{excerpt(item.excerpt)}</p>
                  <p className="mt-2 text-xs text-muted">更新于 {item.updatedAt.toLocaleDateString("zh-CN")}</p>
                </li>
              ))}
            </ul>
          )}
        </article>

        <article className="glass-panel p-5">
          <div className="mb-3 flex items-center justify-between gap-3">
            <h2 className="text-lg font-semibold text-primary">术语</h2>
            <Link href={`/dictionary/all?q=${encodeURIComponent(keyword)}`} className="text-sm text-accent hover:underline">
              查看全部
            </Link>
          </div>
          {terms.length === 0 ? (
            <p className="text-sm text-muted">暂无相关术语</p>
          ) : (
            <ul className="space-y-3">
              {terms.map((item) => (
                <li key={item.id} className="rounded-xl border border-border bg-surface-elevated p-3">
                  <Link href={`/dictionary/${item.slug || item.id}`} className="font-medium text-primary hover:text-accent">
                    {item.title}
                  </Link>
                  <p className="mt-1 text-sm text-muted">{excerpt(item.excerpt)}</p>
                  <p className="mt-2 text-xs text-muted">更新于 {item.updatedAt.toLocaleDateString("zh-CN")}</p>
                </li>
              ))}
            </ul>
          )}
        </article>

        <article className="glass-panel p-5">
          <div className="mb-3 flex items-center justify-between gap-3">
            <h2 className="text-lg font-semibold text-primary">榜单</h2>
            <Link href={`/awards?q=${encodeURIComponent(keyword)}`} className="text-sm text-accent hover:underline">
              查看全部
            </Link>
          </div>
          {awards.length === 0 ? (
            <p className="text-sm text-muted">暂无相关榜单</p>
          ) : (
            <ul className="space-y-3">
              {awards.map((item) => (
                <li key={item.id} className="rounded-xl border border-border bg-surface-elevated p-3">
                  <Link href={`/awards/${item.slug || item.id}`} className="font-medium text-primary hover:text-accent">
                    {item.title}
                  </Link>
                  <p className="mt-1 text-sm text-muted">{excerpt(item.description)}</p>
                  <p className="mt-2 text-xs text-muted">更新于 {item.updatedAt.toLocaleDateString("zh-CN")}</p>
                </li>
              ))}
            </ul>
          )}
        </article>

        <article className="glass-panel p-5">
          <div className="mb-3 flex items-center justify-between gap-3">
            <h2 className="text-lg font-semibold text-primary">品牌</h2>
            <Link href={`/brands/all?q=${encodeURIComponent(keyword)}`} className="text-sm text-accent hover:underline">
              查看全部
            </Link>
          </div>
          {brands.length === 0 ? (
            <p className="text-sm text-muted">暂无相关品牌</p>
          ) : (
            <ul className="space-y-3">
              {brands.map((item) => (
                <li key={item.id} className="rounded-xl border border-border bg-surface-elevated p-3">
                  <Link href={`/brands/${item.slug || item.id}`} className="font-medium text-primary hover:text-accent">
                    {item.title}
                  </Link>
                  <p className="mt-1 text-sm text-muted">{excerpt(item.excerpt)}</p>
                  <p className="mt-2 text-xs text-muted">更新于 {item.updatedAt.toLocaleDateString("zh-CN")}</p>
                </li>
              ))}
            </ul>
          )}
        </article>
      </section>
    </div>
  );
}
