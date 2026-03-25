import type { Metadata } from "next";
import { CategoryHome } from "@/components/CategoryHome";
import Link from "next/link";
import { getCategoryWithMetaByHref } from "@/lib/categories";
import { buildCategoryMetadata } from "@/lib/category-metadata";
import { getBrandDirectoryList } from "@/lib/brand-directory";

export const revalidate = 300;

export async function generateMetadata(): Promise<Metadata> {
  return buildCategoryMetadata(
    "/brands",
    "整木市场",
    "整木市场栏目，涵盖整木品牌与整木选购 FAQ，帮助用户完成品牌选择与采购决策。"
  );
}

export default async function BrandsPage() {
  const [category, brands] = await Promise.all([
    getCategoryWithMetaByHref("/brands"),
    getBrandDirectoryList(8),
  ]);

  return (
    <CategoryHome basePath="/brands" category={category} searchHref="/brands/all">
      <section className="mt-8">
        <article className="glass-panel p-6 sm:p-8">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="section-label mb-2 text-primary">品牌展示</h2>
              <p className="text-sm text-muted">这里展示已迁移的真实企业品牌资料，推荐品牌优先露出。</p>
            </div>
            <Link
              href="/brands/all"
              className="inline-flex items-center gap-2 rounded-full border border-[rgba(194,182,154,0.24)] bg-[linear-gradient(180deg,rgba(255,252,246,0.96),rgba(246,240,231,0.9))] px-3.5 py-1.5 text-[13px] font-medium text-[#7d6846] shadow-[0_10px_24px_rgba(15,23,42,0.04),inset_0_1px_0_rgba(255,255,255,0.9)] transition-all duration-200 hover:-translate-y-0.5 hover:border-[rgba(170,154,122,0.34)] hover:text-[#6f5b3d]"
            >
              查看全部品牌
              <span aria-hidden="true" className="text-[12px] text-[#b49a6b]">-&gt;</span>
            </Link>
          </div>

          {brands.length === 0 ? (
            <p className="mt-6 text-sm text-muted">暂无品牌展示数据，企业会员迁移完成后会在这里呈现。</p>
          ) : (
            <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              {brands.map((item) => (
                <Link
                  key={item.id}
                  href={item.enterprise ? `/enterprise/${item.enterprise.id}` : `/brands/${item.slug}`}
                  className="rounded-[24px] border border-border bg-surface-elevated p-5 transition hover:-translate-y-0.5 hover:border-accent/35 hover:bg-white hover:shadow-[0_18px_36px_rgba(15,23,42,0.08)]"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-[11px] uppercase tracking-[0.12em] text-muted">
                        {item.memberType === "enterprise_advanced" ? "高级企业" : "企业会员"}
                      </p>
                      <h3 className="mt-2 line-clamp-2 font-serif text-lg text-primary">{item.enterpriseName}</h3>
                    </div>
                    {item.isRecommend ? (
                      <span className="rounded-full bg-accent px-2.5 py-1 text-[11px] text-white">推荐</span>
                    ) : null}
                  </div>

                  <p className="mt-3 line-clamp-3 text-sm leading-7 text-muted">{item.summary}</p>
                  <div className="mt-4 flex items-center justify-between text-xs text-muted">
                    <span>{item.region}{item.area ? ` · ${item.area}` : ""}</span>
                    <span className="text-accent">查看详情</span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </article>
      </section>
    </CategoryHome>
  );
}

