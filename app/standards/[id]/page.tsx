import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getStandardById } from "@/lib/standards";

export const dynamic = "force-dynamic";
import { JsonLd } from "@/components/JsonLd";

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const standard = await getStandardById(id);
  if (!standard) return { title: "标准未找到" };
  const description = `${standard.code} ${standard.title}（${standard.year}）`;
  return {
    title: `${standard.code} ${standard.title} | 中华整木网 · 整木标准`,
    description,
    openGraph: { title: standard.title, description, type: "article" },
  };
}

export default async function StandardPage({ params }: Props) {
  const { id } = await params;
  const standard = await getStandardById(id);
  if (!standard) notFound();

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "TechArticle",
    name: standard.title,
    description: standard.content?.slice(0, 200) ?? standard.title,
    dateModified: standard.updatedAt,
  };

  return (
    <article className="max-w-3xl mx-auto px-4 py-10">
      <JsonLd data={jsonLd} />
      <div className="flex items-baseline gap-3 flex-wrap">
        <span className="text-sm font-mono px-2 py-1 bg-gray-200 dark:bg-gray-700 rounded">
          {standard.code}
        </span>
        <span className="text-[var(--color-muted)]">{standard.year} 年</span>
      </div>
      <h1 className="font-serif text-2xl font-semibold tracking-tight text-gray-900 dark:text-gray-100 mt-2">
        {standard.title}
      </h1>

      {standard.content && (
        <section className="mt-8">
          <h2 className="font-serif text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
            内容与等级划分
          </h2>
          <div className="overflow-x-auto">
            <pre className="text-sm text-[var(--color-muted)] whitespace-pre-wrap font-sans">
              {standard.content}
            </pre>
          </div>
        </section>
      )}

      <section className="mt-8 border-t border-[var(--color-border)] pt-6">
        <h2 className="font-serif text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
          更新记录
        </h2>
        <p className="text-sm text-[var(--color-muted)]">
          版本 {standard.version ?? "—"} · 更新于{" "}
          {standard.updatedAt.toLocaleDateString("zh-CN")}
        </p>
      </section>

      <section className="mt-6 p-4 bg-gray-50 dark:bg-gray-800/50 rounded text-sm">
        <h2 className="font-serif text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
          引用格式
        </h2>
        <p className="text-[var(--color-muted)] font-mono">
          中华整木网，标准编号 {standard.code}，{standard.year}。
        </p>
      </section>
    </article>
  );
}
