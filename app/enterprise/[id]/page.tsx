import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { articleOrderByPinnedLatest } from "@/lib/articles";
import { prisma } from "@/lib/prisma";
import { resolveUploadedImageUrl } from "@/lib/uploaded-image";
import { getMemberSiteSettings } from "@/lib/member-site-settings";

export const revalidate = 300;

type Props = { params: Promise<{ id: string }> };

type TemplateKey = "brand_showcase" | "professional_service" | "simple_elegant";

function parseCsv(input: string | null | undefined): string[] {
  if (!input) return [];
  return input
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

function formatDate(input: string | Date | null | undefined) {
  if (!input) return "";
  const date = typeof input === "string" ? new Date(input) : input;
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString("zh-CN");
}

function getTemplateMeta(template: TemplateKey) {
  switch (template) {
    case "professional_service":
      return {
        title: "专业机构型",
        shell: "grid gap-8 lg:grid-cols-[1.05fr,0.95fr]",
        hero:
          "relative overflow-hidden rounded-[34px] border border-[rgba(103,137,168,0.2)] bg-[radial-gradient(circle_at_top_left,rgba(91,129,162,0.3),transparent_34%),linear-gradient(150deg,rgba(14,27,40,0.98),rgba(24,47,67,0.94)_52%,rgba(244,248,251,0.98))] p-8 shadow-[0_28px_96px_rgba(17,32,46,0.22)]",
        heroTone: "text-white/72",
        introTitle: "机构定位",
        advantagesTitle: "服务能力",
        articlesTitle: "行业观点与企业动态",
        galleryTitle: "项目画面",
        statsTone: "border-white/12 bg-white/10 text-white",
      };
    case "simple_elegant":
      return {
        title: "轻奢形象型",
        shell: "space-y-8",
        hero:
          "relative overflow-hidden rounded-[32px] border border-[rgba(198,171,134,0.2)] bg-[radial-gradient(circle_at_top,rgba(220,197,164,0.22),transparent_38%),linear-gradient(180deg,rgba(255,255,255,0.98),rgba(246,241,234,0.94)_64%,rgba(236,228,217,0.96))] p-7 shadow-[0_24px_84px_rgba(82,58,31,0.08)]",
        heroTone: "text-[rgba(110,84,53,0.78)]",
        introTitle: "基础信息",
        advantagesTitle: "能力摘要",
        articlesTitle: "企业动态",
        galleryTitle: "精选图库",
        statsTone: "border-[rgba(190,160,120,0.2)] bg-white/80 text-primary",
      };
    default:
      return {
        title: "品牌旗舰型",
        shell: "space-y-8",
        hero:
          "relative overflow-hidden rounded-[36px] border border-[rgba(181,148,99,0.2)] bg-[radial-gradient(circle_at_top,rgba(214,179,122,0.28),transparent_36%),linear-gradient(160deg,rgba(28,24,20,0.98),rgba(76,61,43,0.92)_52%,rgba(247,240,233,0.98))] p-8 shadow-[0_30px_110px_rgba(58,43,22,0.22)]",
        heroTone: "text-white/72",
        introTitle: "品牌概况",
        advantagesTitle: "核心优势",
        articlesTitle: "企业动态",
        galleryTitle: "案例图库",
        statsTone: "border-white/12 bg-white/10 text-white",
      };
  }
}

export async function generateMetadata({ params }: Props) {
  const { id } = await params;
  const ent = await prisma.enterprise.findUnique({
    where: { id },
    include: { member: { select: { id: true, name: true } } },
  });
  if (!ent?.member) return { title: "企业展示" };

  const settings = await getMemberSiteSettings(ent.member.id);
  const name = ent.companyShortName || ent.companyName || ent.member.name || "企业";
  return {
    title: settings.seo.title || `${name} | 企业展示 | 中华整木网`,
    description: settings.seo.description || ent.positioning || ent.intro || "企业结构化展示页",
    keywords: settings.seo.keywords || undefined,
  };
}

export default async function EnterprisePage({ params }: Props) {
  const { id } = await params;

  const ent = await prisma.enterprise.findUnique({
    where: { id },
    include: {
      member: {
        select: {
          id: true,
          name: true,
          email: true,
          memberType: true,
          rankingWeight: true,
        },
      },
    },
  });

  if (!ent?.member) notFound();

  const memberId = ent.member.id;
  const standardIds = parseCsv(ent.relatedStandards);

  const [siteSettings, articles, gallery, standards] = await Promise.all([
    getMemberSiteSettings(memberId),
    prisma.article.findMany({
      where: { authorMemberId: memberId, status: "approved" },
      orderBy: articleOrderByPinnedLatest,
      take: 6,
      select: { id: true, title: true, slug: true, createdAt: true },
    }),
    prisma.galleryImage.findMany({
      where: { authorMemberId: memberId, status: "approved" },
      orderBy: { createdAt: "desc" },
      take: 8,
      select: { id: true, title: true, imageUrl: true, createdAt: true },
    }),
    standardIds.length
      ? prisma.standard.findMany({
          where: { id: { in: standardIds } },
          select: { id: true, title: true, code: true, year: true },
        })
      : Promise.resolve([]),
  ]);

  const name = ent.companyShortName || ent.companyName || ent.member.name || "企业";
  const tags = [ent.positioning, ent.productSystem, ent.craftLevel, ent.region].filter(Boolean) as string[];
  const meta = getTemplateMeta(siteSettings.template);
  const heroTitle = siteSettings.heroTitle || name;
  const heroSubtitle = siteSettings.heroSubtitle || ent.positioning || ent.intro || "以结构化内容展示企业实力、服务能力与行业参与。";
  const isBrandTemplate = siteSettings.template === "brand_showcase";
  const isServiceTemplate = siteSettings.template === "professional_service";
  const isSimpleTemplate = siteSettings.template === "simple_elegant";
  const showcaseGallery = isBrandTemplate ? gallery.slice(0, 3) : gallery.slice(0, 1);
  const secondaryGallery = isBrandTemplate ? gallery.slice(3, 8) : gallery.slice(1, 8);
  const stats = [
    { label: "企业动态", value: `${articles.length} 篇` },
    { label: "案例图库", value: `${gallery.length} 张` },
    { label: "标准参与", value: `${standards.length} 项` },
  ];

  return (
    <div className="max-w-6xl mx-auto px-4 py-12 space-y-8">
      <nav className="text-sm text-muted" aria-label="面包屑">
        <Link href="/" className="hover:text-accent">首页</Link>
        <span className="mx-2">/</span>
        <Link href="/membership" className="hover:text-accent">会员系统</Link>
        <span className="mx-2">/</span>
        <span className="text-primary">{name}</span>
      </nav>

      <section className={meta.hero}>
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.18),transparent_28%)]" />
        <div className={siteSettings.template === "professional_service" ? "grid gap-8 lg:grid-cols-[1.1fr,0.9fr]" : "space-y-6"}>
          <div className="relative z-10">
            <p className={`text-xs uppercase tracking-[0.28em] ${meta.heroTone}`}>{meta.title}</p>
            <h1 className={`mt-4 font-serif text-4xl leading-tight sm:text-5xl ${isSimpleTemplate ? "text-primary" : "text-white"}`}>{heroTitle}</h1>
            <p className={`mt-4 max-w-3xl text-sm leading-7 ${isSimpleTemplate ? "text-muted" : "text-white/78"}`}>{heroSubtitle}</p>
            {siteSettings.modules.tags && tags.length > 0 && (
              <div className="mt-6 flex flex-wrap gap-2">
                {tags.map((tag) => (
                  <span
                    key={tag}
                    className={`rounded-full px-3 py-1 text-xs ${
                      isSimpleTemplate
                        ? "border border-[rgba(175,143,88,0.22)] bg-[rgba(175,143,88,0.08)] text-[rgba(96,78,47,0.92)]"
                        : "border border-white/14 bg-white/10 text-white"
                    }`}
                  >
                    {tag}
                  </span>
                ))}
              </div>
            )}
            {siteSettings.modules.contact && (ent.contactPhone || ent.contactInfo || ent.website) && (
              <div className="mt-6 flex flex-wrap gap-3">
                {ent.contactPhone ? <InfoChip label={siteSettings.contactLabel} value={ent.contactPhone} /> : null}
                {ent.website ? <InfoChip label="官网" value={ent.website} href={ent.website} /> : null}
              </div>
            )}
            <div className="mt-8 grid gap-3 sm:grid-cols-3">
              {stats.map((item) => (
                <div key={item.label} className={`rounded-[22px] border px-4 py-4 shadow-[0_14px_36px_rgba(15,23,42,0.08)] ${meta.statsTone}`}>
                  <p className={`text-[11px] uppercase tracking-[0.22em] ${isSimpleTemplate ? "text-muted" : "text-white/68"}`}>{item.label}</p>
                  <p className={`mt-3 text-2xl font-semibold ${isSimpleTemplate ? "text-primary" : "text-white"}`}>{item.value}</p>
                </div>
              ))}
            </div>
          </div>

          {!isSimpleTemplate && showcaseGallery[0] ? (
            isBrandTemplate ? (
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="sm:col-span-2 overflow-hidden rounded-[28px] border border-[rgba(175,143,88,0.18)] bg-white shadow-[0_20px_70px_rgba(34,31,26,0.08)]">
                  <Image
                    src={resolveUploadedImageUrl(showcaseGallery[0].imageUrl)}
                    alt={showcaseGallery[0].title ?? name}
                    width={1400}
                    height={900}
                    className="h-[320px] w-full object-cover"
                  />
                </div>
                {showcaseGallery.slice(1).map((image) => (
                  <div key={image.id} className="overflow-hidden rounded-[24px] border border-[rgba(175,143,88,0.14)] bg-white shadow-[0_16px_48px_rgba(34,31,26,0.06)]">
                    <Image
                      src={resolveUploadedImageUrl(image.imageUrl)}
                      alt={image.title ?? name}
                      width={900}
                      height={700}
                      className="h-[170px] w-full object-cover"
                    />
                  </div>
                ))}
              </div>
            ) : (
              <div className="overflow-hidden rounded-[28px] border border-[rgba(175,143,88,0.18)] bg-white shadow-[0_20px_70px_rgba(34,31,26,0.08)]">
                <Image
                  src={resolveUploadedImageUrl(showcaseGallery[0].imageUrl)}
                  alt={showcaseGallery[0].title ?? name}
                  width={1200}
                  height={900}
                  className="h-full min-h-[280px] w-full object-cover"
                />
              </div>
            )
          ) : null}
        </div>
      </section>

      <div className={meta.shell}>
        <div className="space-y-8">
          {siteSettings.modules.intro && (ent.intro || ent.companyName || ent.address) ? (
            <ContentCard title={meta.introTitle}>
              <InfoGrid
                items={[
                  ["企业全称", ent.companyName],
                  ["企业简称", ent.companyShortName],
                  ["企业简介", ent.intro],
                  ["企业定位", ent.positioning],
                  ["企业地址", ent.address],
                  ["成立时间", ent.foundedAt],
                ]}
              />
            </ContentCard>
          ) : null}

          {siteSettings.modules.advantages && (ent.productSystem || ent.craftLevel || ent.certifications || ent.awards) ? (
            <ContentCard title={meta.advantagesTitle}>
              {isServiceTemplate ? (
                <ServiceHighlights
                  items={[
                    ["产品体系", ent.productSystem],
                    ["工艺等级", ent.craftLevel],
                    ["认证情况", ent.certifications],
                    ["获奖记录", ent.awards],
                  ]}
                />
              ) : (
                <InfoGrid
                  items={[
                    ["产品体系", ent.productSystem],
                    ["工艺等级", ent.craftLevel],
                    ["认证情况", ent.certifications],
                    ["获奖记录", ent.awards],
                  ]}
                />
              )}
            </ContentCard>
          ) : null}

          {siteSettings.modules.news && articles.length > 0 ? (
            <ContentCard title={meta.articlesTitle}>
              <div className="grid gap-3 md:grid-cols-2">
                {articles.map((article) => (
                  <Link key={article.id} href={`/news/${article.slug}`} className="rounded-[24px] border border-border bg-surface px-4 py-4 transition hover:-translate-y-0.5 hover:border-accent/35 hover:bg-white hover:shadow-[0_18px_36px_rgba(15,23,42,0.08)]">
                    <p className="text-[11px] uppercase tracking-[0.22em] text-muted">Enterprise News</p>
                    <p className="mt-3 text-sm font-medium leading-7 text-primary">{article.title}</p>
                    <p className="mt-3 text-xs text-muted">发布时间：{formatDate(article.createdAt)}</p>
                  </Link>
                ))}
              </div>
            </ContentCard>
          ) : null}
        </div>

        <div className="space-y-8">
          {siteSettings.modules.gallery && secondaryGallery.length > 0 ? (
            <ContentCard title={meta.galleryTitle}>
              <div className="grid grid-cols-2 gap-3">
                {secondaryGallery.map((image) => (
                  <a
                    key={image.id}
                    href={resolveUploadedImageUrl(image.imageUrl)}
                    target="_blank"
                    rel="noreferrer"
                    className="group block overflow-hidden rounded-[22px] border border-border bg-white"
                  >
                    <Image
                      src={resolveUploadedImageUrl(image.imageUrl)}
                      alt={image.title ?? name}
                      width={500}
                      height={380}
                      className="h-36 w-full object-cover transition duration-300 group-hover:scale-[1.03]"
                    />
                    <div className="px-3 py-3">
                      <p className="line-clamp-1 text-sm text-primary">{image.title || name}</p>
                      <p className="mt-1 text-xs text-muted">{formatDate(image.createdAt)}</p>
                    </div>
                  </a>
                ))}
              </div>
            </ContentCard>
          ) : null}

          {siteSettings.modules.contact && (ent.contactPerson || ent.contactPhone || ent.contactInfo || ent.website) ? (
            <ContentCard title="联系与合作">
              <InfoGrid
                items={[
                  ["联系人", ent.contactPerson],
                  ["联系电话", ent.contactPhone],
                  ["联系方式", ent.contactInfo],
                  ["官网地址", ent.website],
                ]}
              />
            </ContentCard>
          ) : null}

          {siteSettings.modules.standards && standards.length > 0 ? (
            <ContentCard title="标准参与">
              <div className="space-y-3">
                {standards.map((standard) => (
                  <div key={standard.id} className="rounded-2xl border border-border bg-surface px-4 py-4 text-sm text-primary">
                    <p>{standard.title}</p>
                    <p className="mt-1 text-xs text-muted">{standard.code} · {standard.year}</p>
                  </div>
                ))}
              </div>
            </ContentCard>
          ) : null}

          {siteSettings.modules.video && ent.videoUrl ? (
            <ContentCard title="企业视频">
              <a href={ent.videoUrl} target="_blank" rel="noreferrer" className="apple-inline-link">
                查看企业视频
              </a>
            </ContentCard>
          ) : null}

          {siteSettings.modules.terms && ent.relatedTerms ? (
            <ContentCard title="词库参与">
              <p className="text-sm leading-7 text-muted">{ent.relatedTerms}</p>
            </ContentCard>
          ) : null}
        </div>
      </div>

    </div>
  );
}

function ContentCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-[28px] border border-border bg-white p-6 shadow-[0_18px_60px_rgba(34,31,26,0.05)]">
      <h2 className="font-serif text-xl text-primary">{title}</h2>
      <div className="mt-4">{children}</div>
    </section>
  );
}

function InfoGrid({ items }: { items: Array<[string, string | null | undefined]> }) {
  const visible = items.filter(([, value]) => Boolean(value));
  if (visible.length === 0) {
    return <p className="text-sm text-muted">暂无展示内容</p>;
  }
  return (
    <div className="grid gap-4 md:grid-cols-2">
      {visible.map(([label, value]) => (
        <div key={label} className="rounded-2xl border border-border bg-surface px-4 py-4">
          <p className="text-xs uppercase tracking-[0.18em] text-muted">{label}</p>
          <p className="mt-2 text-sm leading-7 text-primary">{value}</p>
        </div>
      ))}
    </div>
  );
}

function InfoChip({ label, value, href }: { label: string; value: string; href?: string }) {
  const body = (
    <span className="rounded-full border border-[rgba(175,143,88,0.22)] bg-white px-4 py-2 text-xs text-primary shadow-[0_8px_24px_rgba(34,31,26,0.05)]">
      {label} · {value}
    </span>
  );

  if (href) {
    return (
      <a href={href} target="_blank" rel="noreferrer">
        {body}
      </a>
    );
  }

  return body;
}

function ServiceHighlights({ items }: { items: Array<[string, string | null | undefined]> }) {
  const visible = items.filter(([, value]) => Boolean(value));
  if (visible.length === 0) {
    return <p className="text-sm text-muted">暂无展示内容</p>;
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {visible.map(([label, value], index) => (
        <div key={label} className="rounded-[24px] border border-border bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(246,243,237,0.86))] px-5 py-5">
          <p className="text-[11px] uppercase tracking-[0.28em] text-[rgba(138,115,77,0.78)]">0{index + 1}</p>
          <p className="mt-3 text-sm font-medium text-primary">{label}</p>
          <p className="mt-2 text-sm leading-7 text-muted">{value}</p>
        </div>
      ))}
    </div>
  );
}
