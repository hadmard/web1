import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { buildPageMetadata } from "@/lib/seo";
import { RichContent } from "@/components/RichContent";
import { EntityArticleList } from "@/components/entity-profile/EntityArticleList";
import { EntityContactCard } from "@/components/entity-profile/EntityContactCard";
import { EntityHero } from "@/components/entity-profile/EntityHero";
import { EntityRelationCard } from "@/components/entity-profile/EntityRelationCard";
import { EntitySummary } from "@/components/entity-profile/EntitySummary";
import { ProfilePageTemplate } from "@/components/entity-profile/ProfilePageTemplate";
import { getBrandDirectoryBySlug } from "@/lib/brand-directory";
import { articleOrderByPinnedLatest } from "@/lib/articles";
import { mapEntityArticlesToListItems, mapEntityGalleryToListItems } from "@/lib/entity-profile-content";
import { resolveUploadedImageUrl } from "@/lib/uploaded-image";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type Props = {
  params: Promise<{ subSlug: string[] }>;
};

type MarketFaq = {
  id: string;
  question: string;
  answer: string;
};

const MARKET_TITLE = "整木市场";
const LEGACY_MARKET_TITLE = "整木品牌";
const MARKET_FALLBACK_DESC = "整木市场栏目，覆盖品牌内容与整木选购 FAQ。";
const MARKET_FAQ_FALLBACK: MarketFaq[] = [
  {
    id: "faq-1",
    question: "整木选购应该先看什么？",
    answer: "先明确预算、空间风格和交付周期，再对比品牌的材料体系、工艺标准和售后能力。",
  },
  {
    id: "faq-2",
    question: "如何判断品牌是否适合本地交付？",
    answer: "建议优先查看服务区域、安装团队配置和本地案例，确认量尺、生产、安装各环节响应时间。",
  },
  {
    id: "faq-3",
    question: "选购阶段最容易忽略哪些问题？",
    answer: "常见遗漏包括合同交付范围、增项规则、安装验收标准和售后质保条款，建议在下单前逐条确认。",
  },
];

function normalizeMarketTitle(input?: string | null) {
  const value = input?.trim();
  if (!value || value === LEGACY_MARKET_TITLE) return MARKET_TITLE;
  return value;
}

function normalizeSegment(raw: string) {
  let value = (raw || "").trim();
  for (let i = 0; i < 2; i += 1) {
    try {
      const decoded = decodeURIComponent(value);
      if (decoded === value) break;
      value = decoded;
    } catch {
      break;
    }
  }
  return value.trim();
}

async function findBrandBySegment(segment: string) {
  const s = normalizeSegment(segment);
  return getBrandDirectoryBySlug(s);
}

async function getMarketFaqState() {
  const category = await prisma.category.findFirst({
    where: { href: "/brands" },
    include: {
      faqs: { orderBy: { sortOrder: "asc" } },
    },
  });

  const title = normalizeMarketTitle(category?.title);
  const desc = category?.desc?.trim() || MARKET_FALLBACK_DESC;
  const faqs =
    category?.faqs
      .filter((item) => item.question.trim() && item.answer.trim())
      .map((item) => ({ id: item.id, question: item.question.trim(), answer: item.answer.trim() })) ?? [];

  return {
    title,
    desc,
    faqs: faqs.length > 0 ? faqs : MARKET_FAQ_FALLBACK,
  };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { subSlug } = await params;
  if (!subSlug || subSlug.length !== 1) return { title: MARKET_TITLE };

  const segment = normalizeSegment(subSlug[0]);
  if (segment === "all") return { title: `${MARKET_TITLE}总览` };

  if (segment === "brand") {
    return buildPageMetadata({
      title: `整木品牌 | 中华整木网 · ${MARKET_TITLE}`,
      description: "整木品牌子栏目，支持品牌浏览与对比。",
      path: "/brands/all",
    });
  }

  if (segment === "buying" || segment === "faq") {
    const faqState = await getMarketFaqState();
    return buildPageMetadata({
      title: `整木选购 FAQ | 中华整木网 · ${faqState.title}`,
      description: faqState.desc,
      path: "/brands/faq",
    });
  }

  const brand = await findBrandBySegment(segment);
  if (brand) {
    return buildPageMetadata({
      title: `${brand.enterpriseName} | 中华整木网 · ${MARKET_TITLE}`,
      description: brand.summary,
      path: `/brands/${brand.slug}`,
      image: brand.logoUrl ? resolveUploadedImageUrl(brand.logoUrl) : undefined,
      imageAlt: brand.enterpriseName,
    });
  }
  return { title: "品牌内容" };
}

