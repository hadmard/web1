import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { articleOrderByPinnedLatest, articleOrderByPinnedPopular } from "@/lib/articles";
import { getTermBySlug } from "@/lib/terms";
import { previewText } from "@/lib/text";
import { DefinitionBlock } from "@/components/DefinitionBlock";
import { JsonLd } from "@/components/JsonLd";
import { RichContent } from "@/components/RichContent";

export const revalidate = 300;

type Props = { params: Promise<{ slug: string }> };

const DICTIONARY_SUBCATEGORY_MAP: Record<string, { href: string; label: string }> = {
  concepts: { href: "/dictionary/concepts", label: "基础概念" },
  terms: { href: "/dictionary/terms", label: "技术术语" },
  segments: { href: "/dictionary/segments", label: "行业细分" },
};

function normalizeSegment(raw: string) {
  let v = (raw || "").trim();
  for (let i = 0; i < 2; i += 1) {
    try {
      const d = decodeURIComponent(v);
      if (d === v) break;
      v = d;
    } catch {
      break;
    }
  }
  return v.trim();
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const s = normalizeSegment(slug);
  if (DICTIONARY_SUBCATEGORY_MAP[s]) {
    const sub = DICTIONARY_SUBCATEGORY_MAP[s];
    return {
      title: `${sub.label} | 整木词库`,
      description: `整木词库子栏目：${sub.label}。`,
    };
  }
  const article = await prisma.article.findFirst({
    where: {
      status: "approved",
      AND: [
        { OR: [{ categoryHref: { startsWith: "/dictionary" } }, { subHref: { startsWith: "/dictionary" } }] },
        { OR: [{ slug: s }, { title: s }, { slug: { contains: s } }, { title: { contains: s } }] },
      ],
    },
    select: { title: true, excerpt: true, content: true },
  });

  if (article) {
    const description = previewText(article.excerpt ?? article.content, 160);
    return {
      title: `${article.title} | 整木网 · 整木词库`,
      description,
      openGraph: { title: article.title, description, type: "article" },
    };
  }

  const term = await getTermBySlug(s);
  if (!term) return { title: "词条未找到" };
  const description = previewText(term.definition, 160);
  return {
    title: `${term.title} | 整木网 · 整木词库`,
    description,
    openGraph: { title: term.title, description, type: "article" },
  };
}

