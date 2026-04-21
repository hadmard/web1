import Link from "next/link";
import type { Metadata } from "next";
import { buildPageMetadata } from "@/lib/seo";
import { DEFAULT_NEWS_SHARE_IMAGE } from "@/lib/news-sharing";
import { prisma } from "@/lib/prisma";
import { articleOrderByPinnedLatest } from "@/lib/articles";
import { buildNewsPath, getArticleSegment } from "@/lib/share-config";
import { decodeEscapedUnicode } from "@/lib/text";

export const revalidate = 300;
export const dynamic = "force-dynamic";

const TEXT = {
  home: "首页",
  news: "整木资讯",
  trends: "行业趋势",
  enterprise: "企业动态",
  tech: "技术发展",
  events: "行业活动",
  searchLabel: "栏目内搜索",
  searchAction: "搜索本栏目",
  heroDesc:
    "整木资讯行业趋势栏目，聚合整木定制价格、预算、选购与门店工厂运营等高频问题内容。",
  seoIntro:
    "本栏目汇总整木定制相关的价格、预算、选购及行业运营问题，涵盖整木定制多少钱一平、整木定制预算怎么控制、整木定制怎么选品牌等高频搜索问题。同时也包含整木门店成交、整木工厂获客与询盘转化等实际运营内容，帮助业主与从业者更清晰地了解整木定制决策逻辑与行业实际情况。",
  empty: "当前栏目还没有已发布内容。",
} as const;

const SIBLING_LINKS = [
  { href: "/news/trends", title: TEXT.trends, active: true },
  { href: "/news/enterprise", title: TEXT.enterprise, active: false },
  { href: "/news/tech", title: TEXT.tech, active: false },
  { href: "/news/events", title: TEXT.events, active: false },
] as const;

export async function generateMetadata(): Promise<Metadata> {
  return buildPageMetadata({
    title: "整木定制多少钱一平？怎么选不踩坑｜预算与门店工厂问题全解",
    description: TEXT.seoIntro,
    path: "/news/trends",
    type: "website",
    image: DEFAULT_NEWS_SHARE_IMAGE,
    absoluteTitle: true,
  });
}

export default async function NewsTrendsPage() {
  const items = await prisma.article.findMany({
    where: {
      status: "approved",
      OR: [{ subHref: "/news/trends" }, { categoryHref: "/news/trends" }],
    },
    orderBy: articleOrderByPinnedLatest,
    take: 24,
    select: {
      id: true,
      title: true,
      slug: true,
      excerpt: true,
      publishedAt: true,
      updatedAt: true,
    },
  });

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 sm:py-12">
      <nav className="mb-8 flex flex-wrap items-center gap-x-2 gap-y-2 text-sm text-muted" aria-label="面包屑">
        <Link href="/" className="hover:text-accent">{TEXT.home}</Link>
        <span>/</span>
        <Link href="/news" className="hover:text-accent">{TEXT.news}</Link>
        <span>/</span>
        <span className="text-primary">{TEXT.trends}</span>
      </nav>

      <section className="glass-panel relative overflow-hidden p-5 sm:p-7 lg:p-9">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(212,194,158,0.18),transparent_34%),radial-gradient(circle_at_bottom_right,rgba(207,221,236,0.18),transparent_30%)]" />
        <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-[linear-gradient(90deg,transparent,rgba(194,182,154,0.58),transparent)]" />
        <div className="relative">
          <div className="max-w-3xl">
            <h1 className="font-serif text-[2rem] font-semibold tracking-[-0.02em] text-primary sm:text-[2.7rem] lg:text-[3.3rem]">
              {TEXT.trends}
            </h1>
            <p className="mt-3 max-w-[46rem] text-[15px] leading-8 text-muted sm:mt-4 sm:text-[15px]">
              {TEXT.heroDesc}
            </p>
            <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="text-xs font-medium uppercase tracking-[0.12em] text-[#9a8560]">
                {TEXT.searchLabel}
              </div>
              <Link
                href="/news/all?sub=%2Fnews%2Ftrends&search=1"
                className="group inline-flex w-full items-center justify-center gap-2 rounded-full border border-[rgba(194,182,154,0.34)] bg-[linear-gradient(180deg,rgba(255,252,246,0.98),rgba(246,240,231,0.94))] px-4 py-3 text-sm font-medium text-primary shadow-[0_16px_34px_-26px_rgba(180,154,107,0.42),inset_0_1px_0_rgba(255,255,255,0.92)] transition-all duration-200 hover:-translate-y-0.5 hover:border-[rgba(170,154,122,0.46)] hover:text-accent sm:w-auto sm:px-5 sm:py-2.5"
              >
                <svg viewBox="0 0 20 20" className="h-4 w-4 text-[#9a8256] transition-transform duration-200 group-hover:scale-105" fill="none" aria-hidden="true">
                  <circle cx="8.5" cy="8.5" r="4.75" stroke="currentColor" strokeWidth="1.5" />
                  <path d="M12.2 12.2 16 16" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                </svg>
                <span>{TEXT.searchAction}</span>
              </Link>
            </div>
          </div>
        </div>

        <div className="relative mt-6 flex flex-wrap items-center gap-2.5 border-t border-[rgba(194,182,154,0.18)] pt-4 sm:mt-8 sm:pt-5">
          {SIBLING_LINKS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`min-w-[calc(50%-0.3125rem)] justify-center rounded-full border px-3.5 py-2 text-sm transition-colors sm:min-w-0 sm:justify-start sm:px-3.5 sm:py-1.5 ${
                item.active
                  ? "border-[rgba(180,154,107,0.42)] bg-[linear-gradient(180deg,rgba(255,252,246,0.96),rgba(246,240,231,0.94))] text-[#8a734d] shadow-[0_10px_22px_rgba(180,154,107,0.12)]"
                  : "border-border bg-white/72 text-muted hover:text-primary"
              }`}
            >
              {item.title}
            </Link>
          ))}
        </div>
      </section>

      <div className="mt-6 rounded-[24px] border border-border bg-[rgba(255,255,255,0.82)] p-5 sm:p-6">
        <p className="text-sm leading-8 text-muted sm:text-[15px]">{TEXT.seoIntro}</p>
      </div>

      <section className="mt-8 rounded-[28px] border border-border bg-[rgba(255,255,255,0.82)] p-5 sm:p-6">
        {items.length === 0 ? (
          <p className="text-sm text-muted">{TEXT.empty}</p>
        ) : (
          <ul className="grid gap-4">
            {items.map((item) => (
              <li key={item.id} className="rounded-[22px] border border-border bg-surface-elevated p-4 sm:p-6">
                <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between sm:gap-3">
                  <div className="flex items-center gap-2 text-xs uppercase tracking-[0.08em] text-muted">
                    <span className="inline-block h-1.5 w-1.5 rounded-full bg-[rgba(180,154,107,0.86)]" />
                    <span>{TEXT.trends}</span>
                  </div>
                  <span className="text-xs text-muted">
                    {(item.publishedAt ?? item.updatedAt).toLocaleDateString("zh-CN")}
                  </span>
                </div>
                <Link href={buildNewsPath(getArticleSegment(item))} className="mt-2 block text-[1rem] font-medium leading-8 text-primary hover:text-accent sm:mt-3 sm:text-[1.1rem]">
                  {decodeEscapedUnicode(item.title)}
                </Link>
                {item.excerpt ? (
                  <p className="mt-2 line-clamp-3 text-sm leading-7 text-muted sm:mt-3">
                    {decodeEscapedUnicode(item.excerpt)}
                  </p>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
