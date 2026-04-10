import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { buildCategoryMetadata } from "@/lib/category-metadata";
import { getBrandDirectoryList } from "@/lib/brand-directory";
import { resolveUploadedImageUrl } from "@/lib/uploaded-image";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const HERO_TEXT =
  "聚合整木品牌与整木选购内容，方便用户从品牌了解、产品方向和选购参考等多个角度进入整木市场核心内容。";

const GUIDE_TEXT =
  "整木市场主要包含整木品牌与整木选购两个方向。整木品牌侧重品牌展示与基础资料，整木选购侧重材料、工艺、风格和选购参考，方便用户根据需求进入对应内容。";

const BRAND_COLUMN_HREF = "/brands/brand";
const BUYING_COLUMN_HREF = "/brands/buying";
const BUYING_VISUAL_IMAGE = "/images/seedance2/picture_10.jpg";

const buyingFaqs = [
  {
    question: "选整木先看什么？",
    description: "先建立对常见用材、板材体系与适用场景的基础认知，再判断是否适合自己的项目需求。",
  },
  {
    question: "哪些工艺最影响落地效果？",
    description: "重点关注表面处理、结构做法、安装配合与交付细节，避免只看展示效果。",
  },
  {
    question: "预算和风格怎么平衡？",
    description: "结合空间风格、配置深度与预算区间做判断，让选购方向更清晰、沟通更高效。",
  },
] as const;

export async function generateMetadata(): Promise<Metadata> {
  return buildCategoryMetadata(
    "/brands",
    "整木市场",
    "整木市场首页，聚合整木品牌、品牌介绍与整木选购参考内容，帮助用户更清晰地进入品牌了解与选购方向。",
  );
}