export default async function TermPage({ params }: Props) {
  const { slug } = await params;
  const s = normalizeSegment(slug);
  const subcategory = DICTIONARY_SUBCATEGORY_MAP[s];

  if (subcategory) {
    const [hotTerms, latestTerms] = await Promise.all([
      prisma.article.findMany({
        where: {
          status: "approved",
          OR: [{ subHref: subcategory.href }, { categoryHref: subcategory.href }],
        },
        orderBy: articleOrderByPinnedPopular,
        take: 10,
        select: { id: true, title: true, slug: true },
      }),
      prisma.article.findMany({
        where: {
          status: "approved",
          OR: [{ subHref: subcategory.href }, { categoryHref: subcategory.href }],
        },
        orderBy: articleOrderByPinnedLatest,
        take: 3,
        select: { id: true, title: true, slug: true, updatedAt: true },
      }),
    ]);

    return (
      <article className="max-w-5xl mx-auto px-4 py-10">
        <nav className="mb-6 text-sm text-muted" aria-label="面包屑">
          <Link href="/" className="hover:text-accent">首页</Link>
          <span className="mx-2">/</span>
          <Link href="/dictionary" className="hover:text-accent">整木词库</Link>
          <span className="mx-2">/</span>
          <span className="text-primary">{subcategory.label}</span>
        </nav>

        <section className="glass-panel p-5 sm:p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h1 className="font-serif text-2xl sm:text-3xl font-semibold text-primary">{subcategory.label}</h1>
            <Link
              href="/membership/content/publish?tab=terms"
              className="interactive-lift rounded-lg bg-[var(--color-accent)] text-white px-4 py-2 text-sm font-medium hover:brightness-105"
            >
              创建词库
            </Link>
          </div>

          <form action="/dictionary/all" method="get" className="mt-4 rounded-xl border border-border bg-surface-elevated p-4 flex flex-col sm:flex-row gap-3">
            <input type="hidden" name="sub" value={subcategory.href} />
            <input
              name="q"
              className="flex-1 border border-border rounded px-3 py-2 bg-surface"
              placeholder={`搜索${subcategory.label}词条`}
            />
            <button className="px-4 py-2 rounded bg-accent text-white text-sm">搜索</button>
          </form>

          <h2 className="section-label text-primary mt-6">热搜词库</h2>
          {hotTerms.length === 0 ? (
            <p className="mt-3 text-sm text-muted">暂无热搜词条。</p>
          ) : (
            <ul className="mt-3 grid sm:grid-cols-2 gap-2">
              {hotTerms.map((item, idx) => (
                <li key={item.id}>
                  <Link href={`/dictionary/${item.slug}`} className="block rounded-lg border border-border bg-surface px-3 py-2 text-sm text-primary hover:border-accent/45 hover:text-accent">
                    <span className="mr-2 text-accent font-semibold">{idx + 1}.</span>
                    {item.title}
                  </Link>
                </li>
              ))}
            </ul>
          )}

          <h2 className="section-label text-primary mt-6">最新发布</h2>
          {latestTerms.length === 0 ? (
            <p className="mt-3 text-sm text-muted">暂无词库内容。</p>
          ) : (
            <ul className="mt-3 space-y-3">
              {latestTerms.map((item) => (
                <li key={item.id} className="border-b border-border pb-3">
                  <Link href={`/dictionary/${item.slug}`} className="text-sm text-primary hover:text-accent">
                    {item.title}
                  </Link>
                  <p className="mt-1 text-xs text-muted">更新于 {item.updatedAt.toLocaleDateString("zh-CN")}</p>
                </li>
              ))}
            </ul>
          )}
        </section>
      </article>
    );
  }

  const article = await prisma.article.findFirst({
    where: {
      status: "approved",
      AND: [
        { OR: [{ categoryHref: { startsWith: "/dictionary" } }, { subHref: { startsWith: "/dictionary" } }] },
        { OR: [{ slug: s }, { title: s }, { slug: { contains: s } }, { title: { contains: s } }] },
      ],
    },
  });

  if (article) {
    const jsonLd = {
      "@context": "https://schema.org",
      "@type": "DefinedTerm",
      name: article.title,
      description: previewText(article.excerpt ?? article.content, 200),
      dateModified: article.updatedAt,
    };

    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://example.com";
    const termUrl = `${baseUrl}/dictionary/${article.slug}`;
    const breadcrumbSchema = {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "首页", item: baseUrl },
        { "@type": "ListItem", position: 2, name: "整木词库", item: `${baseUrl}/dictionary` },
        { "@type": "ListItem", position: 3, name: article.title, item: termUrl },
      ],
    };

    return (
      <article className="max-w-5xl mx-auto px-4 py-10">
        <JsonLd data={jsonLd} />
        <JsonLd data={breadcrumbSchema} />

        <h1 className="font-serif text-3xl font-bold text-primary">{article.title}</h1>
        <div className="mt-4 overflow-hidden rounded-2xl border border-border">
          <Image src="/images/seedance2/picture_16.jpg" alt="" width={1400} height={900} className="h-44 sm:h-56 w-full object-cover" />
        </div>
        {article.excerpt && (
          <blockquote className="mt-4 rounded-r-lg border-l-4 border-accent bg-surface px-4 py-3 text-sm text-muted">
            {article.excerpt}
          </blockquote>
        )}

        <section className="mt-6 rounded-2xl border border-border bg-surface-elevated p-5">
          <RichContent html={article.content} className="prose prose-neutral dark:prose-invert max-w-none" />
        </section>

        <footer className="mt-8 flex flex-wrap items-center justify-between gap-2">
          <p className="text-xs text-muted">更新于 {article.updatedAt.toLocaleDateString("zh-CN")}</p>
          <Link
            href={`/dictionary/edit/${article.id}`}
            className="text-xs px-2 py-1 rounded border border-border text-muted hover:text-accent hover:border-accent/40"
          >
            提出修改
          </Link>
        </footer>
      </article>
    );
  }

  const term = await getTermBySlug(s);
  if (!term) notFound();

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "DefinedTerm",
    name: term.title,
    description: previewText(term.definition, 200),
    dateModified: term.updatedAt,
  };

  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://example.com";
  const termUrl = `${baseUrl}/dictionary/${term.slug}`;
  const breadcrumbSchema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "首页", item: baseUrl },
      { "@type": "ListItem", position: 2, name: "整木词库", item: `${baseUrl}/dictionary` },
      { "@type": "ListItem", position: 3, name: term.title, item: termUrl },
    ],
  };

  return (
    <article className="max-w-3xl mx-auto px-4 py-10">
      <JsonLd data={jsonLd} />
      <JsonLd data={breadcrumbSchema} />
      <h1 className="font-serif text-2xl font-semibold tracking-tight text-gray-900 dark:text-gray-100">{term.title}</h1>
      <div className="mt-4 overflow-hidden rounded-2xl border border-border">
        <Image src="/images/seedance2/picture_16.jpg" alt="" width={1400} height={900} className="h-44 sm:h-56 w-full object-cover" />
      </div>
      <DefinitionBlock definition={term.definition} />

      {term.background && (
        <section className="mt-8">
          <h2 className="font-serif text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">发展背景</h2>
          <p className="text-[var(--color-muted)] whitespace-pre-wrap">{term.background}</p>
        </section>
      )}
      {term.features && (
        <section className="mt-8">
          <h2 className="font-serif text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">核心特征</h2>
          <p className="text-[var(--color-muted)] whitespace-pre-wrap">{term.features}</p>
        </section>
      )}
      {term.structure && (
        <section className="mt-8">
          <h2 className="font-serif text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">技术结构</h2>
          <p className="text-[var(--color-muted)] whitespace-pre-wrap">{term.structure}</p>
        </section>
      )}
      {term.significance && (
        <section className="mt-8">
          <h2 className="font-serif text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">行业意义</h2>
          <p className="text-[var(--color-muted)] whitespace-pre-wrap">{term.significance}</p>
        </section>
      )}

      <footer className="mt-10 pt-4 text-xs text-[var(--color-muted)]">
        版本 {term.version ?? "—"} · 更新于 {term.updatedAt.toLocaleDateString("zh-CN")}
      </footer>
    </article>
  );
}





