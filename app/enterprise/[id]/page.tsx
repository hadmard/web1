import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { articleOrderByPinnedLatest } from "@/lib/articles";
import { htmlToPlainText, toSummaryText } from "@/lib/brand-content";
import { getMemberSiteSettings } from "@/lib/member-site-settings";
import { prisma } from "@/lib/prisma";
import { resolveUploadedImageUrl } from "@/lib/uploaded-image";
import { RichContent } from "@/components/RichContent";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type Props = { params: Promise<{ id: string }> };
type TemplateKey = "brand_showcase" | "professional_service" | "simple_elegant";

function parseCsv(input: string | null | undefined): string[] {
  if (!input) return [];
  return input
    .split(",")
    .map((item) => item.trim())
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
        label: "专业机构型",
        hero:
          "relative overflow-hidden rounded-[34px] border border-[rgba(103,137,168,0.2)] bg-[radial-gradient(circle_at_top_left,rgba(91,129,162,0.3),transparent_34%),linear-gradient(150deg,rgba(14,27,40,0.98),rgba(24,47,67,0.94)_52%,rgba(244,248,251,0.98))] p-6 sm:p-8 shadow-[0_28px_96px_rgba(17,32,46,0.22)]",
        title: "text-white",
        body: "text-white/78",
        chip: "border-white/14 bg-white/10 text-white",
        panel: "border-[rgba(255,255,255,0.12)] bg-white/8 text-white",
      };
    case "simple_elegant":
      return {
        label: "轻奢形象型",
        hero:
          "relative overflow-hidden rounded-[34px] border border-[rgba(198,171,134,0.2)] bg-[radial-gradient(circle_at_top,rgba(220,197,164,0.22),transparent_38%),linear-gradient(180deg,rgba(255,255,255,0.98),rgba(246,241,234,0.94)_64%,rgba(236,228,217,0.96))] p-6 sm:p-8 shadow-[0_24px_84px_rgba(82,58,31,0.08)]",
        title: "text-primary",
        body: "text-muted",
        chip: "border-[rgba(175,143,88,0.22)] bg-[rgba(175,143,88,0.08)] text-[rgba(96,78,47,0.92)]",
        panel: "border-[rgba(190,160,120,0.2)] bg-white/80 text-primary",
      };
    default:
      return {
        label: "品牌旗舰型",
        hero:
          "relative overflow-hidden rounded-[36px] border border-[rgba(181,148,99,0.2)] bg-[radial-gradient(circle_at_top,rgba(214,179,122,0.28),transparent_36%),linear-gradient(160deg,rgba(28,24,20,0.98),rgba(76,61,43,0.92)_52%,rgba(247,240,233,0.98))] p-6 sm:p-8 shadow-[0_30px_110px_rgba(58,43,22,0.22)]",
        title: "text-white",
        body: "text-white/78",
        chip: "border-white/14 bg-white/10 text-white",
        panel: "border-[rgba(255,255,255,0.12)] bg-white/10 text-white",
      };
  }
}

