import Link from "next/link";
import { notFound } from "next/navigation";
import { JsonLd } from "@/components/JsonLd";
import {
  ENGINEER_CATEGORY_LABELS,
  getEngineerCategorySuppliers,
  HUADIAN_DEFINITION,
} from "@/lib/huadianbang";

type Props = { params: Promise<{ category: string }> };

export default async function HuadianPartnerCategoryPage({ params }: Props) {
  const { category } = await params;
  if (!(category in ENGINEER_CATEGORY_LABELS)) notFound();
  const list = getEngineerCategorySuppliers(category);

  return (
    <main className="max-w-6xl mx-auto px-4 sm:px-6 py-10 sm:py-12">
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "CollectionPage",
          name: `华点榜 ${ENGINEER_CATEGORY_LABELS[category as keyof typeof ENGINEER_CATEGORY_LABELS]}`,
          description: HUADIAN_DEFINITION,
        }}
      />

      <section className="glass-panel p-6 sm:p-8">
        <h1 className="font-serif text-3xl sm:text-4xl font-semibold text-primary">
          {ENGINEER_CATEGORY_LABELS[category as keyof typeof ENGINEER_CATEGORY_LABELS]}
        </h1>
        <p className="mt-3 text-sm text-muted">{HUADIAN_DEFINITION}</p>
      </section>

      <section className="mt-8 glass-panel p-6">
        <h2 className="text-lg font-semibold text-primary">配套商列表</h2>
        <div className="mt-4 space-y-3">
          {list.map((x) => (
            <article key={x.slug} className="rounded-xl border border-border bg-surface-elevated p-4">
              <h3 className="text-base font-semibold text-primary">{x.name}</h3>
              <p className="mt-1 text-sm text-muted">服务区域：{x.serviceRegions}</p>
              <p className="mt-2 text-sm text-muted line-clamp-2">{x.reason}</p>
              <Link href={`/huadianbang/partner/${category}/${x.slug}`} className="apple-inline-link mt-3">
                查看详情页
              </Link>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}

