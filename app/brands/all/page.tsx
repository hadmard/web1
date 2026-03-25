import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { buildCategoryMetadata } from "@/lib/category-metadata";
import { getBrandDirectory } from "@/lib/brand-directory";
import { resolveUploadedImageUrl } from "@/lib/uploaded-image";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type Props = {
  searchParams: Promise<{
    q?: string;
    region?: string;
    page?: string;
  }>;
};

const PAGE_SIZE = 18;
const REGION_OPTIONS = ["全国", "华东", "华中", "华南", "西南", "西北", "华北", "东北"] as const;

export async function generateMetadata(): Promise<Metadata> {
  return buildCategoryMetadata(
    "/brands",
    "整木市场",
    "整木市场总览，支持关键词与区域筛选，帮助用户快速定位合适品牌。",
  );
}

function BrandLogo({ name, logoUrl, size = 72 }: { name: string; logoUrl: string | null; size?: number }) {
  if (logoUrl) {
    return (
      <Image
        src={resolveUploadedImageUrl(logoUrl)}
        alt={`${name} logo`}
        width={size}
        height={size}
        className="h-[72px] w-[72px] rounded-[22px] border border-[rgba(174,149,111,0.18)] bg-white object-contain p-3 shadow-[0_12px_28px_rgba(15,23,42,0.05)]"
      />
    );
  }

  return <div className="flex h-[72px] w-[72px] items-center justify-center rounded-[22px] border border-dashed border-[rgba(174,149,111,0.28)] bg-white text-[11px] tracking-[0.18em] text-[#8d7a5a]">LOGO</div>;
}

function buildPageHref(q: string, region: string, page: number) {
  const sp = new URLSearchParams();
  if (q) sp.set("q", q);
  if (region) sp.set("region", region);
  if (page > 1) sp.set("page", String(page));
  return `/brands/all${sp.toString() ? `?${sp.toString()}` : ""}`;
}

function buildVisiblePages(current: number, total: number) {
  const pages = new Set([1, total, current - 1, current, current + 1]);
  return Array.from(pages)
    .filter((page) => page >= 1 && page <= total)
    .sort((a, b) => a - b);
}