function buildContactHref(value: string | null | undefined) {
  const input = (value || "").trim();
  if (!input) return null;
  if (/^https?:\/\//i.test(input)) return input;
  const phone = input.replace(/[^\d+]/g, "");
  if (phone) return `tel:${phone}`;
  return null;
}

function extractContactLabel(value: string | null | undefined) {
  const input = (value || "").trim();
  if (!input) return "联系品牌";
  if (/^https?:\/\//i.test(input)) return "访问官网";
  return "立即致电";
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
  const description = toSummaryText(settings.seo.description || ent.positioning || ent.intro, 120) || "企业结构化展示页";
  return {
    title: settings.seo.title || `${name} | 企业展示 | 中华整木网`,
    description,
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
  const meta = getTemplateMeta(siteSettings.template);
  const heroTitle = siteSettings.heroTitle || name;
  const introRichText = ent.intro || "";
  const introPreview = toSummaryText(ent.positioning || ent.intro, 150) || "以结构化内容展示企业实力、服务能力与行业参与。";
  const contactHref = buildContactHref(ent.contactPhone || ent.website || ent.contactInfo);
  const websiteHref = buildContactHref(ent.website);
  const contactAnchor = contactHref || "#contact-panel";
  const tags = [ent.positioning, ent.productSystem, ent.craftLevel, ent.region].filter(Boolean) as string[];
  const heroGallery = gallery.slice(0, 3);
  const secondaryGallery = gallery.slice(3, 9);
  const qualityFacts = [
    ent.productSystem ? { label: "产品体系", value: ent.productSystem } : null,
    ent.craftLevel ? { label: "工艺等级", value: ent.craftLevel } : null,
    ent.certifications ? { label: "认证情况", value: ent.certifications } : null,
    ent.awards ? { label: "获奖记录", value: ent.awards } : null,
  ].filter(Boolean) as Array<{ label: string; value: string }>;
  const quickFacts = [
    { label: "所在地", value: [ent.region, ent.area].filter(Boolean).join(" / ") || "全国" },
    { label: "联系电话", value: ent.contactPhone || "待补充" },
    { label: "官网", value: ent.website || "待补充" },
    { label: "成立时间", value: ent.foundedAt || "待补充" },
  ];
  const stats = [
    { label: "企业动态", value: `${articles.length} 篇` },
    { label: "案例图库", value: `${gallery.length} 张` },
    { label: "标准参与", value: `${standards.length} 项` },
  ];

  return (
    <div className="mx-auto max-w-7xl space-y-8 px-4 py-10 sm:px-6 sm:py-12">
      <nav className="text-sm text-muted" aria-label="面包屑">
        <Link href="/" className="hover:text-accent">首页</Link>
        <span className="mx-2">/</span>
        <Link href="/brands" className="hover:text-accent">整木市场</Link>
        <span className="mx-2">/</span>
        <span className="text-primary">{name}</span>
      </nav>

      <section className={meta.hero}>
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.18),transparent_28%)]" />
        <div className="relative z-10 grid gap-8 xl:grid-cols-[1.15fr,0.85fr]">
          <div>
            <p className={`text-xs uppercase tracking-[0.28em] ${meta.body}`}>{meta.label}</p>
            <div className="mt-5 flex flex-col gap-5 sm:flex-row sm:items-start">
              <div className="flex h-24 w-24 shrink-0 items-center justify-center overflow-hidden rounded-[28px] border border-white/12 bg-white/90 shadow-[0_18px_40px_rgba(15,23,42,0.12)]">
                {ent.logoUrl ? (
                  <Image
                    src={resolveUploadedImageUrl(ent.logoUrl)}
                    alt={`${name} logo`}
                    width={160}
                    height={160}
                    className="h-full w-full object-contain p-4"
                  />
                ) : (
                  <span className="text-center font-serif text-lg text-primary">{name.slice(0, 4)}</span>
                )}
              </div>

              <div className="min-w-0 flex-1">
                <h1 className={`font-serif text-4xl leading-tight sm:text-5xl ${meta.title}`}>{heroTitle}</h1>
                <p className={`mt-4 max-w-3xl text-sm leading-7 ${meta.body}`}>{introPreview}</p>
                <div className="mt-5 flex flex-wrap gap-2">
                  {(tags.length > 0 ? tags : ["整木品牌", "企业展示"]).map((tag) => (
                    <span key={tag} className={`rounded-full border px-3 py-1 text-xs ${meta.chip}`}>
                      {tag}
                    </span>
                  ))}
                </div>
                <div className="mt-6 flex flex-wrap gap-3">
                  <a
                    href={contactAnchor}
                    className="inline-flex items-center justify-center rounded-full bg-accent px-5 py-3 text-sm font-medium text-white transition hover:opacity-92"
                  >
                    {extractContactLabel(ent.contactPhone || ent.website || ent.contactInfo)}
                  </a>
                  <a
                    href="#contact-panel"
                    className="inline-flex items-center justify-center rounded-full border border-white/18 bg-white/10 px-5 py-3 text-sm font-medium text-white transition hover:bg-white/16"
                  >
                    立即咨询
                  </a>
                  <a
                    href="#contact-panel"
                    className="inline-flex items-center justify-center rounded-full border border-white/18 bg-white/10 px-5 py-3 text-sm font-medium text-white transition hover:bg-white/16"
                  >
                    获取方案
                  </a>
                </div>
              </div>
            </div>

            <div className="mt-8 grid gap-3 sm:grid-cols-3">
              {stats.map((item) => (
                <div key={item.label} className={`rounded-[22px] border px-4 py-4 shadow-[0_14px_36px_rgba(15,23,42,0.08)] ${meta.panel}`}>
                  <p className="text-[11px] uppercase tracking-[0.22em] text-inherit/80">{item.label}</p>
                  <p className="mt-3 text-2xl font-semibold">{item.value}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-4">
            {heroGallery.length > 0 ? (
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="sm:col-span-2 overflow-hidden rounded-[28px] border border-white/14 bg-white shadow-[0_20px_70px_rgba(34,31,26,0.12)]">
                  <Image
                    src={resolveUploadedImageUrl(heroGallery[0].imageUrl)}
                    alt={heroGallery[0].title ?? name}
                    width={1400}
                    height={900}
                    className="h-[280px] w-full object-cover sm:h-[320px]"
                  />
                </div>
                {heroGallery.slice(1).map((image) => (
                  <div key={image.id} className="overflow-hidden rounded-[24px] border border-white/14 bg-white shadow-[0_16px_48px_rgba(34,31,26,0.08)]">
                    <Image
                      src={resolveUploadedImageUrl(image.imageUrl)}
                      alt={image.title ?? name}
                      width={900}
                      height={700}
                      className="h-[160px] w-full object-cover"
                    />
                  </div>
                ))}
              </div>
            ) : (
              <div className="rounded-[28px] border border-white/14 bg-white/10 p-6 text-sm leading-7 text-white/82">
                <p className="text-xs uppercase tracking-[0.2em] text-white/58">品牌摘要</p>
                <p className="mt-4">{htmlToPlainText(ent.intro || ent.positioning) || "企业正在完善品牌介绍、案例和联系信息。"}</p>
              </div>
            )}

            <div className="grid gap-3 sm:grid-cols-2">
              {quickFacts.map((fact) => (
                <div key={fact.label} className="rounded-[24px] border border-white/14 bg-white/10 px-4 py-4 text-white shadow-[0_14px_36px_rgba(15,23,42,0.08)]">
                  <p className="text-[11px] uppercase tracking-[0.18em] text-white/58">{fact.label}</p>
                  <p className="mt-2 text-sm leading-6 text-white/88">{fact.value}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <div className="grid gap-8 xl:grid-cols-[1.08fr,0.92fr]">
        <div className="space-y-8">
          <ContentCard title="品牌简介" helper="这里展示企业维护后的正式介绍内容，后台修改后前台会立即同步。">
            {introRichText ? (
              <RichContent html={introRichText} className="text-[15px] leading-8 text-primary" />
            ) : (
              <p className="text-sm leading-7 text-muted">暂未填写品牌简介。</p>
            )}
          </ContentCard>

          {(ent.positioning || qualityFacts.length > 0) ? (
            <ContentCard title="品牌亮点" helper="帮助用户快速理解这家企业做什么、擅长什么、适合什么项目。">
              {ent.positioning ? (
                <div className="rounded-[24px] border border-[rgba(180,154,107,0.18)] bg-[linear-gradient(180deg,rgba(255,252,247,0.98),rgba(248,242,233,0.9))] px-5 py-5 text-sm leading-8 text-primary shadow-[0_16px_36px_rgba(15,23,42,0.05)]">
                  {ent.positioning}
                </div>
              ) : null}
              {qualityFacts.length > 0 ? (
                <div className="mt-4 grid gap-4 sm:grid-cols-2">
                  {qualityFacts.map((item) => (
                    <div key={item.label} className="rounded-[22px] border border-border bg-surface px-4 py-4">
                      <p className="text-xs uppercase tracking-[0.18em] text-muted">{item.label}</p>
                      <p className="mt-2 text-sm leading-7 text-primary">{item.value}</p>
                    </div>
                  ))}
                </div>
              ) : null}
            </ContentCard>
          ) : null}

          {articles.length > 0 ? (
            <ContentCard title="企业动态" helper="最新通过审核的企业内容会优先在这里展示。">
              <div className="grid gap-3 md:grid-cols-2">
                {articles.map((article) => (
                  <Link
                    key={article.id}
                    href={`/news/${article.slug}`}
                    className="rounded-[24px] border border-border bg-surface px-4 py-4 transition hover:-translate-y-0.5 hover:border-accent/35 hover:bg-white hover:shadow-[0_18px_36px_rgba(15,23,42,0.08)]"
                  >
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
          <ContentCard title="联系品牌" helper="把咨询、合作、索取方案这三个动作集中到首要区域。" id="contact-panel">
            <div className="space-y-4">
              <ContactRow label="联系人" value={ent.contactPerson} />
              <ContactRow label="联系电话" value={ent.contactPhone} href={buildContactHref(ent.contactPhone)} />
              <ContactRow label="联系方式" value={ent.contactInfo} />
              <ContactRow label="官网地址" value={ent.website} href={websiteHref} />
              <ContactRow label="企业地址" value={ent.address} />
            </div>
            <div className="mt-5 grid gap-3 sm:grid-cols-3">
              <a href={contactAnchor} className="inline-flex items-center justify-center rounded-full bg-accent px-4 py-3 text-sm font-medium text-white transition hover:opacity-92">
                联系品牌
              </a>
              <a href="#contact-panel" className="inline-flex items-center justify-center rounded-full border border-border bg-surface px-4 py-3 text-sm font-medium text-primary transition hover:bg-white">
                立即咨询
              </a>
              <a href="#contact-panel" className="inline-flex items-center justify-center rounded-full border border-border bg-surface px-4 py-3 text-sm font-medium text-primary transition hover:bg-white">
                获取方案
              </a>
            </div>
          </ContentCard>

          {secondaryGallery.length > 0 ? (
            <ContentCard title="项目画面" helper="展示企业案例、产品细节和场景图，强化品牌信任感。">
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

          {standards.length > 0 ? (
            <ContentCard title="标准参与" helper="展示企业参与的标准工作，增强专业可信度。">
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

          {ent.videoUrl ? (
            <ContentCard title="企业视频" helper="用于承接更深一步的品牌认知和咨询转化。">
              <a href={ent.videoUrl} target="_blank" rel="noreferrer" className="apple-inline-link">
                查看企业视频
              </a>
            </ContentCard>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function ContentCard({
  title,
  helper,
  children,
  id,
}: {
  title: string;
  helper?: string;
  children: React.ReactNode;
  id?: string;
}) {
  return (
    <section id={id} className="rounded-[28px] border border-border bg-white p-6 shadow-[0_18px_60px_rgba(34,31,26,0.05)]">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <h2 className="font-serif text-2xl text-primary">{title}</h2>
        {helper ? <p className="max-w-xl text-sm leading-7 text-muted">{helper}</p> : null}
      </div>
      <div className="mt-5">{children}</div>
    </section>
  );
}

function ContactRow({
  label,
  value,
  href,
}: {
  label: string;
  value: string | null | undefined;
  href?: string | null;
}) {
  if (!value) return null;
  return (
    <div className="rounded-[22px] border border-border bg-surface px-4 py-4">
      <p className="text-xs uppercase tracking-[0.18em] text-muted">{label}</p>
      {href ? (
        <a href={href} target={href.startsWith("http") ? "_blank" : undefined} rel={href.startsWith("http") ? "noreferrer" : undefined} className="mt-2 block text-sm leading-7 text-primary underline-offset-4 hover:text-accent hover:underline">
          {value}
        </a>
      ) : (
        <p className="mt-2 text-sm leading-7 text-primary">{value}</p>
      )}
    </div>
  );
}
