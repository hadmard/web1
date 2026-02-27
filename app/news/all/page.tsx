import Link from "next/link";
import { prisma } from "@/lib/prisma";

type Props = {
  searchParams: Promise<{
    q?: string;
    sub?: string;
    start?: string;
    end?: string;
    range?: string;
    sort?: string;
    page?: string;
  }>;
};

const PAGE_SIZE = 20;
const SUB_OPTIONS = [
  { value: "", label: "全部" },
  { value: "/news/trends", label: "行业趋势" },
  { value: "/news/enterprise", label: "企业动态" },
  { value: "/news/tech", label: "技术发展" },
  { value: "/news/events", label: "行业活动" },
] as const;

type RangeKey = "" | "7d" | "30d" | "year";
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

function getRangeDates(range: RangeKey): { start: Date; end: Date } | null {
  const today = new Date();
  if (range === "7d") {
    const s = new Date(today);
    s.setDate(s.getDate() - 6);
    return { start: startOfDay(s), end: endOfDay(today) };
  }
  if (range === "30d") {
    const s = new Date(today);
    s.setDate(s.getDate() - 29);
    return { start: startOfDay(s), end: endOfDay(today) };
  }
  if (range === "year") {
    return { start: new Date(today.getFullYear(), 0, 1, 0, 0, 0, 0), end: endOfDay(today) };
  }
  return null;
}

