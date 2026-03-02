import Link from "next/link";
import Image from "next/image";
import { notFound, redirect } from "next/navigation";
import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { JsonLd } from "@/components/JsonLd";
import { previewText } from "@/lib/text";
import { RichContent } from "@/components/RichContent";
import { parseBrandStructuredHtml } from "@/lib/brand-structured";

export const revalidate = 300;

type Props = {
  params: Promise<{ subSlug: string[] }>;
};

type MarketFaq = {
  id: string;
  question: string;
  answer: string;
};

const MARKET_TITLE = "整木品牌";
const LEGACY_MARKET_TITLE = "整木市场";
const MARKET_FALLBACK_DESC = "整木品牌栏目，覆盖品牌内容与整木选购 FAQ。";
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

async function findBrandArticleBySegment(segment: string) {
  const s = normalizeSegment(segment);
  return prisma.article.findFirst({
    where: {
      status: "approved",
      OR: [{ categoryHref: { startsWith: "/brands" } }, { subHref: { startsWith: "/brands" } }],
      AND: [
        {
          OR: [{ slug: s }, { title: s }, { slug: { contains: s } }, { title: { contains: s } }],
        },
      ],
    },
    orderBy: [{ updatedAt: "desc" }],
  });
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
    return {
      title: `整木品牌 | 整木网 · ${MARKET_TITLE}`,
      description: "整木品牌子栏目，支持品牌浏览与对比。",
      openGraph: {
        title: `整木品牌 | 整木网 · ${MARKET_TITLE}`,
        description: "整木品牌子栏目，支持品牌浏览与对比。",
        type: "website",
      },
    };
  }

  if (segment === "buying" || segment === "faq") {
    const faqState = await getMarketFaqState();
    return {
      title: `整木选购 FAQ | 整木网 · ${faqState.title}`,
      description: faqState.desc,
      openGraph: {
        title: `整木选购 FAQ | 整木网 · ${faqState.title}`,
        description: faqState.desc,
        type: "website",
      },
    };
  }

  const article = await findBrandArticleBySegment(segment);
  if (!article) return { title: "品牌内容" };
  const description = previewText(article.excerpt ?? article.content, 160);
  return {
    title: `${article.title} | 整木网 · ${MARKET_TITLE}`,
    description,
    openGraph: { title: article.title, description, type: "article" },
  };
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
            <Link href="/brands/all" className="text-sm text-accent hover:underline">查看整木品牌总览</Link>
          </div>
        </section>
      </div>
    );
  }

  const article = await findBrandArticleBySegment(segment);
  if (!article || article.status !== "approved") notFound();

  const profile = parseBrandStructuredHtml(article.content ?? "");
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://example.com";
  const articleUrl = `${baseUrl}/brands/${article.slug}`;
  const articleSchema = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: article.title,
    description: previewText(article.excerpt ?? article.content, 200),
    datePublished: article.publishedAt ?? article.updatedAt,
    dateModified: article.updatedAt,
    url: articleUrl,
  };

  return (
    <article className="max-w-4xl mx-auto px-4 py-10">
      <JsonLd data={articleSchema} />

      <nav className="mb-6 text-sm text-muted" aria-label="面包屑">
        <Link href="/" className="hover:text-accent">首页</Link>
        <span className="mx-2">/</span>
        <Link href="/brands/all" className="hover:text-accent">{MARKET_TITLE}</Link>
        <span className="mx-2">/</span>
        <span className="text-primary">{article.title}</span>
      </nav>

      <h1 className="font-serif text-2xl font-bold text-primary mb-2">{article.title}</h1>
      <div className="mb-4 overflow-hidden rounded-2xl border border-border">
        <Image
          src="/images/seedance2/picture_15.jpg"
          alt=""
          width={1600}
          height={900}
          className="h-44 sm:h-56 w-full object-cover"
        />
      </div>
      <p className="text-xs text-muted mb-4">更新于 {article.updatedAt.toLocaleDateString("zh-CN")}</p>

      {article.excerpt && (
        <blockquote className="mb-5 rounded-r-lg border-l-4 border-accent bg-surface px-4 py-3 text-sm text-muted whitespace-pre-line">
          {article.excerpt}
        </blockquote>
      )}

      {profile ? (
        <section className="space-y-5">
          <div className="rounded-2xl border border-border bg-surface-elevated p-5">
            <div className="flex flex-col md:flex-row md:items-start gap-4">
              {profile.logoUrl ? (
                <img src={profile.logoUrl} alt={`${article.title} logo`} className="w-28 h-28 rounded-xl border border-border object-contain bg-white p-2" />
              ) : (
                <div className="w-28 h-28 rounded-xl border border-dashed border-border bg-surface flex items-center justify-center text-xs text-muted">
                  暂无 Logo
                </div>
              )}
              <div className="min-w-0 flex-1">
                {profile.slogan && <p className="text-sm text-primary mb-3">{profile.slogan}</p>}
                <div className="grid sm:grid-cols-2 gap-2 text-sm">
                  {profile.foundedYear && <p className="text-muted"><span className="text-primary">成立时间：</span>{profile.foundedYear}</p>}
                  {profile.headquarters && <p className="text-muted"><span className="text-primary">总部地区：</span>{profile.headquarters}</p>}
                  {profile.serviceAreas && <p className="text-muted"><span className="text-primary">服务区域：</span>{profile.serviceAreas}</p>}
                  {profile.mainProducts && <p className="text-muted"><span className="text-primary">主营品类：</span>{profile.mainProducts}</p>}
                  {profile.website && <p className="text-muted"><span className="text-primary">官网：</span>{profile.website}</p>}
                  {profile.contactPhone && <p className="text-muted"><span className="text-primary">热线：</span>{profile.contactPhone}</p>}
                </div>
              </div>
            </div>
          </div>

          {profile.modules.length > 0 && (
            <div className="grid md:grid-cols-2 gap-3">
              {profile.modules.map((m) => (
                <section key={m.id} className="rounded-xl border border-border bg-surface-elevated p-4">
                  <h2 className="text-base font-semibold text-primary">{m.title || "未命名模块"}</h2>
                  <p className="mt-2 text-sm text-muted whitespace-pre-wrap">{m.body || "暂无说明"}</p>
                </section>
              ))}
            </div>
          )}
        </section>
      ) : (
        <RichContent html={article.content} className="prose prose-neutral dark:prose-invert max-w-none" />
      )}
    </article>
  );
}

