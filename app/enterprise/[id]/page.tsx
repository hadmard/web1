import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { RichContent } from "@/components/RichContent";
import { articleOrderByPinnedLatest } from "@/lib/articles";
import { htmlToPlainText, toSummaryText } from "@/lib/brand-content";
import {
  resolveEnterpriseHomepageCapabilities,
  resolveEnterpriseHomepageContact,
  resolveEnterpriseHomepageHero,
  resolveEnterpriseHomepageSeo,
} from "@/lib/enterprise-homepage";
import { getMemberSiteSettings } from "@/lib/member-site-settings";
import { prisma } from "@/lib/prisma";
import { resolveUploadedImageUrl } from "@/lib/uploaded-image";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type Props = { params: Promise<{ id: string }> };
type TemplateKey = "brand_showcase" | "professional_service" | "simple_elegant";

type NewsCard = {
  id: string;
  title: string;
  excerpt: string;
  dateLabel: string;
  href: string;
  badge: string;
};

type GalleryCard = {
  id: string;
  title: string;
  category: string;
  imageUrl?: string | null;
  href?: string;
  fallbackTone?: string;
};

function parseCsv(input: string | null | undefined): string[] {
  if (!input) return [];
  return input.split(",").map((item) => item.trim()).filter(Boolean);
}

