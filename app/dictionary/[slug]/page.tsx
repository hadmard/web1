import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { getTermBySlug } from "@/lib/terms";
import { previewText } from "@/lib/text";
import { DefinitionBlock } from "@/components/DefinitionBlock";
import { JsonLd } from "@/components/JsonLd";
import { RichContent } from "@/components/RichContent";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ slug: string }> };

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
      title: `${article.title} | 中华整木网 · 整木词库`,
      description,
      openGraph: { title: article.title, description, type: "article" },
    };
  }

  const term = await getTermBySlug(slug);
  if (!term) return { title: "词条未找到" };
  const description = previewText(term.definition, 160);
  return {
    title: `${term.title} | 中华整木网 · 整木词库`,
    description,
    openGraph: { title: term.title, description, type: "article" },
  };
}

export default async function TermPage({ params }: Props) {
  const { slug } = await params;
  const s = normalizeSegment(slug);

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
        {article.excerpt && (
          <blockquote className="mt-4 rounded-r-lg border-l-4 border-accent bg-surface px-4 py-3 text-sm text-muted">
            {article.excerpt}
          </blockquote>
        )}

        <section className="mt-6 rounded-2xl border border-border bg-surface-elevated p-5">
          <p className="text-[11px] uppercase tracking-wider text-muted mb-2">TERM CARD</p>
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



