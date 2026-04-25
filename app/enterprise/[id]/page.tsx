import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { articleOrderByPinnedLatest } from "@/lib/articles";
import { htmlToPlainText, toSummaryText } from "@/lib/brand-content";
import {
  resolveEnterpriseHomepageContact,
  resolveEnterpriseHomepageHero,
  resolveEnterpriseHomepageSeo,
} from "@/lib/enterprise-homepage";
import { getMemberSiteSettings } from "@/lib/member-site-settings";
import { prisma } from "@/lib/prisma";
import { buildNewsPath } from "@/lib/share-config";
import { resolveUploadedImageUrl } from "@/lib/uploaded-image";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type Props = {
  params: Promise<{ id: string }>;
  searchParams?: Promise<{ newsPage?: string }>;
};

const ENTERPRISE_NEWS_PAGE_SIZE = 6;

function buildEnterpriseArticleWhere(memberId: string, enterpriseId: string) {
  return {
    status: "approved",
    OR: [{ authorMemberId: memberId }, { ownedEnterpriseId: enterpriseId }],
  };
}

type NewsCard = {
  id: string;
  title: string;
  excerpt: string;
  dateLabel: string;
  href: string;
  badge: string;
  imageUrl?: string | null;
};

type GalleryCard = {
  id: string;
  title: string;
  category: string;
  imageUrl?: string | null;
  href?: string;
};

const DEFAULT_HERO_IMAGE = "/images/seedance2/picture_14.jpg";
const DEFAULT_GALLERY_IMAGES = [
  "/images/seedance2/picture_3.jpg",
  "/images/seedance2/picture_8.jpg",
  "/images/seedance2/picture_17.jpg",
  "/images/seedance2/picture_21.jpg",
  "/images/seedance2/picture_9.jpg",
  "/images/seedance2/picture_12.jpg",
];
const DEFAULT_NEWS_IMAGES = [
  "/images/seedance2/picture_5.jpg",
  "/images/seedance2/picture_11.jpg",
  "/images/seedance2/picture_19.jpg",
];

function formatDate(input: string | Date | null | undefined) {
  if (!input) return "";
  const date = typeof input === "string" ? new Date(input) : input;
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString("zh-CN");
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
  return value
    .split(/\n{2,}/)
    .map((item) => item.trim())
    .filter(Boolean)
    .slice(0, 4);
}