function uniqueItems(items: Array<string | null | undefined>) {
  return Array.from(new Set(items.map((item) => (item || "").trim()).filter(Boolean)));
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
        label: "模板 B",
        titleName: "招商转化型",
        hero:
          "relative overflow-hidden rounded-[36px] border border-[rgba(91,129,162,0.18)] bg-[radial-gradient(circle_at_top_left,rgba(109,143,173,0.28),transparent_34%),linear-gradient(145deg,rgba(12,26,38,1),rgba(26,52,73,0.96)_52%,rgba(242,247,250,0.98))] p-6 sm:p-8 shadow-[0_30px_100px_rgba(17,32,46,0.22)]",
        titleClass: "text-white",
        body: "text-white/78",
        chip: "border-white/14 bg-white/10 text-white",
        strip: "border-[rgba(255,255,255,0.12)] bg-white/8 text-white",
        button: "bg-white text-slate-900 hover:bg-white/92",
        buttonGhost: "border-white/18 bg-white/10 text-white hover:bg-white/16",
        shell: "bg-[linear-gradient(180deg,#f5f8fa,#eef4f8)]",
      };
    case "simple_elegant":
      return {
        label: "模板 C",
        titleName: "内容运营型",
        hero:
          "relative overflow-hidden rounded-[36px] border border-[rgba(183,156,116,0.18)] bg-[radial-gradient(circle_at_top,rgba(224,196,157,0.26),transparent_36%),linear-gradient(180deg,rgba(255,255,255,0.98),rgba(247,241,233,0.96)_62%,rgba(238,229,216,0.98))] p-6 sm:p-8 shadow-[0_24px_80px_rgba(82,58,31,0.08)]",
        titleClass: "text-primary",
        body: "text-primary/72",
        chip: "border-[rgba(175,143,88,0.22)] bg-[rgba(175,143,88,0.08)] text-[rgba(96,78,47,0.92)]",
        strip: "border-[rgba(190,160,120,0.2)] bg-white/80 text-primary",
        button: "bg-accent text-white hover:opacity-95",
        buttonGhost: "border-[rgba(175,143,88,0.2)] bg-white/84 text-primary hover:bg-white",
        shell: "bg-[linear-gradient(180deg,#fffdf9,#f6f0e8)]",
      };
    default:
      return {
        label: "模板 A",
        titleName: "高端品牌型",
        hero:
          "relative overflow-hidden rounded-[36px] border border-[rgba(181,148,99,0.2)] bg-[radial-gradient(circle_at_top,rgba(214,179,122,0.28),transparent_36%),linear-gradient(160deg,rgba(24,20,16,0.98),rgba(72,56,38,0.94)_52%,rgba(247,240,233,0.98))] p-6 sm:p-8 shadow-[0_30px_110px_rgba(58,43,22,0.22)]",
        titleClass: "text-white",
        body: "text-white/78",
        chip: "border-white/14 bg-white/10 text-white",
        strip: "border-[rgba(255,255,255,0.12)] bg-white/10 text-white",
        button: "bg-accent text-white hover:opacity-92",
        buttonGhost: "border-white/18 bg-white/10 text-white hover:bg-white/16",
        shell: "bg-[linear-gradient(180deg,#fcfaf7,#f6efe6)]",
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

function chunkParagraphs(value: string) {
  return value.split(/\n{2,}/).map((item) => item.trim()).filter(Boolean);
}

function buildHeroTags(input: {
  positioning?: string | null;
  productSystem?: string | null;
  craftLevel?: string | null;
  region?: string | null;
  memberType?: string | null;
}) {
  return uniqueItems([
    input.positioning,
    input.productSystem,
    input.craftLevel,
    input.region ? `${input.region}服务` : null,
    input.memberType === "enterprise_advanced" ? "VIP 企业" : "企业会员",
  ]).slice(0, 3);
}

function buildAdvantageCards(input: {
  name: string;
  productSystem?: string | null;
  craftLevel?: string | null;
  certifications?: string | null;
  awards?: string | null;
  region?: string | null;
  area?: string | null;
  positioning?: string | null;
}) {
  const cards = [
    input.productSystem ? { title: "主营产品 / 服务", desc: input.productSystem } : null,
    input.positioning ? { title: "应用场景", desc: input.positioning } : null,
    input.craftLevel ? { title: "优势能力", desc: `围绕 ${input.craftLevel} 的交付与落地能力持续输出。` } : null,
    input.certifications ? { title: "资质能力", desc: input.certifications } : null,
    input.awards ? { title: "荣誉表现", desc: input.awards } : null,
    { title: "服务范围", desc: [input.region, input.area].filter(Boolean).join(" / ") || `${input.name}持续服务全国整木与木作项目需求。` },
  ].filter(Boolean) as Array<{ title: string; desc: string }>;

  if (cards.length >= 3) return cards.slice(0, 6);

  return [
    ...cards,
    { title: "方案交付", desc: `${input.name}围绕品牌表达、项目落地与客户沟通建立清晰交付链路。` },
    { title: "合作支持", desc: "支持前期沟通、需求梳理、方案对接与后续服务承接。" },
  ].slice(0, 4);
}

function buildGeneratedNews(name: string, input: { productSystem?: string | null; region?: string | null; positioning?: string | null }): NewsCard[] {
  return [
    {
      id: `${name}-generated-1`,
      title: `为什么选择 ${name} 的服务方案`,
      excerpt: `${name}围绕${input.productSystem || "整木定制与空间落地"}持续输出稳定服务能力，更强调项目匹配度与长期合作体验。`,
      dateLabel: "品牌整理",
      href: "#contact-panel",
      badge: "品牌观察",
    },
    {
      id: `${name}-generated-2`,
      title: `${name} 的典型应用场景解析`,
      excerpt: `${name}更适合${input.positioning || "注重工艺、场景协调与整体落地效率"}的项目需求，能够在沟通与交付之间形成更顺畅的连接。`,
      dateLabel: input.region ? `${input.region}视角` : "行业视角",
      href: "#gallery-section",
      badge: "场景解读",
    },
    {
      id: `${name}-generated-3`,
      title: `木作项目常见问题与 ${name} 的应对方式`,
      excerpt: "从前期沟通、材料选择到实施节奏，整理出访客最关心的几个合作问题，帮助用户更快判断是否匹配。",
      dateLabel: "常见问答",
      href: "#contact-panel",
      badge: "FAQ",
    },
  ];
}

function buildFallbackGallery(name: string, productSystem?: string | null): GalleryCard[] {
  return [
    { id: `${name}-gallery-1`, title: `${name} 品牌主视觉`, category: productSystem || "品牌展示", fallbackTone: "from-[#7b6143] via-[#aa8a63] to-[#f4ede3]" },
    { id: `${name}-gallery-2`, title: "空间应用场景", category: "案例参考", fallbackTone: "from-[#17324a] via-[#506f88] to-[#ebf2f8]" },
    { id: `${name}-gallery-3`, title: "工艺与细节表达", category: "工艺细节", fallbackTone: "from-[#30412b] via-[#7b8f6f] to-[#eef3ea]" },
  ];
}

function buildIntroSummary(name: string, input: { positioning?: string | null; intro?: string | null; productSystem?: string | null; region?: string | null }) {
  return toSummaryText(input.positioning || input.intro, 120) || `${name}围绕${input.productSystem || "整木与空间服务"}建立统一展示与交付表达，持续服务${input.region || "区域"}客户咨询与项目合作。`;
}

export async function generateMetadata({ params }: Props) {
  const { id } = await params;
  const ent = await prisma.enterprise.findUnique({
    where: { id },
    include: { member: { select: { id: true, name: true } } },
  });
  if (!ent?.member) return { title: "企业展示" };

  const settings = await getMemberSiteSettings(ent.member.id);
  const gallery = await prisma.galleryImage.findMany({
    where: { authorMemberId: ent.member.id, status: "approved" },
    orderBy: [{ sortOrder: "desc" }, { createdAt: "desc" }],
    take: 1,
    select: { imageUrl: true },
  });
  const seo = resolveEnterpriseHomepageSeo(ent, settings, gallery);

  return {
    title: seo.title,
    description: seo.description,
    keywords: settings.seo.keywords || undefined,
    alternates: {
      canonical: `/enterprise/${id}`,
    },
    openGraph: {
      title: seo.title,
      description: seo.description,
      url: `/enterprise/${id}`,
      type: "website",
      images: seo.imageUrl ? [{ url: seo.imageUrl }] : undefined,
    },
    twitter: {
      card: seo.imageUrl ? "summary_large_image" : "summary",
      title: seo.title,
      description: seo.description,
      images: seo.imageUrl ? [seo.imageUrl] : undefined,
    },
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
          memberType: true,
        },
      },
    },
  });

  if (!ent?.member) notFound();

  const memberId = ent.member.id;
  const standardIds = parseCsv(ent.relatedStandards);
  const [siteSettings, ownArticles, ownGallery, standards, platformArticles, platformGallery] = await Promise.all([
    getMemberSiteSettings(memberId),
    prisma.article.findMany({
      where: { authorMemberId: memberId, status: "approved" },
      orderBy: articleOrderByPinnedLatest,
      take: 6,
      select: { id: true, title: true, slug: true, excerpt: true, createdAt: true, publishedAt: true },
    }),
    prisma.galleryImage.findMany({
      where: { authorMemberId: memberId, status: "approved" },
      orderBy: [{ sortOrder: "desc" }, { createdAt: "desc" }],
      take: 8,
      select: { id: true, title: true, imageUrl: true, category: true, createdAt: true },
    }),
    standardIds.length
      ? prisma.standard.findMany({
          where: { id: { in: standardIds } },
          select: { id: true, title: true, code: true, year: true },
        })
      : Promise.resolve([]),
    prisma.article.findMany({
      where: { status: "approved", authorMemberId: { not: memberId } },
      orderBy: articleOrderByPinnedLatest,
      take: 6,
      select: { id: true, title: true, slug: true, excerpt: true, createdAt: true, publishedAt: true },
    }),
    prisma.galleryImage.findMany({
      where: { status: "approved", authorMemberId: { not: memberId } },
      orderBy: [{ sortOrder: "desc" }, { createdAt: "desc" }],
      take: 6,
      select: { id: true, title: true, imageUrl: true, category: true, createdAt: true },
    }),
  ]);

  const name = ent.companyShortName || ent.companyName || ent.member.name || "企业";
  const meta = getTemplateMeta(siteSettings.template);
  const heroTitle = siteSettings.heroTitle || name;
  const introRichText = ent.intro || "";
  const introPlain = htmlToPlainText(ent.intro || ent.positioning || "");
  const introParagraphs = chunkParagraphs(introPlain);
  const capabilityCards = resolveEnterpriseHomepageCapabilities(ent, siteSettings);
  const generatedNews = buildGeneratedNews(name, {
    productSystem: ent.productSystem,
    region: ent.region,
    positioning: ent.positioning,
  });
  const enterpriseNewsCards: NewsCard[] = ownArticles.map((article) => ({
    id: article.id,
    title: article.title,
    excerpt: toSummaryText(article.excerpt || article.title, 74) || article.title,
    dateLabel: formatDate(article.publishedAt || article.createdAt),
    href: `/news/${article.slug}`,
    badge: "企业动态",
  }));
  const platformNewsCards: NewsCard[] = platformArticles.map((article) => ({
    id: article.id,
    title: article.title,
    excerpt: toSummaryText(article.excerpt || article.title, 74) || article.title,
    dateLabel: formatDate(article.publishedAt || article.createdAt),
    href: `/news/${article.slug}`,
    badge: "平台推荐",
  }));
  const newsCards =
    enterpriseNewsCards.length >= 3
      ? enterpriseNewsCards.slice(0, 4)
      : enterpriseNewsCards.length > 0
        ? [...enterpriseNewsCards, ...platformNewsCards].slice(0, 4)
        : [...generatedNews, ...platformNewsCards].slice(0, 4);
  const ownGalleryCards: GalleryCard[] = ownGallery.map((image) => ({
    id: image.id,
    title: image.title || `${name} 项目画面`,
    category: image.category || "企业案例",
    imageUrl: image.imageUrl,
    href: resolveUploadedImageUrl(image.imageUrl),
  }));
  const platformGalleryCards: GalleryCard[] = platformGallery.map((image) => ({
    id: image.id,
    title: image.title || "行业案例参考",
    category: image.category || "行业案例",
    imageUrl: image.imageUrl,
    href: resolveUploadedImageUrl(image.imageUrl),
  }));
  const galleryCards =
    ownGalleryCards.length > 0 ? ownGalleryCards.slice(0, 6) : platformGalleryCards.length > 0 ? platformGalleryCards.slice(0, 6) : buildFallbackGallery(name, ent.productSystem);
  const heroImages = [...ownGalleryCards, ...platformGalleryCards].slice(0, 3);
  const heroView = resolveEnterpriseHomepageHero(ent, siteSettings, ownGallery);
  const contactView = resolveEnterpriseHomepageContact(ent, siteSettings);
  const quickFacts = [
    [ent.region || ent.area ? "服务区域" : null, [ent.region, ent.area].filter(Boolean).join(" / ")],
    [ent.productSystem ? "产品 / 服务" : null, ent.productSystem || ""],
    [ent.foundedAt ? "成立时间" : null, ent.foundedAt || ""],
  ]
    .filter((item) => item[0] && item[1])
    .map(([label, value]) => ({ label: label as string, value: value as string }));
  const stats = [
    { label: "品牌内容", value: `${newsCards.length} 组` },
    { label: "案例展示", value: `${galleryCards.length} 组` },
    { label: "标准 / 荣誉", value: `${standards.length + uniqueItems([ent.certifications, ent.awards]).length} 项` },
  ];
  const primaryContactHref = contactView.primaryCtaHref;
  const standardsAndHonors = [
    ...standards.map((item) => ({ key: item.id, label: item.title, meta: `${item.code} · ${item.year}` })),
    ...(ent.certifications ? parseCsv(ent.certifications).map((item, index) => ({ key: `cert-${index}`, label: item, meta: "企业资质" })) : []),
    ...(ent.awards ? parseCsv(ent.awards).map((item, index) => ({ key: `award-${index}`, label: item, meta: "企业荣誉" })) : []),
  ].slice(0, 6);

  return (
    <div className={`min-h-screen ${meta.shell}`}>
      <div className="mx-auto max-w-7xl space-y-8 px-4 py-8 sm:px-6 sm:py-10">
        <nav className="text-sm text-muted" aria-label="面包屑">
          <Link href="/" className="hover:text-accent">首页</Link>
          <span className="mx-2">/</span>
          <Link href="/brands" className="hover:text-accent">整木市场</Link>
          <span className="mx-2">/</span>
          <span className="text-primary">{name}</span>
        </nav>

        <section className={meta.hero}>
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.18),transparent_28%)]" />
          <div className="relative z-10 grid gap-8 xl:grid-cols-[1.05fr,0.95fr]">
            <div>
              <div className="flex flex-wrap items-center gap-3 text-xs uppercase tracking-[0.24em]">
                <span className={meta.body}>{meta.label}</span>
                <span className={`rounded-full border px-3 py-1 ${meta.chip}`}>{meta.titleName}</span>
              </div>
              <div className="mt-6 flex flex-col gap-5 sm:flex-row sm:items-start">
                <div className="flex h-24 w-24 shrink-0 items-center justify-center overflow-hidden rounded-[28px] border border-white/12 bg-white/92 shadow-[0_18px_40px_rgba(15,23,42,0.12)]">
                  {ent.logoUrl ? (
                    <Image
                      src={resolveUploadedImageUrl(ent.logoUrl)}
                      alt={`${name} logo`}
                      width={160}
                      height={160}
                      className="h-full w-full object-contain p-4"
                    />
                  ) : (
                    <span className="px-3 text-center font-serif text-lg text-primary">{name.slice(0, 6)}</span>
                  )}
                </div>

                <div className="min-w-0 flex-1">
                  <h1 className={`font-serif text-4xl leading-tight sm:text-5xl ${meta.titleClass}`}>{heroTitle}</h1>
                  <p className={`mt-4 max-w-3xl text-base leading-8 ${meta.body}`}>{heroView.tagline}</p>
                  <div className="mt-5 flex flex-wrap gap-2">
                    {heroView.tags.map((tag) => (
                      <span key={tag} className={`rounded-full border px-3 py-1 text-xs ${meta.chip}`}>
                        {tag}
                      </span>
                    ))}
                  </div>
                  <div className="mt-6 flex flex-wrap gap-3">
                    <a href={primaryContactHref} className={`inline-flex items-center justify-center rounded-full px-5 py-3 text-sm font-medium transition ${meta.button}`}>
                      {heroView.primaryCtaLabel}
                    </a>
                    <a href={heroView.secondaryHref} className={`inline-flex items-center justify-center rounded-full border px-5 py-3 text-sm font-medium transition ${meta.buttonGhost}`}>
                      {heroView.secondaryCtaLabel}
                    </a>
                    <a href="#contact-panel" className={`inline-flex items-center justify-center rounded-full border px-5 py-3 text-sm font-medium transition ${meta.buttonGhost}`}>
                      获取方案
                    </a>
                  </div>
                </div>
              </div>

              <div className="mt-8 grid gap-3 sm:grid-cols-3">
                {stats.map((item) => (
                  <div key={item.label} className={`rounded-[24px] border px-4 py-4 shadow-[0_14px_36px_rgba(15,23,42,0.08)] ${meta.strip}`}>
                    <p className="text-[11px] uppercase tracking-[0.22em] text-inherit/80">{item.label}</p>
                    <p className="mt-3 text-2xl font-semibold">{item.value}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-4">
              {heroView.heroImageUrl ? (
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="sm:col-span-2 overflow-hidden rounded-[28px] border border-white/14 bg-white shadow-[0_20px_70px_rgba(34,31,26,0.12)]">
                    <Image
                      src={heroView.heroImageUrl}
                      alt={`${name} 主视觉`}
                      width={1400}
                      height={900}
                      className="h-[280px] w-full object-cover sm:h-[340px]"
                    />
                  </div>
                  {heroImages.slice(0, 2).map((image) => (
                    <div key={image.id} className="overflow-hidden rounded-[24px] border border-white/14 bg-white shadow-[0_16px_48px_rgba(34,31,26,0.08)]">
                      <Image
                        src={image.href!}
                        alt={image.title}
                        width={900}
                        height={700}
                        className="h-[160px] w-full object-cover"
                      />
                    </div>
                  ))}
                </div>
              ) : heroImages.length > 0 ? (
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="sm:col-span-2 overflow-hidden rounded-[28px] border border-white/14 bg-white shadow-[0_20px_70px_rgba(34,31,26,0.12)]">
                    <Image
                      src={heroImages[0].href!}
                      alt={heroImages[0].title}
                      width={1400}
                      height={900}
                      className="h-[280px] w-full object-cover sm:h-[340px]"
                    />
                  </div>
                  {heroImages.slice(1).map((image) => (
                    <div key={image.id} className="overflow-hidden rounded-[24px] border border-white/14 bg-white shadow-[0_16px_48px_rgba(34,31,26,0.08)]">
                      <Image
                        src={image.href!}
                        alt={image.title}
                        width={900}
                        height={700}
                        className="h-[160px] w-full object-cover"
                      />
                    </div>
                  ))}
                </div>
              ) : (
                <div className="grid gap-3 sm:grid-cols-2">
                  {buildFallbackGallery(name, ent.productSystem).map((item) => (
                    <div key={item.id} className={`flex min-h-[150px] items-end rounded-[26px] bg-gradient-to-br p-5 text-white shadow-[0_18px_40px_rgba(15,23,42,0.14)] ${item.fallbackTone}`}>
                      <div>
                        <p className="text-[11px] uppercase tracking-[0.2em] text-white/70">{item.category}</p>
                        <p className="mt-2 text-lg font-medium">{item.title}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {quickFacts.length > 0 ? (
                <div className="grid gap-3 sm:grid-cols-3">
                  {quickFacts.map((fact) => (
                    <div key={fact.label} className={`rounded-[24px] border px-4 py-4 shadow-[0_14px_36px_rgba(15,23,42,0.08)] ${meta.strip}`}>
                      <p className="text-[11px] uppercase tracking-[0.18em] text-inherit/70">{fact.label}</p>
                      <p className="mt-2 text-sm leading-6">{fact.value}</p>
                    </div>
                  ))}
                </div>
              ) : null}
            </div>
          </div>
        </section>

        <div className="grid gap-8 xl:grid-cols-[1.02fr,0.98fr]">
          <div className="space-y-8">
            <ContentCard title="企业简介" helper="简介只出现一次，系统会自动清洗文本结构，让品牌表达更像官网内容。">
              <div className="space-y-5">
                <div className="rounded-[24px] border border-[rgba(180,154,107,0.18)] bg-[linear-gradient(180deg,rgba(255,252,247,0.98),rgba(248,242,233,0.9))] px-5 py-5 text-sm leading-8 text-primary shadow-[0_16px_36px_rgba(15,23,42,0.05)]">
                  {buildIntroSummary(name, ent)}
                </div>
                {introParagraphs.length > 0 ? (
                  <div className="grid gap-4 md:grid-cols-2">
                    {introParagraphs.slice(0, 4).map((paragraph, index) => (
                      <div key={`${index}-${paragraph.slice(0, 12)}`} className="rounded-[22px] border border-border bg-surface px-4 py-4 text-sm leading-7 text-primary/88">
                        {paragraph}
                      </div>
                    ))}
                  </div>
                ) : null}
                {introRichText ? (
                  <div className="rounded-[24px] border border-border bg-white p-5">
                    <RichContent html={introRichText} className="text-[15px] leading-8 text-primary" />
                  </div>
                ) : (
                  <div className="rounded-[24px] border border-dashed border-[rgba(181,157,121,0.22)] bg-[rgba(255,249,238,0.72)] px-5 py-5 text-sm leading-8 text-primary/88">
                    {name}正在持续完善品牌介绍、业务说明与案例内容，当前页面已根据现有资料自动生成完整展示结构。
                  </div>
                )}
              </div>
            </ContentCard>

            <ContentCard title="核心能力 / 业务范围" helper="优先展示后台配置的能力卡片；不足时再从企业资料中补齐，保证中段表达稳定而清晰。">
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {capabilityCards.map((item) => (
                  <div key={item.title} className="rounded-[24px] border border-border bg-white p-5 shadow-[0_14px_36px_rgba(15,23,42,0.05)]">
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-[11px] uppercase tracking-[0.18em] text-[#9d7e4d]">{item.title}</p>
                      <span className="rounded-full border border-border px-2.5 py-1 text-[10px] text-muted">{item.source === "configured" ? "已配置" : "自动补齐"}</span>
                    </div>
                    <p className="mt-3 text-sm leading-7 text-primary">{item.description}</p>
                  </div>
                ))}
              </div>
            </ContentCard>

            <ContentCard title="企业动态 / 新闻" helper="新闻模块始终保留。企业内容优先展示；内容不足时自动补入品牌整理和平台推荐，让页面持续像一个正在运营中的官网。">
              <div className="grid gap-4 md:grid-cols-2">
                {newsCards.map((item) => (
                  <Link
                    key={item.id}
                    href={item.href}
                    className="rounded-[24px] border border-border bg-white p-5 transition hover:-translate-y-0.5 hover:border-accent/35 hover:shadow-[0_18px_36px_rgba(15,23,42,0.08)]"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <span className="rounded-full border border-[rgba(181,157,121,0.2)] bg-[rgba(255,249,238,0.92)] px-3 py-1 text-[11px] uppercase tracking-[0.18em] text-accent">
                        {item.badge}
                      </span>
                      <span className="text-xs text-muted">{item.dateLabel}</span>
                    </div>
                    <p className="mt-4 text-base font-medium leading-7 text-primary">{item.title}</p>
                    <p className="mt-3 text-sm leading-7 text-muted">{item.excerpt}</p>
                  </Link>
                ))}
                <div className="rounded-[24px] border border-dashed border-[rgba(181,157,121,0.24)] bg-[rgba(255,249,238,0.72)] p-5">
                  <p className="text-[11px] uppercase tracking-[0.18em] text-[#9d7e4d]">内容运营</p>
                  <p className="mt-3 text-base font-medium text-primary">持续发布企业动态，能更稳定地积累品牌信任</p>
                  <p className="mt-3 text-sm leading-7 text-muted">
                    企业内容会优先进入主页展示；当内容不足时，系统会自动补入行业资讯与品牌整理内容，保证页面始终完整。
                  </p>
                  <a href="#contact-panel" className="mt-4 inline-flex items-center justify-center rounded-full bg-accent px-4 py-2.5 text-sm font-medium text-white transition hover:opacity-92">
                    联系企业
                  </a>
                </div>
              </div>
            </ContentCard>
          </div>

          <div className="space-y-8">
            <ContentCard id="gallery-section" title="案例 / 图库" helper="案例模块始终保留。优先展示企业上传内容，其次补入行业案例与场景图库，让访客始终能看到品牌画面。">
              <div className="grid gap-4 sm:grid-cols-2">
                {galleryCards.map((item) =>
                  item.imageUrl ? (
                    <a
                      key={item.id}
                      href={item.href}
                      target="_blank"
                      rel="noreferrer"
                      className="group block overflow-hidden rounded-[24px] border border-border bg-white shadow-[0_14px_34px_rgba(15,23,42,0.05)]"
                    >
                      <Image
                        src={resolveUploadedImageUrl(item.imageUrl)}
                        alt={item.title}
                        width={700}
                        height={520}
                        className="h-44 w-full object-cover transition duration-300 group-hover:scale-[1.03]"
                      />
                      <div className="px-4 py-4">
                        <p className="text-[11px] uppercase tracking-[0.18em] text-[#9d7e4d]">{item.category}</p>
                        <p className="mt-2 text-sm font-medium text-primary">{item.title}</p>
                      </div>
                    </a>
                  ) : (
                    <div key={item.id} className={`flex min-h-[250px] items-end rounded-[24px] bg-gradient-to-br p-5 text-white shadow-[0_16px_36px_rgba(15,23,42,0.1)] ${item.fallbackTone}`}>
                      <div>
                        <p className="text-[11px] uppercase tracking-[0.18em] text-white/72">{item.category}</p>
                        <p className="mt-2 text-lg font-medium">{item.title}</p>
                      </div>
                    </div>
                  ),
                )}
                <div className="rounded-[24px] border border-dashed border-[rgba(181,157,121,0.24)] bg-[rgba(255,249,238,0.72)] p-5">
                  <p className="text-[11px] uppercase tracking-[0.18em] text-[#9d7e4d]">品牌画面</p>
                  <p className="mt-3 text-base font-medium text-primary">持续补充案例图片，能明显提升咨询转化</p>
                  <p className="mt-3 text-sm leading-7 text-muted">
                    当前模块会自动组合企业案例、行业参考与默认场景表达，保证访客始终能看到完整的视觉内容。
                  </p>
                  <a href="#contact-panel" className="mt-4 inline-flex items-center justify-center rounded-full border border-border bg-white px-4 py-2.5 text-sm font-medium text-primary transition hover:bg-surface">
                    获取案例资料
                  </a>
                </div>
              </div>
            </ContentCard>

            <ContentCard title="资质 / 标准 / 荣誉" helper="把资质、标准参与和荣誉信息收拢到同一块，强化信任感，不让页面显得零散。">
              <div className="grid gap-3">
                {standardsAndHonors.map((item) => (
                  <div key={item.key} className="rounded-[22px] border border-border bg-white px-4 py-4 shadow-[0_12px_28px_rgba(15,23,42,0.04)]">
                    <p className="text-sm font-medium text-primary">{item.label}</p>
                    <p className="mt-1 text-xs text-muted">{item.meta}</p>
                  </div>
                ))}
              </div>
            </ContentCard>

            <ContentCard id="contact-panel" title="联系方式" helper="只展示真实可联系的信息；资料不完整时，保留平台兜底转化入口，不伪造任何联系方式。">
              <div className="space-y-4">
                {contactView.items.map((item) => (
                  <ContactRow key={item.label} label={item.label} value={item.value} href={item.href} />
                ))}
                {contactView.wechatQrImageUrl ? (
                  <div className="rounded-[22px] border border-border bg-white px-4 py-4 shadow-[0_12px_28px_rgba(15,23,42,0.04)]">
                    <p className="text-xs uppercase tracking-[0.18em] text-muted">微信二维码</p>
                    <div className="mt-3 overflow-hidden rounded-[16px] border border-border bg-surface p-2">
                      <Image
                        src={resolveUploadedImageUrl(contactView.wechatQrImageUrl)}
                        alt="微信二维码"
                        width={260}
                        height={260}
                        className="h-36 w-36 object-contain"
                      />
                    </div>
                  </div>
                ) : null}
                <div className="rounded-[22px] border border-[rgba(181,157,121,0.16)] bg-[rgba(255,249,238,0.72)] px-4 py-4 text-sm text-primary/88">
                  <p className="text-xs uppercase tracking-[0.16em] text-muted">联系说明</p>
                  <p className="mt-3 leading-7">{contactView.contactIntro}</p>
                </div>
                <div className="grid gap-3 sm:grid-cols-3">
                  <a href={primaryContactHref} className="inline-flex items-center justify-center rounded-full bg-accent px-4 py-3 text-sm font-medium text-white transition hover:opacity-92">
                    {contactView.hasRealContact ? "立即咨询" : "提交需求"}
                  </a>
                  <a href={contactView.websiteUrl ? buildContactHref(contactView.websiteUrl)! : primaryContactHref} className="inline-flex items-center justify-center rounded-full border border-border bg-surface px-4 py-3 text-sm font-medium text-primary transition hover:bg-white">
                    查看官网
                  </a>
                  <a href="#gallery-section" className="inline-flex items-center justify-center rounded-full border border-border bg-surface px-4 py-3 text-sm font-medium text-primary transition hover:bg-white">
                    查看案例
                  </a>
                </div>
              </div>
            </ContentCard>
          </div>
        </div>
      </div>
    </div>
  );
}

function ContentCard({ title, helper, children, id }: { title: string; helper?: string; children: React.ReactNode; id?: string }) {
  return (
    <section id={id} className="rounded-[30px] border border-border bg-[rgba(255,255,255,0.9)] p-6 shadow-[0_18px_60px_rgba(34,31,26,0.05)] backdrop-blur">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <h2 className="font-serif text-2xl text-primary">{title}</h2>
        {helper ? <p className="max-w-xl text-sm leading-7 text-muted">{helper}</p> : null}
      </div>
      <div className="mt-5">{children}</div>
    </section>
  );
}

function ContactRow({ label, value, href }: { label: string; value: string; href?: string | null }) {
  return (
    <div className="rounded-[22px] border border-border bg-white px-4 py-4 shadow-[0_12px_28px_rgba(15,23,42,0.04)]">
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
