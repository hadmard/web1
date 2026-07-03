import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { JsonLd } from "@/components/JsonLd";
import {
  ENGINEER_CATEGORY_LABELS,
  getEngineerCategorySuppliers,
  HUADIAN_DEFINITION,
} from "@/lib/huadianbang";
import { buildHuadianMetadata } from "../../metadata";

type Props = { params: Promise<{ category: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { category } = await params;
  const label = ENGINEER_CATEGORY_LABELS[category as keyof typeof ENGINEER_CATEGORY_LABELS];
  if (!label) {
    return buildHuadianMetadata(
      "华点榜配套商分类",
      "华点榜配套商分类页。",
      `/huadianbang/partner/${category}`,
    );
  }

  return buildHuadianMetadata(
    `华点榜${label}`,
    `华点榜${label}分类页，展示配套商推荐列表与详情入口。`,
    `/huadianbang/partner/${category}`,
  );
}

export default async function HuadianPartnerCategoryPage({ params }: Props) {
  const { category } = await params;
  if (!(category in ENGINEER_CATEGORY_LABELS)) notFound();
  const list = getEngineerCategorySuppliers(category);
  const label = ENGINEER_CATEGORY_LABELS[category as keyof typeof ENGINEER_CATEGORY_LABELS];

  return (
    <main className="max-w-6xl mx-auto px-4 sm:px-6 py-10 sm:py-12">
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "CollectionPage",
          name: `华点榜 ${label}`,
          description: HUADIAN_DEFINITION,
        }}
      />

      <section className="glass-panel p-6 sm:p-8">
        <h1 className="font-serif text-3xl sm:text-4xl font-semibold text-primary">{label}</h1>
        <p className="mt-3 text-sm text-muted">{HUADIAN_DEFINITION}</p>
      </section>

      <section className="mt-8 glass-panel p-6">
        <h2 className="text-lg font-semibold text-primary">配套商列表</h2>
        <div className="mt-4 space-y-3">
          {list.map((item) => (
            <article key={item.slug} className="rounded-xl border border-border bg-surface-elevated p-4">
              <h3 className="text-base font-semibold text-primary">{item.name}</h3>
              <p className="mt-1 text-sm text-muted">服务区域：{item.serviceRegions}</p>
              <p className="mt-2 text-sm text-muted line-clamp-2">{item.reason}</p>
              <Link href={`/huadianbang/partner/${category}/${item.slug}`} className="apple-inline-link mt-3">
                查看详情页
              </Link>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