function splitSentences(value: string) {
  return value
    .split(/(?<=[。！？])/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function isBusinessScopeParagraph(value: string) {
  const text = value.replace(/\s+/g, "");
  if (!text) return false;
  return (
    /(加工|销售|制造|安装|维修|进出口|依法须经批准|经营活动)/.test(text) &&
    /(木门|柜|衣柜|家具|护墙|木制|林木)/.test(text)
  );
}

function shortText(value: string | null | undefined, maxLength = 18) {
  const text = htmlToPlainText(value);
  if (!text) return null;
  const normalized = text.replace(/\s+/g, " ").trim();
  if (!normalized || /^[-|/\\·,.，。]+$/.test(normalized)) return null;
  return normalized.length > maxLength ? `${normalized.slice(0, Math.max(0, maxLength - 1)).trim()}…` : normalized;
}

function buildLocationLabel(region?: string | null, area?: string | null) {
  const normalizedRegion = shortText(region, 16);
  const normalizedArea = shortText(area, 16);
  if (normalizedRegion && normalizedArea) {
    if (normalizedArea.includes(normalizedRegion)) return normalizedArea;
    if (normalizedRegion.includes(normalizedArea)) return normalizedRegion;
    return `${normalizedRegion} · ${normalizedArea}`;
  }
  return normalizedRegion || normalizedArea || "全国";
}

function buildHeroSubtitle(name: string, input: { positioning?: string | null; intro?: string | null }) {
  return (
    toSummaryText(input.positioning, 24) ||
    `${name}专注高端整木空间定制，覆盖住宅与商业场景`
  );
}

function buildGeneratedNews(
  name: string,
  input: { productSystem?: string | null; region?: string | null; positioning?: string | null },
): NewsCard[] {
  return [
    {
      id: `${name}-generated-1`,
      title: "高端整木空间为什么更强调整体设计",
      excerpt: "从材质统一、场景协调到落地细节，整体化设计往往决定空间最终的高级感与完成度。",
      dateLabel: "行业观察",
      href: "#contact-panel",
      badge: "洞察",
      imageUrl: DEFAULT_NEWS_IMAGES[0],
    },
    {
      id: `${name}-generated-2`,
      title: "整木项目中最容易被忽视的细节",
      excerpt: `在${input.region || "当前"}市场环境下，用户往往更关注结果呈现，而真正拉开差距的是细节控制与交付协同。`,
      dateLabel: "项目经验",
      href: "#gallery-section",
      badge: "专题",
      imageUrl: DEFAULT_NEWS_IMAGES[1],
    },
    {
      id: `${name}-generated-3`,
      title: "如何判断一个整木品牌是否适合你的项目",
      excerpt: "除了产品本身，还应重点了解方案匹配度、服务协同方式与项目落地经验，帮助判断合作是否顺畅。",
      dateLabel: "合作指南",
      href: "#contact-panel",
      badge: "指南",
      imageUrl: DEFAULT_NEWS_IMAGES[2],
    },
  ];
}

function buildFallbackGallery(name: string, productSystem?: string | null): GalleryCard[] {
  return [
    {
      id: `${name}-gallery-1`,
      title: "现代住宅空间",
      category: productSystem || "住宅场景",
      imageUrl: DEFAULT_GALLERY_IMAGES[0],
    },
    {
      id: `${name}-gallery-2`,
      title: "高端商业场景",
      category: "商业空间",
      imageUrl: DEFAULT_GALLERY_IMAGES[1],
    },
    {
      id: `${name}-gallery-3`,
      title: "木作细节表达",
      category: "工艺细节",
      imageUrl: DEFAULT_GALLERY_IMAGES[2],
    },
    {
      id: `${name}-gallery-4`,
      title: "整体氛围演绎",
      category: "品牌画面",
      imageUrl: DEFAULT_GALLERY_IMAGES[3],
    },
    {
      id: `${name}-gallery-5`,
      title: "现代木作细节",
      category: "工艺细节",
      imageUrl: DEFAULT_GALLERY_IMAGES[4],
    },
    {
      id: `${name}-gallery-6`,
      title: "场景风格表达",
      category: productSystem || "整木空间",
      imageUrl: DEFAULT_GALLERY_IMAGES[5],
    },
  ];
}

function buildAboutSummary(
  name: string,
  input: {
    positioning?: string | null;
    intro?: string | null;
    productSystem?: string | null;
    region?: string | null;
  },
) {
  return (
    toSummaryText(input.positioning || input.intro, 120) ||
    `${name}围绕${input.productSystem || "整木与空间服务"}建立统一展示与交付表达，持续服务${input.region || "区域"}客户咨询与项目合作。`
  );
}

function buildAboutBlocks(
  name: string,
  input: {
    positioning?: string | null;
    introPlain: string;
    productSystem?: string | null;
    region?: string | null;
    area?: string | null;
  },
) {
  const introPieces = chunkParagraphs(input.introPlain);
  if (introPieces.length >= 2) {
    return introPieces.slice(0, 3);
  }

  return [
    `${name}${input.region ? `立足${buildLocationLabel(input.region, input.area)}` : ""}，持续完善品牌展示、项目沟通与空间落地能力。`,
    input.productSystem
      ? `围绕${toSummaryText(input.productSystem, 30)}构建更完整的整木系统表达，兼顾设计统一性与实际落地效果。`
      : "围绕整木空间定制与项目交付建立更完整的服务表达。",
    input.positioning
      ? `${toSummaryText(input.positioning, 44)}，更关注空间气质、材质协调与整体完成度。`
      : "在方案呈现、工艺细节与合作节奏之间保持稳定平衡，让项目推进更顺畅。",
  ];
}

function buildAboutParagraphs(introPlain: string, fallbackBlocks: string[]) {
  const cleaned = chunkParagraphs(introPlain)
    .map((item) =>
      splitSentences(item)
        .filter((sentence) => !isBusinessScopeParagraph(sentence))
        .join("")
        .replace(/\s+/g, " ")
        .trim(),
    )
    .filter((item) => item && !isBusinessScopeParagraph(item));

  if (cleaned.length > 0) {
    return cleaned.slice(0, 2);
  }

  return fallbackBlocks.slice(0, 2);
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

export default async function EnterprisePage({ params, searchParams }: Props) {
  const { id } = await params;
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const currentNewsPage = Math.max(1, parseInt(resolvedSearchParams?.newsPage ?? "1", 10) || 1);

  const ent = await prisma.enterprise.findUnique({
    where: { id },
    include: {
      member: {
        select: {
          id: true,
          name: true,
        },
      },
    },
  });

  if (!ent?.member) notFound();

  const memberId = ent.member.id;
  const enterpriseArticleWhere = buildEnterpriseArticleWhere(memberId, ent.id);
  const [siteSettings, ownArticleCount, ownGallery, platformArticles, platformGallery] = await Promise.all([
    getMemberSiteSettings(memberId),
    prisma.article.count({
      where: enterpriseArticleWhere,
    }),
    prisma.galleryImage.findMany({
      where: { authorMemberId: memberId, status: "approved" },
      orderBy: [{ sortOrder: "desc" }, { createdAt: "desc" }],
      take: 8,
      select: { id: true, title: true, imageUrl: true, category: true, createdAt: true },
    }),
    prisma.article.findMany({
      where: { status: "approved", authorMemberId: { not: memberId } },
      orderBy: articleOrderByPinnedLatest,
      take: 4,
      select: { id: true, title: true, slug: true, excerpt: true, createdAt: true, publishedAt: true },
    }),
    prisma.galleryImage.findMany({
      where: { status: "approved", authorMemberId: { not: memberId } },
      orderBy: [{ sortOrder: "desc" }, { createdAt: "desc" }],
      take: 4,
      select: { id: true, title: true, imageUrl: true, category: true, createdAt: true },
    }),
  ]);
  const totalNewsPages = Math.max(1, Math.ceil(ownArticleCount / ENTERPRISE_NEWS_PAGE_SIZE));
  const normalizedNewsPage = Math.min(currentNewsPage, totalNewsPages);
  const ownArticles = await prisma.article.findMany({
    where: enterpriseArticleWhere,
    orderBy: articleOrderByPinnedLatest,
    skip: (normalizedNewsPage - 1) * ENTERPRISE_NEWS_PAGE_SIZE,
    take: ENTERPRISE_NEWS_PAGE_SIZE,
    select: { id: true, title: true, slug: true, excerpt: true, createdAt: true, publishedAt: true },
  });

  const name = ent.companyShortName || ent.companyName || "企业";
  const introPlain = htmlToPlainText(ent.intro || ent.positioning || "");
  const heroView = resolveEnterpriseHomepageHero(ent, siteSettings, ownGallery);
  const contactView = resolveEnterpriseHomepageContact(ent, siteSettings);
  const generatedNews = buildGeneratedNews(name, {
    productSystem: ent.productSystem,
    region: ent.region,
    positioning: ent.positioning,
  });

  const enterpriseNewsCards: NewsCard[] = ownArticles.map((article, index) => ({
    id: article.id,
    title: article.title,
    excerpt: toSummaryText(article.excerpt || article.title, 78) || article.title,
    dateLabel: formatDate(article.publishedAt || article.createdAt),
      href: buildNewsPath(article.slug || article.id),
    badge: "企业动态",
    imageUrl: ownGallery[index]?.imageUrl || ownGallery[0]?.imageUrl || DEFAULT_NEWS_IMAGES[index % DEFAULT_NEWS_IMAGES.length],
  }));

  const platformNewsCards: NewsCard[] = platformArticles.map((article, index) => ({
    id: article.id,
    title: article.title,
    excerpt: toSummaryText(article.excerpt || article.title, 78) || article.title,
    dateLabel: formatDate(article.publishedAt || article.createdAt),
      href: buildNewsPath(article.slug || article.id),
    badge: "行业资讯",
    imageUrl: platformGallery[index]?.imageUrl || platformGallery[0]?.imageUrl || DEFAULT_NEWS_IMAGES[index % DEFAULT_NEWS_IMAGES.length],
  }));

  const newsCards =
    ownArticleCount > 0
      ? enterpriseNewsCards
      : enterpriseNewsCards.length > 0
        ? [...enterpriseNewsCards, ...platformNewsCards].slice(0, 3)
        : [...generatedNews, ...platformNewsCards].slice(0, 3);
  const ownGalleryCards: GalleryCard[] = ownGallery.map((image) => ({
    id: image.id,
    title: image.title || `${name} 项目画面`,
    category: image.category || "住宅场景",
    imageUrl: image.imageUrl,
    href: resolveUploadedImageUrl(image.imageUrl),
  }));

  const platformGalleryCards: GalleryCard[] = platformGallery.map((image) => ({
    id: image.id,
    title: image.title || "精选空间案例",
    category: image.category || "商业场景",
    imageUrl: image.imageUrl,
    href: resolveUploadedImageUrl(image.imageUrl),
  }));

  const galleryCards =
    ownGalleryCards.length > 0
      ? ownGalleryCards.slice(0, 6)
      : platformGalleryCards.length > 0
        ? platformGalleryCards.slice(0, 6)
        : buildFallbackGallery(name, ent.productSystem);

  const heroBackground =
    heroView.heroImageUrl ||
    (ownGalleryCards[0]?.imageUrl ? resolveUploadedImageUrl(ownGalleryCards[0].imageUrl) : null) ||
    (platformGalleryCards[0]?.imageUrl ? resolveUploadedImageUrl(platformGalleryCards[0].imageUrl) : null) ||
    DEFAULT_HERO_IMAGE;

  const secondaryWebsiteHref = contactView.websiteUrl ? buildContactHref(contactView.websiteUrl) : null;
  const contactPrimaryLabel = contactView.hasRealContact ? heroView.primaryCtaLabel : "提交咨询";
  const contactPrimaryHref =
    contactView.primaryCtaHref === "#contact-panel" ? secondaryWebsiteHref || "/membership" : contactView.primaryCtaHref;
  const aboutSummary = buildAboutSummary(name, {
    positioning: ent.positioning,
    intro: ent.intro,
    productSystem: ent.productSystem,
    region: ent.region,
  });
  const heroSubtitle = buildHeroSubtitle(name, { positioning: ent.positioning, intro: ent.intro });
  const aboutBlocks = buildAboutBlocks(name, {
    positioning: ent.positioning,
    introPlain,
    productSystem: ent.productSystem,
    region: ent.region,
    area: ent.area,
  });
  const aboutParagraphs = buildAboutParagraphs(introPlain, aboutBlocks);
  const logoUrl = ent.logoUrl ? resolveUploadedImageUrl(ent.logoUrl) : null;

  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,#f4f0ea_0%,#f8f6f2_22%,#fbfaf8_100%)] text-[#1f1b18]">
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-8">
        <nav className="mb-8 text-sm text-[#7f6b57]" aria-label="面包屑">
          <Link href="/" className="transition hover:text-[#a47b45]">
            首页
          </Link>
          <span className="mx-2">/</span>
          <Link href="/brands" className="transition hover:text-[#a47b45]">
            品牌栏目
          </Link>
          <span className="mx-2">/</span>
          <span className="text-[#2c241d]">{name}</span>
        </nav>

        <section className="relative isolate overflow-hidden rounded-[30px] border border-[rgba(140,111,78,0.14)] bg-[#171310] shadow-[0_24px_72px_rgba(32,24,17,0.18)] sm:rounded-[40px] sm:shadow-[0_30px_120px_rgba(32,24,17,0.22)]">
          <Image
            src={heroBackground}
            alt={`${name} 品牌主视觉`}
            fill
            priority
            className="z-0 object-cover"
          />
          <div className="pointer-events-none absolute inset-0 z-[1] bg-[linear-gradient(180deg,rgba(8,6,5,0.34)_0%,rgba(8,6,5,0.66)_24%,rgba(12,8,6,0.88)_72%,rgba(12,8,6,0.94)_100%)] sm:bg-[linear-gradient(90deg,rgba(8,6,5,0.96)_0%,rgba(12,8,6,0.88)_36%,rgba(18,13,10,0.68)_68%,rgba(20,15,11,0.5)_100%)]" />
          <div className="pointer-events-none absolute inset-0 z-[2] bg-[radial-gradient(circle_at_top_right,rgba(216,182,136,0.2),transparent_24%),radial-gradient(circle_at_bottom_left,rgba(255,255,255,0.05),transparent_22%)]" />
          <div className="relative z-10 flex min-h-[380px] items-end px-4 py-6 sm:min-h-[460px] sm:px-10 sm:py-16 lg:min-h-[520px] lg:px-14 lg:py-20">
            <div className="max-w-3xl">
              <p className="text-[11px] uppercase tracking-[0.28em] text-white/62">Brand Home</p>
              <h1 className="mt-3 max-w-4xl font-serif text-[2rem] leading-[1.04] text-white drop-shadow-[0_10px_28px_rgba(0,0,0,0.3)] sm:text-6xl lg:text-[80px]">{name}</h1>
              <div className="mt-3 w-full max-w-full rounded-[22px] border border-white/12 bg-[linear-gradient(180deg,rgba(10,8,6,0.72),rgba(10,8,6,0.48))] px-4 py-3.5 shadow-[0_16px_36px_rgba(0,0,0,0.24)] backdrop-blur-[8px] sm:mt-5 sm:inline-flex sm:w-auto sm:max-w-2xl sm:rounded-[24px] sm:bg-[linear-gradient(180deg,rgba(10,8,6,0.52),rgba(10,8,6,0.28))] sm:px-5 sm:py-4">
                <p className="max-w-none text-[1.08rem] font-medium leading-7 text-white drop-shadow-[0_8px_24px_rgba(0,0,0,0.48)] sm:max-w-2xl sm:text-[32px] sm:leading-tight">
                  {heroSubtitle}
                </p>
              </div>
              <p className="mt-3 max-w-lg px-1 text-sm leading-6 text-white/82 sm:hidden">
                {aboutSummary}
              </p>
            </div>
          </div>
        </section>

        <div className="mt-10 space-y-10 sm:mt-20 sm:space-y-16">
          <section className="rounded-[28px] border border-[rgba(180,154,107,0.16)] bg-[linear-gradient(180deg,rgba(255,255,255,0.95),rgba(247,241,233,0.9))] p-4 shadow-[0_16px_32px_rgba(35,26,18,0.05)] sm:rounded-[36px] sm:p-8 lg:p-10">
            <div className="rounded-[24px] border border-[rgba(140,111,78,0.1)] bg-white/82 p-5 shadow-[0_16px_34px_rgba(35,26,18,0.04)] sm:rounded-[30px] sm:p-7 lg:p-8">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:gap-5">
                {logoUrl ? (
                  <div className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-[20px] border border-[rgba(140,111,78,0.12)] bg-white p-3 shadow-[0_10px_24px_rgba(35,26,18,0.06)] sm:h-20 sm:w-20">
                    <Image
                      src={logoUrl}
                      alt={`${name} Logo`}
                      width={120}
                      height={120}
                      className="h-full w-full object-contain"
                    />
                  </div>
                ) : null}
                <div className="max-w-4xl">
                <p className="text-[11px] uppercase tracking-[0.28em] text-[#9f7a46]">Brand Story</p>
                <h2 className="mt-2.5 font-serif text-[1.9rem] text-[#241c15] sm:mt-3 sm:text-4xl">关于品牌</h2>
                </div>
              </div>

              <div className="mt-5 rounded-[22px] border border-[rgba(140,111,78,0.08)] bg-[rgba(255,252,247,0.86)] p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.7)] sm:mt-7 sm:rounded-[26px] sm:p-7">
                <div className="grid gap-5 lg:grid-cols-[minmax(0,0.84fr),minmax(0,1.16fr)] lg:gap-8">
                  <div className="rounded-[20px] border border-[rgba(159,122,70,0.12)] bg-[linear-gradient(180deg,rgba(255,255,255,0.72),rgba(252,246,238,0.92))] p-4 sm:rounded-[22px] sm:p-5">
                    <p className="text-[11px] uppercase tracking-[0.22em] text-[#9f7a46]">品牌摘要</p>
                    <p className="mt-3 text-[15px] leading-7 text-[#3d3025] sm:text-base sm:leading-8">
                      {aboutSummary}
                    </p>
                  </div>

                  <div className="space-y-4 sm:space-y-5">
                    {aboutParagraphs.slice(0, 2).map((paragraph, index) => (
                      <p
                        key={`${name}-about-${index}`}
                        className="text-[15px] leading-7 text-[#3d3025] sm:text-base sm:leading-8"
                      >
                        {paragraph}
                      </p>
                    ))}
                    <a
                      href="#contact-panel"
                      className="inline-flex items-center gap-2 text-sm font-medium text-[#9f7a46] transition hover:text-[#876234]"
                    >
                      了解更多
                      <span aria-hidden="true">→</span>
                    </a>
                  </div>
                </div>
              </div>
            </div>
          </section>

          <Section id="gallery-section" title="精选案例" description="移动端左右滑动即可快速浏览案例，不必连续下拉。">
            <div className="-mx-4 flex snap-x snap-mandatory gap-4 overflow-x-auto px-4 pb-2 md:mx-0 md:grid md:snap-none md:grid-cols-2 md:gap-6 md:overflow-visible md:px-0 xl:grid-cols-3">
              {galleryCards.map((item) => (
                <CaseCard key={item.id} item={item} />
              ))}
            </div>
          </Section>

          <Section
            id="enterprise-news"
            title="企业动态"
          >
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {newsCards.map((item) => (
                <NewsItemCard key={item.id} item={item} />
              ))}
            </div>
            {ownArticleCount > ENTERPRISE_NEWS_PAGE_SIZE ? (
              <EnterpriseNewsPagination enterpriseId={id} currentPage={normalizedNewsPage} totalPages={totalNewsPages} />
            ) : null}
          </Section>

          <section id="contact-panel">
            <div className="overflow-hidden rounded-[28px] border border-[rgba(180,154,107,0.18)] bg-[linear-gradient(135deg,rgba(255,252,247,0.98)_0%,rgba(245,238,229,0.96)_48%,rgba(234,223,209,0.94)_100%)] shadow-[0_20px_56px_rgba(32,24,17,0.08)] sm:rounded-[36px] sm:shadow-[0_28px_90px_rgba(32,24,17,0.08)]">
              <div className="grid gap-5 px-4 py-5 sm:gap-8 sm:px-10 sm:py-10 lg:grid-cols-[0.88fr,1.12fr] lg:px-12">
                <div className="flex flex-col justify-center">
                  <p className="text-[11px] uppercase tracking-[0.32em] text-[#9f7a46]">Contact</p>
                  <h2 className="mt-2.5 font-serif text-[1.95rem] leading-tight text-[#231b15] sm:mt-4 sm:text-5xl">获取专属方案</h2>
                  <p className="mt-3 max-w-xl text-sm leading-6 text-[#4e4033] sm:mt-5 sm:text-base sm:leading-8">
                    {contactView.contactIntro || "提交您的需求，我们将为您提供专属整木空间解决方案，从设计到落地，全流程支持。"}
                  </p>
                  <div className="mt-4 flex flex-col gap-2.5 sm:mt-8 sm:flex-row sm:flex-wrap sm:gap-4">
                    <a
                      href={contactPrimaryHref}
                      className="inline-flex min-w-[148px] items-center justify-center rounded-full bg-[#c79a62] px-5 py-3 text-sm font-medium text-white transition hover:bg-[#b9894f] sm:px-6 sm:py-3.5"
                    >
                      {contactPrimaryLabel}
                    </a>
                    <a
                      href={secondaryWebsiteHref || "#gallery-section"}
                      className="inline-flex min-w-[148px] items-center justify-center rounded-full border border-[rgba(165,132,87,0.26)] bg-white/78 px-5 py-3 text-sm font-medium text-[#2c221b] transition hover:bg-white sm:px-6 sm:py-3.5"
                    >
                      {secondaryWebsiteHref ? "访问官网" : "查看案例"}
                    </a>
                  </div>
                </div>

                <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr),220px] lg:gap-4">
                  <div className="rounded-[22px] border border-[rgba(180,154,107,0.14)] bg-[linear-gradient(180deg,rgba(255,255,255,0.84),rgba(255,251,245,0.72))] p-4 shadow-[0_14px_28px_rgba(35,26,18,0.05)] sm:rounded-[28px] sm:p-6 sm:shadow-[0_18px_36px_rgba(35,26,18,0.05)]">
                    <div className="space-y-2.5 sm:space-y-4">
                      {contactView.items.map((item) => (
                        <div
                          key={item.label}
                          className="rounded-[18px] border border-[rgba(180,154,107,0.12)] bg-white/88 px-4 py-3 shadow-[0_8px_18px_rgba(35,26,18,0.03)] sm:rounded-[22px] sm:px-5 sm:py-4 sm:shadow-[0_10px_24px_rgba(35,26,18,0.03)]"
                        >
                          <p className="text-[11px] uppercase tracking-[0.18em] text-[#9f7a46]">{item.label}</p>
                          {item.href ? (
                            <a
                              href={item.href}
                              target={item.href.startsWith("http") ? "_blank" : undefined}
                              rel={item.href.startsWith("http") ? "noreferrer" : undefined}
                              className="mt-1.5 block text-[15px] leading-6 text-[#231b15] underline-offset-4 hover:text-[#a47b45] hover:underline sm:mt-2 sm:text-lg sm:leading-7"
                            >
                              {item.value}
                            </a>
                          ) : (
                            <p className="mt-1.5 text-[15px] leading-6 text-[#231b15] sm:mt-2 sm:text-lg sm:leading-7">{item.value}</p>
                          )}
                        </div>
                      ))}
                    </div>
                    {!contactView.hasRealContact ? (
                      <p className="mt-3 text-sm leading-6 text-[#6d5d4f] sm:mt-5 sm:leading-7">
                        当前企业未公开完整联系方式，可通过左侧咨询按钮发起需求对接。
                      </p>
                    ) : null}
                  </div>

                  {contactView.wechatQrImageUrl ? (
                    <div className="rounded-[22px] border border-[rgba(180,154,107,0.16)] bg-white/78 p-4 shadow-[0_14px_28px_rgba(35,26,18,0.05)] sm:rounded-[28px] sm:p-5 sm:shadow-[0_16px_32px_rgba(35,26,18,0.05)]">
                      <p className="text-[11px] uppercase tracking-[0.18em] text-[#9f7a46]">扫码联系</p>
                      <div className="mt-3 flex items-center justify-center overflow-hidden rounded-[18px] border border-[rgba(180,154,107,0.14)] bg-white p-2.5 sm:mt-4 sm:rounded-[20px] sm:p-3">
                        <Image
                          src={resolveUploadedImageUrl(contactView.wechatQrImageUrl)}
                          alt="联系二维码"
                          width={220}
                          height={220}
                          className="h-full w-full object-contain"
                        />
                      </div>
                      <p className="mt-2.5 text-sm leading-6 text-[#6d5d4f] sm:mt-3">支持微信等渠道进一步沟通</p>
                    </div>
                  ) : null}
                </div>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

function Section({
  title,
  children,
  id,
  eyebrow,
  description,
  aside,
}: {
  title: string;
  children: React.ReactNode;
  id?: string;
  eyebrow?: string;
  description?: string;
  aside?: React.ReactNode;
}) {
  return (
    <section id={id}>
      <div className="mb-5 flex items-end justify-between gap-4 sm:mb-7">
        <div>
          {eyebrow ? <p className="text-[11px] uppercase tracking-[0.24em] text-[#9f7a46]">{eyebrow}</p> : null}
          <h2 className="mt-2.5 font-serif text-[1.9rem] text-[#241c15] sm:mt-3 sm:text-4xl">{title}</h2>
          {description ? <p className="mt-2 max-w-2xl text-sm leading-6 text-[#6a5949] sm:mt-3 sm:leading-7">{description}</p> : null}
        </div>
        {aside}
      </div>
      {children}
    </section>
  );
}

function FeatureStrip({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[26px] border border-white/12 bg-white/8 p-5 backdrop-blur">
      <p className="text-[11px] uppercase tracking-[0.22em] text-white/52">{label}</p>
      <p className="mt-3 text-sm leading-7 text-white/78">{value}</p>
    </div>
  );
}

function CaseCard({ item }: { item: GalleryCard }) {
  const wrapperClass =
    "group min-w-[78vw] snap-start overflow-hidden rounded-[26px] border border-[rgba(140,111,78,0.12)] bg-white shadow-[0_14px_32px_rgba(35,26,18,0.06)] md:min-w-0 md:rounded-[30px] md:shadow-[0_18px_40px_rgba(35,26,18,0.06)]";

  if (item.imageUrl) {
    const content = (
      <>
        <div className="overflow-hidden">
          <Image
            src={resolveUploadedImageUrl(item.imageUrl)}
            alt={item.title}
            width={800}
            height={600}
            className="aspect-[4/3] w-full object-cover transition duration-500 group-hover:scale-[1.03] md:aspect-[5/4]"
          />
        </div>
        <div className="bg-white px-4 py-4 md:px-6 md:py-5">
          <p className="line-clamp-1 min-h-[1rem] text-[11px] uppercase tracking-[0.2em] text-[#a47b45]">{item.category}</p>
          <p className="mt-2.5 line-clamp-1 min-h-[1.75rem] text-base font-medium leading-7 text-[#241c15] md:mt-3 md:min-h-[1.9rem] md:text-lg">
            {item.title}
          </p>
        </div>
      </>
    );

    if (item.href) {
      return (
        <a href={item.href} target="_blank" rel="noreferrer" className={`block ${wrapperClass}`}>
          {content}
        </a>
      );
    }

    return <div className={wrapperClass}>{content}</div>;
  }

  return null;
}

function NewsItemCard({
  item,
}: {
  item: NewsCard;
}) {
  return (
    <Link
      href={item.href}
      className="group flex h-full min-h-[196px] flex-col rounded-[24px] border border-[rgba(140,111,78,0.12)] bg-[linear-gradient(180deg,rgba(255,255,255,0.96),rgba(248,243,236,0.92))] px-4 py-4 shadow-[0_14px_32px_rgba(35,26,18,0.05)] transition hover:-translate-y-0.5 sm:min-h-[208px] sm:px-5 sm:py-4.5"
    >
      <div className="flex items-center justify-end">
        <span className="text-[11px] text-[#8c7b69] sm:text-xs">{item.dateLabel}</span>
      </div>
      <p
        title={item.title}
        className="mt-2.5 min-h-[52px] text-[1.5rem] font-medium leading-[1.4] text-[#241c15] sm:mt-3 sm:min-h-[60px] sm:text-[1.7rem]"
        style={{
          display: "-webkit-box",
          WebkitLineClamp: 2,
          WebkitBoxOrient: "vertical",
          overflow: "hidden",
        }}
      >
        {item.title}
      </p>
      <div className="mt-auto flex items-end justify-between gap-3 pt-3 sm:pt-4">
        <p
          className="min-w-0 flex-1 text-[13px] leading-6 text-[#5c4d40] sm:text-sm sm:leading-7"
          style={{
            display: "-webkit-box",
            WebkitLineClamp: 2,
            WebkitBoxOrient: "vertical",
            overflow: "hidden",
          }}
        >
          {item.excerpt}
        </p>
        <div className="shrink-0 text-sm font-medium text-[#a47b45] transition group-hover:translate-x-0.5">→</div>
      </div>
    </Link>
  );
}

function EnterpriseNewsPagination({
  enterpriseId,
  currentPage,
  totalPages,
}: {
  enterpriseId: string;
  currentPage: number;
  totalPages: number;
}) {
  const pages = buildPageList(currentPage, totalPages);

  return (
    <div className="mt-8 flex justify-center">
      <div className="flex flex-wrap items-center justify-center gap-2">
        <PaginationLink href={buildEnterpriseNewsPageHref(enterpriseId, Math.max(1, currentPage - 1))} disabled={currentPage <= 1}>
          上一页
        </PaginationLink>
        {pages.map((page, index) =>
          page === "ellipsis" ? (
            <span key={`ellipsis-${index}`} className="px-2 text-sm text-[#9a866f]">
              ...
            </span>
          ) : (
            <PaginationLink key={page} href={buildEnterpriseNewsPageHref(enterpriseId, page)} active={page === currentPage}>
              {page}
            </PaginationLink>
          )
        )}
        <PaginationLink href={buildEnterpriseNewsPageHref(enterpriseId, Math.min(totalPages, currentPage + 1))} disabled={currentPage >= totalPages}>
          下一页
        </PaginationLink>
      </div>
    </div>
  );
}

function PaginationLink({
  href,
  children,
  active = false,
  disabled = false,
}: {
  href: string;
  children: React.ReactNode;
  active?: boolean;
  disabled?: boolean;
}) {
  const className = active
    ? "inline-flex min-w-10 items-center justify-center rounded-full border border-[#b9905f] bg-[#c79a62] px-4 py-2 text-sm font-medium text-white shadow-[0_12px_24px_rgba(167,120,69,0.18)]"
    : "inline-flex min-w-10 items-center justify-center rounded-full border border-[rgba(181,157,121,0.2)] bg-white/84 px-4 py-2 text-sm font-medium text-[#5b4a3b] transition hover:border-[rgba(167,120,69,0.32)] hover:text-[#a47b45]";

  if (disabled) {
    return <span className={`${className} cursor-not-allowed opacity-45`}>{children}</span>;
  }

  return (
    <Link href={href} className={className} scroll>
      {children}
    </Link>
  );
}

function buildEnterpriseNewsPageHref(id: string, page: number) {
  return page <= 1 ? `/enterprise/${id}#enterprise-news` : `/enterprise/${id}?newsPage=${page}#enterprise-news`;
}

function buildPageList(currentPage: number, totalPages: number): Array<number | "ellipsis"> {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, index) => index + 1);
  }

  if (currentPage <= 4) {
    return [1, 2, 3, 4, 5, "ellipsis", totalPages];
  }

  if (currentPage >= totalPages - 3) {
    return [1, "ellipsis", totalPages - 4, totalPages - 3, totalPages - 2, totalPages - 1, totalPages];
  }

  return [1, "ellipsis", currentPage - 1, currentPage, currentPage + 1, "ellipsis", totalPages];
}
