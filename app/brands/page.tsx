import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { CategoryHome } from "@/components/CategoryHome";
import { buildCategoryMetadata } from "@/lib/category-metadata";
import { getCategoryWithMetaByHref } from "@/lib/categories";
import { getBrandDirectoryList } from "@/lib/brand-directory";
import { resolveUploadedImageUrl } from "@/lib/uploaded-image";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function generateMetadata(): Promise<Metadata> {
  return buildCategoryMetadata(
    "/brands",
    "整木市场",
    "整木市场栏目，涵盖整木品牌与整木选购 FAQ，帮助用户完成品牌选择与采购决策。"
  );
}

export default async function BrandsPage() {
  const [category, brands] = await Promise.all([getCategoryWithMetaByHref("/brands"), getBrandDirectoryList(8)]);

  return (
    <CategoryHome basePath="/brands" category={category} searchHref="/brands/all">
      <section className="mt-8 space-y-6">
        <article className="glass-panel overflow-hidden p-0">
          <div className="grid gap-0 lg:grid-cols-[1.08fr,0.92fr]">
            <div className="p-6 sm:p-8">
              <p className="text-xs uppercase tracking-[0.24em] text-accent">Brand Showcase</p>
              <h2 className="mt-3 font-serif text-3xl text-primary sm:text-4xl">品牌展示</h2>
              <p className="mt-4 max-w-2xl text-sm leading-8 text-muted">
                这里展示已迁移并可运营的真实企业品牌资料。品牌摘要、Logo、地区和联系方式会优先读取企业实时数据，推荐品牌优先露出。
              </p>
              <div className="mt-6 flex flex-wrap gap-3">
                <Link href="/brands/all" className="inline-flex items-center justify-center rounded-full bg-accent px-5 py-3 text-sm font-medium text-white transition hover:opacity-92">
                  查看全部品牌
                </Link>
                <Link href="/brands/all" className="inline-flex items-center justify-center rounded-full border border-border bg-white px-5 py-3 text-sm font-medium text-primary transition hover:bg-surface">
                  按地区筛选
                </Link>
              </div>
            </div>
            <div className="border-t border-border/70 bg-[radial-gradient(circle_at_top,rgba(213,183,131,0.16),transparent_38%),linear-gradient(180deg,rgba(255,253,249,0.98),rgba(245,239,230,0.92))] p-6 sm:p-8 lg:border-l lg:border-t-0">
              <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-1">
                <div className="rounded-[24px] border border-[rgba(180,154,107,0.18)] bg-white/88 px-4 py-4 shadow-[0_14px_36px_rgba(15,23,42,0.05)]">
                  <p className="text-[11px] uppercase tracking-[0.2em] text-[#8d7a5a]">展示逻辑</p>
                  <p className="mt-3 text-sm leading-7 text-primary">企业实时字段优先，避免旧快照覆盖新内容。</p>
                </div>
                <div className="rounded-[24px] border border-[rgba(180,154,107,0.18)] bg-white/88 px-4 py-4 shadow-[0_14px_36px_rgba(15,23,42,0.05)]">
                  <p className="text-[11px] uppercase tracking-[0.2em] text-[#8d7a5a]">转化入口</p>
                  <p className="mt-3 text-sm leading-7 text-primary">详情页内提供联系品牌、立即咨询、获取方案入口。</p>
                </div>
                <div className="rounded-[24px] border border-[rgba(180,154,107,0.18)] bg-white/88 px-4 py-4 shadow-[0_14px_36px_rgba(15,23,42,0.05)]">
                  <p className="text-[11px] uppercase tracking-[0.2em] text-[#8d7a5a]">数据治理</p>
                  <p className="mt-3 text-sm leading-7 text-primary">后台可直接维护 Logo、简介、地区与联系方式。</p>
                </div>
              </div>
            </div>
          </div>
        </article>

        <article className="glass-panel p-6 sm:p-8">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h3 className="section-label mb-2 text-primary">推荐品牌</h3>
              <p className="text-sm text-muted">优先展示适合用户快速判断和咨询的推荐企业。</p>
            </div>
            <p className="text-sm text-muted">共展示 {brands.length} 家推荐品牌</p>
          </div>

          {brands.length === 0 ? (
            <p className="mt-6 text-sm text-muted">暂无品牌展示数据，企业会员迁移完成后会在这里呈现。</p>
          ) : (
            <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              {brands.map((item) => {
                const href = item.enterprise ? `/enterprise/${item.enterprise.id}` : `/brands/${item.slug}`;
                return (
                  <Link
                    key={item.id}
                    href={href}
                    className="group rounded-[26px] border border-border bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(248,243,236,0.92))] p-5 transition hover:-translate-y-1 hover:border-accent/35 hover:shadow-[0_20px_42px_rgba(15,23,42,0.08)]"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-[11px] uppercase tracking-[0.12em] text-muted">{item.memberType === "enterprise_advanced" ? "高级企业" : "企业会员"}</p>
                        <h3 className="mt-2 line-clamp-2 font-serif text-xl text-primary">{item.enterpriseName}</h3>
                      </div>
                      <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-[18px] border border-border bg-white shadow-[0_10px_24px_rgba(15,23,42,0.04)]">
                        {item.logoUrl ? (
                          <Image src={resolveUploadedImageUrl(item.logoUrl)} alt={`${item.enterpriseName} logo`} width={96} height={96} className="h-full w-full object-contain p-2" />
                        ) : (
                          <span className="text-[11px] text-muted">LOGO</span>
                        )}
                      </div>
                    </div>

                    <p className="mt-4 line-clamp-4 text-sm leading-7 text-muted">{item.summary}</p>
                    <div className="mt-4 flex flex-wrap gap-2 text-xs text-muted">
                      <span className="rounded-full border border-border px-2.5 py-1">{item.region}</span>
                      {item.area ? <span className="rounded-full border border-border px-2.5 py-1">{item.area}</span> : null}
                    </div>
                    <div className="mt-5 flex items-center justify-between text-sm">
                      <span className="text-accent">联系品牌</span>
                      <span className="text-primary transition group-hover:translate-x-0.5">查看详情</span>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </article>
      </section>
    </CategoryHome>
  );
}
