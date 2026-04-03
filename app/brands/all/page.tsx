import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { JsonLd } from "@/components/JsonLd";
import { getBrandDirectory } from "@/lib/brand-directory";
import { buildPageMetadata, absoluteUrl } from "@/lib/seo";
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
  return buildPageMetadata({
    title: "品牌总览",
    description: "整木市场总览，支持关键词与地区筛选，帮助用户快速定位合适品牌。",
    path: "/brands/all",
    type: "website",
  });
}

function BrandLogo({ name, logoUrl, size = 72 }: { name: string; logoUrl: string | null; size?: number }) {
  if (logoUrl) {
    return (
      <Image
        src={resolveUploadedImageUrl(logoUrl)}
        alt={`${name} logo`}
        width={size}
        height={size}
        className="rounded-[22px] border border-[rgba(174,149,111,0.18)] bg-white object-contain p-3 shadow-[0_12px_28px_rgba(15,23,42,0.05)]"
      />
    );
  }

  return (
    <div
      className="flex items-center justify-center rounded-[22px] border border-dashed border-[rgba(174,149,111,0.28)] bg-white text-[11px] tracking-[0.18em] text-[#8d7a5a]"
      style={{ width: size, height: size }}
    >
      LOGO
    </div>
  );
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

function truncateText(text: string, length: number) {
  const normalized = text.trim();
  if (normalized.length <= length) return normalized;
  return `${normalized.slice(0, Math.max(0, length)).trim()}...`;
}

type BrandCardItem = Awaited<ReturnType<typeof getBrandDirectory>>["items"][number];

function getMemberLabel(memberType: string) {
  return memberType === "enterprise_advanced" ? "高级企业" : "企业会员";
}

function getBrandTags(item: BrandCardItem) {
  return item.highlights.filter((tag) => tag.length <= 8).slice(0, 2).map((tag) => truncateText(tag, 8));
}

function BrandCard({ item, featured = false }: { item: BrandCardItem; featured?: boolean }) {
  const href = `/brands/${item.slug}`;
  const updated = item.updatedAt.toLocaleDateString("zh-CN");
  const logoSize = featured ? 72 : 58;
  const headline = truncateText(item.headline, featured ? 22 : 18);
  const summary = truncateText(item.summary, featured ? 66 : 42);
  const tags = getBrandTags(item);
  const memberLabel = getMemberLabel(item.memberType);
  const serviceLine = truncateText(item.serviceLine, featured ? 18 : 14);
  const locationLabel = truncateText(item.locationLabel, featured ? 18 : 14);
  const contactLabel = item.contactLabel === "查看详情" ? "品牌详情" : item.contactLabel;

  return (
    <article
      className={[
        "group h-full rounded-[26px] border border-[rgba(181,157,121,0.14)] bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(251,248,243,0.96))] shadow-[0_14px_32px_rgba(15,23,42,0.045)] transition hover:-translate-y-1 hover:border-[rgba(181,157,121,0.26)] hover:shadow-[0_20px_44px_rgba(15,23,42,0.07)]",
        featured ? "p-5" : "p-4.5",
      ].join(" ")}
    >
      <div className="flex h-full flex-col">
        <div className="flex items-start gap-3">
          <Link href={href} className="shrink-0">
            <BrandLogo name={item.enterpriseName} logoUrl={item.logoUrl} size={logoSize} />
          </Link>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2 text-[11px]">
              {item.isRecommend ? (
                <span className="rounded-full border border-[rgba(181,157,121,0.22)] bg-[rgba(245,236,220,0.82)] px-2.5 py-1 text-accent">
                  推荐品牌
                </span>
              ) : null}
              <span className="rounded-full border border-[rgba(181,157,121,0.14)] bg-white/82 px-2.5 py-1 text-muted">
                {memberLabel}
              </span>
            </div>
            <h2 className={featured ? "mt-3 font-serif text-[1.65rem] leading-tight text-primary" : "mt-2.5 font-serif text-[1.22rem] leading-tight text-primary"}>
              <Link href={href} className="transition hover:text-accent">
                {item.enterpriseName}
              </Link>
            </h2>
            <p className="mt-2 line-clamp-1 text-sm text-primary/84">{headline}</p>
          </div>
        </div>

        <div className="mt-4 rounded-[20px] bg-white/68 px-4 py-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <p className="text-[11px] uppercase tracking-[0.18em] text-[#9d7e4d]">地区</p>
              <p className="mt-1 line-clamp-1 text-sm text-primary">{locationLabel}</p>
            </div>
            <div>
              <p className="text-[11px] uppercase tracking-[0.18em] text-[#9d7e4d]">业务</p>
              <p className="mt-1 line-clamp-1 text-sm text-primary">{serviceLine}</p>
            </div>
          </div>
        </div>

        <p className={featured ? "mt-4 line-clamp-2 text-sm leading-7 text-muted" : "mt-4 line-clamp-2 text-sm leading-6 text-muted"}>
          {summary}
        </p>

        <div className="mt-4 flex flex-wrap gap-2 text-xs text-muted">
          {tags.length > 0
            ? tags.map((tag) => (
                <span key={tag} className="rounded-full border border-border bg-white/82 px-2.5 py-1">
                  {tag}
                </span>
              ))
            : (
                <span className="rounded-full border border-border bg-white/82 px-2.5 py-1">{item.region}</span>
              )}
        </div>

        <div className="mt-auto flex items-center justify-between gap-3 border-t border-[rgba(181,157,121,0.1)] pt-4 text-sm">
          <div className="min-w-0 text-xs text-muted">
            <span className="truncate">更新于 {updated}</span>
          </div>
          <Link
            href={href}
            className="shrink-0 rounded-full border border-[rgba(181,157,121,0.22)] bg-white px-4 py-2 text-sm text-primary transition group-hover:border-[rgba(181,157,121,0.34)] group-hover:text-accent"
          >
            {contactLabel}
          </Link>
        </div>
      </div>
    </article>
  );
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
  const visiblePages = buildVisiblePages(safePage, totalPages);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: "品牌总览",
    description: "整木市场总览页，集中展示推荐品牌与全部品牌，支持关键词与地区筛选。",
    url: absoluteUrl("/brands/all"),
    mainEntity: {
      "@type": "ItemList",
      itemListElement: items.slice(0, 12).map((item, index) => ({
        "@type": "ListItem",
        position: index + 1,
        url: absoluteUrl(`/brands/${item.slug}`),
        name: item.enterpriseName,
      })),
    },
  };

  return (
    <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:py-8">
      <JsonLd data={jsonLd} />

      <nav className="mb-6 text-sm text-muted" aria-label="面包屑">
        <Link href="/" className="hover:text-accent">首页</Link>
        <span className="mx-2">/</span>
        <Link href="/brands" className="hover:text-accent">整木市场</Link>
        <span className="mx-2">/</span>
        <span className="text-primary">品牌总览</span>
      </nav>

      <section className="overflow-hidden rounded-[30px] border border-[rgba(181,157,121,0.16)] bg-[radial-gradient(circle_at_top_left,rgba(213,183,131,0.13),transparent_30%),linear-gradient(180deg,rgba(255,255,255,0.98),rgba(247,242,235,0.94))] shadow-[0_22px_56px_rgba(34,31,26,0.06)]">
        <div className="grid gap-0 xl:grid-cols-[1.08fr,0.92fr]">
          <div className="p-6 sm:p-8">
            <p className="text-xs uppercase tracking-[0.3em] text-[#9d7e4d]">Brand Directory</p>
            <h1 className="mt-3 font-serif text-[2rem] text-primary sm:text-[2.4rem] sm:leading-[1.08]">品牌总览</h1>
          </div>
          <div className="border-t border-[rgba(181,157,121,0.16)] p-5 sm:p-7 xl:border-l xl:border-t-0">
            <form method="get" className="rounded-[24px] border border-[rgba(181,157,121,0.16)] bg-white/88 p-4 shadow-[0_12px_26px_rgba(15,23,42,0.04)]">
              <label className="block text-xs uppercase tracking-[0.18em] text-[#8d7a5a]">搜索品牌</label>
              <input
                name="q"
                defaultValue={q}
                className="mt-3 h-11 w-full rounded-[16px] border border-border bg-surface px-4 text-sm text-primary"
                placeholder="品牌名 / 企业名 / 产品体系 / 地区关键词"
              />
              <input type="hidden" name="region" value={region} />
              <div className="mt-4 flex flex-wrap gap-3">
                <button className="rounded-full bg-accent px-4 py-2 text-sm font-medium text-white">开始筛选</button>
                <Link href="/brands/all" className="rounded-full border border-border bg-white px-4 py-2 text-sm text-primary transition hover:bg-surface">
                  重置
                </Link>
              </div>
            </form>
          </div>
        </div>
      </section>

      <section className="mt-5 flex flex-wrap gap-2 text-xs" aria-label="地区筛选">
        <Link
          href={buildPageHref(q, "", 1)}
          className={`rounded-full border px-3 py-1.5 transition ${region === "" ? "border-accent bg-[rgba(180,154,107,0.08)] text-accent" : "border-border text-muted hover:border-[rgba(180,154,107,0.26)] hover:text-primary"}`}
        >
          全部
        </Link>
        {REGION_OPTIONS.map((item) => (
          <Link
            key={item}
            href={buildPageHref(q, item, 1)}
            className={`rounded-full border px-3 py-1.5 transition ${region === item ? "border-accent bg-[rgba(180,154,107,0.08)] text-accent" : "border-border text-muted hover:border-[rgba(180,154,107,0.26)] hover:text-primary"}`}
          >
            {item}
          </Link>
        ))}
      </section>

      {recommended.length > 0 ? (
        <section className="mt-8" aria-labelledby="recommended-brands-heading">
          <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-[#9d7e4d]">Recommended Brands</p>
              <h2 id="recommended-brands-heading" className="mt-1.5 font-serif text-[1.8rem] text-primary">
                推荐品牌
              </h2>
            </div>
          </div>

          <div className="grid gap-4 lg:grid-cols-3">
            {recommended.map((item) => (
              <BrandCard key={`recommended-${item.id}`} item={item} featured />
            ))}
          </div>
        </section>
      ) : null}

      <section className="mt-8" aria-labelledby="all-brands-heading">
        <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-[#9d7e4d]">All Brands</p>
            <h2 id="all-brands-heading" className="mt-1.5 font-serif text-[1.8rem] text-primary">
              全部品牌
            </h2>
          </div>
          <p className="text-sm text-muted">第 {safePage} / {totalPages} 页，共 {total} 条结果</p>
        </div>

        {items.length === 0 ? (
          <article className="rounded-[28px] border border-border bg-white p-10 text-center text-sm text-muted shadow-[0_14px_36px_rgba(15,23,42,0.05)]">
            暂无符合条件的品牌数据。
          </article>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {items.map((item) => (
              <BrandCard key={item.id} item={item} />
            ))}
          </div>
        )}
      </section>

      <nav className="mt-6 flex flex-col gap-4 rounded-[22px] border border-border bg-white p-4 text-sm shadow-[0_12px_28px_rgba(15,23,42,0.05)] sm:flex-row sm:items-center sm:justify-between" aria-label="分页导航">
        <span className="text-muted">当前为第 {safePage} 页，共 {totalPages} 页</span>
        <div className="flex flex-wrap items-center gap-2">
          <Link
            href={buildPageHref(q, region, Math.max(1, safePage - 1))}
            className={`rounded-full border px-4 py-2 ${safePage <= 1 ? "pointer-events-none border-border text-muted opacity-50" : "border-border text-primary hover:bg-surface"}`}
          >
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
          <Link
            href={buildPageHref(q, region, Math.min(totalPages, safePage + 1))}
            className={`rounded-full border px-4 py-2 ${safePage >= totalPages ? "pointer-events-none border-border text-muted opacity-50" : "border-border text-primary hover:bg-surface"}`}
          >
            下一页
          </Link>
        </div>
      </nav>
    </main>
  );
}
