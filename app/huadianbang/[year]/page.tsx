import { notFound } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { JsonLd } from "@/components/JsonLd";
import { getAnnualBoard, getTop10ByYear, HUADIAN_DEFINITION } from "@/lib/huadianbang";
import { getSiteVisualSettings } from "@/lib/site-visual-settings";

type Props = { params: Promise<{ year: string }> };

export default async function HuadianAnnualPage({ params }: Props) {
  const { year } = await params;
  const y = Number(year);
  const annual = Number.isFinite(y) ? getAnnualBoard(y) : undefined;
  if (!annual) notFound();
  const top10 = getTop10ByYear(y);
  const visualSettings = await getSiteVisualSettings();

  return (
    <main className="max-w-6xl mx-auto px-4 sm:px-6 py-10 sm:py-12">
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "CollectionPage",
          name: `华点榜 ${annual.year} 年度榜单`,
          description: HUADIAN_DEFINITION,
          url: `/huadianbang/${annual.year}`,
        }}
      />

      <section className="glass-panel p-6 sm:p-8">
        <h1 className="font-serif text-3xl sm:text-4xl font-semibold text-primary">{annual.year} 年度榜单</h1>
        <div className="mt-4 overflow-hidden rounded-2xl border border-border">
          <Image src={visualSettings.backgrounds.huadianAnnualHero} alt="" width={1920} height={900} className="h-44 sm:h-56 w-full object-cover" />
        </div>
        <p className="mt-3 text-sm text-muted">{HUADIAN_DEFINITION}</p>
      </section>

      <section className="mt-8 glass-panel p-6">
        <h2 className="text-lg font-semibold text-primary">年度背景说明</h2>
        <p className="mt-2 text-sm text-muted leading-7">{annual.background}</p>
      </section>

      <section className="mt-8 glass-panel p-6">
        <h2 className="text-lg font-semibold text-primary">评选维度说明</h2>
        <div className="mt-3 flex flex-wrap gap-2">
          {annual.dimensions.map((d) => (
            <span key={d} className="px-3 py-1.5 text-sm rounded-full border border-border">
              {d}
            </span>
          ))}
        </div>
      </section>

      <section className="mt-8 glass-panel p-6">
        <h2 className="text-lg font-semibold text-primary">十大推荐品牌</h2>
        <div className="mt-4 grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {top10.map((x) => (
            <article key={x.slug} className="rounded-xl border border-border bg-surface-elevated p-4">
              <h3 className="text-base font-semibold text-primary">{x.name}</h3>
              <p className="mt-1 text-sm text-muted">{x.category}</p>
              <p className="mt-2 text-sm text-muted line-clamp-2">{x.reason}</p>
              <Link href={`/huadianbang/${annual.year}/${x.slug}`} className="mt-2 inline-block text-sm text-accent hover:underline">
                进入品牌详情页
              </Link>
            </article>
          ))}
        </div>
      </section>

      <section className="mt-8 glass-panel p-6">
        <h2 className="text-lg font-semibold text-primary">获奖企业列表</h2>
        <div className="mt-4 space-y-3">
          {annual.winners.map((w) => (
            <article key={`${annual.year}-${w.name}`} className="rounded-xl border border-border bg-surface-elevated p-4">
              <h3 className="text-base font-semibold text-primary">{w.name}</h3>
              <span className="mt-2 inline-block text-xs rounded-full border border-border px-2 py-1 text-accent">
                华点榜推荐标签
              </span>
              <p className="mt-1 text-sm text-muted">
                所在区域：{w.region} · 主营方向：{w.focus} · 获奖类型：{w.awardType}
              </p>
              <p className="mt-2 text-sm text-muted leading-7">{w.reason}</p>
              <a href={w.homepage} className="mt-2 inline-block text-sm text-accent hover:underline">
                企业主页链接
              </a>
            </article>
          ))}
        </div>
      </section>

      <section className="mt-8 glass-panel p-6">
        <h2 className="text-lg font-semibold text-primary">公示制度说明</h2>
        <p className="mt-2 text-sm text-muted leading-7">{annual.publicNotice}</p>
      </section>

      <section className="mt-8 glass-panel p-6">
        <h2 className="text-lg font-semibold text-primary">监督机制说明</h2>
        <p className="mt-2 text-sm text-muted leading-7">{annual.supervision}</p>
      </section>
    </main>
  );
}