export default async function BrandDetailPage({ params }: Props) {
  const { subSlug } = await params;
  if (!subSlug || subSlug.length !== 1) notFound();

  const segment = normalizeSegment(subSlug[0]);
  if (segment === "all") {
    redirect("/brands/all");
  }

  if (segment === "brand") {
    redirect("/brands/all");
  }

  if (segment === "buying" || segment === "faq") {
    const faqState = await getMarketFaqState();
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-10">
        <nav className="mb-6 text-sm text-muted" aria-label="面包屑">
          <Link href="/" className="hover:text-accent">首页</Link>
          <span className="mx-2">/</span>
          <Link href="/brands" className="hover:text-accent">{faqState.title}</Link>
          <span className="mx-2">/</span>
          <span className="text-primary">整木选购</span>
        </nav>

        <section className="glass-panel p-6 sm:p-7">
          <h1 className="font-serif text-2xl sm:text-3xl font-semibold text-primary">整木选购 FAQ</h1>
          <p className="mt-2 text-sm text-muted">{faqState.desc}</p>

          <div className="mt-6 space-y-3">
            {faqState.faqs.map((item, index) => (
              <article key={item.id} className="rounded-xl border border-border bg-surface-elevated p-4">
                <h2 className="text-base font-semibold text-primary">Q{index + 1}：{item.question}</h2>
                <p className="mt-2 text-sm text-muted leading-7">{item.answer}</p>
              </article>
            ))}
          </div>

          <div className="mt-6">
            <Link href="/brands/all" className="apple-inline-link">查看整木市场总览</Link>
          </div>
        </section>
      </div>
    );
  }

  const brand = await findBrandBySegment(segment);
  if (!brand) notFound();

  const relatedMemberId = brand.enterprise?.memberId ?? null;
  const [relatedArticles, relatedGallery] = relatedMemberId
    ? await Promise.all([
        prisma.article.findMany({
          where: {
            status: "approved",
            OR: [{ authorMemberId: relatedMemberId }, { relatedBrandIds: { contains: brand.id } }],
          },
          orderBy: articleOrderByPinnedLatest,
          take: 4,
          select: {
            id: true,
            title: true,
            slug: true,
            excerpt: true,
            categoryHref: true,
            subHref: true,
            publishedAt: true,
            createdAt: true,
          },
        }),
        prisma.galleryImage.findMany({
          where: { authorMemberId: relatedMemberId, status: "approved" },
          orderBy: [{ sortOrder: "desc" }, { createdAt: "desc" }],
          take: 2,
          select: {
            id: true,
            title: true,
            category: true,
            imageUrl: true,
            createdAt: true,
          },
        }),
      ])
    : [[], []];

  const contactItems = [
    brand.contactPhone ? { label: "联系电话", value: brand.contactPhone, href: brand.contactHref } : null,
    brand.website ? { label: "品牌官网", value: brand.website, href: brand.website } : null,
    brand.contactInfo ? { label: "联系说明", value: brand.contactInfo } : null,
  ].filter(Boolean) as Array<{ label: string; value: string; href?: string | null }>;

  const relationItems = [
    { label: "品牌名称", value: brand.enterpriseName },
    { label: "服务区域", value: brand.locationLabel },
    { label: "主营方向", value: brand.serviceLine },
    { label: "联系动作", value: brand.contactLabel },
  ];
  const enterpriseRelationItems = brand.enterprise
    ? [
        {
          label: "所属企业",
          value: brand.enterprise.companyShortName || brand.enterprise.companyName || brand.enterpriseName,
          href: `/enterprise/${brand.enterprise.id}`,
        },
        {
          label: "会员类型",
          value: brand.memberType,
        },
      ]
    : [
        {
          label: "所属企业",
          value: "当前未绑定企业主体",
        },
        {
          label: "展示模式",
          value: "品牌独立展示",
        },
      ];

  const brandBlocks = [brand.summary, brand.serviceLine, brand.locationLabel]
    .filter(Boolean)
    .slice(0, 2);
  const contentItems = [
    ...mapEntityGalleryToListItems(relatedGallery, brand.enterprise ? `/enterprise/${brand.enterprise.id}#gallery-section` : `/brands/${brand.slug}`),
    ...mapEntityArticlesToListItems(relatedArticles),
  ].slice(0, 6);

  return (
    <ProfilePageTemplate
      breadcrumbs={[
        { label: "首页", href: "/" },
        { label: MARKET_TITLE, href: "/brands" },
        { label: brand.enterpriseName },
      ]}
      hero={
        <EntityHero
          eyebrow={`Brand Detail · ${brand.locationLabel}`}
          title={brand.enterpriseName}
          subtitle={brand.headline}
          summary={brand.summary}
          meta={[`更新于 ${new Date(brand.updatedAt).toLocaleDateString("zh-CN")}`, brand.serviceLine]}
          badges={brand.highlights}
          logoUrl={brand.logoUrl ? resolveUploadedImageUrl(brand.logoUrl) : null}
          imageAlt={brand.enterpriseName}
        />
      }
    >
      <EntitySummary
        eyebrow="Brand Story"
        title="关于品牌"
        statement={brand.headline}
        summary={brand.summary}
        blocks={brandBlocks}
        aside={
          <>
            <EntityRelationCard
              eyebrow="Brand Snapshot"
              title="品牌概览"
              description="统一展示品牌身份、服务范围与当前联系入口。"
              items={relationItems}
            />
            <EntityRelationCard
              eyebrow="Entity Relation"
              title="关联信息"
              description="品牌页只展示 Brand 主体，这里补充它与企业主体之间的正式关系。"
              items={enterpriseRelationItems}
            />
          </>
        }
        detailTitle="展开完整品牌介绍"
        detailContent={
          brand.summaryRichText ? (
            <RichContent html={brand.summaryRichText} className="prose prose-neutral max-w-none text-[#4f4134]" />
          ) : (
            <p className="text-sm leading-8 text-[#4f4134]">{brand.summary}</p>
          )
        }
      />

      {contentItems.length > 0 ? (
        <EntityArticleList
          title="品牌内容"
          eyebrow="Content Feed"
          description="统一聚合品牌相关的案例、新闻与动态，保持 Brand 主体展示不变。"
          items={contentItems}
        />
      ) : null}

      {contactItems.length > 0 ? (
        <EntityContactCard
          title="联系品牌"
          intro="如果你正在筛选品牌、咨询合作或了解更完整的品牌资料，可以通过下方方式继续沟通。"
          items={contactItems}
          note={brand.contactHref ? "支持电话或官网进一步了解品牌信息。" : "当前展示的是公开联系信息。"}
        />
      ) : null}
    </ProfilePageTemplate>
  );
}

