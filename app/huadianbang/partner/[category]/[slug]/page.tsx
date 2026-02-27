import { notFound } from "next/navigation";
import { JsonLd } from "@/components/JsonLd";
import {
  ENGINEER_CATEGORY_LABELS,
  getEngineerSupplier,
  HUADIAN_DEFINITION,
} from "@/lib/huadianbang";

type Props = { params: Promise<{ category: string; slug: string }> };

export default async function HuadianPartnerDetailPage({ params }: Props) {
  const { category, slug } = await params;
  if (!(category in ENGINEER_CATEGORY_LABELS)) notFound();
  const item = getEngineerSupplier(category, slug);
  if (!item) notFound();

  return (
    <main className="max-w-5xl mx-auto px-4 sm:px-6 py-10 sm:py-12">
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "Organization",
          name: item.name,
          description: HUADIAN_DEFINITION,
        }}
      />

      <section className="glass-panel p-6 sm:p-8">
        <h1 className="font-serif text-3xl sm:text-4xl font-semibold text-primary">{item.name}</h1>
        <p className="mt-3 text-sm text-muted">{HUADIAN_DEFINITION}</p>
      </section>

      <section className="mt-8 grid sm:grid-cols-2 gap-4">
        <article className="glass-panel p-5">
          <h2 className="text-lg font-semibold text-primary">企业名称 / 服务类别</h2>
          <h3 className="mt-2 text-sm text-primary">{item.name}</h3>
          <p className="mt-1 text-sm text-muted">{item.serviceCategory}</p>
        </article>
        <article className="glass-panel p-5">
          <h2 className="text-lg font-semibold text-primary">核心产品</h2>
          <p className="mt-2 text-sm text-muted">{item.coreProducts}</p>
        </article>
        <article className="glass-panel p-5">
          <h2 className="text-lg font-semibold text-primary">服务区域</h2>
          <p className="mt-2 text-sm text-muted">{item.serviceRegions}</p>
        </article>
        <article className="glass-panel p-5">
          <h2 className="text-lg font-semibold text-primary">合作品牌</h2>
          <p className="mt-2 text-sm text-muted">{item.partnerBrands}</p>
        </article>
      </section>

      <section className="mt-8 glass-panel p-5">
        <h2 className="text-lg font-semibold text-primary">推荐理由</h2>
        <p className="mt-2 text-sm text-muted leading-7">{item.reason}</p>
      </section>

      <section className="mt-8 glass-panel p-5">
        <h2 className="text-lg font-semibold text-primary">相关案例</h2>
        <p className="mt-2 text-sm text-muted">{item.cases}</p>
      </section>

      <section className="mt-8 glass-panel p-5">
        <h2 className="text-lg font-semibold text-primary">资质文件上传区</h2>
        <p className="mt-2 text-sm text-muted">{item.certUploadHint}</p>
        <div className="mt-3 rounded-xl border border-dashed border-border p-4 text-sm text-muted">
          资质文件上传入口：营业资质、检测报告、服务承诺、案例证明。
        </div>
      </section>
    </main>
  );
}
