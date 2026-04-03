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
    "整木市场栏目，涵盖整木品牌与整木选购 FAQ，帮助用户完成品牌选择与采购决策。",
  );
}

function BrandMark({ name, logoUrl }: { name: string; logoUrl: string | null }) {
  if (logoUrl) {
    return (
      <Image
        src={resolveUploadedImageUrl(logoUrl)}
        alt={`${name} logo`}
        width={96}
        height={96}
        className="h-[84px] w-[84px] rounded-[26px] border border-[rgba(174,149,111,0.18)] bg-white object-contain p-3 shadow-[0_14px_34px_rgba(15,23,42,0.06)]"
      />
    );
  }

  return <div className="flex h-[84px] w-[84px] items-center justify-center rounded-[26px] border border-dashed border-[rgba(174,149,111,0.28)] bg-white text-[11px] tracking-[0.18em] text-[#8d7a5a]">LOGO</div>;
}

type DirectoryBrand = Awaited<ReturnType<typeof getBrandDirectoryList>>[number];

function BrandPreviewCard({ item, compact = false }: { item: DirectoryBrand; compact?: boolean }) {
  const href = `/brands/${item.slug}`;

  return (
    <Link
      href={href}
      className={[
        "group block rounded-[28px] border border-[rgba(181,157,121,0.16)] bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(250,247,242,0.92))] shadow-[0_16px_40px_rgba(15,23,42,0.05)] transition hover:-translate-y-1 hover:border-[rgba(181,157,121,0.3)] hover:shadow-[0_22px_54px_rgba(15,23,42,0.08)]",
        compact ? "p-5" : "p-6",
      ].join(" ")}
    >
      <div className="flex items-start gap-4">
        <BrandMark name={item.enterpriseName} logoUrl={item.logoUrl} />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                {item.isRecommend ? (
                  <span className="rounded-full border border-[rgba(181,157,121,0.22)] bg-[rgba(245,236,220,0.8)] px-3 py-1 text-xs text-accent">
                    推荐
                  </span>
                ) : null}
                <span className="text-[11px] uppercase tracking-[0.18em] text-muted">
                  {item.memberType === "enterprise_advanced" ? "高级企业" : "企业会员"}
                </span>
              </div>
              <h3 className="mt-3 font-serif text-2xl leading-tight text-primary">{item.enterpriseName}</h3>
            </div>
            <span className="text-xs text-muted">{item.locationLabel}</span>
          </div>

          <p className="mt-4 line-clamp-2 text-sm leading-7 text-primary/88">{item.headline}</p>
          <p className="mt-2 line-clamp-3 text-sm leading-7 text-muted">{item.summary}</p>

          <div className="mt-4 flex flex-wrap gap-2 text-xs text-muted">
            {item.highlights.slice(0, compact ? 2 : 3).map((tag) => (
              <span key={tag} className="rounded-full border border-border px-3 py-1.5">
                {tag}
              </span>
            ))}
          </div>

          <div className="mt-5 flex flex-wrap items-center justify-between gap-3 text-sm">
            <div className="flex flex-wrap gap-3 text-muted">
              <span>{item.serviceLine}</span>
              <span>{item.contactLabel}</span>
            </div>
            <span className="text-primary transition group-hover:translate-x-0.5">查看详情</span>
          </div>
        </div>
      </div>
    </Link>
  );
}

