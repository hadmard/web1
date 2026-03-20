import type { Metadata } from "next";
import Link from "next/link";
import { CategoryHome } from "@/components/CategoryHome";
import { getCategoryWithMetaByHref } from "@/lib/categories";
import { buildCategoryMetadata } from "@/lib/category-metadata";
import { getLatestHuadianYear, HUADIAN_DEFINITION } from "@/lib/huadianbang";
import { prisma } from "@/lib/prisma";

export const revalidate = 300;
type Props = { searchParams: Promise<{ q?: string }> };

export async function generateMetadata(): Promise<Metadata> {
  return buildCategoryMetadata(
    "/awards",
    "整木评选",
    "整木评选栏目，发布评选规则、年度榜单与获奖结果。"
  );
}

export default async function AwardsPage({ searchParams }: Props) {
  const { q = "" } = await searchParams;
  const keyword = q.trim();
  const [category, awards] = await Promise.all([
    getCategoryWithMetaByHref("/awards"),
    prisma.award.findMany({
      where: keyword
        ? {
            OR: [{ title: { contains: keyword } }, { description: { contains: keyword } }],
          }
        : undefined,
      orderBy: [{ year: "desc" }, { updatedAt: "desc" }],
      take: 24,
      select: { id: true, title: true, slug: true, year: true, description: true, updatedAt: true },
    }),
  ]);

  const latestYear = awards.find((x) => x.year != null)?.year ?? null;
  const yearCount = new Set(awards.map((x) => x.year).filter((x): x is number => x != null)).size;
  const huadianYear = getLatestHuadianYear();

  return (
    <CategoryHome basePath="/awards" category={category} searchHref="/awards">
      <section className="glass-panel p-5 sm:p-6">
        <div className="grid sm:grid-cols-3 gap-3">
          <div className="rounded-2xl border border-border bg-surface-elevated p-4">
            <p className="text-xs text-muted">评选收录</p>
            <p className="mt-2 text-2xl font-semibold text-primary">{awards.length}</p>
          </div>
          <div className="rounded-2xl border border-border bg-surface-elevated p-4">
            <p className="text-xs text-muted">最新年度</p>
            <p className="mt-2 text-2xl font-semibold text-primary">{latestYear ?? "未发布"}</p>
          </div>
          <div className="rounded-2xl border border-border bg-surface-elevated p-4">
            <p className="text-xs text-muted">覆盖年份</p>
            <p className="mt-2 text-2xl font-semibold text-primary">{yearCount}</p>
          </div>
        </div>
      </section>

      <section className="mt-8">
        <article className="glass-panel p-5 sm:p-6">
          <form method="get" className="flex flex-col sm:flex-row gap-3">
            <input
              name="q"
              defaultValue={keyword}
              className="flex-1 border border-border rounded px-3 py-2 bg-surface"
              placeholder="搜索评选标题或描述"
            />
            <button className="px-4 py-2 rounded bg-accent text-white text-sm">搜索</button>
            {keyword && (
              <Link href="/awards" className="px-4 py-2 rounded border border-border text-sm text-primary hover:bg-surface text-center">
                清空
              </Link>
            )}
          </form>
        </article>
      </section>

      <section className="mt-8">
        <article className="glass-panel p-5 sm:p-6">
          <h2 className="text-lg font-semibold text-primary">华点榜信用系统</h2>
          <p className="mt-2 text-sm text-muted">{HUADIAN_DEFINITION}</p>
          <div className="mt-4 flex flex-wrap gap-3">
            <Link href="/huadianbang" className="apple-inline-link">进入华点榜</Link>
            <Link href={`/huadianbang/${huadianYear}`} className="apple-inline-link">查看本年度榜单</Link>
            <Link href="/huadianbang/feature" className="apple-inline-link">查看特色奖项</Link>
            <Link href="/huadianbang/partner" className="apple-inline-link">查看配套商推荐</Link>
          </div>
        </article>
      </section>

      <section className="mt-8">
        <article className="glass-panel p-5 sm:p-6">
          <div className="flex items-center justify-between gap-3 mb-4">
            <div>
              <h2 className="section-label text-primary mb-2">评选发布内容</h2>
              <p className="text-sm text-muted">集中展示年度评选结果与获奖企业详情。</p>
            </div>
            <span className="text-xs rounded-full border border-border px-2.5 py-1 text-muted">
              共 {awards.length} 条
            </span>
          </div>

          {awards.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border p-8 text-center bg-surface-elevated">
              <p className="text-base font-medium text-primary">评选中心正在准备内容</p>
              <p className="mt-2 text-sm text-muted">你可以先查看华点榜年度榜单，或通过会员系统提交评选资料。</p>
              <div className="mt-4 flex items-center justify-center gap-3">
                <Link href={`/huadianbang/${huadianYear}`} className="apple-inline-link">
                  查看年度榜单
                </Link>
                <Link href="/membership" className="text-sm text-muted hover:text-accent">
                  进入会员系统
                </Link>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {awards.map((x) => (
                <Link
                  key={x.id}
                  href={`/awards/${x.slug || x.id}`}
                  className="interactive-lift rounded-2xl border border-border bg-surface-elevated p-4 block"
                >
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-xs rounded-full px-2 py-1 border border-border text-muted">
                      {x.year ?? "未标注年份"}
                    </span>
                    <span className="text-xs text-muted">{x.updatedAt.toLocaleDateString("zh-CN")}</span>
                  </div>
                  <h3 className="mt-3 text-base font-semibold text-primary leading-6">{x.title}</h3>
                  {x.description && (
                    <p className="mt-2 text-sm text-muted line-clamp-2">{x.description.replace(/<[^>]*>/g, "")}</p>
                  )}
                  <p className="mt-3 text-sm text-accent">查看评选详情</p>
                </Link>
              ))}
            </div>
          )}
        </article>
      </section>
    </CategoryHome>
  );
}