export default async function BrandsAllPage({ searchParams }: Props) {
  const params = await searchParams;
  const q = (params.q ?? "").trim();
  const region = (params.region ?? "").trim();
  const requestedPage = Math.max(1, Number.parseInt(params.page ?? "1", 10) || 1);
  const { items, recommended, total, totalPages, page: safePage } = await getBrandDirectory({
    q,
    region,
    page: requestedPage,
    pageSize: PAGE_SIZE,
  });

  const featured = recommended[0] ?? null;
  const featuredAside = recommended.slice(1, 4);
  const visiblePages = buildVisiblePages(safePage, totalPages);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:py-10">
      <nav className="mb-6 text-sm text-muted" aria-label="面包屑">
        <Link href="/" className="hover:text-accent">首页</Link>
        <span className="mx-2">/</span>
        <Link href="/brands" className="hover:text-accent">整木市场</Link>
        <span className="mx-2">/</span>
        <span className="text-primary">品牌总览</span>
      </nav>

      <section className="overflow-hidden rounded-[36px] border border-[rgba(181,157,121,0.18)] bg-[radial-gradient(circle_at_top_left,rgba(213,183,131,0.15),transparent_32%),linear-gradient(180deg,rgba(255,255,255,0.98),rgba(247,242,235,0.92))] shadow-[0_28px_80px_rgba(34,31,26,0.07)]">
        <div className="grid gap-0 xl:grid-cols-[1.08fr,0.92fr]">
          <div className="p-7 sm:p-9">
            <p className="text-xs uppercase tracking-[0.3em] text-[#9d7e4d]">Brand Directory</p>
            <h1 className="mt-4 font-serif text-3xl text-primary sm:text-[2.8rem] sm:leading-[1.1]">整木品牌总览</h1>
            <div className="mt-6 flex flex-wrap gap-3 text-sm">
              <span className="rounded-full border border-[rgba(181,157,121,0.2)] bg-white/80 px-4 py-2 text-primary">当前品牌 {total} 家</span>
              <span className="rounded-full border border-[rgba(181,157,121,0.2)] bg-white/80 px-4 py-2 text-primary">推荐品牌优先展示</span>
              <span className="rounded-full border border-[rgba(181,157,121,0.2)] bg-white/80 px-4 py-2 text-primary">支持关键词与地区筛选</span>
            </div>
          </div>
          <div className="border-t border-[rgba(181,157,121,0.16)] p-6 sm:p-8 xl:border-l xl:border-t-0">
            <form method="get" className="rounded-[28px] border border-[rgba(181,157,121,0.18)] bg-white/86 p-5 shadow-[0_16px_38px_rgba(15,23,42,0.05)]">
              <label className="block text-xs uppercase tracking-[0.18em] text-[#8d7a5a]">搜索品牌</label>
              <input name="q" defaultValue={q} className="mt-3 h-12 w-full rounded-[18px] border border-border bg-surface px-4 text-sm text-primary" placeholder="品牌名 / 企业名 / 产品体系 / 地区关键词" />
              <input type="hidden" name="region" value={region} />
              <div className="mt-4 flex flex-wrap gap-3">
                <button className="rounded-full bg-accent px-5 py-2.5 text-sm font-medium text-white">开始筛选</button>
                <Link href="/brands/all" className="rounded-full border border-border bg-white px-5 py-2.5 text-sm text-primary transition hover:bg-surface">重置</Link>
              </div>
            </form>
          </div>
        </div>
      </section>

      <section className="mt-6 flex flex-wrap gap-2 text-xs">
        <Link href={buildPageHref(q, "", 1)} className={`rounded-full border px-3 py-1.5 transition ${region === "" ? "border-accent bg-[rgba(180,154,107,0.08)] text-accent" : "border-border text-muted hover:border-[rgba(180,154,107,0.26)] hover:text-primary"}`}>
          全部
        </Link>
        {REGION_OPTIONS.map((item) => (
          <Link key={item} href={buildPageHref(q, item, 1)} className={`rounded-full border px-3 py-1.5 transition ${region === item ? "border-accent bg-[rgba(180,154,107,0.08)] text-accent" : "border-border text-muted hover:border-[rgba(180,154,107,0.26)] hover:text-primary"}`}>
            {item}
          </Link>
        ))}
      </section>

      {featured ? (
        <section className="mt-8 grid gap-4 xl:grid-cols-[1.12fr,0.88fr]">
          <div className="group overflow-hidden rounded-[34px] border border-[rgba(175,143,88,0.18)] bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(246,240,231,0.92))] p-7 shadow-[0_24px_72px_rgba(34,31,26,0.08)] transition hover:-translate-y-1 hover:shadow-[0_28px_84px_rgba(34,31,26,0.12)]">
            <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
              <div className="max-w-2xl">
                <p className="text-xs uppercase tracking-[0.3em] text-[#9d7e4d]">Featured Brand</p>
                <Link
                  href={featured.enterprise ? `/enterprise/${featured.enterprise.id}` : `/brands/${featured.slug}`}
                  className="mt-4 inline-block font-serif text-3xl leading-tight text-primary transition hover:text-accent sm:text-[2.35rem]"
                >
                  {featured.enterpriseName}
                </Link>
                <p className="mt-4 text-base leading-8 text-primary/88">{featured.headline}</p>
                <p className="mt-4 text-sm leading-8 text-muted">{featured.summary}</p>
                <div className="mt-5 flex flex-wrap gap-2 text-xs text-muted">
                  {featured.highlights.map((item) => (
                    <span key={item} className="rounded-full border border-border px-3 py-1.5">{item}</span>
                  ))}
                </div>
              </div>
              <div className="flex flex-col items-start gap-4 sm:items-end">
                <span className="rounded-full bg-accent px-3.5 py-1.5 text-xs text-white">推荐品牌</span>
                <BrandLogo name={featured.enterpriseName} logoUrl={featured.logoUrl} size={88} />
              </div>
            </div>
            <div className="mt-8 grid gap-4 border-t border-[rgba(181,157,121,0.12)] pt-5 text-sm sm:grid-cols-[1fr,auto] sm:items-center">
              <div className="space-y-2 text-muted">
                <p>{featured.locationLabel}</p>
                <p>{featured.serviceLine}</p>
              </div>
              <div className="flex flex-wrap gap-3">
                {featured.contactHref ? (
                  <a
                    href={featured.contactHref}
                    target={featured.contactHref.startsWith("http") ? "_blank" : undefined}
                    rel={featured.contactHref.startsWith("http") ? "noreferrer" : undefined}
                    className="rounded-full border border-[rgba(181,157,121,0.2)] bg-white px-4 py-2 text-accent transition hover:bg-[rgba(255,249,238,0.92)]"
                  >
                    {featured.contactLabel}
                  </a>
                ) : (
                  <span className="rounded-full border border-[rgba(181,157,121,0.2)] bg-white px-4 py-2 text-accent">{featured.contactLabel}</span>
                )}
                <Link
                  href={featured.enterprise ? `/enterprise/${featured.enterprise.id}` : `/brands/${featured.slug}`}
                  className="rounded-full border border-[rgba(181,157,121,0.2)] bg-white px-4 py-2 text-primary transition hover:bg-[rgba(255,249,238,0.92)]"
                >
                  查看详情
                </Link>
              </div>
            </div>
          </div>

          <div className="grid gap-4">
            {featuredAside.map((item) => {
              const href = item.enterprise ? `/enterprise/${item.enterprise.id}` : `/brands/${item.slug}`;
              return (
                <Link key={`featured-${item.id}`} href={href} className="group rounded-[28px] border border-[rgba(181,157,121,0.16)] bg-white/92 p-5 shadow-[0_16px_40px_rgba(15,23,42,0.05)] transition hover:-translate-y-1 hover:shadow-[0_22px_54px_rgba(15,23,42,0.08)]">
                  <div className="flex items-start gap-4">
                    <BrandLogo name={item.enterpriseName} logoUrl={item.logoUrl} />
                    <div className="min-w-0 flex-1">
                      <p className="text-[11px] uppercase tracking-[0.2em] text-[#9d7e4d]">推荐</p>
                      <h3 className="mt-2 font-serif text-2xl text-primary">{item.enterpriseName}</h3>
                      <p className="mt-3 line-clamp-2 text-sm leading-7 text-primary/88">{item.headline}</p>
                      <p className="mt-2 line-clamp-2 text-sm leading-7 text-muted">{item.summary}</p>
                      <div className="mt-4 flex flex-wrap gap-2 text-xs text-muted">
                        {item.highlights.slice(0, 2).map((tag) => (
                          <span key={tag} className="rounded-full border border-border px-2.5 py-1">{tag}</span>
                        ))}
                      </div>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        </section>
      ) : null}

      <section className="mt-10">
        <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-[#9d7e4d]">All Brands</p>
            <h2 className="mt-2 font-serif text-2xl text-primary">全部品牌</h2>
          </div>
          <p className="text-sm text-muted">第 {safePage} / {totalPages} 页，共 {items.length} 条当前结果</p>
        </div>

        {items.length === 0 ? (
          <article className="rounded-[28px] border border-border bg-white p-10 text-center text-sm text-muted shadow-[0_14px_36px_rgba(15,23,42,0.05)]">暂无符合条件的品牌数据。</article>
        ) : (
          <div className="grid gap-4 lg:grid-cols-2">
            {items.map((item) => {
              const href = item.enterprise ? `/enterprise/${item.enterprise.id}` : `/brands/${item.slug}`;
              const updated = item.updatedAt.toLocaleDateString("zh-CN");
              return (
                <Link key={item.id} href={href} className="group block rounded-[30px] border border-[rgba(181,157,121,0.16)] bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(250,247,242,0.92))] p-5 shadow-[0_16px_40px_rgba(15,23,42,0.05)] transition hover:-translate-y-1 hover:border-[rgba(181,157,121,0.3)] hover:shadow-[0_22px_54px_rgba(15,23,42,0.08)] sm:p-6">
                  <div className="flex flex-col gap-5 sm:flex-row sm:items-start">
                    <div className="shrink-0">
                      <BrandLogo name={item.enterpriseName} logoUrl={item.logoUrl} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <p className="text-[11px] uppercase tracking-[0.18em] text-muted">{item.memberType === "enterprise_advanced" ? "高级企业" : "企业会员"}</p>
                          <h3 className="mt-2 font-serif text-[1.75rem] leading-tight text-primary">{item.enterpriseName}</h3>
                        </div>
                        {item.isRecommend ? <span className="rounded-full border border-[rgba(181,157,121,0.22)] bg-[rgba(245,236,220,0.8)] px-3 py-1 text-xs text-accent">推荐展示</span> : null}
                      </div>
                      <p className="mt-4 text-sm leading-7 text-primary/88">{item.headline}</p>
                      <p className="mt-2 text-sm leading-8 text-muted">{item.summary}</p>
                      <div className="mt-5 flex flex-wrap gap-2 text-xs text-muted">
                        {item.highlights.length > 0
                          ? item.highlights.map((tag) => (
                              <span key={tag} className="rounded-full border border-border px-3 py-1.5">{tag}</span>
                            ))
                          : <span className="rounded-full border border-border px-3 py-1.5">资料持续完善中</span>}
                      </div>
                      <div className="mt-6 flex flex-wrap items-center justify-between gap-3 text-sm">
                        <div className="flex flex-wrap gap-3 text-muted">
                          <span>更新于 {updated}</span>
                          <span>{item.locationLabel}</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="rounded-full border border-[rgba(181,157,121,0.18)] bg-white px-3.5 py-1.5 text-accent">{item.contactLabel}</span>
                          <span className="text-xs text-muted">{item.contactHref ? "支持进一步咨询" : "详情页查看联系信息"}</span>
                          <span className="text-primary transition group-hover:translate-x-0.5">查看详情</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </section>

      <div className="mt-8 flex flex-col gap-4 rounded-[24px] border border-border bg-white p-4 text-sm shadow-[0_14px_36px_rgba(15,23,42,0.05)] sm:flex-row sm:items-center sm:justify-between">
        <span className="text-muted">当前为第 {safePage} 页，共 {totalPages} 页</span>
        <div className="flex flex-wrap items-center gap-2">
          <Link href={buildPageHref(q, region, Math.max(1, safePage - 1))} className={`rounded-full border px-4 py-2 ${safePage <= 1 ? "pointer-events-none border-border text-muted opacity-50" : "border-border text-primary hover:bg-surface"}`}>
            上一页
          </Link>
          {visiblePages.map((page) => (
            <Link
              key={page}
              href={buildPageHref(q, region, page)}
              className={`rounded-full border px-4 py-2 ${page === safePage ? "border-accent bg-[rgba(180,154,107,0.08)] text-accent" : "border-border text-primary hover:bg-surface"}`}
            >
              {page}
            </Link>
          ))}
          <Link href={buildPageHref(q, region, Math.min(totalPages, safePage + 1))} className={`rounded-full border px-4 py-2 ${safePage >= totalPages ? "pointer-events-none border-border text-muted opacity-50" : "border-border text-primary hover:bg-surface"}`}>
            下一页
          </Link>
        </div>
      </div>
    </div>
  );
}
