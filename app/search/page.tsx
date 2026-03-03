import Link from "next/link";
import { prisma } from "@/lib/prisma";

export const revalidate = 300;

const RESULT_LIMIT = 12;

type Props = {
  searchParams: Promise<{ q?: string }>;
};

function stripHtml(input: string | null | undefined): string {
  if (!input) return "";
  return input.replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim();
}

function makeSummary(input: string | null | undefined, fallback: string): string {
  const text = stripHtml(input);
  if (!text) return fallback;
  return text.length > 92 ? `${text.slice(0, 92)}...` : text;
}

export default async function SearchPage({ searchParams }: Props) {
  const { q = "" } = await searchParams;
  const keyword = q.trim();

  const [standards, terms, awards] = keyword
    ? await Promise.all([
        prisma.article.findMany({
          where: {
            status: "approved",
            AND: [
              {
                OR: [{ categoryHref: { startsWith: "/standards" } }, { subHref: { startsWith: "/standards" } }],
              },
              {
                OR: [{ title: { contains: keyword } }, { excerpt: { contains: keyword } }, { content: { contains: keyword } }],
              },
            ],
          },
          orderBy: [{ isPinned: "desc" }, { updatedAt: "desc" }],
          take: RESULT_LIMIT,
          select: { id: true, title: true, slug: true, excerpt: true, versionLabel: true },
        }),
        prisma.article.findMany({
          where: {
            status: "approved",
            AND: [
              {
                OR: [{ categoryHref: { startsWith: "/dictionary" } }, { subHref: { startsWith: "/dictionary" } }],
              },
              {
                OR: [{ title: { contains: keyword } }, { excerpt: { contains: keyword } }, { content: { contains: keyword } }],
              },
            ],
          },
          orderBy: [{ isPinned: "desc" }, { updatedAt: "desc" }],
          take: RESULT_LIMIT,
          select: { id: true, title: true, slug: true, excerpt: true },
        }),
        prisma.award.findMany({
          where: {
            OR: [{ title: { contains: keyword } }, { description: { contains: keyword } }],
          },
          orderBy: [{ year: "desc" }, { updatedAt: "desc" }],
          take: RESULT_LIMIT,
          select: { id: true, title: true, slug: true, year: true, description: true },
        }),
      ])
    : [[], [], []];

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-10">
      <h1 className="font-serif text-2xl sm:text-3xl font-semibold text-primary">行业搜索结果</h1>
      <p className="mt-2 text-sm text-muted">
        {keyword ? (
          <>
            关键词：<span className="text-primary">{keyword}</span>
          </>
        ) : (
          "请输入关键词后再搜索。"
        )}
      </p>

      <form action="/search" className="mt-4 rounded-xl border border-border bg-surface-elevated p-4 flex flex-col sm:flex-row gap-3">
        <input
          type="search"
          name="q"
          defaultValue={keyword}
          placeholder="行业搜索：请输入标准、术语、榜单关键词"
          className="flex-1 border border-border rounded px-3 py-2 bg-surface"
        />
        <button className="px-4 py-2 rounded bg-accent text-white text-sm">搜索</button>
      </form>

      {keyword && (
        <section className="mt-6 space-y-4">
          <article className="glass-panel p-5">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-lg font-semibold text-primary">标准</h2>
              <Link href={`/standards/all?q=${encodeURIComponent(keyword)}`} className="text-sm text-accent hover:underline">
                查看更多
              </Link>
            </div>
            {standards.length === 0 ? (
              <p className="mt-3 text-sm text-muted">暂无匹配的标准内容。</p>
            ) : (
              <ul className="mt-3 space-y-2.5">
                {standards.map((item) => (
                  <li key={item.id}>
                    <Link href={`/standards/${item.slug || item.id}`} className="block rounded-lg border border-border bg-surface-elevated px-3 py-2.5 hover:border-accent/40">
                      <p className="text-sm font-medium text-primary">{item.title}</p>
                      <p className="mt-1 text-xs text-muted">
                        {item.versionLabel ? `${item.versionLabel} · ` : ""}
                        {makeSummary(item.excerpt, "标准内容，点击查看详情")}
                      </p>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </article>

          <article className="glass-panel p-5">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-lg font-semibold text-primary">术语</h2>
              <Link href={`/dictionary/all?q=${encodeURIComponent(keyword)}`} className="text-sm text-accent hover:underline">
                查看更多
              </Link>
            </div>
            {terms.length === 0 ? (
              <p className="mt-3 text-sm text-muted">暂无匹配的术语内容。</p>
            ) : (
              <ul className="mt-3 space-y-2.5">
                {terms.map((item) => (
                  <li key={item.id}>
                    <Link href={`/dictionary/${item.slug || item.id}`} className="block rounded-lg border border-border bg-surface-elevated px-3 py-2.5 hover:border-accent/40">
                      <p className="text-sm font-medium text-primary">{item.title}</p>
                      <p className="mt-1 text-xs text-muted">{makeSummary(item.excerpt, "术语内容，点击查看详情")}</p>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </article>

          <article className="glass-panel p-5">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-lg font-semibold text-primary">榜单</h2>
              <Link href={`/awards?q=${encodeURIComponent(keyword)}`} className="text-sm text-accent hover:underline">
                查看更多
              </Link>
            </div>
            {awards.length === 0 ? (
              <p className="mt-3 text-sm text-muted">暂无匹配的榜单内容。</p>
            ) : (
              <ul className="mt-3 space-y-2.5">
                {awards.map((item) => (
                  <li key={item.id}>
                    <Link href={`/awards/${item.slug || item.id}`} className="block rounded-lg border border-border bg-surface-elevated px-3 py-2.5 hover:border-accent/40">
                      <p className="text-sm font-medium text-primary">
                        {item.year ? `${item.year} · ` : ""}
                        {item.title}
                      </p>
                      <p className="mt-1 text-xs text-muted">{makeSummary(item.description, "榜单内容，点击查看详情")}</p>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </article>
        </section>
      )}
    </div>
  );
}