export default async function NewsAllPage({ searchParams }: Props) {
  const params = await searchParams;
  const q = (params.q ?? "").trim();
  const sub = (params.sub ?? "").trim();
  const range = (["7d", "30d", "year"].includes(params.range ?? "") ? params.range : "") as RangeKey;
  const sort = params.sort === "oldest" ? "oldest" : "latest" as SortKey;
  const page = Math.max(1, parseInt(params.page ?? "1", 10) || 1);
  const skip = (page - 1) * PAGE_SIZE;

  const explicitStart = parseDate(params.start);
  const explicitEnd = parseDate(params.end);
  const quickRange = !explicitStart && !explicitEnd ? getRangeDates(range) : null;
  const start = explicitStart ?? quickRange?.start ?? null;
  const end = explicitEnd ?? quickRange?.end ?? null;

  const newsFilter: Record<string, unknown> = {
    status: "approved",
    OR: [{ categoryHref: { startsWith: "/news" } }, { subHref: { startsWith: "/news" } }],
  };

  const andConds: Record<string, unknown>[] = [];
  if (q) {
    andConds.push({
      OR: [{ title: { contains: q } }, { excerpt: { contains: q } }, { content: { contains: q } }],
    });
  }
  if (sub) {
    andConds.push({ OR: [{ subHref: sub }, { categoryHref: sub }] });
  }

  const rangeFilter: Record<string, Date> = {};
  if (start) rangeFilter.gte = start;
  if (end) rangeFilter.lte = endOfDay(end);
  if (Object.keys(rangeFilter).length > 0) {
    andConds.push({
      OR: [
        { publishedAt: rangeFilter },
        { AND: [{ publishedAt: null }, { updatedAt: rangeFilter }] },
      ],
    });
  }

  const where = andConds.length > 0 ? { AND: [newsFilter, ...andConds] } : newsFilter;

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
        subHref: true,
        publishedAt: true,
        updatedAt: true,
      },
    }),
    prisma.article.count({ where }),
  ]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const buildQuery = (overrides: Partial<Record<"page" | "q" | "sub" | "start" | "end" | "range" | "sort", string>>) => {
    const merged = {
      q,
      sub,
      start: params.start ?? "",
      end: params.end ?? "",
      range,
      sort,
      page: String(page),
      ...overrides,
    };

    const sp = new URLSearchParams();
    if (merged.q) sp.set("q", merged.q);
    if (merged.sub) sp.set("sub", merged.sub);
    if (merged.start) sp.set("start", merged.start);
    if (merged.end) sp.set("end", merged.end);
    if (!merged.start && !merged.end && merged.range) sp.set("range", merged.range);
    if (merged.sort && merged.sort !== "latest") sp.set("sort", merged.sort);
    if (merged.page && merged.page !== "1") sp.set("page", merged.page);

    return `/news/all${sp.toString() ? `?${sp.toString()}` : ""}`;
  };

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-10">
      <nav className="mb-6 text-sm text-muted" aria-label="面包屑">
        <Link href="/" className="hover:text-accent">首页</Link>
        <span className="mx-2">/</span>
        <Link href="/news" className="hover:text-accent">整木资讯</Link>
        <span className="mx-2">/</span>
        <span className="text-primary">全部资讯</span>
      </nav>

      <h1 className="font-serif text-2xl sm:text-3xl font-bold text-primary">资讯中心</h1>
      <p className="mt-2 text-sm text-muted">支持关键词检索、时间筛选、栏目筛选。共 {total} 条。</p>

      <div className="mt-4 flex flex-wrap gap-2 text-xs">
        {SUB_OPTIONS.map((s) => (
          <Link
            key={s.value || "all-sub"}
            href={buildQuery({ sub: s.value, page: "1" })}
            className={`px-2.5 py-1 rounded-full border ${sub === s.value ? "border-accent text-accent" : "border-border text-muted hover:text-primary"}`}
          >
            {s.label}
          </Link>
        ))}

        <div className="mx-1 h-5 w-px bg-border" />

        {[
          { key: "", label: "全部时间" },
          { key: "7d", label: "最近7天" },
          { key: "30d", label: "最近30天" },
          { key: "year", label: "今年" },
        ].map((r) => (
          <Link
            key={r.key || "all"}
            href={buildQuery({ range: r.key, start: "", end: "", page: "1" })}
            className={`px-2.5 py-1 rounded-full border ${range === r.key ? "border-accent text-accent" : "border-border text-muted hover:text-primary"}`}
          >
            {r.label}
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
          <input name="q" defaultValue={q} className="w-full border border-border rounded px-3 py-2 bg-surface" placeholder="标题/摘要/正文关键词" />
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
          <Link href="/news/all" className="px-4 py-2 rounded border border-border text-sm text-primary hover:bg-surface">重置</Link>
        </div>
      </form>

      <section className="mt-6 rounded-xl border border-border bg-surface-elevated p-5">
        {items.length === 0 ? (
          <p className="text-sm text-muted">未找到符合条件的资讯。</p>
        ) : (
          <ul className="space-y-4">
            {items.map((x) => (
              <li key={x.id} className="border-b border-border pb-4">
                <Link href={`/news/${x.slug}`} className="text-base font-medium text-primary hover:text-accent">
                  {x.title}
                </Link>
                <p className="mt-1 text-xs text-muted">
                  {x.subHref || "/news"} · 发布时间：{(x.publishedAt ?? x.updatedAt).toLocaleDateString("zh-CN")}
                </p>
                {x.excerpt && <p className="mt-2 text-sm text-muted line-clamp-2">{x.excerpt}</p>}
              </li>
            ))}
          </ul>
        )}

        <div className="mt-5 flex items-center justify-between text-sm">
          <span className="text-muted">第 {page} / {totalPages} 页</span>
          <div className="flex gap-2">
            <Link
              href={buildQuery({ page: String(Math.max(1, page - 1)) })}
              className={`px-3 py-1.5 rounded border ${page <= 1 ? "pointer-events-none opacity-50 border-border text-muted" : "border-border text-primary hover:bg-surface"}`}
            >
              上一页
            </Link>
            <Link
              href={buildQuery({ page: String(Math.min(totalPages, page + 1)) })}
              className={`px-3 py-1.5 rounded border ${page >= totalPages ? "pointer-events-none opacity-50 border-border text-muted" : "border-border text-primary hover:bg-surface"}`}
            >
              下一页
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
