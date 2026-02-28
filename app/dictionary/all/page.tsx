import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { MEMBER_PUBLISH_CATEGORY_OPTIONS } from "@/lib/content-taxonomy";
export const revalidate = 300;


type Props = {
  searchParams: Promise<{
    q?: string;
    sub?: string;
    page?: string;
    sort?: string;
  }>;
};

const PAGE_SIZE = 24;

export default async function DictionaryAllPage({ searchParams }: Props) {
  const params = await searchParams;
  const q = (params.q ?? "").trim();
  const sub = (params.sub ?? "").trim();
  const page = Math.max(1, parseInt(params.page ?? "1", 10) || 1);
  const sort = params.sort === "oldest" ? "oldest" : "latest";
  const skip = (page - 1) * PAGE_SIZE;

  const where: Record<string, unknown> = {
    status: "approved",
    OR: [{ categoryHref: { startsWith: "/dictionary" } }, { subHref: { startsWith: "/dictionary" } }],
  };

  const andConds: Record<string, unknown>[] = [];
  if (sub) {
    andConds.push({ OR: [{ subHref: sub }, { categoryHref: sub }] });
  }
  if (q) {
    andConds.push({
      OR: [{ title: { contains: q } }, { excerpt: { contains: q } }, { content: { contains: q } }],
    });
  }
  if (andConds.length > 0) {
    (where as { AND?: Record<string, unknown>[] }).AND = andConds;
  }

  const termCategory = MEMBER_PUBLISH_CATEGORY_OPTIONS.find((x) => x.href === "/dictionary");
  const subOptions = [{ href: "", label: "全部" }, ...(termCategory?.subs ?? []).map((s) => ({ href: s.href, label: s.label }))];

  const [items, total] = await Promise.all([
    prisma.article.findMany({
      where,
      orderBy: sort === "oldest" ? [{ updatedAt: "asc" }] : [{ updatedAt: "desc" }],
      skip,
      take: PAGE_SIZE,
      select: {
        id: true,
        title: true,
        slug: true,
        excerpt: true,
        updatedAt: true,
      },
    }),
    prisma.article.count({ where }),
  ]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const buildHref = (next: Partial<{ q: string; sub: string; page: string; sort: string }>) => {
    const merged = {
      q,
      sub,
      page: String(page),
      sort,
      ...next,
    };
    const sp = new URLSearchParams();
    if (merged.q) sp.set("q", merged.q);
    if (merged.sub) sp.set("sub", merged.sub);
    if (merged.sort && merged.sort !== "latest") sp.set("sort", merged.sort);
    if (merged.page && merged.page !== "1") sp.set("page", merged.page);
    return `/dictionary/all${sp.toString() ? `?${sp.toString()}` : ""}`;
  };

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-10">
      <nav className="mb-6 text-sm text-muted" aria-label="面包屑">
        <Link href="/" className="hover:text-accent">首页</Link>
        <span className="mx-2">/</span>
        <Link href="/dictionary" className="hover:text-accent">整木词库</Link>
        <span className="mx-2">/</span>
        <span className="text-primary">词库总览</span>
      </nav>

      <h1 className="font-serif text-2xl sm:text-3xl font-bold text-primary">整木词库 · 词条总览</h1>
      <p className="mt-2 text-sm text-muted">卡片式浏览与检索，共 {total} 条词条。</p>

      <div className="mt-4 flex flex-wrap gap-2 text-xs">
        {subOptions.map((s) => (
          <Link
            key={s.href || "all-sub"}
            href={buildHref({ sub: s.href, page: "1" })}
            className={`px-2.5 py-1 rounded-full border ${sub === s.href ? "border-accent text-accent" : "border-border text-muted hover:text-primary"}`}
          >
            {s.label}
          </Link>
        ))}
      </div>

      <div className="mt-4 flex gap-2">
        <Link href={buildHref({ sort: "latest", page: "1" })} className={`px-3 py-1.5 rounded border text-xs ${sort === "latest" ? "border-accent text-accent" : "border-border text-muted hover:text-primary"}`}>
          最近更新
        </Link>
        <Link href={buildHref({ sort: "oldest", page: "1" })} className={`px-3 py-1.5 rounded border text-xs ${sort === "oldest" ? "border-accent text-accent" : "border-border text-muted hover:text-primary"}`}>
          最早更新
        </Link>
      </div>

      <form method="get" className="mt-4 rounded-xl border border-border bg-surface-elevated p-4 flex flex-col sm:flex-row gap-3">
        <input name="q" defaultValue={q} className="flex-1 border border-border rounded px-3 py-2 bg-surface" placeholder="检索词条、摘要或正文关键词" />
        <input type="hidden" name="sub" value={sub} />
        <input type="hidden" name="sort" value={sort} />
        <button className="px-4 py-2 rounded bg-accent text-white text-sm">搜索</button>
      </form>

      {items.length === 0 ? (
        <section className="mt-6 rounded-xl border border-border bg-surface-elevated p-5">
          <p className="text-sm text-muted">暂无词条。</p>
        </section>
      ) : (
        <section className="mt-6 grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {items.map((x) => (
            <article key={x.id} className="rounded-2xl border border-border bg-surface-elevated p-4 hover:border-accent/45 transition-colors">
              <p className="text-[11px] uppercase tracking-wider text-muted">TERM CARD</p>
              <Link href={`/dictionary/${x.slug}`} className="mt-2 block font-serif text-lg font-semibold text-primary hover:text-accent">
                {x.title}
              </Link>
              <p className="mt-2 text-sm text-muted line-clamp-3">{x.excerpt || "暂无摘要，点击进入查看完整释义。"}</p>
              <p className="mt-3 text-xs text-muted">更新于 {x.updatedAt.toLocaleDateString("zh-CN")}</p>
              <div className="mt-3 flex items-center gap-2">
                <Link href={`/dictionary/${x.slug}`} className="text-xs text-accent hover:underline">
                  查看词条
                </Link>
                <Link
                  href={`/dictionary/edit/${x.id}`}
                  className="text-xs px-2 py-1 rounded border border-border text-muted hover:text-accent hover:border-accent/40"
                >
                  提出修改
                </Link>
              </div>
            </article>
          ))}
        </section>
      )}

      <div className="mt-6 flex items-center justify-between text-sm">
        <span className="text-muted">第 {page} / {totalPages} 页</span>
        <div className="flex gap-2">
          <Link href={buildHref({ page: String(Math.max(1, page - 1)) })} className={`px-3 py-1.5 rounded border ${page <= 1 ? "pointer-events-none opacity-50 border-border text-muted" : "border-border text-primary hover:bg-surface"}`}>
            上一页
          </Link>
          <Link href={buildHref({ page: String(Math.min(totalPages, page + 1)) })} className={`px-3 py-1.5 rounded border ${page >= totalPages ? "pointer-events-none opacity-50 border-border text-muted" : "border-border text-primary hover:bg-surface"}`}>
            下一页
          </Link>
        </div>
      </div>
    </div>
  );
}
