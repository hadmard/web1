import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { articleOrderByPinnedLatest, articleOrderByPinnedOldest } from "@/lib/articles";
import { buildNewsPath } from "@/lib/share-config";
import { decodeEscapedUnicode } from "@/lib/text";

export const revalidate = 300;
export const dynamic = "force-dynamic";

type Props = {
  searchParams: Promise<{
    q?: string;
    sub?: string;
    start?: string;
    end?: string;
    range?: string;
    sort?: string;
    page?: string;
    advanced?: string;
    search?: string;
  }>;
};

const PAGE_SIZE = 20;
const SUB_OPTIONS = [
  { value: "", label: "\u5168\u90e8" },
  { value: "/news/trends", label: "\u884c\u4e1a\u8d8b\u52bf" },
  { value: "/news/enterprise", label: "\u4f01\u4e1a\u52a8\u6001" },
  { value: "/news/tech", label: "\u6280\u672f\u53d1\u5c55" },
  { value: "/news/events", label: "\u884c\u4e1a\u6d3b\u52a8" },
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

function getActiveSubLabel(value: string) {
  return SUB_OPTIONS.find((item) => item.value === value)?.label ?? SUB_OPTIONS[0].label;
}

function getActiveRangeLabel(value: RangeKey) {
  if (value === "7d") return "\u8fd17\u5929";
  if (value === "30d") return "\u8fd130\u5929";
  if (value === "year") return "\u4eca\u5e74";
  return "\u5168\u90e8\u65f6\u95f4";
}

function getActiveSortLabel(value: SortKey) {
  return value === "oldest" ? "\u6700\u65e9\u4f18\u5148" : "\u6700\u65b0\u4f18\u5148";
}

function getNewsSectionLabel(href?: string | null) {
  if (href === "/news/trends") return "行业趋势";
  if (href === "/news/enterprise") return "企业动态";
  if (href === "/news/tech") return "技术发展";
  if (href === "/news/events") return "行业活动";
  return "资讯";
}

export default async function NewsAllPage({ searchParams }: Props) {
  const params = await searchParams;
  const q = (params.q ?? "").trim();
  const sub = (params.sub ?? "").trim();
  const range = (["7d", "30d", "year"].includes(params.range ?? "") ? params.range : "") as RangeKey;
  const sort = (params.sort === "oldest" ? "oldest" : "latest") as SortKey;
  const advanced = params.advanced === "1";
  const forceSearchPage = params.search === "1";
  const page = Math.max(1, parseInt(params.page ?? "1", 10) || 1);
  const skip = (page - 1) * PAGE_SIZE;

  const matchedSubSlug = SUB_OPTIONS.find((item) => item.value === sub)?.value?.replace("/news/", "") ?? null;
  const hasOnlySubcategoryFilter =
    Boolean(matchedSubSlug) &&
    !advanced &&
    !forceSearchPage &&
    !q &&
    !(params.start ?? "").trim() &&
    !(params.end ?? "").trim() &&
    !range &&
    sort === "latest" &&
    page === 1;

  if (hasOnlySubcategoryFilter && matchedSubSlug) {
    redirect(`/news/${matchedSubSlug}`);
  }

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
      OR: [
        { title: { contains: q, mode: "insensitive" } },
        { excerpt: { contains: q, mode: "insensitive" } },
        { content: { contains: q, mode: "insensitive" } },
        { source: { contains: q, mode: "insensitive" } },
        { displayAuthor: { contains: q, mode: "insensitive" } },
        { tagSlugs: { contains: q, mode: "insensitive" } },
        { keywords: { contains: q, mode: "insensitive" } },
        { manualKeywords: { contains: q, mode: "insensitive" } },
        { keywordItems: { some: { keyword: { contains: q, mode: "insensitive" } } } },
      ],
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
      OR: [{ publishedAt: rangeFilter }, { AND: [{ publishedAt: null }, { updatedAt: rangeFilter }] }],
    });
  }

  const where = andConds.length > 0 ? { AND: [newsFilter, ...andConds] } : newsFilter;

  const [items, total] = await Promise.all([
    prisma.article.findMany({
      where,
      orderBy: sort === "oldest" ? articleOrderByPinnedOldest : articleOrderByPinnedLatest,
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
  const activeSubLabel = getActiveSubLabel(sub);
  const activeRangeLabel = getActiveRangeLabel(range);
  const activeSortLabel = getActiveSortLabel(sort);

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
    <div className="max-w-6xl mx-auto px-4 py-7 sm:px-6 sm:py-12">
      <nav className="mb-8 hidden text-sm text-muted sm:block" aria-label="\u9762\u5305\u5c51">
        <Link href="/" className="hover:text-accent">
          \u9996\u9875
        </Link>
        <span className="mx-2">/</span>
        <Link href="/news" className="hover:text-accent">
          \u6574\u6728\u8d44\u8baf
        </Link>
        <span className="mx-2">/</span>
        <span className="text-primary">\u5168\u90e8\u8d44\u8baf</span>
      </nav>

      <section className="glass-panel p-6 sm:p-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="font-serif text-[2rem] font-semibold tracking-tight text-primary sm:text-[2.6rem]">\u8d44\u8baf\u4e2d\u5fc3</h1>
            <p className="mt-2 max-w-2xl text-sm leading-7 text-muted sm:mt-3">
              \u7528\u66f4\u8f7b\u76c8\u7684\u65b9\u5f0f\u6d4f\u89c8\u6574\u6728\u8d44\u8baf\uff0c\u6309\u680f\u76ee\u3001\u65f6\u95f4\u4e0e\u641c\u7d22\u8bcd\u5feb\u901f\u7b5b\u9009\uff1b\u53ef\u5339\u914d\u6807\u9898\u3001\u6458\u8981\u3001\u6b63\u6587\u3001\u6765\u6e90\u3001\u4f5c\u8005\u3001\u6807\u7b7e\u548c\u5173\u952e\u8bcd\u3002
            </p>
          </div>
          <div className="hidden rounded-full border border-border bg-white/80 px-4 py-2 text-sm text-muted shadow-[0_16px_32px_-28px_rgba(15,23,42,0.3)] sm:block">
            \u5171 {total} \u7bc7\u8d44\u8baf
          </div>
        </div>

        <form method="get" className="mt-5 rounded-[22px] border border-border bg-[rgba(255,255,255,0.78)] p-4 md:hidden">
          <input type="hidden" name="sub" value={sub} />
          <input type="hidden" name="sort" value={sort} />
          <div className="flex items-center gap-2">
            <input
              name="q"
              defaultValue={q}
              className="min-w-0 flex-1 rounded-full border border-border bg-surface px-4 py-3 text-sm"
              placeholder="\u6807\u9898 / \u6458\u8981 / \u6b63\u6587\u5173\u952e\u8bcd"
            />
            <button className="btn-primary shrink-0 px-4 py-3 text-sm">\u641c\u7d22</button>
          </div>
          <div className="mt-3 text-xs text-muted">\u5171 {total} \u7bc7\u8d44\u8baf / {activeSubLabel} / {activeRangeLabel} / {activeSortLabel}</div>

          <details className="mt-3 rounded-[18px] border border-border bg-white/72">
            <summary className="cursor-pointer list-none px-4 py-3 text-sm font-medium text-primary">
              \u5c55\u5f00\u7b5b\u9009
            </summary>
            <div className="space-y-4 border-t border-border px-4 py-4">
              <div>
                <p className="mb-2 text-xs text-muted">\u680f\u76ee</p>
                <div className="flex flex-wrap gap-2 text-xs">
                  {SUB_OPTIONS.map((s) => (
                    <Link
                      key={s.value || "mobile-all-sub"}
                      href={buildQuery({ sub: s.value, page: "1" })}
                      className={`rounded-full border px-3 py-1.5 ${sub === s.value ? "border-accent bg-white text-accent" : "border-border bg-white/72 text-muted hover:text-primary"}`}
                    >
                      {s.label}
                    </Link>
                  ))}
                </div>
              </div>

              <div>
                <p className="mb-2 text-xs text-muted">\u65f6\u95f4</p>
                <div className="flex flex-wrap gap-2 text-xs">
                  {[
                    { key: "", label: "\u5168\u90e8\u65f6\u95f4" },
                    { key: "7d", label: "\u8fd17\u5929" },
                    { key: "30d", label: "\u8fd130\u5929" },
                    { key: "year", label: "\u4eca\u5e74" },
                  ].map((r) => (
                    <Link
                      key={r.key || "mobile-all-range"}
                      href={buildQuery({ range: r.key, start: "", end: "", page: "1" })}
                      className={`rounded-full border px-3 py-1.5 ${range === r.key ? "border-accent bg-white text-accent" : "border-border bg-white/72 text-muted hover:text-primary"}`}
                    >
                      {r.label}
                    </Link>
                  ))}
                </div>
              </div>

              <div>
                <p className="mb-2 text-xs text-muted">\u6392\u5e8f</p>
                <div className="flex flex-wrap gap-2 text-xs">
                  <Link
                    href={buildQuery({ sort: "latest", page: "1" })}
                    className={`rounded-full border px-3 py-1.5 ${sort === "latest" ? "border-accent bg-white text-accent" : "border-border bg-white/72 text-muted hover:text-primary"}`}
                  >
                    \u6700\u65b0\u4f18\u5148
                  </Link>
                  <Link
                    href={buildQuery({ sort: "oldest", page: "1" })}
                    className={`rounded-full border px-3 py-1.5 ${sort === "oldest" ? "border-accent bg-white text-accent" : "border-border bg-white/72 text-muted hover:text-primary"}`}
                  >
                    \u6700\u65e9\u4f18\u5148
                  </Link>
                </div>
              </div>

              <div className="grid gap-3">
                <div>
                  <label className="mb-1 block text-xs text-muted">\u5f00\u59cb\u65e5\u671f</label>
                  <input type="date" name="start" defaultValue={params.start ?? ""} className="w-full rounded-2xl border border-border bg-surface px-4 py-3 text-sm" />
                </div>
                <div>
                  <label className="mb-1 block text-xs text-muted">\u7ed3\u675f\u65e5\u671f</label>
                  <input type="date" name="end" defaultValue={params.end ?? ""} className="w-full rounded-2xl border border-border bg-surface px-4 py-3 text-sm" />
                </div>
              </div>

              <div className="flex gap-2">
                <button className="btn-primary px-5 py-2.5 text-sm">\u7b5b\u9009</button>
                <Link href="/news/all" className="rounded-full border border-border px-5 py-2.5 text-sm text-primary hover:bg-surface">
                  \u91cd\u7f6e
                </Link>
              </div>
            </div>
          </details>
        </form>

        <div className="mt-6 hidden flex-wrap gap-2 text-xs md:flex">
          {SUB_OPTIONS.map((s) => (
            <Link
              key={s.value || "all-sub"}
              href={buildQuery({ sub: s.value, page: "1" })}
              className={`rounded-full border px-3 py-1.5 ${sub === s.value ? "border-accent bg-white text-accent" : "border-border bg-white/72 text-muted hover:text-primary"}`}
            >
              {s.label}
            </Link>
          ))}

          <div className="mx-1 h-5 w-px bg-border" />

          {[
            { key: "", label: "\u5168\u90e8\u65f6\u95f4" },
            { key: "7d", label: "\u6700\u8fd17\u5929" },
            { key: "30d", label: "\u6700\u8fd130\u5929" },
            { key: "year", label: "\u4eca\u5e74" },
          ].map((r) => (
            <Link
              key={r.key || "all"}
              href={buildQuery({ range: r.key, start: "", end: "", page: "1" })}
              className={`rounded-full border px-3 py-1.5 ${range === r.key ? "border-accent bg-white text-accent" : "border-border bg-white/72 text-muted hover:text-primary"}`}
            >
              {r.label}
            </Link>
          ))}

          <div className="mx-1 h-5 w-px bg-border" />

          <Link
            href={buildQuery({ sort: "latest", page: "1" })}
            className={`rounded-full border px-3 py-1.5 ${sort === "latest" ? "border-accent bg-white text-accent" : "border-border bg-white/72 text-muted hover:text-primary"}`}
          >
            \u6700\u65b0\u4f18\u5148
          </Link>
          <Link
            href={buildQuery({ sort: "oldest", page: "1" })}
            className={`rounded-full border px-3 py-1.5 ${sort === "oldest" ? "border-accent bg-white text-accent" : "border-border bg-white/72 text-muted hover:text-primary"}`}
          >
            \u6700\u65e9\u4f18\u5148
          </Link>
        </div>

        <form method="get" className="mt-6 hidden gap-3 rounded-[22px] border border-border bg-[rgba(255,255,255,0.78)] p-5 md:grid md:grid-cols-4">
          <div className="md:col-span-2">
            <label className="mb-1 block text-xs text-muted">\u641c\u7d22\u8bcd</label>
            <input
              name="q"
              defaultValue={q}
              className="w-full rounded-2xl border border-border bg-surface px-4 py-3"
              placeholder="\u6807\u9898 / \u6458\u8981 / \u6b63\u6587 / \u6765\u6e90 / \u4f5c\u8005 / \u6807\u7b7e / \u5173\u952e\u8bcd"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs text-muted">\u5f00\u59cb\u65e5\u671f</label>
            <input type="date" name="start" defaultValue={params.start ?? ""} className="w-full rounded-2xl border border-border bg-surface px-4 py-3" />
          </div>
          <div>
            <label className="mb-1 block text-xs text-muted">\u7ed3\u675f\u65e5\u671f</label>
            <input type="date" name="end" defaultValue={params.end ?? ""} className="w-full rounded-2xl border border-border bg-surface px-4 py-3" />
          </div>
          <input type="hidden" name="sort" value={sort} />
          <input type="hidden" name="sub" value={sub} />
          <div className="flex gap-2 md:col-span-4">
            <button className="btn-primary px-5 py-2.5 text-sm">\u7b5b\u9009</button>
            <Link href="/news/all" className="rounded-full border border-border px-5 py-2.5 text-sm text-primary hover:bg-surface">
              \u91cd\u7f6e
            </Link>
          </div>
        </form>
      </section>

      <section className="mt-5 rounded-[22px] border border-border bg-[rgba(255,255,255,0.82)] p-3 sm:mt-8 sm:rounded-[24px] sm:p-6">
        {items.length === 0 ? (
          <p className="text-sm text-muted">\u672a\u627e\u5230\u7b26\u5408\u6761\u4ef6\u7684\u8d44\u8baf\u3002</p>
        ) : (
          <ul className="grid gap-2 sm:gap-4">
            {items.map((x) => (
              <li key={x.id} className="rounded-[16px] border border-border bg-surface-elevated p-3 sm:rounded-[20px] sm:p-5">
                <Link
                  href={buildNewsPath(x.id)}
                  className="line-clamp-2 text-[15px] font-medium leading-6 text-primary hover:text-accent sm:text-lg sm:leading-8"
                >
                  {decodeEscapedUnicode(x.title)}
                </Link>
                <p className="mt-1.5 text-xs text-muted">
                  <span className="hidden sm:inline">{getNewsSectionLabel(x.subHref)} · </span>
                  {(x.publishedAt ?? x.updatedAt).toLocaleDateString("zh-CN")}
                </p>
                {x.excerpt ? <p className="mt-1.5 hidden line-clamp-2 text-[13px] leading-6 text-muted sm:mt-3 sm:block sm:line-clamp-3 sm:text-sm sm:leading-7">{decodeEscapedUnicode(x.excerpt)}</p> : null}
              </li>
            ))}
          </ul>
        )}

        <div className="mt-6 flex items-center justify-between text-sm">
          <span className="text-muted">
            \u7b2c {page} / {totalPages} \u9875
          </span>
          <div className="flex gap-2">
            <Link
              href={buildQuery({ page: String(Math.max(1, page - 1)) })}
              className={`rounded-full border px-4 py-2 ${page <= 1 ? "pointer-events-none border-border text-muted opacity-50" : "border-border text-primary hover:bg-surface"}`}
            >
              \u4e0a\u4e00\u9875
            </Link>
            <Link
              href={buildQuery({ page: String(Math.min(totalPages, page + 1)) })}
              className={`rounded-full border px-4 py-2 ${page >= totalPages ? "pointer-events-none border-border text-muted opacity-50" : "border-border text-primary hover:bg-surface"}`}
            >
              \u4e0b\u4e00\u9875
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}

