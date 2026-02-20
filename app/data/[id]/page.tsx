import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getIndustryDataById } from "@/lib/industry-data";

export const dynamic = "force-dynamic";
import { JsonLd } from "@/components/JsonLd";

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const data = await getIndustryDataById(id);
  if (!data) return { title: "数据未找到" };
  const description = data.source ?? data.title;
  return {
    title: `${data.title} | 中华整木网 · 整木数据`,
    description,
    openGraph: { title: data.title, description, type: "article" },
  };
}

export default async function IndustryDataPage({ params }: Props) {
  const { id } = await params;
  const data = await getIndustryDataById(id);
  if (!data) notFound();

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Dataset",
    name: data.title,
    description: data.content?.slice(0, 200) ?? data.title,
    dateModified: data.updatedAt,
  };

  return (
    <article className="max-w-3xl mx-auto px-4 py-10">
      <JsonLd data={jsonLd} />
      <h1 className="font-serif text-2xl font-semibold tracking-tight text-gray-900 dark:text-gray-100">
        {data.title}
      </h1>
      {data.year != null && (
        <p className="text-[var(--color-muted)] mt-1">{data.year} 年</p>
      )}

      {data.source && (
        <section className="mt-8 p-4 bg-gray-50 dark:bg-gray-800/50 rounded">
          <h2 className="font-serif text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
            数据来源
          </h2>
          <p className="text-sm text-[var(--color-muted)]">{data.source}</p>
        </section>
      )}

      {data.methodology && (
        <section className="mt-6">
          <h2 className="font-serif text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
            统计方法
          </h2>
          <p className="text-sm text-[var(--color-muted)] whitespace-pre-wrap">
            {data.methodology}
          </p>
        </section>
      )}

      {data.content && (
        <section className="mt-6">
          <h2 className="font-serif text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
            内容
          </h2>
          <div className="text-sm text-[var(--color-muted)] whitespace-pre-wrap">
            {data.content}
          </div>
        </section>
      )}

      <section className="mt-8 border border-[var(--color-border)] rounded p-4">
        <h2 className="font-serif text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
          可视化图表
        </h2>
        <p className="text-sm text-[var(--color-muted)] mb-4">
          市场规模、区域分布、品类结构等图表占位，后续接入图表库。
        </p>
        <div className="h-48 bg-gray-100 dark:bg-gray-800 rounded flex items-center justify-center text-[var(--color-muted)] text-sm">
          图表占位
        </div>
      </section>

      <div className="mt-8 flex items-center gap-4">
        <span className="text-sm text-[var(--color-muted)]">
          更新于 {data.updatedAt.toLocaleDateString("zh-CN")}
        </span>
        <button
          type="button"
          className="text-sm text-gray-900 dark:text-gray-100 underline hover:no-underline"
        >
          下载（预留）
        </button>
      </div>
    </article>
  );
}
