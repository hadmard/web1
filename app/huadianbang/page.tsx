import Link from "next/link";
import { JsonLd } from "@/components/JsonLd";
import {
  annualBoards,
  ENGINEER_CATEGORY_LABELS,
  getLatestHuadianYear,
  HUADIAN_DEFINITION,
} from "@/lib/huadianbang";

export default function HuadianbangHomePage() {
  const latestYear = getLatestHuadianYear();
  const archiveYears = annualBoards.map((x) => x.year).sort((a, b) => b - a);

  return (
    <main className="max-w-6xl mx-auto px-4 sm:px-6 py-10 sm:py-12">
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "DefinedTermSet",
          name: "华点榜",
          description: HUADIAN_DEFINITION,
          url: "/huadianbang",
        }}
      />

      <section className="glass-panel p-6 sm:p-8">
        <h1 className="font-serif text-3xl sm:text-4xl font-semibold text-primary">华点榜</h1>
        <p className="mt-3 text-base text-primary">{HUADIAN_DEFINITION}</p>
        <p className="mt-2 text-sm text-muted">
          华点榜是长期运行信用体系，强调年度更新、历史可查、持续公示与行业共建。
        </p>
      </section>

      <section className="mt-8 glass-panel p-6">
        <h2 className="text-lg font-semibold text-primary">本年度榜单入口</h2>
        <div className="mt-4 grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          <Link href={`/huadianbang/${latestYear}`} className="rounded-xl border border-border bg-surface-elevated p-4 hover:border-accent/40">
            <h3 className="text-base font-semibold text-primary">{latestYear} 年度榜单</h3>
            <p className="mt-1 text-sm text-muted">包含年度背景、评选维度、十大推荐品牌与获奖企业信息。</p>
          </Link>
          <Link href="/huadianbang/feature" className="rounded-xl border border-border bg-surface-elevated p-4 hover:border-accent/40">
            <h3 className="text-base font-semibold text-primary">特色奖项</h3>
            <p className="mt-1 text-sm text-muted">查看工艺、设计、服务、数字化等特色奖项结构。</p>
          </Link>
          <Link href="/huadianbang/partner" className="rounded-xl border border-border bg-surface-elevated p-4 hover:border-accent/40">
            <h3 className="text-base font-semibold text-primary">配套商推荐</h3>
            <p className="mt-1 text-sm text-muted">查看配套商分类白名单与详情页可核验信息。</p>
          </Link>
        </div>
      </section>

      <section className="mt-8 glass-panel p-6">
        <h2 className="text-lg font-semibold text-primary">往届榜单归档</h2>
        <div className="mt-4 flex flex-wrap gap-2">
          {archiveYears.map((year) => (
            <Link key={year} href={`/huadianbang/${year}`} className="px-3 py-1.5 text-sm rounded-full border border-border hover:border-accent/40">
              {year} 年归档
            </Link>
          ))}
        </div>
      </section>

      <section className="mt-8 glass-panel p-6">
        <h2 className="text-lg font-semibold text-primary">结构导航</h2>
        <div className="mt-4 grid sm:grid-cols-2 gap-3 text-sm">
          <Link href={`/huadianbang/${latestYear}`} className="rounded-xl border border-border p-4 hover:border-accent/40">
            <h3 className="font-semibold text-primary">年度榜单</h3>
            <p className="mt-1 text-muted">年度评选主页面，包含十大推荐品牌与企业详情入口。</p>
          </Link>
          <Link href="/huadianbang/feature" className="rounded-xl border border-border p-4 hover:border-accent/40">
            <h3 className="font-semibold text-primary">特色奖项</h3>
            <p className="mt-1 text-muted">特色奖项定义、标准、获奖企业与说明。</p>
          </Link>
          <Link href="/huadianbang/partner" className="rounded-xl border border-border p-4 hover:border-accent/40">
            <h3 className="font-semibold text-primary">配套商推荐</h3>
            <p className="mt-1 text-muted">{Object.values(ENGINEER_CATEGORY_LABELS).join("、")}分类推荐。</p>
          </Link>
        </div>
      </section>
    </main>
  );
}

