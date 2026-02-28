import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { JsonLd } from "@/components/JsonLd";
import { getBrandAwardHistory, getTopBrand, HUADIAN_DEFINITION } from "@/lib/huadianbang";

type Props = { params: Promise<{ year: string; brand: string }> };

export default async function HuadianAnnualBrandDetailPage({ params }: Props) {
  const { year, brand } = await params;
  const y = Number(year);
  if (!Number.isFinite(y)) notFound();
  const item = getTopBrand(y, brand);
  if (!item) notFound();
  const history = getBrandAwardHistory(item.name);

  return (
    <main className="max-w-5xl mx-auto px-4 sm:px-6 py-10 sm:py-12">
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "Organization",
          name: item.name,
          award: `${item.year} ${item.category}`,
          description: HUADIAN_DEFINITION,
        }}
      />

      <section className="glass-panel p-6 sm:p-8">
        <h1 className="font-serif text-3xl sm:text-4xl font-semibold text-primary">{item.name}</h1>
        <div className="mt-4 overflow-hidden rounded-2xl border border-border">
          <Image src="/images/seedance2/picture_21.jpg" alt="" width={1600} height={900} className="h-44 sm:h-56 w-full object-cover" />
        </div>
        <p className="mt-3 text-sm text-muted">{HUADIAN_DEFINITION}</p>
        <span className="mt-3 inline-block text-xs rounded-full border border-border px-2.5 py-1 text-accent">
          华点榜推荐标签
        </span>
      </section>

      <section className="mt-8 glass-panel p-6 space-y-4">
        <h2 className="text-lg font-semibold text-primary">品牌详情</h2>
        <article className="rounded-xl border border-border bg-surface-elevated p-4">
          <h3 className="font-semibold text-primary">企业 LOGO</h3>
          <img src={item.logo} alt={item.name} className="mt-3 h-14 w-14 rounded object-contain border border-border bg-white" />
        </article>
        <article className="rounded-xl border border-border bg-surface-elevated p-4">
          <h3 className="font-semibold text-primary">企业简介</h3>
          <p className="mt-2 text-sm text-muted">{item.intro}</p>
        </article>
        <article className="rounded-xl border border-border bg-surface-elevated p-4">
          <h3 className="font-semibold text-primary">获奖年份 / 类别</h3>
          <p className="mt-2 text-sm text-muted">
            {item.year} 年 · {item.category}
          </p>
        </article>
        <article className="rounded-xl border border-border bg-surface-elevated p-4">
          <h3 className="font-semibold text-primary">推荐理由</h3>
          <p className="mt-2 text-sm text-muted leading-7">{item.reason}</p>
        </article>
        <article className="rounded-xl border border-border bg-surface-elevated p-4">
          <h3 className="font-semibold text-primary">代表案例</h3>
          <p className="mt-2 text-sm text-muted">{item.caseStudy}</p>
        </article>
      </section>

      <section className="mt-8 glass-panel p-6">
        <h2 className="text-lg font-semibold text-primary">关联资源</h2>
        <div className="mt-3 flex flex-wrap gap-3">
          <Link href={item.enterpriseHref} className="text-sm text-accent hover:underline">企业主页</Link>
          <Link href={item.standardsHref} className="text-sm text-accent hover:underline">关联标准</Link>
        </div>
      </section>

      <section className="mt-8 glass-panel p-6">
        <h2 className="text-lg font-semibold text-primary">历年获奖记录</h2>
        <div className="mt-3 space-y-2">
          {history.map((h) => (
            <h3 key={`${item.slug}-${h.year}-${h.category}`} className="text-sm text-primary">
              {h.year} 年 · {h.category}
            </h3>
          ))}
        </div>
      </section>
    </main>
  );
}

