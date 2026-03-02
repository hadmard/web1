import Link from "next/link";
import { ScrollMotion } from "@/components/ScrollMotion";
import { StructuredSearch } from "@/components/StructuredSearch";
import { ENGINEER_CATEGORY_LABELS, getLatestHuadianYear, getTop10ByYear } from "@/lib/huadianbang";
import { prisma } from "@/lib/prisma";
import { getSiteVisualSettings } from "@/lib/site-visual-settings";
export const revalidate = 300;


const QUICK_ENTRIES = [
  { href: "/news", label: "整木资讯" },
  { href: "/brands", label: "整木品牌" },
  { href: "/dictionary", label: "整木词库" },
  { href: "/standards", label: "整木标准" },
  { href: "/awards", label: "整木评选" },
];

const REGION_ORDER = ["华东", "华中", "华南", "西南", "西北", "华北", "东北"];

function pick<T>(arr: T[], n: number) {
  return arr.slice(0, n);
}

function isReadableLabel(text: string | null | undefined): boolean {
  if (!text) return false;
  const t = text.trim();
  if (!t) return false;
  if (t.includes("?")) return false;
  if (/^[BTSDW]-\d{14}$/.test(t)) return false;
  return true;
}

export default async function HomePage() {
  const [visualSettings, latestNews, hotNews, latestBrands, latestTerms, latestStandards, latestAwards, enterprises] = await Promise.all([
    getSiteVisualSettings(),
    prisma.article.findMany({
      where: { status: "approved", OR: [{ categoryHref: { startsWith: "/news" } }, { subHref: { startsWith: "/news" } }] },
      orderBy: [{ publishedAt: "desc" }, { updatedAt: "desc" }],
      take: 6,
      select: { id: true, title: true, slug: true },
    }),
    prisma.article.findMany({
      where: { status: "approved", OR: [{ categoryHref: { startsWith: "/news" } }, { subHref: { startsWith: "/news" } }] },
      orderBy: [{ viewCount: "desc" }, { publishedAt: "desc" }, { updatedAt: "desc" }],
      take: 6,
      select: { id: true, title: true, slug: true },
    }),
    prisma.article.findMany({
      where: { status: "approved", OR: [{ categoryHref: { startsWith: "/brands" } }, { subHref: { startsWith: "/brands" } }] },
      orderBy: [{ publishedAt: "desc" }, { updatedAt: "desc" }],
      take: 8,
      select: { id: true, title: true, slug: true },
    }),
    prisma.article.findMany({
      where: { status: "approved", OR: [{ categoryHref: { startsWith: "/dictionary" } }, { subHref: { startsWith: "/dictionary" } }] },
      orderBy: [{ publishedAt: "desc" }, { updatedAt: "desc" }],
      take: 8,
      select: { id: true, title: true, slug: true },
    }),
    prisma.article.findMany({
      where: { status: "approved", OR: [{ categoryHref: { startsWith: "/standards" } }, { subHref: { startsWith: "/standards" } }] },
      orderBy: [{ publishedAt: "desc" }, { updatedAt: "desc" }],
      take: 8,
      select: { id: true, title: true, slug: true, versionLabel: true },
    }),
    prisma.award.findMany({
      orderBy: [{ year: "desc" }, { updatedAt: "desc" }],
      take: 8,
      select: { id: true, title: true, slug: true, year: true },
    }),
    prisma.enterprise.findMany({
      orderBy: { updatedAt: "desc" },
      take: 8,
      select: {
        id: true,
        region: true,
        area: true,
        positioning: true,
        member: { select: { name: true, memberType: true } },
      },
    }),
  ]);

  const regionMap = new Map<string, number>();
  REGION_ORDER.forEach((r) => regionMap.set(r, 0));
  enterprises.forEach((e) => {
    const region = (e.region || "").trim();
    if (regionMap.has(region)) regionMap.set(region, (regionMap.get(region) ?? 0) + 1);
  });

  const safeBrands = latestBrands.filter((x) => isReadableLabel(x.title));
  const safeTerms = latestTerms.filter((x) => isReadableLabel(x.title));
  const safeStandards = latestStandards.filter((x) => isReadableLabel(x.title));
  const safeAwards = latestAwards.filter((x) => isReadableLabel(x.title));
  const huadianYear = getLatestHuadianYear();
  const huadianTop10 = getTop10ByYear(huadianYear);
  const huadianPartner = Object.values(ENGINEER_CATEGORY_LABELS).slice(0, 3);

  const structureCards = [
    {
      title: "整木品牌",
      subtitle: "品牌选择与选购问答",
      desc: "从品牌定位到整木选购 FAQ，快速完成品牌对比与决策。",
      href: "/brands/all",
      image: visualSettings.backgrounds.homeStructureMarket,
      items: safeBrands.map((x) => ({ label: x.title, href: `/brands/${x.slug}` })),
    },
    {
      title: "整木词库",
      subtitle: "术语与知识结构",
      desc: "沉淀概念定义、工艺术语与行业语义，形成统一表达。",
      href: "/dictionary/all",
      image: visualSettings.backgrounds.homeStructureDictionary,
      items: safeTerms.map((x) => ({ label: x.title, href: `/dictionary/${x.slug}` })),
    },
    {
      title: "整木标准",
      subtitle: "材料 / 工艺 / 服务",
      desc: "以结构化标准体系支撑落地执行与跨团队协作。",
      href: "/standards/all",
      image: visualSettings.backgrounds.homeStructureStandards,
      items: safeStandards.map((x) => ({ label: `${x.versionLabel ? `${x.versionLabel} · ` : ""}${x.title}`, href: `/standards/${x.slug || x.id}` })),
    },
    {
      title: "整木评选",
      subtitle: "规则透明、流程可追溯",
      desc: "以公开规则、评审机制和公示流程建立行业公信力。",
      href: "/awards",
      image: visualSettings.backgrounds.homeStructureAwards,
      items: safeAwards.map((x) => ({ label: `${x.year ? `${x.year} · ` : ""}${x.title}`, href: `/awards/${x.slug || x.id}` })),
    },
  ];
  const topAd = visualSettings.ads.homeTop;
  const middleAd = visualSettings.ads.homeMiddle;

  return (
    <main className="min-h-screen">
      <ScrollMotion />

      <section className="relative overflow-hidden border-b border-border py-20 sm:py-28" data-mouse-zone>
        <div className="pointer-events-none absolute inset-0 parallax-layer" data-parallax="0.05">
          <img
            src={visualSettings.backgrounds.homeHero}
            alt=""
            className="h-full w-full object-cover brightness-125 saturate-95"
          />
        </div>
        <div className="pointer-events-none absolute inset-0 bg-surface/22" />
        <div className="max-w-6xl mx-auto px-4 sm:px-6 relative">
          <div data-reveal="zoom-soft" data-reveal-delay="0" className="text-center">
            <p className="text-xs sm:text-sm uppercase tracking-[0.16em] text-muted">整木行业知识基础设施平台</p>
            <h1 className="mt-5 font-serif text-[2.15rem] sm:text-6xl lg:text-7xl font-semibold tracking-[0.06em] text-primary">整木网</h1>
            <p className="mt-5 text-[15px] sm:text-base text-muted max-w-3xl mx-auto">让行业资讯、品牌、标准与评选在一个界面里高效协同。</p>
          </div>

          <nav
            data-reveal="fade-up"
            data-reveal-delay="100"
            className="mt-8 -mx-1 flex gap-2.5 overflow-x-auto px-1 pb-1 no-scrollbar sm:mx-0 sm:flex-wrap sm:justify-center sm:overflow-visible sm:px-0"
            aria-label="快捷入口"
          >
            {QUICK_ENTRIES.map((item) => (
              <Link key={item.href} href={item.href} className="interactive-lift shrink-0 rounded-full border border-border bg-surface-elevated/90 px-4 py-2 text-sm text-primary hover:border-accent/40 hover:text-accent">
                {item.label}
              </Link>
            ))}
            <Link href="/dictionary/all" className="interactive-lift shrink-0 rounded-full border border-border bg-surface-elevated/90 px-4 py-2 text-sm text-primary hover:border-accent/40 hover:text-accent">
              搜索
            </Link>
          </nav>

          <div data-reveal="fade-up" data-reveal-delay="140" className="mt-5 flex justify-center">
            <StructuredSearch />
          </div>

          {topAd.enabled && (
            <Link
              data-reveal="fade-up"
              data-reveal-delay="180"
              href={topAd.href || "/membership"}
              className="mt-6 block overflow-hidden rounded-2xl border border-border bg-surface-elevated/95 hover:border-accent/45 transition-colors"
            >
              <div className="relative h-24 sm:h-28">
                <img src={topAd.imageUrl} alt={topAd.title} className="h-full w-full object-cover" />
                <div className="absolute inset-0 bg-gradient-to-r from-black/35 to-transparent" />
                <p className="absolute left-4 bottom-3 text-sm font-medium text-white">{topAd.title}</p>
              </div>
            </Link>
          )}
        </div>
      </section>

      <section className="section-tone-a border-b border-border py-14 sm:py-16">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div data-reveal="zoom-soft" className="relative mb-6 overflow-hidden rounded-2xl border border-border">
            <img
              src={visualSettings.backgrounds.homeUpdates}
              alt=""
              className="h-40 sm:h-52 w-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-r from-surface/82 via-surface/45 to-transparent" />
          </div>
          <h2 data-reveal="fade-up" className="section-label text-primary mb-6">资讯速览</h2>
          <div className="grid lg:grid-cols-3 gap-4">
            <article data-reveal="fade-left" data-reveal-delay="60" className="glass-panel p-5 lg:col-span-2">
              <p className="text-[13px] sm:text-sm text-muted mb-2">整木资讯</p>
              <h3 className="font-serif text-lg font-semibold text-primary mb-3">最新发布</h3>
              <ul className="space-y-2">
                {latestNews.map((x) => (
                  <li key={x.id}>
                    <Link href={`/news/${x.slug}`} className="text-sm text-primary hover:text-accent">{x.title}</Link>
                  </li>
                ))}
              </ul>
              <Link href="/news/all" className="mt-4 inline-block text-sm font-medium text-accent hover:underline">查看更多</Link>
            </article>

            <article data-reveal="fade-right" data-reveal-delay="120" className="glass-panel p-5">
              <p className="text-[13px] sm:text-sm text-muted mb-2">高频阅读</p>
              <h3 className="font-serif text-lg font-semibold text-red-600 mb-3">热门内容</h3>
              <ul className="space-y-2">
                {hotNews.map((x) => (
                  <li key={x.id}>
                    <Link href={`/news/${x.slug}`} className="text-sm text-primary hover:text-accent">{x.title}</Link>
                  </li>
                ))}
              </ul>
              <Link href="/news/all?sort=latest" className="mt-4 inline-block text-sm font-medium text-accent hover:underline">查看更多</Link>
            </article>
          </div>
        </div>
      </section>

      <section className="section-tone-b border-b border-border py-14 sm:py-16">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="grid lg:grid-cols-2 gap-4" data-reveal-stagger="85">
            {structureCards.map((card) => (
              <article key={card.title} data-reveal="zoom-soft" className="glass-panel p-5 sm:p-6 relative overflow-hidden">
                <div className="relative">
                  <div className="mb-4 overflow-hidden rounded-xl border border-border">
                    <img
                      src={card.image}
                      alt=""
                      className="h-32 w-full object-cover"
                    />
                  </div>
                  <p className="text-[13px] sm:text-sm text-muted">{card.subtitle}</p>
                  <h3 className="mt-1 font-serif text-xl sm:text-2xl font-semibold text-primary">{card.title}</h3>
                  <p className="mt-2 text-sm text-muted">{card.desc}</p>

                  <ul className="mt-4 space-y-2">
                    {pick(card.items, 5).map((item, idx) => (
                      <li key={item.href + idx}>
                        <Link href={item.href} className="text-sm text-primary hover:text-accent">{item.label}</Link>
                      </li>
                    ))}
                  </ul>

                  <Link href={card.href} className="mt-5 inline-block text-sm font-medium text-accent hover:underline">查看更多</Link>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="section-tone-c border-b border-border py-14 sm:py-16">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 grid lg:grid-cols-3 gap-4">
          <article data-reveal="fade-left" className="glass-panel p-5 lg:col-span-2">
            {middleAd.enabled ? (
              <Link href={middleAd.href || "/membership"} className="block">
                <div className="mb-3 overflow-hidden rounded-xl border border-border">
                  <img
                    src={middleAd.imageUrl}
                    alt={middleAd.title}
                    className="h-40 sm:h-48 w-full object-cover"
                  />
                </div>
                <p className="text-sm font-medium text-primary">{middleAd.title}</p>
              </Link>
            ) : (
              <div>
                <div className="mb-4 overflow-hidden rounded-xl border border-border">
                  <img
                    src={visualSettings.backgrounds.homeEnterprise}
                    alt=""
                    className="h-40 sm:h-48 w-full object-cover"
                  />
                </div>
                <p className="text-[13px] sm:text-sm text-muted mb-2">品牌生态</p>
                <h3 className="font-serif text-lg font-semibold text-primary mb-3">企业入口</h3>
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {pick(enterprises, 6).map((e) => (
                    <Link key={e.id} href={`/enterprise/${e.id}`} className="interactive-lift rounded-xl border border-border bg-surface p-3 block">
                      <p className="text-sm font-medium text-primary">{e.member.name ?? "企业会员"}</p>
                      <p className="text-[13px] text-muted mt-1">{e.area || e.region || "区域待补充"}</p>
                      <span className="mt-2 inline-block text-xs rounded-full px-2 py-0.5 border border-border text-muted">
                        {e.member.memberType === "enterprise_advanced" ? "高级会员" : e.member.memberType === "enterprise_basic" ? "基础会员" : "个人会员"}
                      </span>
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </article>

          <article data-reveal="fade-right" data-reveal-delay="80" className="glass-panel p-5">
            <p className="text-[13px] sm:text-sm text-muted mb-2">区域热度</p>
            <h3 className="font-serif text-lg font-semibold text-primary mb-3">品牌数量</h3>
            <ul className="space-y-2 text-sm">
              {REGION_ORDER.map((r) => (
                <li key={r} className="flex items-center justify-between">
                  <Link href={`/brands/all?region=${encodeURIComponent(r)}`} className="text-primary hover:text-accent">{r}</Link>
                  <span className="text-muted">{regionMap.get(r) ?? 0}</span>
                </li>
              ))}
            </ul>
          </article>
        </div>
      </section>

      <section className="section-tone-b border-b border-border py-14 sm:py-16">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <article data-reveal="zoom-soft" className="glass-panel p-6 sm:p-7">
            <div className="mb-4 overflow-hidden rounded-xl border border-border">
              <img
                src={visualSettings.backgrounds.homeHuadian}
                alt=""
                className="h-40 sm:h-48 w-full object-cover"
              />
            </div>
            <p className="text-[13px] sm:text-sm text-muted">信用推荐体系</p>
            <h2 className="mt-1 font-serif text-2xl sm:text-3xl font-semibold text-primary">华点榜 · 本年度信用推荐</h2>
            <p className="mt-3 text-sm text-muted">华点榜为长期运行信用体系，按年度更新并持续归档公示。</p>
            <div className="mt-6 grid lg:grid-cols-3 gap-4">
              <article className="lg:col-span-2 rounded-xl border border-border bg-surface-elevated p-4">
                <h3 className="text-sm font-semibold text-primary">本年度十大推荐品牌</h3>
                <ul className="mt-3 grid sm:grid-cols-2 gap-2">
                  {pick(huadianTop10, 10).map((x) => (
                    <li key={x.slug}>
                      <Link href={`/huadianbang/${huadianYear}/${x.slug}`} className="text-sm text-primary hover:text-accent">{x.name}</Link>
                    </li>
                  ))}
                </ul>
              </article>
              <article className="rounded-xl border border-border bg-surface-elevated p-4">
                <h3 className="text-sm font-semibold text-primary">本年度配套商推荐</h3>
                <ul className="mt-3 space-y-1.5">
                  {huadianPartner.map((x) => (
                    <li key={x}>
                      <Link href="/huadianbang/partner" className="text-sm text-primary hover:text-accent">{x}</Link>
                    </li>
                  ))}
                </ul>
              </article>
            </div>
            <div className="mt-6">
              <Link href={`/huadianbang/${huadianYear}`} className="text-sm font-medium text-accent hover:underline">查看完整榜单</Link>
            </div>
          </article>
        </div>
      </section>

      <section className="section-tone-a py-14 sm:py-16">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div data-reveal="fade-up" className="glass-panel p-7 sm:p-8 text-center">
            <h3 className="font-serif text-2xl sm:text-3xl font-semibold text-primary">加入整木网，进入行业结构</h3>
            <p className="mt-3 text-sm text-muted">会员系统不仅是发布入口，更是标准共建、内容协作与行业知识沉淀的工作空间。</p>
            <div className="mt-6 flex flex-wrap justify-center gap-2.5 sm:gap-3">
              <Link href="/membership" className="interactive-lift inline-flex items-center justify-center min-w-[9.25rem] rounded-xl bg-[var(--color-accent)] text-white px-5 py-2.5 text-sm font-medium">企业入驻</Link>
              <Link href="/membership" className="interactive-lift inline-flex items-center justify-center min-w-[9.25rem] rounded-xl border border-border bg-surface px-5 py-2.5 text-sm font-medium text-primary">个人入驻</Link>
              <Link href="/standards/co-create" className="interactive-lift inline-flex items-center justify-center min-w-[9.25rem] rounded-xl border border-border bg-surface px-5 py-2.5 text-sm font-medium text-primary">参与标准共建</Link>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}


