import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { buildCategoryMetadata } from "@/lib/category-metadata";
import { getBrandDirectory } from "@/lib/brand-directory";
import { resolveUploadedImageUrl } from "@/lib/uploaded-image";

export const revalidate = 300;

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
    "整木市场总览，支持关键词、区域和时间筛选，快速定位合适品牌。"
  );
}

export default async function BrandsAllPage({ searchParams }: Props) {
  const params = await searchParams;
  const q = (params.q ?? "").trim();
  const region = (params.region ?? "").trim();
  const page = Math.max(1, parseInt(params.page ?? "1", 10) || 1);
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
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-10">
      <nav className="mb-6 text-sm text-muted" aria-label="面包屑">
        <Link href="/" className="hover:text-accent">首页</Link>
        <span className="mx-2">/</span>
        <Link href="/brands" className="hover:text-accent">整木市场</Link>
        <span className="mx-2">/</span>
        <span className="text-primary">品牌总览</span>
      </nav>

      <section className="glass-panel p-6 sm:p-7">
        <h1 className="font-serif text-2xl sm:text-3xl font-semibold text-primary">品牌总览</h1>
        <p className="mt-2 text-sm text-muted">展示企业会员迁移后的真实品牌数据。推荐品牌优先显示，共 {total} 家。</p>

        <div className="mt-4 flex flex-wrap gap-2 text-xs">
          <Link
            href={buildQuery({ region: "", page: "1" })}
            className={`px-2.5 py-1 rounded-full border ${region === "" ? "border-accent text-accent" : "border-border text-muted hover:text-primary"}`}
          >
            全部
          </Link>
          {REGION_OPTIONS.map((r) => (
            <Link
              key={r}
              href={buildQuery({ region: r, page: "1" })}
              className={`px-2.5 py-1 rounded-full border ${region === r ? "border-accent text-accent" : "border-border text-muted hover:text-primary"}`}
            >
              {r}
            </Link>
          ))}
        </div>

        <form method="get" className="mt-4 grid md:grid-cols-4 gap-3 rounded-xl border border-border bg-surface-elevated p-4">
          <div className="md:col-span-3">
            <label className="block text-xs text-muted mb-1">关键词</label>
            <input name="q" defaultValue={q} className="w-full border border-border rounded px-3 py-2 bg-surface" placeholder="品牌名/企业名/产品体系/地区关键词" />
          </div>
          <input type="hidden" name="region" value={region} />
          <div className="md:col-span-4 flex gap-2">
            <button className="px-4 py-2 rounded bg-accent text-white text-sm">筛选</button>
            <Link href="/brands/all" className="px-4 py-2 rounded border border-border text-sm text-primary hover:bg-surface">重置</Link>
          </div>
        </form>
      </section>

      {recommended.length > 0 ? (
        <section className="mt-6">
          <div className="mb-3 flex items-center justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-[0.24em] text-accent">Featured Brands</p>
              <h2 className="mt-1 font-serif text-2xl text-primary">推荐品牌</h2>
            </div>
            <p className="text-sm text-muted">VIP 企业与推荐品牌会在这里优先展示。</p>
          </div>

          <div className="grid gap-4 lg:grid-cols-3">
            {recommended.map((item) => (
              <Link
                key={`featured-${item.id}`}
                href={item.enterprise ? `/enterprise/${item.enterprise.id}` : `/brands/${item.slug}`}
                className="overflow-hidden rounded-[28px] border border-[rgba(175,143,88,0.18)] bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(246,240,231,0.92))] p-6 shadow-[0_18px_60px_rgba(34,31,26,0.08)] transition hover:-translate-y-1 hover:shadow-[0_24px_72px_rgba(34,31,26,0.12)]"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-[11px] uppercase tracking-[0.18em] text-[#8a734d]">
                      {item.memberType === "enterprise_advanced" ? "高级企业" : "推荐企业"}
                    </p>
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
              </Link>
            ))}
          </div>
        </section>
      ) : null}

      <section className="mt-6 grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {items.length === 0 ? (
          <article className="sm:col-span-2 lg:col-span-3 glass-panel p-8 text-center text-sm text-muted">
            暂无符合条件的品牌数据。
          </article>
        ) : (
          items.map((item) => {
            const updated = item.updatedAt.toLocaleDateString("zh-CN");

            return (
              <Link
                key={item.id}
                href={item.enterprise ? `/enterprise/${item.enterprise.id}` : `/brands/${item.slug}`}
                className="glass-panel interactive-lift p-5 block"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-[11px] uppercase tracking-[0.12em] text-muted">
                      {item.memberType === "enterprise_advanced" ? "高级企业" : "企业会员"}
                    </p>
                    <h2 className="mt-1 font-serif text-lg text-primary line-clamp-1">{item.enterpriseName}</h2>
                  </div>
                  {item.logoUrl ? (
                    <Image
                      src={resolveUploadedImageUrl(item.logoUrl)}
                      alt={`${item.enterpriseName} logo`}
                      width={56}
                      height={56}
                      className="w-14 h-14 rounded-lg border border-border object-contain bg-white p-1.5 shrink-0"
                    />
                  ) : (
                    <div className="w-14 h-14 rounded-lg border border-dashed border-border flex items-center justify-center text-[10px] text-muted shrink-0">
                      LOGO
                    </div>
                  )}
                </div>
                <p className="mt-3 text-sm text-muted line-clamp-3">
                  {item.summary}
                </p>
                <div className="mt-4 flex items-center justify-between text-xs text-muted">
                  <span>{item.region}{item.area ? ` · ${item.area}` : ""}</span>
                  <span>更新于 {updated}</span>
                  <span className="text-accent">查看详情</span>
                </div>
              </Link>
            );
          })
        )}
      </section>

      <div className="mt-6 flex items-center justify-between text-sm">
        <span className="text-muted">第 {safePage} / {totalPages} 页</span>
        <div className="flex gap-2">
          <Link
            href={buildQuery({ page: String(Math.max(1, safePage - 1)) })}
            className={`px-3 py-1.5 rounded border ${safePage <= 1 ? "pointer-events-none opacity-50 border-border text-muted" : "border-border text-primary hover:bg-surface"}`}
          >
            上一页
          </Link>
          <Link
            href={buildQuery({ page: String(Math.min(totalPages, safePage + 1)) })}
            className={`px-3 py-1.5 rounded border ${safePage >= totalPages ? "pointer-events-none opacity-50 border-border text-muted" : "border-border text-primary hover:bg-surface"}`}
          >
            下一页
          </Link>
        </div>
      </div>
    </div>
  );
}

