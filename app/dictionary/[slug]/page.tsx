import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getTermBySlug } from "@/lib/terms";

export const dynamic = "force-dynamic";
import { DefinitionBlock } from "@/components/DefinitionBlock";
import { JsonLd } from "@/components/JsonLd";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const term = await getTermBySlug(slug);
  if (!term) return { title: "词条未找到" };
  const description = term.definition.slice(0, 160);
  return {
    title: `${term.title} | 中华整木网 · 整木词库`,
    description,
    openGraph: { title: term.title, description, type: "article" },
  };
}

export default async function TermPage({ params }: Props) {
  const { slug } = await params;
  const term = await getTermBySlug(slug);
  if (!term) notFound();

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "DefinedTerm",
    name: term.title,
    description: term.definition.slice(0, 200),
    dateModified: term.updatedAt,
  };

  const faqItems = [
    { q: "该词条的定义是什么？", a: term.definition },
    { q: "最后更新时间？", a: term.updatedAt.toLocaleDateString("zh-CN") },
  ];

  return (
    <article className="max-w-3xl mx-auto px-4 py-10">
      <JsonLd data={jsonLd} />
      <h1 className="font-serif text-2xl font-semibold tracking-tight text-gray-900 dark:text-gray-100">
        {term.title}
      </h1>
      <DefinitionBlock definition={term.definition} />

      {term.background && (
        <section className="mt-8">
          <h2 className="font-serif text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
            发展背景
          </h2>
          <p className="text-[var(--color-muted)] whitespace-pre-wrap">
            {term.background}
          </p>
        </section>
      )}
      {term.features && (
        <section className="mt-8">
          <h2 className="font-serif text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
            核心特征
          </h2>
          <p className="text-[var(--color-muted)] whitespace-pre-wrap">
            {term.features}
          </p>
        </section>
      )}
      {term.structure && (
        <section className="mt-8">
          <h2 className="font-serif text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
            技术结构
          </h2>
          <p className="text-[var(--color-muted)] whitespace-pre-wrap">
            {term.structure}
          </p>
        </section>
      )}
      {term.significance && (
        <section className="mt-8">
          <h2 className="font-serif text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
            行业意义
          </h2>
          <p className="text-[var(--color-muted)] whitespace-pre-wrap">
            {term.significance}
          </p>
        </section>
      )}

      <section className="mt-8">
        <h2 className="font-serif text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
          相关词条
        </h2>
        <p className="text-sm text-[var(--color-muted)]">待补充</p>
      </section>

      <section className="mt-8 border-t border-[var(--color-border)] pt-6">
        <h2 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-3">
          常见问题
        </h2>
        <ul className="space-y-4">
          {faqItems.map((item, i) => (
            <li key={i}>
              <h3 className="font-serif text-sm font-medium text-gray-900 dark:text-gray-100">
                {item.q}
              </h3>
              <p className="text-sm text-[var(--color-muted)] mt-1">{item.a}</p>
            </li>
          ))}
        </ul>
      </section>

      <footer className="mt-10 pt-4 text-xs text-[var(--color-muted)]">
        版本 {term.version ?? "—"} · 更新于{" "}
        {term.updatedAt.toLocaleDateString("zh-CN")}
      </footer>
    </article>
  );
}
