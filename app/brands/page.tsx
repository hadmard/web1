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

function BrandMark({ name, logoUrl }: { name: string; logoUrl: string | null }) {
  if (logoUrl) {
    return <Image src={resolveUploadedImageUrl(logoUrl)} alt={`${name} logo`} width={88} height={88} className="h-[76px] w-[76px] rounded-[22px] border border-[rgba(174,149,111,0.18)] bg-white object-contain p-3 shadow-[0_12px_28px_rgba(15,23,42,0.05)]" />;
  }

  return <div className="flex h-[76px] w-[76px] items-center justify-center rounded-[22px] border border-dashed border-[rgba(174,149,111,0.28)] bg-white text-[11px] tracking-[0.18em] text-[#8d7a5a]">LOGO</div>;
}

export default async function BrandsPage() {
  const [category, brands] = await Promise.all([getCategoryWithMetaByHref("/brands"), getBrandDirectoryList(8)]);
  const lead = brands[0] ?? null;
  const rest = brands.slice(1, 5);

  return (
    <CategoryHome basePath="/brands" category={category} searchHref="/brands/all">
      <section className="mt-8 space-y-6">
        <article className="overflow-hidden rounded-[34px] border border-[rgba(181,157,121,0.18)] bg-[radial-gradient(circle_at_top_left,rgba(213,183,131,0.14),transparent_34%),linear-gradient(180deg,rgba(255,255,255,0.98),rgba(247,242,235,0.92))] shadow-[0_24px_72px_rgba(34,31,26,0.07)]">
          <div className="grid gap-0 xl:grid-cols-[1.06fr,0.94fr]">
            <div className="p-7 sm:p-9">
              <p className="text-xs uppercase tracking-[0.3em] text-[#9d7e4d]">Brand Showcase</p>
              <h2 className="mt-4 font-serif text-3xl text-primary sm:text-[2.8rem] sm:leading-[1.1]">品牌展示</h2>
              <p className="mt-5 max-w-2xl text-sm leading-8 text-muted">
                这里聚合展示可运营、可维护的整木品牌资料。前台摘要、地区、Logo 与联系入口统一走企业实时信息，方便用户快速判断品牌定位与合作方向。
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
            <div className="border-t border-[rgba(181,157,121,0.16)] p-6 sm:p-8 xl:border-l xl:border-t-0">
              <div className="grid gap-3 sm:grid-cols-3 xl:grid-cols-1">
                <div className="rounded-[24px] border border-[rgba(180,154,107,0.18)] bg-white/88 px-4 py-4 shadow-[0_14px_36px_rgba(15,23,42,0.05)]">
                  <p className="text-[11px] uppercase tracking-[0.2em] text-[#8d7a5a]">展示规则</p>
                  <p className="mt-3 text-sm leading-7 text-primary">企业实时字段优先，统一摘要、地区和联系方式展示口径。</p>
                </div>
                <div className="rounded-[24px] border border-[rgba(180,154,107,0.18)] bg-white/88 px-4 py-4 shadow-[0_14px_36px_rgba(15,23,42,0.05)]">
                  <p className="text-[11px] uppercase tracking-[0.2em] text-[#8d7a5a]">转化入口</p>
                  <p className="mt-3 text-sm leading-7 text-primary">详情页保留联系品牌、立即咨询、获取方案等动作入口。</p>
                </div>
                <div className="rounded-[24px] border border-[rgba(180,154,107,0.18)] bg-white/88 px-4 py-4 shadow-[0_14px_36px_rgba(15,23,42,0.05)]">
                  <p className="text-[11px] uppercase tracking-[0.2em] text-[#8d7a5a]">运营维护</p>
                  <p className="mt-3 text-sm leading-7 text-primary">后台可直接治理 Logo、简介、地区和联系信息，保存后前台立即刷新。</p>
                </div>
              </div>
            </div>
          </div>
        </article>

        {lead ? (
          <article className="grid gap-4 xl:grid-cols-[1.06fr,0.94fr]">
            <Link href={lead.enterprise ? `/enterprise/${lead.enterprise.id}` : `/brands/${lead.slug}`} className="group overflow-hidden rounded-[32px] border border-[rgba(181,157,121,0.18)] bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(246,240,231,0.92))] p-7 shadow-[0_20px_60px_rgba(34,31,26,0.07)] transition hover:-translate-y-1 hover:shadow-[0_26px_72px_rgba(34,31,26,0.1)]">
              <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
                <div className="max-w-2xl">
                  <p className="text-xs uppercase tracking-[0.28em] text-[#9d7e4d]">Featured</p>
                  <h3 className="mt-3 font-serif text-3xl leading-tight text-primary sm:text-[2.35rem]">{lead.enterpriseName}</h3>
                  <p className="mt-4 text-sm leading-8 text-muted">{lead.summary}</p>
                  <div className="mt-5 flex flex-wrap gap-2 text-xs text-muted">
                    <span className="rounded-full border border-border px-3 py-1.5">{lead.region}</span>
                    {lead.area ? <span className="rounded-full border border-border px-3 py-1.5">{lead.area}</span> : null}
                    {lead.enterprise?.productSystem ? <span className="rounded-full border border-border px-3 py-1.5">{lead.enterprise.productSystem}</span> : null}
                  </div>
                </div>
                <div className="flex flex-col items-start gap-4 sm:items-end">
                  <span className="rounded-full bg-accent px-3.5 py-1.5 text-xs text-white">推荐品牌</span>
                  <BrandMark name={lead.enterpriseName} logoUrl={lead.logoUrl} />
                </div>
              </div>
              <div className="mt-7 flex flex-wrap items-center gap-3 text-sm">
                <span className="rounded-full border border-[rgba(181,157,121,0.2)] bg-white/88 px-4 py-2 text-accent">联系品牌</span>
                <span className="rounded-full border border-[rgba(181,157,121,0.2)] bg-white/88 px-4 py-2 text-primary">获取方案</span>
                <span className="text-primary transition group-hover:translate-x-0.5">查看详情</span>
              </div>
            </Link>

            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-1">
              {rest.map((item) => {
                const href = item.enterprise ? `/enterprise/${item.enterprise.id}` : `/brands/${item.slug}`;
                return (
                  <Link key={item.id} href={href} className="group rounded-[28px] border border-[rgba(181,157,121,0.16)] bg-white/92 p-5 shadow-[0_16px_40px_rgba(15,23,42,0.05)] transition hover:-translate-y-1 hover:shadow-[0_22px_54px_rgba(15,23,42,0.08)]">
                    <div className="flex items-start gap-4">
                      <BrandMark name={item.enterpriseName} logoUrl={item.logoUrl} />
                      <div className="min-w-0 flex-1">
                        <p className="text-[11px] uppercase tracking-[0.18em] text-[#9d7e4d]">{item.memberType === "enterprise_advanced" ? "高级企业" : "企业会员"}</p>
                        <h3 className="mt-2 font-serif text-2xl text-primary">{item.enterpriseName}</h3>
                        <p className="mt-3 line-clamp-3 text-sm leading-7 text-muted">{item.summary}</p>
                        <div className="mt-4 flex flex-wrap gap-2 text-xs text-muted">
                          <span className="rounded-full border border-border px-2.5 py-1">{item.region}</span>
                          {item.area ? <span className="rounded-full border border-border px-2.5 py-1">{item.area}</span> : null}
                        </div>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          </article>
        ) : null}

        <article className="rounded-[32px] border border-[rgba(181,157,121,0.16)] bg-white/94 p-6 shadow-[0_16px_40px_rgba(15,23,42,0.05)] sm:p-8">
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
            <div className="mt-6 grid gap-4 lg:grid-cols-2">
              {brands.map((item) => {
                const href = item.enterprise ? `/enterprise/${item.enterprise.id}` : `/brands/${item.slug}`;
                return (
                  <Link key={item.id} href={href} className="group block rounded-[28px] border border-[rgba(181,157,121,0.16)] bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(250,247,242,0.92))] p-5 shadow-[0_14px_34px_rgba(15,23,42,0.05)] transition hover:-translate-y-1 hover:border-[rgba(181,157,121,0.3)] hover:shadow-[0_22px_54px_rgba(15,23,42,0.08)]">
                    <div className="flex items-start gap-4">
                      <BrandMark name={item.enterpriseName} logoUrl={item.logoUrl} />
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div>
                            <p className="text-[11px] uppercase tracking-[0.12em] text-muted">{item.memberType === "enterprise_advanced" ? "高级企业" : "企业会员"}</p>
                            <h3 className="mt-2 font-serif text-2xl text-primary">{item.enterpriseName}</h3>
                          </div>
                          {item.isRecommend ? <span className="rounded-full border border-[rgba(181,157,121,0.22)] bg-[rgba(245,236,220,0.8)] px-3 py-1 text-xs text-accent">推荐</span> : null}
                        </div>
                        <p className="mt-4 text-sm leading-8 text-muted">{item.summary}</p>
                        <div className="mt-5 flex flex-wrap items-center justify-between gap-3 text-sm">
                          <div className="flex flex-wrap gap-2 text-xs text-muted">
                            <span className="rounded-full border border-border px-2.5 py-1">{item.region}</span>
                            {item.area ? <span className="rounded-full border border-border px-2.5 py-1">{item.area}</span> : null}
                          </div>
                          <span className="text-primary transition group-hover:translate-x-0.5">查看详情</span>
                        </div>
                      </div>
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
