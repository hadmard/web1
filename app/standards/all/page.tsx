import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getCategoryWithMetaByHref } from "@/lib/categories";
import { parseStandardStructuredHtml } from "@/lib/standard-structured";
export const dynamic = "force-dynamic";


type Props = {
  searchParams: Promise<{
    q?: string;
    sub?: string;
    start?: string;
    end?: string;
    sort?: string;
    page?: string;
  }>;
};

const PAGE_SIZE = 16;
type SortKey = "latest" | "oldest";

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

export default async function StandardsAllPage({ searchParams }: Props) {
  const params = await searchParams;
  const category = await getCategoryWithMetaByHref("/standards");

  const q = (params.q ?? "").trim();
  const sub = (params.sub ?? "").trim();
  const sort = (params.sort === "oldest" ? "oldest" : "latest") as SortKey;
  const page = Math.max(1, parseInt(params.page ?? "1", 10) || 1);
  const skip = (page - 1) * PAGE_SIZE;
  const start = parseDate(params.start);
  const end = parseDate(params.end);

  const baseFilter: Record<string, unknown> = {
    status: "approved",
    OR: [{ categoryHref: { startsWith: "/standards" } }, { subHref: { startsWith: "/standards" } }],
  };

  const andConds: Record<string, unknown>[] = [];
  if (q) {
    andConds.push({
      OR: [{ title: { contains: q } }, { excerpt: { contains: q } }, { content: { contains: q } }],
    });
  }
  if (sub) andConds.push({ OR: [{ subHref: sub }, { categoryHref: sub }] });
  if (start || end) {
    const rangeFilter: Record<string, Date> = {};
    if (start) rangeFilter.gte = startOfDay(start);
    if (end) rangeFilter.lte = endOfDay(end);
    andConds.push({
      OR: [
        { publishedAt: rangeFilter },
        { AND: [{ publishedAt: null }, { updatedAt: rangeFilter }] },
      ],
    });
  }

  const where = andConds.length > 0 ? { AND: [baseFilter, ...andConds] } : baseFilter;

  const [items, total] = await Promise.all([
    prisma.article.findMany({
      where,
      orderBy:
        sort === "oldest"
          ? [{ publishedAt: "asc" }, { updatedAt: "asc" }]
          : [{ publishedAt: "desc" }, { updatedAt: "desc" }],
      skip,
      take: PAGE_SIZE,
      select: {
        id: true,
        title: true,
        slug: true,
        excerpt: true,
        content: true,
        subHref: true,
        versionLabel: true,
        updatedAt: true,
        publishedAt: true,
      },
    }),
    prisma.article.count({ where }),
  ]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const subOptions = category?.subcategories ?? [];
  const subMap = new Map(subOptions.map((x) => [x.href, x.label] as const));

  const buildQuery = (
    overrides: Partial<Record<"page" | "q" | "sub" | "start" | "end" | "sort", string>>
  ) => {
    const merged = {
      q,
      sub,
      start: params.start ?? "",
      end: params.end ?? "",
      sort,
      page: String(page),
      ...overrides,
    };
    const sp = new URLSearchParams();
    if (merged.q) sp.set("q", merged.q);
    if (merged.sub) sp.set("sub", merged.sub);
    if (merged.start) sp.set("start", merged.start);
    if (merged.end) sp.set("end", merged.end);
    if (merged.sort && merged.sort !== "latest") sp.set("sort", merged.sort);
    if (merged.page && merged.page !== "1") sp.set("page", merged.page);
    return `/standards/all${sp.toString() ? `?${sp.toString()}` : ""}`;
  };

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-10">
      <nav className="mb-6 text-sm text-muted" aria-label="面包屑">
        <Link href="/" className="hover:text-accent">首页</Link>
        <span className="mx-2">/</span>
        <Link href="/standards" className="hover:text-accent">整木标准</Link>
        <span className="mx-2">/</span>
        <span className="text-primary">标准总览</span>
      </nav>

      <section className="glass-panel p-6 sm:p-7">
        <h1 className="font-serif text-2xl sm:text-3xl font-semibold text-primary">标准总览</h1>
        <p className="mt-2 text-sm text-muted">按标准文档方式展示与检索，支持子栏目、关键词、时间筛选。共 {total} 条。</p>

        <div className="mt-4 flex flex-wrap gap-2 text-xs">
          <Link href={buildQuery({ sub: "", page: "1" })} className={`px-2.5 py-1 rounded-full border ${sub === "" ? "border-accent text-accent" : "border-border text-muted hover:text-primary"}`}>全部</Link>
          {subOptions.map((x) => (
            <Link key={x.href} href={buildQuery({ sub: x.href, page: "1" })} className={`px-2.5 py-1 rounded-full border ${sub === x.href ? "border-accent text-accent" : "border-border text-muted hover:text-primary"}`}>
              {x.label}
            </Link>
          ))}
          <div className="mx-1 h-5 w-px bg-border" />
          <Link href={buildQuery({ sort: "latest", page: "1" })} className={`px-2.5 py-1 rounded-full border ${sort === "latest" ? "border-accent text-accent" : "border-border text-muted hover:text-primary"}`}>最新优先</Link>
          <Link href={buildQuery({ sort: "oldest", page: "1" })} className={`px-2.5 py-1 rounded-full border ${sort === "oldest" ? "border-accent text-accent" : "border-border text-muted hover:text-primary"}`}>最早优先</Link>
        </div>

        <form method="get" className="mt-4 grid md:grid-cols-4 gap-3 rounded-xl border border-border bg-surface-elevated p-4">
          <div className="md:col-span-2">
            <label className="block text-xs text-muted mb-1">关键词</label>
            <input name="q" defaultValue={q} className="w-full border border-border rounded px-3 py-2 bg-surface" placeholder="标准编号/条款/术语关键词" />
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
          <input type="hidden" name="sub" value={sub} />
          <div className="md:col-span-4 flex gap-2">
            <button className="px-4 py-2 rounded bg-accent text-white text-sm">筛选</button>
            <Link href="/standards/all" className="px-4 py-2 rounded border border-border text-sm text-primary hover:bg-surface">重置</Link>
          </div>
        </form>
      </section>

      <section className="mt-6 space-y-3">
        {items.length === 0 ? (
          <article className="glass-panel p-8 text-center text-sm text-muted">暂无符合条件的标准内容。</article>
        ) : (
          items.map((item) => {
            const structured = parseStandardStructuredHtml(item.content);
            const code = structured?.standardCode || "";
            const subLabel = subMap.get(item.subHref ?? "") ?? "标准内容";
            const updated = (item.publishedAt ?? item.updatedAt).toLocaleDateString("zh-CN");
            return (
              <Link key={item.id} href={`/standards/${item.slug}`} className="glass-panel interactive-lift p-5 block">
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-xs text-muted">{subLabel}</p>
                    <h2 className="font-serif text-lg text-primary line-clamp-1 mt-1">{item.title}</h2>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-xs text-muted">版本</p>
                    <p className="text-sm font-medium text-primary">{item.versionLabel || structured?.versionNote || "—"}</p>
                  </div>
                </div>
                <div className="mt-3 flex flex-wrap gap-2 text-xs">
                  <span className="rounded-full border border-border px-2 py-0.5 text-muted">编号：{code || "未填写"}</span>
                  <span className="rounded-full border border-border px-2 py-0.5 text-muted">更新时间：{updated}</span>
                </div>
                <p className="mt-3 text-sm text-muted line-clamp-2">{item.excerpt || structured?.scope || "暂无摘要，点击查看标准全文结构。"}</p>
              </Link>
            );
          })
        )}
      </section>

      <div className="mt-6 flex items-center justify-between text-sm">
        <span className="text-muted">第 {page} / {totalPages} 页</span>
        <div className="flex gap-2">
          <Link href={buildQuery({ page: String(Math.max(1, page - 1)) })} className={`px-3 py-1.5 rounded border ${page <= 1 ? "pointer-events-none opacity-50 border-border text-muted" : "border-border text-primary hover:bg-surface"}`}>上一页</Link>
          <Link href={buildQuery({ page: String(Math.min(totalPages, page + 1)) })} className={`px-3 py-1.5 rounded border ${page >= totalPages ? "pointer-events-none opacity-50 border-border text-muted" : "border-border text-primary hover:bg-surface"}`}>下一页</Link>
        </div>
      </div>
    </div>
  );
}
