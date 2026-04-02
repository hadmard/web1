import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { htmlToPlainText, toSummaryText } from "@/lib/brand-content";
import { resolveUploadedImageUrl } from "@/lib/uploaded-image";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type Props = {
  searchParams: Promise<{
    q?: string;
    region?: string;
    page?: string;
    sort?: string;
  }>;
};

const PAGE_SIZE = 18;
const REGION_OPTIONS = ["全国", "华东", "华中", "华南", "西南", "西北", "华北", "东北"] as const;

export const metadata: Metadata = {
  title: "企业库",
  description: "会员企业主页总览，支持按企业名称与地区筛选，查看企业主页、案例与联系方式。",
};

function buildPageHref(q: string, region: string, sort: string, page: number) {
  const sp = new URLSearchParams();
  if (q) sp.set("q", q);
  if (region) sp.set("region", region);
  if (sort && sort !== "latest") sp.set("sort", sort);
  if (page > 1) sp.set("page", String(page));
  return `/enterprise${sp.toString() ? `?${sp.toString()}` : ""}`;
}

export default async function EnterpriseListPage({ searchParams }: Props) {
  const params = await searchParams;
  const q = (params.q ?? "").trim();
  const region = (params.region ?? "").trim();
  const sort = params.sort === "vip" ? "vip" : "latest";
  const requestedPage = Math.max(1, Number.parseInt(params.page ?? "1", 10) || 1);

  const conditions: Record<string, unknown>[] = [{ verificationStatus: "approved" }];

  if (q) {
    conditions.push({
      OR: [
        { companyName: { contains: q } },
        { companyShortName: { contains: q } },
        { productSystem: { contains: q } },
        { positioning: { contains: q } },
        { region: { contains: q } },
        { area: { contains: q } },
      ],
    });
  }

  if (region) {
    conditions.push({
      OR: [{ region: { contains: region } }, { area: { contains: region } }],
    });
  }

  const where = conditions.length > 0 ? { AND: conditions } : {};

  const orderBy =
    sort === "vip"
      ? [{ member: { rankingWeight: "desc" as const } }, { updatedAt: "desc" as const }, { createdAt: "desc" as const }]
      : [{ updatedAt: "desc" as const }, { createdAt: "desc" as const }];

  const total = await prisma.enterprise.count({ where });
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const page = Math.min(requestedPage, totalPages);

  const items = await prisma.enterprise.findMany({
    where,
    include: {
      member: {
        select: {
          memberType: true,
          rankingWeight: true,
          name: true,
        },
      },
      brand: {
        select: {
          id: true,
          slug: true,
          isBrandVisible: true,
        },
      },
    },
    orderBy,
    skip: (page - 1) * PAGE_SIZE,
    take: PAGE_SIZE,
  });

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:py-10">
      <nav className="mb-6 text-sm text-muted" aria-label="面包屑">
        <Link href="/" className="hover:text-accent">首页</Link>
        <span className="mx-2">/</span>
        <span className="text-primary">企业库</span>
      </nav>

      <section className="overflow-hidden rounded-[36px] border border-[rgba(181,157,121,0.18)] bg-[radial-gradient(circle_at_top_left,rgba(213,183,131,0.15),transparent_32%),linear-gradient(180deg,rgba(255,255,255,0.98),rgba(247,242,235,0.92))] shadow-[0_28px_80px_rgba(34,31,26,0.07)]">
        <div className="grid gap-0 xl:grid-cols-[1.08fr,0.92fr]">
          <div className="p-7 sm:p-9">
            <p className="text-xs uppercase tracking-[0.3em] text-[#9d7e4d]">Enterprise Directory</p>
            <h1 className="mt-4 font-serif text-3xl text-primary sm:text-[2.8rem] sm:leading-[1.1]">企业库</h1>
            <p className="mt-4 max-w-2xl text-sm leading-8 text-muted">
              企业是内容池，品牌是展示位。这里展示已审核企业主页，是否进入品牌栏目由品牌绑定与展示开关单独控制。
            </p>
            <div className="mt-6 flex flex-wrap gap-3 text-sm">
              <span className="rounded-full border border-[rgba(181,157,121,0.2)] bg-white/80 px-4 py-2 text-primary">当前企业 {total} 家</span>
              <span className="rounded-full border border-[rgba(181,157,121,0.2)] bg-white/80 px-4 py-2 text-primary">支持名称与地区筛选</span>
            </div>
          </div>

          <div className="border-t border-[rgba(181,157,121,0.16)] p-6 sm:p-8 xl:border-l xl:border-t-0">
            <form method="get" className="rounded-[28px] border border-[rgba(181,157,121,0.18)] bg-white/86 p-5 shadow-[0_16px_38px_rgba(15,23,42,0.05)]">
              <label className="block text-xs uppercase tracking-[0.18em] text-[#8d7a5a]">搜索企业</label>
              <input
                name="q"
                defaultValue={q}
                className="mt-3 h-12 w-full rounded-[18px] border border-border bg-surface px-4 text-sm text-primary"
                placeholder="企业名称 / 品类 / 地区关键词"
              />
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <select name="region" defaultValue={region} className="h-12 rounded-[18px] border border-border bg-surface px-4 text-sm text-primary">
                  <option value="">全部地区</option>
                  {REGION_OPTIONS.map((item) => (
                    <option key={item} value={item}>{item}</option>
                  ))}
                </select>
                <select name="sort" defaultValue={sort} className="h-12 rounded-[18px] border border-border bg-surface px-4 text-sm text-primary">
                  <option value="latest">最新更新</option>
                  <option value="vip">权重优先</option>
                </select>
              </div>
              <div className="mt-4 flex flex-wrap gap-3">
                <button className="rounded-full bg-accent px-5 py-2.5 text-sm font-medium text-white">开始筛选</button>
                <Link href="/enterprise" className="rounded-full border border-border bg-white px-5 py-2.5 text-sm text-primary transition hover:bg-surface">重置</Link>
              </div>
            </form>
          </div>
        </div>
      </section>

      <section className="mt-8 grid gap-4 lg:grid-cols-2">
        {items.length === 0 ? (
          <article className="rounded-[28px] border border-border bg-white p-10 text-center text-sm text-muted shadow-[0_14px_36px_rgba(15,23,42,0.05)] lg:col-span-2">
            暂无符合条件的企业主页。
          </article>
        ) : (
          items.map((item) => {
            const name = item.companyShortName || item.companyName || item.member.name || "企业";
            const summary =
              toSummaryText(item.positioning || item.intro || htmlToPlainText(item.intro || ""), 120) ||
              "企业资料正在持续完善中。";
            const logoUrl = item.logoUrl ? resolveUploadedImageUrl(item.logoUrl) : null;

            return (
              <Link
                key={item.id}
                href={`/enterprise/${item.id}`}
                className="group block rounded-[30px] border border-[rgba(181,157,121,0.16)] bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(250,247,242,0.92))] p-5 shadow-[0_16px_40px_rgba(15,23,42,0.05)] transition hover:-translate-y-1 hover:border-[rgba(181,157,121,0.3)] hover:shadow-[0_22px_54px_rgba(15,23,42,0.08)] sm:p-6"
              >
                <div className="flex gap-4">
                  <div className="flex h-[72px] w-[72px] shrink-0 items-center justify-center overflow-hidden rounded-[22px] border border-[rgba(174,149,111,0.18)] bg-white p-3 shadow-[0_12px_28px_rgba(15,23,42,0.05)]">
                    {logoUrl ? (
                      <Image src={logoUrl} alt={`${name} logo`} width={72} height={72} className="h-full w-full object-contain" />
                    ) : (
                      <span className="text-[11px] tracking-[0.18em] text-[#8d7a5a]">LOGO</span>
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="text-[11px] uppercase tracking-[0.18em] text-muted">
                          {item.member.memberType === "enterprise_advanced" ? "VIP 企业" : "基础企业"}
                        </p>
                        <h2 className="mt-2 font-serif text-[1.75rem] leading-tight text-primary">{name}</h2>
                      </div>
                      {item.brand?.isBrandVisible ? (
                        <span className="rounded-full border border-[rgba(181,157,121,0.22)] bg-[rgba(245,236,220,0.8)] px-3 py-1 text-xs text-accent">
                          品牌展示中
                        </span>
                      ) : null}
                    </div>

                    <p className="mt-4 text-sm leading-7 text-primary/88">{item.positioning || item.productSystem || "企业主页已开通"}</p>
                    <p className="mt-2 text-sm leading-8 text-muted">{summary}</p>

                    <div className="mt-5 flex flex-wrap gap-2 text-xs text-muted">
                      <span className="rounded-full border border-border px-3 py-1.5">{item.region || "全国"}</span>
                      {item.area ? <span className="rounded-full border border-border px-3 py-1.5">{item.area}</span> : null}
                      {item.productSystem ? <span className="rounded-full border border-border px-3 py-1.5">{item.productSystem}</span> : null}
                    </div>
                  </div>
                </div>
              </Link>
            );
          })
        )}
      </section>

      <div className="mt-8 flex flex-col gap-4 rounded-[24px] border border-border bg-white p-4 text-sm shadow-[0_14px_36px_rgba(15,23,42,0.05)] sm:flex-row sm:items-center sm:justify-between">
        <span className="text-muted">当前第 {page} / {totalPages} 页</span>
        <div className="flex flex-wrap items-center gap-2">
          <Link href={buildPageHref(q, region, sort, Math.max(1, page - 1))} className={`rounded-full border px-4 py-2 ${page <= 1 ? "pointer-events-none border-border text-muted opacity-50" : "border-border text-primary hover:bg-surface"}`}>
            上一页
          </Link>
          <Link href={buildPageHref(q, region, sort, Math.min(totalPages, page + 1))} className={`rounded-full border px-4 py-2 ${page >= totalPages ? "pointer-events-none border-border text-muted opacity-50" : "border-border text-primary hover:bg-surface"}`}>
            下一页
          </Link>
        </div>
      </div>
    </div>
  );
}