export default async function BrandsPage() {
  const [category, brands] = await Promise.all([getCategoryWithMetaByHref("/brands"), getBrandDirectoryList(8)]);
  const recommended = brands.filter((item) => item.isRecommend);
  const lead = recommended[0] ?? brands[0] ?? null;
  const spotlight = brands.filter((item) => item.id !== lead?.id).slice(0, 3);
  const directory = brands.filter((item) => item.id !== lead?.id).slice(0, 4);

  return (
    <CategoryHome basePath="/brands" category={category} searchHref="/brands/all">
      <section className="mt-8 space-y-8">
        <article className="overflow-hidden rounded-[36px] border border-[rgba(181,157,121,0.18)] bg-[radial-gradient(circle_at_top_left,rgba(213,183,131,0.15),transparent_32%),linear-gradient(180deg,rgba(255,255,255,0.98),rgba(247,242,235,0.92))] shadow-[0_24px_76px_rgba(34,31,26,0.08)]">
          <div className="p-7 sm:p-9">
            <div className="flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
              <div className="max-w-3xl">
                <p className="text-xs uppercase tracking-[0.3em] text-[#9d7e4d]">Brand Directory</p>
                <h1 className="mt-4 font-serif text-3xl text-primary sm:text-[2.9rem] sm:leading-[1.08]">整木市场</h1>
              </div>
              <div className="flex flex-wrap gap-3">
                <Link href="/brands/all" className="inline-flex items-center justify-center rounded-full bg-accent px-5 py-3 text-sm font-medium text-white transition hover:opacity-92">
                  浏览全部品牌
                </Link>
                <Link href="/brands/all" className="inline-flex items-center justify-center rounded-full border border-border bg-white px-5 py-3 text-sm font-medium text-primary transition hover:bg-surface">
                  按地区筛选
                </Link>
              </div>
            </div>
          </div>
        </article>

        {lead ? (
          <article className="grid gap-4 xl:grid-cols-[1.08fr,0.92fr]">
            <div className="group overflow-hidden rounded-[34px] border border-[rgba(181,157,121,0.18)] bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(246,240,231,0.92))] p-7 shadow-[0_20px_64px_rgba(34,31,26,0.08)] transition hover:-translate-y-1 hover:shadow-[0_26px_78px_rgba(34,31,26,0.12)]">
              <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
                <div className="max-w-2xl">
                  <p className="text-xs uppercase tracking-[0.28em] text-[#9d7e4d]">Featured Brand</p>
                  <Link href={`/brands/${lead.slug}`} className="mt-3 inline-block font-serif text-3xl leading-tight text-primary transition hover:text-accent sm:text-[2.4rem]">
                    {lead.enterpriseName}
                  </Link>
                  <p className="mt-4 text-base leading-8 text-primary/88">{lead.headline}</p>
                  <p className="mt-4 text-sm leading-8 text-muted">{lead.summary}</p>
                  <div className="mt-5 flex flex-wrap gap-2 text-xs text-muted">
                    {lead.highlights.map((item) => (
                      <span key={item} className="rounded-full border border-border px-3 py-1.5">
                        {item}
                      </span>
                    ))}
                  </div>
                </div>
                <div className="flex flex-col items-start gap-4 sm:items-end">
                  <span className="rounded-full bg-accent px-3.5 py-1.5 text-xs text-white">推荐品牌</span>
                  <BrandMark name={lead.enterpriseName} logoUrl={lead.logoUrl} />
                </div>
              </div>
              <div className="mt-8 grid gap-4 border-t border-[rgba(181,157,121,0.12)] pt-5 text-sm sm:grid-cols-[1fr,auto] sm:items-center">
                <div className="space-y-2 text-muted">
                  <p>{lead.locationLabel}</p>
                  <p>{lead.serviceLine}</p>
                </div>
                <div className="flex flex-wrap gap-3">
                  {lead.contactHref ? (
                    <a
                      href={lead.contactHref}
                      target={lead.contactHref.startsWith("http") ? "_blank" : undefined}
                      rel={lead.contactHref.startsWith("http") ? "noreferrer" : undefined}
                      className="rounded-full border border-[rgba(181,157,121,0.2)] bg-white px-4 py-2 text-accent transition hover:bg-[rgba(255,249,238,0.92)]"
                    >
                      {lead.contactLabel}
                    </a>
                  ) : (
                    <span className="rounded-full border border-[rgba(181,157,121,0.2)] bg-white px-4 py-2 text-accent">{lead.contactLabel}</span>
                  )}
                  <Link
                    href={`/brands/${lead.slug}`}
                    className="rounded-full border border-[rgba(181,157,121,0.2)] bg-white px-4 py-2 text-primary transition hover:bg-[rgba(255,249,238,0.92)]"
                  >
                    查看详情
                  </Link>
                </div>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-1">
              {spotlight.map((item) => (
                <BrandPreviewCard key={item.id} item={item} compact />
              ))}
            </div>
          </article>
        ) : null}

        <article className="rounded-[32px] border border-[rgba(181,157,121,0.16)] bg-white/94 p-6 shadow-[0_16px_40px_rgba(15,23,42,0.05)] sm:p-8">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 className="section-label mb-2 text-primary">品牌列表</h2>
            </div>
            <Link href="/brands/all" className="text-sm text-accent transition hover:opacity-80">
              查看全部品牌
            </Link>
          </div>

          {directory.length === 0 ? (
            <p className="mt-6 text-sm text-muted">暂无可展示的品牌资料。</p>
          ) : (
            <div className="mt-6 grid gap-4 lg:grid-cols-2">
              {directory.map((item) => (
                <BrandPreviewCard key={item.id} item={item} />
              ))}
            </div>
          )}
        </article>
      </section>
    </CategoryHome>
  );
}
