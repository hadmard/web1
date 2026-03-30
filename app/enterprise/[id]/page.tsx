import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { RichContent } from "@/components/RichContent";
import { EntityArticleList } from "@/components/entity-profile/EntityArticleList";
import { EntityContactCard } from "@/components/entity-profile/EntityContactCard";
import { EntityHero } from "@/components/entity-profile/EntityHero";
import { EntityRelationCard } from "@/components/entity-profile/EntityRelationCard";
import { EntitySummary } from "@/components/entity-profile/EntitySummary";
import { ProfilePageTemplate } from "@/components/entity-profile/ProfilePageTemplate";
import { articleOrderByPinnedLatest } from "@/lib/articles";
import { htmlToPlainText, toSummaryText } from "@/lib/brand-content";
import {
  resolveEnterpriseHomepageContact,
  resolveEnterpriseHomepageHero,
  resolveEnterpriseHomepageSeo,
} from "@/lib/enterprise-homepage";
import { getMemberSiteSettings } from "@/lib/member-site-settings";
import { prisma } from "@/lib/prisma";
import { resolveUploadedImageUrl } from "@/lib/uploaded-image";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type Props = {
  params: Promise<{ id: string }>;
  searchParams?: Promise<{ newsPage?: string }>;
};

const ENTERPRISE_NEWS_PAGE_SIZE = 9;

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
    toSummaryText(input.intro, 24) ||
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
      brand: {
        select: {
          id: true,
          name: true,
          slug: true,
        },
      },
    },
  });

  if (!ent?.member) notFound();

  const memberId = ent.member.id;
  const [siteSettings, ownArticleCount, ownGallery, platformArticles, platformGallery] = await Promise.all([
    getMemberSiteSettings(memberId),
    prisma.article.count({
      where: { authorMemberId: memberId, status: "approved" },
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
    where: { authorMemberId: memberId, status: "approved" },
    orderBy: articleOrderByPinnedLatest,
    skip: (normalizedNewsPage - 1) * ENTERPRISE_NEWS_PAGE_SIZE,
    take: ENTERPRISE_NEWS_PAGE_SIZE,
    select: { id: true, title: true, slug: true, excerpt: true, createdAt: true, publishedAt: true },
  });

  const name = ent.companyShortName || ent.companyName || ent.member.name || "企业";
  const introRichText = ent.intro || "";
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
    href: `/news/${article.slug}`,
    badge: "企业动态",
    imageUrl: ownGallery[index]?.imageUrl || ownGallery[0]?.imageUrl || DEFAULT_NEWS_IMAGES[index % DEFAULT_NEWS_IMAGES.length],
  }));

  const platformNewsCards: NewsCard[] = platformArticles.map((article, index) => ({
    id: article.id,
    title: article.title,
    excerpt: toSummaryText(article.excerpt || article.title, 78) || article.title,
    dateLabel: formatDate(article.publishedAt || article.createdAt),
    href: `/news/${article.slug}`,
    badge: "行业资讯",
    imageUrl: platformGallery[index]?.imageUrl || platformGallery[0]?.imageUrl || DEFAULT_NEWS_IMAGES[index % DEFAULT_NEWS_IMAGES.length],
  }));

  const newsCards =
    ownArticleCount > 0
      ? enterpriseNewsCards
      : enterpriseNewsCards.length > 0
        ? [...enterpriseNewsCards, ...platformNewsCards].slice(0, 3)
        : [...generatedNews, ...platformNewsCards].slice(0, 3);
  const newsRangeStart = ownArticleCount > 0 ? (normalizedNewsPage - 1) * ENTERPRISE_NEWS_PAGE_SIZE + 1 : 0;
  const newsRangeEnd = ownArticleCount > 0 ? Math.min(normalizedNewsPage * ENTERPRISE_NEWS_PAGE_SIZE, ownArticleCount) : 0;

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

  const heroSupplement =
    toSummaryText(ent.productSystem, 18) ||
    "专注木作空间养护服务";

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
  const brandStatement =
    toSummaryText(ent.positioning || ent.intro, 42) ||
    `${name}专注高端整木空间定制与整体设计表达。`;
  const brandDetail =
    toSummaryText(ent.productSystem, 28) ||
    "专注住宅与商业空间整体木作解决方案。";
  const brandFactItems = [
    {
      label: "品牌定位",
      value: toSummaryText(ent.positioning, 22) || null,
    },
    {
      label: "主营方向",
      value: toSummaryText(ent.productSystem, 22) || null,
    },
    {
      label: "服务区域",
      value: buildLocationLabel(ent.region, ent.area),
    },
    {
      label: "合作方式",
      value: contactView.hasRealContact ? "支持项目沟通与需求对接" : "支持线上咨询与意向沟通",
    },
  ].filter((item) => item.value) as Array<{ label: string; value: string }>;
  const relationBrandItems = ent.brand
    ? [
        { label: "关联品牌", value: ent.brand.name, href: `/brands/${ent.brand.slug}` },
        { label: "企业主页", value: "当前企业详情页" },
      ]
    : [
        { label: "关联品牌", value: "当前未绑定品牌展示" },
        { label: "企业主页", value: "当前企业详情页" },
      ];
  const aboutBlocks = buildAboutBlocks(name, {
    positioning: ent.positioning,
    introPlain,
    productSystem: ent.productSystem,
    region: ent.region,
    area: ent.area,
  });

  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,#f4f0ea_0%,#f8f6f2_22%,#fbfaf8_100%)] text-[#1f1b18]">
      <ProfilePageTemplate
        breadcrumbs={[
          { label: "首页", href: "/" },
          { label: "品牌栏目", href: "/brands" },
          { label: name },
        ]}
        hero={
          <EntityHero
            variant="dark"
            eyebrow="Enterprise Profile"
            title={name}
            subtitle={heroSubtitle}
            summary={heroSupplement}
            backgroundImageUrl={heroBackground}
          />
        }
      >
        <EntitySummary
          eyebrow="Brand Story"
          title="关于品牌"
          statement={brandStatement}
          summary={aboutSummary}
          blocks={aboutBlocks}
          aside={
            <>
              <EntityRelationCard
                eyebrow="Brand Snapshot"
                title="品牌概览"
                description={brandDetail}
                items={brandFactItems}
              />
              <EntityRelationCard
                eyebrow="Entity Relation"
                title="关联信息"
                description="企业页只展示 Enterprise 主体，这里同步说明与 Brand 展示层的对应关系。"
                items={relationBrandItems}
              />
            </>
          }
          detailTitle="展开完整品牌介绍"
          detailContent={
            introRichText ? (
              <RichContent html={introRichText} className="prose prose-neutral max-w-none text-[#4f4134]" />
            ) : (
              <div className="space-y-4">
                {aboutBlocks.map((item, index) => (
                  <p key={`${index}-${item}`} className="text-sm leading-8 text-[#4f4134]">
                    {item}
                  </p>
                ))}
              </div>
            )
          }
        />

          <Section id="gallery-section" title="精选案例">
            <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
              {galleryCards.map((item) => (
                <CaseCard key={item.id} item={item} />
              ))}
            </div>
          </Section>

          <EntityArticleList
            id="enterprise-news"
            title="企业动态"
            eyebrow={ownArticleCount > 0 ? `共 ${ownArticleCount} 条动态` : "优先展示企业发布内容"}
            description={
              ownArticleCount > 0
                ? `按时间倒序展示企业全部已发布内容，当前为第 ${normalizedNewsPage} 页。`
                : "当前企业尚未发布动态，先展示平台精选与默认内容占位。"
            }
            aside={
              ownArticleCount > 0 ? (
                <div className="rounded-full border border-[rgba(181,157,121,0.18)] bg-white/76 px-4 py-2 text-xs tracking-[0.08em] text-[#8f7452]">
                  {newsRangeStart}-{newsRangeEnd} / {ownArticleCount}
                </div>
              ) : null
            }
            items={newsCards.map((item) => ({
              id: item.id,
              title: item.title,
              excerpt: item.excerpt,
              meta: item.dateLabel,
              href: item.href,
              badge: item.badge,
            }))}
            footer={
              ownArticleCount > ENTERPRISE_NEWS_PAGE_SIZE ? (
              <EnterpriseNewsPagination enterpriseId={id} currentPage={normalizedNewsPage} totalPages={totalNewsPages} />
              ) : null
            }
          />

          <div id="contact-panel">
            <EntityContactCard
              title="获取专属方案"
              intro={contactView.contactIntro || "提交您的需求，我们将为您提供专属整木空间解决方案，从设计到落地，全流程支持。"}
              primaryAction={
                <a
                  href={contactPrimaryHref}
                  className="inline-flex min-w-[148px] items-center justify-center rounded-full bg-[#c79a62] px-6 py-3.5 text-sm font-medium text-white transition hover:bg-[#b9894f]"
                >
                  {contactPrimaryLabel}
                </a>
              }
              secondaryAction={
                <a
                  href={secondaryWebsiteHref || "#gallery-section"}
                  className="inline-flex min-w-[148px] items-center justify-center rounded-full border border-[rgba(165,132,87,0.26)] bg-white/78 px-6 py-3.5 text-sm font-medium text-[#2c221b] transition hover:bg-white"
                >
                  {secondaryWebsiteHref ? "访问官网" : "查看案例"}
                </a>
              }
              items={contactView.items}
              note={!contactView.hasRealContact ? "当前企业未公开完整联系方式，可通过左侧咨询按钮发起需求对接。" : null}
              qrImageUrl={contactView.wechatQrImageUrl ? resolveUploadedImageUrl(contactView.wechatQrImageUrl) : null}
              qrDescription={contactView.wechatQrImageUrl ? "支持微信等渠道进一步沟通" : null}
            />
          </div>
      </ProfilePageTemplate>
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
      <div className="mb-7 flex items-end justify-between gap-4">
        <div>
          {eyebrow ? <p className="text-[11px] uppercase tracking-[0.24em] text-[#9f7a46]">{eyebrow}</p> : null}
          <h2 className="mt-3 font-serif text-3xl text-[#241c15] sm:text-4xl">{title}</h2>
          {description ? <p className="mt-3 max-w-2xl text-sm leading-7 text-[#6a5949]">{description}</p> : null}
        </div>
        {aside}
      </div>
      {children}
    </section>
  );
}

function CaseCard({ item }: { item: GalleryCard }) {
  const wrapperClass =
    "group overflow-hidden rounded-[30px] border border-[rgba(140,111,78,0.12)] bg-white shadow-[0_18px_40px_rgba(35,26,18,0.06)]";

  if (item.imageUrl) {
    const content = (
      <>
        <div className="overflow-hidden">
          <Image
            src={resolveUploadedImageUrl(item.imageUrl)}
            alt={item.title}
            width={800}
            height={600}
            className="aspect-[5/4] w-full object-cover transition duration-500 group-hover:scale-[1.03]"
          />
        </div>
        <div className="bg-white px-6 py-5">
          <p className="text-[11px] uppercase tracking-[0.2em] text-[#a47b45]">{item.category}</p>
          <p className="mt-3 text-lg font-medium text-[#241c15]">{item.title}</p>
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
    <div className="mt-8 flex flex-col items-center gap-4">
      <div className="text-sm text-[#7f6b57]">第 {currentPage} / {totalPages} 页</div>
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
