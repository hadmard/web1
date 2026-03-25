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
    "整木市场总览，支持关键词与区域筛选，帮助用户快速定位合适品牌。"
  );
}

export default async function BrandsAllPage({ searchParams }: Props) {
  const params = await searchParams;
  const q = (params.q ?? "").trim();
  const region = (params.region ?? "").trim();
  const page = Math.max(1, Number.parseInt(params.page ?? "1", 10) || 1);
  const { items, recommended, total, totalPages, page: safePage } = await getBrandDirectory({
    q,
    region,
    page,
    pageSize: PAGE_SIZE,
  });

  const buildQuery = (overrides: Partial<Record<"page" | "q" | "region", string>>) => {
    const merged = {
      q,
      region,
      page: String(safePage),
      ...overrides,
    };

    const sp = new URLSearchParams();
    if (merged.q) sp.set("q", merged.q);
    if (merged.region) sp.set("region", merged.region);
    if (merged.page && merged.page !== "1") sp.set("page", merged.page);
    return `/brands/all${sp.toString() ? `?${sp.toString()}` : ""}`;
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
      <nav className="mb-6 text-sm text-muted" aria-label="面包屑">
        <Link href="/" className="hover:text-accent">首页</Link>
        <span className="mx-2">/</span>
        <Link href="/brands" className="hover:text-accent">整木市场</Link>
        <span className="mx-2">/</span>
        <span className="text-primary">品牌总览</span>
      </nav>

      <section className="overflow-hidden rounded-[32px] border border-border bg-[radial-gradient(circle_at_top,rgba(213,183,131,0.16),transparent_36%),linear-gradient(180deg,rgba(255,255,255,0.98),rgba(246,241,233,0.94))] shadow-[0_24px_72px_rgba(15,23,42,0.06)]">
        <div className="grid gap-0 xl:grid-cols-[1.06fr,0.94fr]">
          <div className="p-6 sm:p-8">
            <p className="text-xs uppercase tracking-[0.24em] text-accent">Brand Directory</p>
            <h1 className="mt-3 font-serif text-3xl font-semibold text-primary sm:text-4xl">品牌总览</h1>
            <p className="mt-4 max-w-2xl text-sm leading-8 text-muted">
              展示企业会员迁移后的真实品牌数据。前台摘要、Logo、地区与联系方式统一走企业实时字段，避免旧快照和导入脏数据影响展示。
            </p>
            <div className="mt-5 flex flex-wrap gap-3 text-sm">
              <span className="rounded-full border border-[rgba(180,154,107,0.22)] bg-white/80 px-4 py-2 text-primary">当前共 {total} 家</span>
              <span className="rounded-full border border-[rgba(180,154,107,0.22)] bg-white/80 px-4 py-2 text-primary">推荐品牌优先展示</span>
            </div>
          </div>
          <div className="border-t border-border/70 p-6 sm:p-8 xl:border-l xl:border-t-0">
            <form method="get" className="grid gap-3 rounded-[24px] border border-border bg-white/82 p-5 shadow-[0_14px_36px_rgba(15,23,42,0.05)]">
              <div>
                <label className="mb-1 block text-xs text-muted">关键词</label>
                <input name="q" defaultValue={q} className="h-12 w-full rounded-[18px] border border-border bg-surface px-4 text-sm text-primary" placeholder="品牌名 / 企业名 / 产品体系 / 地区关键词" />
              </div>
              <input type="hidden" name="region" value={region} />
              <div className="flex flex-wrap gap-2">
                <button className="rounded-full bg-accent px-5 py-2.5 text-sm font-medium text-white">筛选品牌</button>
                <Link href="/brands/all" className="rounded-full border border-border bg-white px-5 py-2.5 text-sm text-primary transition hover:bg-surface">重置筛选</Link>
              </div>
            </form>
          </div>
        </div>
      </section>

      <section className="mt-6 flex flex-wrap gap-2 text-xs">
        <Link href={buildQuery({ region: "", page: "1" })} className={`rounded-full border px-3 py-1.5 ${region === "" ? "border-accent bg-[rgba(180,154,107,0.08)] text-accent" : "border-border text-muted hover:text-primary"}`}>
          全部
        </Link>
        {REGION_OPTIONS.map((item) => (
          <Link key={item} href={buildQuery({ region: item, page: "1" })} className={`rounded-full border px-3 py-1.5 ${region === item ? "border-accent bg-[rgba(180,154,107,0.08)] text-accent" : "border-border text-muted hover:text-primary"}`}>
            {item}
          </Link>
        ))}
      </section>

      {recommended.length > 0 ? (
        <section className="mt-8">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-[0.24em] text-accent">Featured Brands</p>
              <h2 className="mt-1 font-serif text-2xl text-primary">推荐品牌</h2>
            </div>
            <p className="text-sm text-muted">VIP 企业与推荐品牌会在这里优先展示。</p>
          </div>

          <div className="grid gap-4 lg:grid-cols-3">
            {recommended.map((item) => {
              const href = item.enterprise ? `/enterprise/${item.enterprise.id}` : `/brands/${item.slug}`;
              return (
                <Link
                  key={`featured-${item.id}`}
                  href={href}
                  className="overflow-hidden rounded-[28px] border border-[rgba(175,143,88,0.18)] bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(246,240,231,0.92))] p-6 shadow-[0_18px_60px_rgba(34,31,26,0.08)] transition hover:-translate-y-1 hover:shadow-[0_24px_72px_rgba(34,31,26,0.12)]"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-[11px] uppercase tracking-[0.18em] text-[#8a734d]">{item.memberType === "enterprise_advanced" ? "高级企业" : "推荐企业"}</p>
                      <h3 className="mt-2 font-serif text-2xl text-primary">{item.enterpriseName}</h3>
                    </div>
                    <span className="rounded-full bg-accent px-3 py-1 text-[11px] text-white">推荐</span>
                  </div>
                  <p className="mt-4 line-clamp-4 text-sm leading-7 text-muted">{item.summary}</p>
                  <div className="mt-5 flex flex-wrap gap-2 text-xs text-muted">
                    <span className="rounded-full border border-border px-2.5 py-1">{item.region}</span>
                    {item.area ? <span className="rounded-full border border-border px-2.5 py-1">{item.area}</span> : null}
                    {item.enterprise?.productSystem ? <span className="rounded-full border border-border px-2.5 py-1">{item.enterprise.productSystem}</span> : null}
                  </div>
                  <div className="mt-5 flex items-center justify-between text-sm">
                    <span className="text-accent">联系品牌</span>
                    <span className="text-primary">查看详情</span>
                  </div>
                </Link>
              );
            })}
          </div>
        </section>
      ) : null}

      <section className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {items.length === 0 ? (
          <article className="glass-panel sm:col-span-2 lg:col-span-3 p-8 text-center text-sm text-muted">暂无符合条件的品牌数据。</article>
        ) : (
          items.map((item) => {
            const href = item.enterprise ? `/enterprise/${item.enterprise.id}` : `/brands/${item.slug}`;
            const updated = item.updatedAt.toLocaleDateString("zh-CN");

            return (
              <Link key={item.id} href={href} className="group block rounded-[28px] border border-border bg-white p-5 shadow-[0_16px_40px_rgba(15,23,42,0.05)] transition hover:-translate-y-1 hover:border-accent/35 hover:shadow-[0_24px_56px_rgba(15,23,42,0.08)]">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-[11px] uppercase tracking-[0.12em] text-muted">{item.memberType === "enterprise_advanced" ? "高级企业" : "企业会员"}</p>
                    <h2 className="mt-1 line-clamp-1 font-serif text-xl text-primary">{item.enterpriseName}</h2>
                  </div>
                  {item.logoUrl ? (
                    <Image src={resolveUploadedImageUrl(item.logoUrl)} alt={`${item.enterpriseName} logo`} width={64} height={64} className="h-16 w-16 rounded-[18px] border border-border bg-white object-contain p-2 shadow-[0_10px_24px_rgba(15,23,42,0.04)]" />
                  ) : (
                    <div className="flex h-16 w-16 items-center justify-center rounded-[18px] border border-dashed border-border text-[11px] text-muted">LOGO</div>
                  )}
                </div>
                <p className="mt-4 line-clamp-4 text-sm leading-7 text-muted">{item.summary}</p>
                <div className="mt-4 flex flex-wrap gap-2 text-xs text-muted">
                  <span className="rounded-full border border-border px-2.5 py-1">{item.region}</span>
                  {item.area ? <span className="rounded-full border border-border px-2.5 py-1">{item.area}</span> : null}
                </div>
                <div className="mt-5 flex items-center justify-between text-sm">
                  <span className="text-muted">更新于 {updated}</span>
                  <span className="text-accent transition group-hover:translate-x-0.5">查看详情</span>
                </div>
              </Link>
            );
          })
        )}
      </section>

      <div className="mt-8 flex items-center justify-between text-sm">
        <span className="text-muted">第 {safePage} / {totalPages} 页</span>
        <div className="flex gap-2">
          <Link href={buildQuery({ page: String(Math.max(1, safePage - 1)) })} className={`rounded-full border px-4 py-2 ${safePage <= 1 ? "pointer-events-none opacity-50 border-border text-muted" : "border-border text-primary hover:bg-surface"}`}>
            上一页
          </Link>
          <Link href={buildQuery({ page: String(Math.min(totalPages, safePage + 1)) })} className={`rounded-full border px-4 py-2 ${safePage >= totalPages ? "pointer-events-none opacity-50 border-border text-muted" : "border-border text-primary hover:bg-surface"}`}>
            下一页
          </Link>
        </div>
      </div>
    </div>
  );
}
