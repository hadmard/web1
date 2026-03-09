import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { buildCategoryMetadata } from "@/lib/category-metadata";
import { articleOrderByPinnedLatest, articleOrderByPinnedOldest } from "@/lib/articles";
import { prisma } from "@/lib/prisma";
import { parseBrandStructuredHtml } from "@/lib/brand-structured";

export const revalidate = 300;

type Props = {
  searchParams: Promise<{
    q?: string;
    region?: string;
    start?: string;
    end?: string;
    sort?: string;
    page?: string;
  }>;
};

type SortKey = "latest" | "oldest";

const PAGE_SIZE = 18;
const REGION_OPTIONS = ["全国", "华东", "华中", "华南", "西南", "西北", "华北", "东北"] as const;

export async function generateMetadata(): Promise<Metadata> {
  return buildCategoryMetadata(
    "/brands",
    "整木市场",
    "整木市场总览，支持关键词、区域和时间筛选，快速定位合适品牌。"
  );
}

function parseDate(value?: string) {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

function startOfDay(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function endOfDay(d: Date) {
  const x = new Date(d);
  x.setHours(23, 59, 59, 999);
  return x;
}

export default async function BrandsAllPage({ searchParams }: Props) {
  const params = await searchParams;
  const q = (params.q ?? "").trim();
  const region = (params.region ?? "").trim();
  const sort = (params.sort === "oldest" ? "oldest" : "latest") as SortKey;
  const page = Math.max(1, parseInt(params.page ?? "1", 10) || 1);
  const start = parseDate(params.start);
  const end = parseDate(params.end);

  const where: Record<string, unknown> = {
    status: "approved",
    OR: [{ categoryHref: { startsWith: "/brands" } }, { subHref: { startsWith: "/brands" } }],
  };

  const andConds: Record<string, unknown>[] = [];
  if (q) {
    andConds.push({
      OR: [{ title: { contains: q } }, { excerpt: { contains: q } }, { content: { contains: q } }],
    });
  }
  if (start || end) {
    const rangeFilter: Record<string, Date> = {};
    if (start) rangeFilter.gte = startOfDay(start);
    if (end) rangeFilter.lte = endOfDay(end);
    andConds.push({
      OR: [{ publishedAt: rangeFilter }, { AND: [{ publishedAt: null }, { updatedAt: rangeFilter }] }],
    });
  }

  const finalWhere = andConds.length > 0 ? { AND: [where, ...andConds] } : where;

  const rows = await prisma.article.findMany({
    where: finalWhere,
    orderBy:
      sort === "oldest"
        ? articleOrderByPinnedOldest
        : articleOrderByPinnedLatest,
    select: {
      id: true,
      title: true,
      slug: true,
      excerpt: true,
      content: true,
      updatedAt: true,
      publishedAt: true,
    },
  });

  const withRegion = rows.map((item) => {
    const structured = parseBrandStructuredHtml(item.content ?? "");
    const area = (structured?.serviceAreas || "").trim();
    const normalizedRegion = area || "全国";
    return {
      ...item,
      structured,
      region: normalizedRegion,
    };
  });

  const regionFiltered = region
    ? withRegion.filter((item) => item.region.includes(region))
    : withRegion;

  const total = regionFiltered.length;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const skip = (safePage - 1) * PAGE_SIZE;
  const items = regionFiltered.slice(skip, skip + PAGE_SIZE);

  const buildQuery = (overrides: Partial<Record<"page" | "q" | "region" | "start" | "end" | "sort", string>>) => {
    const merged = {
      q,
      region,
      start: params.start ?? "",
      end: params.end ?? "",
      sort,
      page: String(safePage),
      ...overrides,
    };

    const sp = new URLSearchParams();
    if (merged.q) sp.set("q", merged.q);
    if (merged.region) sp.set("region", merged.region);
    if (merged.start) sp.set("start", merged.start);
    if (merged.end) sp.set("end", merged.end);
    if (merged.sort && merged.sort !== "latest") sp.set("sort", merged.sort);
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
        <p className="mt-2 text-sm text-muted">支持关键词、区域和时间筛选。共 {total} 条。</p>

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
          <div className="mx-1 h-5 w-px bg-border" />
          <Link
            href={buildQuery({ sort: "latest", page: "1" })}
            className={`px-2.5 py-1 rounded-full border ${sort === "latest" ? "border-accent text-accent" : "border-border text-muted hover:text-primary"}`}
          >
            最新优先
          </Link>
          <Link
            href={buildQuery({ sort: "oldest", page: "1" })}
            className={`px-2.5 py-1 rounded-full border ${sort === "oldest" ? "border-accent text-accent" : "border-border text-muted hover:text-primary"}`}
          >
            最早优先
          </Link>
        </div>

        <form method="get" className="mt-4 grid md:grid-cols-4 gap-3 rounded-xl border border-border bg-surface-elevated p-4">
          <div className="md:col-span-2">
            <label className="block text-xs text-muted mb-1">关键词</label>
            <input name="q" defaultValue={q} className="w-full border border-border rounded px-3 py-2 bg-surface" placeholder="品牌名/摘要/产品/区域关键词" />
          </div>
          <div>
            <label className="block text-xs text-muted mb-1">开始日期</label>
            <input type="date" name="start" defaultValue={params.start ?? ""} className="w-full border border-border rounded px-3 py-2 bg-surface" />
          </div>
          <div>
            <label className="block text-xs text-muted mb-1">结束日期</label>
            <input type="date" name="end" defaultValue={params.end ?? ""} className="w-full border border-border rounded px-3 py-2 bg-surface" />
          </div>
          <input type="hidden" name="sort" value={sort} />
          <input type="hidden" name="region" value={region} />
          <div className="md:col-span-4 flex gap-2">
            <button className="px-4 py-2 rounded bg-accent text-white text-sm">筛选</button>
            <Link href="/brands/all" className="px-4 py-2 rounded border border-border text-sm text-primary hover:bg-surface">重置</Link>
          </div>
        </form>
      </section>

      <section className="mt-6 grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {items.length === 0 ? (
          <article className="sm:col-span-2 lg:col-span-3 glass-panel p-8 text-center text-sm text-muted">
            暂无符合条件的品牌内容。
          </article>
        ) : (
          items.map((item) => {
            const logoUrl = item.structured?.logoUrl ?? "";
            const slogan = item.structured?.slogan ?? "";
            const updated = (item.publishedAt ?? item.updatedAt).toLocaleDateString("zh-CN");

            return (
              <Link key={item.id} href={`/brands/${item.slug}`} className="glass-panel interactive-lift p-5 block">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-[11px] uppercase tracking-[0.12em] text-muted">{item.region}</p>
                    <h2 className="mt-1 font-serif text-lg text-primary line-clamp-1">{item.title}</h2>
                  </div>
                  {logoUrl ? (
                    <Image
                      src={logoUrl}
                      alt={`${item.title} logo`}
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
                  {item.excerpt || slogan || "暂无摘要，点击查看完整品牌资料。"}
                </p>
                <div className="mt-4 flex items-center justify-between text-xs text-muted">
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