function BrandMark({ name, logoUrl }: { name: string; logoUrl: string | null }) {
  if (logoUrl) {
    return (
      <Image
        src={resolveUploadedImageUrl(logoUrl)}
        alt={`${name}品牌标识`}
        width={72}
        height={72}
        className="h-14 w-14 rounded-2xl border border-[rgba(174,149,111,0.16)] bg-white object-contain p-2.5 shadow-[0_12px_28px_rgba(15,23,42,0.06)] sm:h-[72px] sm:w-[72px]"
      />
    );
  }

  return (
    <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-dashed border-[rgba(174,149,111,0.26)] bg-white text-[11px] tracking-[0.14em] text-[#8d7a5a] sm:h-[72px] sm:w-[72px]">
      品牌
    </div>
  );
}

type DirectoryBrand = Awaited<ReturnType<typeof getBrandDirectoryList>>[number];

function ColumnCard({
  title,
  description,
  href,
  buttonLabel,
}: {
  title: string;
  description: string;
  href: string;
  buttonLabel: string;
}) {
  return (
    <article className="border-t border-[rgba(27,29,33,0.08)] pt-6 sm:pt-7">
      <p className="text-[11px] tracking-[0.18em] text-[#9d7e4d]">子栏目</p>
      <h2 className="mt-4 font-serif text-[2rem] leading-[1.04] text-primary sm:text-[2.35rem]">{title}</h2>
      <p className="mt-4 max-w-md text-[15px] leading-8 text-muted sm:text-base">{description}</p>
      <Link href={href} className="mt-6 inline-flex items-center text-sm text-primary/78 transition hover:text-accent">
        {buttonLabel}
      </Link>
    </article>
  );
}

function BrandOverviewCard({ item }: { item: DirectoryBrand }) {
  return (
    <article className="border-t border-[rgba(27,29,33,0.06)] py-5 first:border-t-0 first:pt-0">
      <div className="flex items-start gap-4">
        <div className="hidden sm:block">
          <BrandMark name={item.enterpriseName} logoUrl={item.logoUrl} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-end justify-between gap-2">
            <h3 className="font-serif text-[1.45rem] leading-tight text-primary">{item.enterpriseName}</h3>
            <span className="text-xs text-muted">{item.locationLabel}</span>
          </div>
          <p className="mt-3 max-w-xl line-clamp-2 text-sm leading-7 text-muted">{item.headline}</p>
          <div className="mt-4">
            <Link href={`/brands/${item.slug}`} className="text-sm text-primary/72 transition hover:text-accent">
              查看详情
            </Link>
          </div>
        </div>
      </div>
    </article>
  );
}

export default async function BrandsPage() {
  const brands = await getBrandDirectoryList(4);

  return (
    <div className="min-h-screen">
      <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 sm:py-14">
        <nav className="mb-6 flex flex-wrap items-center gap-x-2 gap-y-2 text-sm text-muted" aria-label="面包屑">
          <Link href="/" className="transition-colors hover:text-accent">
            首页
          </Link>
          <span>/</span>
          <span className="font-medium text-primary">整木市场</span>
        </nav>

        <section className="relative py-12 sm:py-16">
          <div
            aria-hidden
            className="absolute left-0 top-2 h-52 w-52 rounded-full bg-[radial-gradient(circle,rgba(212,187,145,0.2),transparent_72%)] blur-2xl"
          />
          <div className="relative max-w-4xl">
            <p className="text-[11px] tracking-[0.22em] text-[#9d7e4d]">栏目首页</p>
            <h1 className="mt-4 text-[2rem] font-semibold tracking-tight text-primary sm:text-[2.5rem]">整木市场</h1>
            <p className="mt-5 max-w-[34rem] text-[15px] leading-8 text-muted sm:text-[1rem]">
              聚合整木品牌与整木选购内容，方便用户从品牌了解、产品方向和选购参考等角度进入整木市场核心内容。
            </p>
            <div className="mt-8 flex flex-wrap gap-3 sm:gap-4">
              <Link
                href={BRAND_COLUMN_HREF}
                className="inline-flex min-h-12 items-center justify-center rounded-full bg-[linear-gradient(180deg,rgba(176,150,103,0.96),rgba(142,118,77,0.98))] px-6 py-3 text-sm font-medium text-white shadow-[0_12px_30px_rgba(176,150,103,0.2)] transition hover:brightness-[1.03]"
              >
                进入整木品牌
              </Link>
              <Link
                href={BUYING_COLUMN_HREF}
                className="inline-flex min-h-12 items-center justify-center rounded-full border border-[rgba(27,29,33,0.08)] bg-white/92 px-6 py-3 text-sm font-medium text-primary transition hover:border-[rgba(138,115,77,0.24)] hover:text-accent"
              >
                进入整木选购
              </Link>
            </div>
          </div>
        </section>

        <section className="mt-12 grid gap-10 lg:grid-cols-2 lg:gap-12">
          <ColumnCard
            title="整木品牌"
            description="查看整木行业品牌展示、品牌介绍与基础资料，快速了解不同品牌的定位与方向。"
            href={BRAND_COLUMN_HREF}
            buttonLabel="了解整木品牌 →"
          />
          <ColumnCard
            title="整木选购"
            description="查看整木选购相关内容，从材料、工艺、预算、风格与落地需求等角度获取参考。"
            href={BUYING_COLUMN_HREF}
            buttonLabel="了解整木选购 →"
          />
        </section>

        {brands.length > 0 ? (
          <section className="mt-20">
            <div className="grid gap-8 lg:grid-cols-[220px,minmax(0,1fr)] lg:gap-10">
              <div className="lg:pt-1">
                <h2 className="font-serif text-[1.85rem] text-primary sm:text-[2.1rem]">品牌速览</h2>
                <p className="mt-2 text-sm leading-7 text-muted">
                  保留少量品牌介绍与基础资料，帮助用户快速进入整木品牌栏目。
                </p>
                <Link href={BRAND_COLUMN_HREF} className="mt-5 inline-block text-sm text-primary transition hover:text-accent">
                  进入整木品牌栏目
                </Link>
              </div>
              <div className="grid gap-x-10 md:grid-cols-2">
                {brands.map((item) => (
                  <BrandOverviewCard key={item.id} item={item} />
                ))}
              </div>
            </div>
          </section>
        ) : null}

        <section className="mt-20">
          <div className="grid grid-cols-1 gap-8 lg:grid-cols-[minmax(0,1fr),340px] lg:items-start lg:gap-12">
            <div>
              <div className="max-w-3xl">
                <h2 className="font-serif text-[1.85rem] text-primary sm:text-[2.1rem]">选购参考</h2>
                <p className="mt-2 text-sm leading-7 text-muted sm:text-[15px]">
                  用常见问题快速建立选购判断，再进入整木选购栏目查看更具体的内容。
                </p>
              </div>

              <div className="mt-10 space-y-5">
                {buyingFaqs.map((item) => (
                  <Link
                    key={item.question}
                    href={BUYING_COLUMN_HREF}
                    className="group block max-w-3xl border-t border-[rgba(27,29,33,0.06)] pt-7 transition"
                  >
                    <article>
                      <h3 className="font-serif text-[1.3rem] leading-tight text-primary transition group-hover:text-accent">
                        {item.question}
                      </h3>
                      <p className="mt-4 text-sm leading-7 text-muted transition group-hover:text-primary/80">
                        {item.description}
                      </p>
                    </article>
                  </Link>
                ))}
              </div>

              <Link href={BUYING_COLUMN_HREF} className="mt-10 inline-block text-sm text-primary transition hover:text-accent">
                查看更多整木选购问题 →
              </Link>
            </div>

            <aside className="mt-1 lg:mt-0">
              <div className="overflow-hidden rounded-[28px]">
                <Image
                  src={BUYING_VISUAL_IMAGE}
                  alt="整木空间效果参考"
                  width={900}
                  height={560}
                  className="aspect-[16/10] h-auto w-full object-cover"
                />
              </div>
              <div className="mt-6 max-w-[18rem]">
                <p className="text-base leading-7 text-primary sm:text-[1.05rem]">看看真实整木空间效果</p>
                <Link
                  href={BRAND_COLUMN_HREF}
                  className="mt-4 inline-flex items-center text-sm text-primary/82 transition hover:text-accent"
                >
                  查看整木品牌 →
                </Link>
              </div>
            </aside>
          </div>
        </section>

        <section className="mt-20 border-t border-[rgba(27,29,33,0.08)] pt-8 sm:pt-10">
          <div className="max-w-3xl">
            <p className="text-sm leading-7 text-muted">
              如果你已经明确想先看品牌定位、空间表达与基础资料，可以直接进入整木品牌栏目继续浏览。
            </p>
            <Link href={BRAND_COLUMN_HREF} className="mt-5 inline-flex items-center text-base text-primary transition hover:text-accent">
              查看整木品牌 →
            </Link>
          </div>
        </section>
      </div>
    </div>
  );
}
