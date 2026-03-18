import Link from "next/link";
import { notFound, permanentRedirect, redirect } from "next/navigation";
import type { Metadata } from "next";
import { ContentHeroImage } from "@/components/ContentHeroImage";
import { prisma } from "@/lib/prisma";
import { articleOrderByPinnedLatest } from "@/lib/articles";
import { JsonLd } from "@/components/JsonLd";
import { previewText } from "@/lib/text";
import { RichContent } from "@/components/RichContent";
import { NewsViewTracker } from "./NewsViewTracker";
import { NewsUrlSync } from "./NewsUrlSync";
import { buildPageMetadata } from "@/lib/seo";
import { ArticleShareActions } from "@/components/ArticleShareActions";
import { buildNewsPath, buildNewsShareEntryUrl, buildPublicNewsUrl } from "@/lib/share-config";
import { resolveUploadedImageUrl } from "@/lib/uploaded-image";

export const revalidate = 300;
export const dynamic = "force-dynamic";

const SHARE_SITE_NAME = "中华整木网";
const DEFAULT_NEWS_SHARE_IMAGE = "/api/og/news-default";
const NEWS_SUBCATEGORY_META: Record<string, { title: string; description: string }> = {
  trends: {
    title: "行业趋势",
    description: "整木资讯行业趋势栏目，聚合木作行业趋势观察与热点动态。",
  },
  enterprise: {
    title: "企业动态",
    description: "整木资讯企业动态栏目，聚合品牌新闻、企业动作与市场动态。",
  },
  tech: {
    title: "技术发展",
    description: "整木资讯技术发展栏目，聚合工艺升级、材料演进与技术创新内容。",
  },
  events: {
    title: "行业活动",
    description: "整木资讯行业活动栏目，聚合展会、峰会、论坛与行业重要事件。",
  },
};

type Props = {
  params: Promise<{ slug: string }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

const NEWS_SUB_SLUGS = new Set(["trends", "enterprise", "tech", "events"]);

function normalizeSegment(raw: string) {
  let v = (raw || "").trim();
  for (let i = 0; i < 2; i += 1) {
    try {
      const d = decodeURIComponent(v);
      if (d === v) break;
      v = d;
    } catch {
      break;
    }
  }
  return v.trim();
}

async function findNewsArticleBySegment(segment: string) {
  const s = normalizeSegment(segment);
  return prisma.article.findFirst({
    where: {
      status: "approved",
      OR: [{ categoryHref: { startsWith: "/news" } }, { subHref: { startsWith: "/news" } }],
      AND: [
        {
          OR: [
            { id: s },
            { slug: s },
            { title: s },
            { slug: { contains: s } },
            { title: { contains: s } },
          ],
        },
      ],
    },
    orderBy: articleOrderByPinnedLatest,
  });
}

function extractFirstContentImage(html: string | null | undefined) {
  if (!html) return "";
  const match = html.match(/<img[^>]+src=["']([^"']+)["']/i);
  return match?.[1]?.trim() || "";
}

function resolveArticleShareImage(article: { coverImage?: string | null; content?: string | null }) {
  const candidates = [
    resolveUploadedImageUrl(article.coverImage),
    resolveUploadedImageUrl(extractFirstContentImage(article.content)),
    DEFAULT_NEWS_SHARE_IMAGE,
  ];

  return candidates.find((value) => Boolean(value && value.trim())) || DEFAULT_NEWS_SHARE_IMAGE;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  if (NEWS_SUB_SLUGS.has(slug)) {
    const subMeta = NEWS_SUBCATEGORY_META[slug];
    return buildPageMetadata({
      title: subMeta?.title ?? "整木资讯子栏目",
      description: subMeta?.description ?? "整木资讯子栏目",
      path: `/news/${slug}`,
      type: "website",
      image: DEFAULT_NEWS_SHARE_IMAGE,
    });
  }

  const article = await findNewsArticleBySegment(slug);
  if (!article || article.status !== "approved") return { title: "资讯" };
  const description = previewText(article.excerpt ?? article.content, 160);
  const image = resolveArticleShareImage(article);
  return buildPageMetadata({
    title: article.title,
    description,
    path: buildNewsPath(article.id),
    type: "article",
    siteName: SHARE_SITE_NAME,
    image,
  });
}

function getSearchParamValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function ArticlePage({ params, searchParams }: Props) {
  const { slug } = await params;
  if (NEWS_SUB_SLUGS.has(slug)) {
    redirect(`/news/all?sub=${encodeURIComponent(`/news/${slug}`)}`);
  }

  const article = await findNewsArticleBySegment(slug);
  if (!article || article.status !== "approved") notFound();

  const currentSegment = normalizeSegment(slug);
  if (currentSegment !== article.id) {
    const nextSearchParams = searchParams ? await searchParams : {};
    const shareVersion = getSearchParamValue(nextSearchParams.sharev);
    const target = new URL(buildNewsPath(article.id), "https://dummy.local");
    if (shareVersion) target.searchParams.set("sharev", shareVersion);
    permanentRedirect(`${target.pathname}${target.search}`);
  }

  const articleUrl = buildPublicNewsUrl(article.id);
  const shareEntryUrl = buildNewsShareEntryUrl(article.id);
  const publicBaseUrl = articleUrl.replace(/\/news\/.*$/, "");
  const articleShareImage = resolveArticleShareImage(article);

  const articleSchema = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: article.title,
    description: previewText(article.excerpt ?? article.content, 200),
    datePublished: article.publishedAt ?? article.updatedAt,
    dateModified: article.updatedAt,
    url: articleUrl,
    image: [articleShareImage.startsWith("http") ? articleShareImage : `${publicBaseUrl}${articleShareImage}`],
  };

  const breadcrumbSchema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "首页", item: publicBaseUrl },
      { "@type": "ListItem", position: 2, name: "整木资讯", item: `${publicBaseUrl}/news` },
      { "@type": "ListItem", position: 3, name: article.title, item: articleUrl },
    ],
  };

  return (
    <article id="news-reading-article" className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-12">
      <NewsUrlSync canonicalPath={buildNewsPath(article.id)} />
      <NewsViewTracker slug={article.slug} />
      <JsonLd data={articleSchema} />
      <JsonLd data={breadcrumbSchema} />

      <div className="mx-auto max-w-[940px]">
        <nav className="mb-8 flex flex-wrap items-center gap-x-2 gap-y-2 text-sm text-muted" aria-label="面包屑">
          <Link href="/" className="hover:text-accent">首页</Link>
          <span>/</span>
          <Link href="/news" className="hover:text-accent">整木资讯</Link>
          <span>/</span>
          <span className="line-clamp-1 text-primary">{article.title}</span>
        </nav>

        <header className="rounded-[30px] border border-[rgba(15,23,42,0.08)] bg-[linear-gradient(180deg,rgba(255,255,255,0.9),rgba(246,248,251,0.92))] px-5 py-6 shadow-[0_32px_64px_-52px_rgba(15,23,42,0.4)] sm:px-8 sm:py-8">
          <div className="flex flex-wrap items-center gap-3 text-[11px] uppercase tracking-[0.22em] text-muted">
            <span className="rounded-full border border-border bg-white/80 px-3 py-1">News</span>
            {article.updatedAt ? <span>{new Date(article.updatedAt).toLocaleDateString("zh-CN")}</span> : null}
          </div>

          <h1 className="mt-5 max-w-[16ch] font-serif text-[2.15rem] font-semibold leading-[1.18] tracking-[-0.015em] text-primary sm:text-[3.25rem]">
            {article.title}
          </h1>

          {article.conceptSummary ? (
            <p className="mt-5 max-w-2xl text-[15px] leading-7 text-muted sm:text-base">
              {article.conceptSummary}
            </p>
          ) : null}
        </header>

        <div className="mt-7">
          <ContentHeroImage
            src={article.coverImage}
            alt={article.title}
            containerClassName="mx-auto aspect-[16/10] max-w-[860px] rounded-[32px] border border-[rgba(15,23,42,0.08)] bg-[linear-gradient(180deg,rgba(255,255,255,0.92),rgba(245,247,250,0.95))] p-2.5 shadow-[0_34px_68px_-54px_rgba(15,23,42,0.42)] sm:aspect-[16/9]"
            imageClassName="rounded-[24px] object-cover object-center p-0"
          />
        </div>

        <div className="mt-8 flex flex-wrap items-center gap-3 text-sm text-muted">
          <span className="rounded-full border border-border bg-white/80 px-3 py-1.5">资讯栏目</span>
          {article.updatedAt ? (
            <span className="rounded-full border border-border bg-white/80 px-3 py-1.5">
              更新于 {new Date(article.updatedAt).toLocaleDateString("zh-CN")}
            </span>
          ) : null}
          {article.versionLabel ? (
            <span className="rounded-full border border-border bg-white/80 px-3 py-1.5">版本 {article.versionLabel}</span>
          ) : null}
        </div>

        {article.excerpt ? (
          <blockquote className="mt-7 rounded-[26px] border border-[rgba(10,132,255,0.1)] bg-[linear-gradient(180deg,rgba(255,255,255,0.78),rgba(243,247,252,0.88))] px-5 py-5 text-[15px] leading-8 text-muted shadow-[0_24px_54px_-48px_rgba(10,132,255,0.55)] sm:px-7">
            {article.excerpt}
          </blockquote>
        ) : null}

        <div className="mt-8 rounded-[30px] border border-[rgba(15,23,42,0.08)] bg-[rgba(255,255,255,0.82)] px-5 py-7 shadow-[0_28px_60px_-52px_rgba(15,23,42,0.32)] backdrop-blur-[10px] sm:px-8 sm:py-9">
          <RichContent html={article.content} className="prose prose-neutral dark:prose-invert max-w-none" />
        </div>

        <ArticleShareActions title={article.title} shareUrl={shareEntryUrl} siteName={SHARE_SITE_NAME} />

        {article.applicableScenarios ? (
          <section className="mt-10 rounded-[28px] border border-border bg-[rgba(255,255,255,0.75)] px-5 py-6 shadow-[0_24px_54px_-50px_rgba(15,23,42,0.28)] sm:px-7">
            <h2 className="mb-2 text-lg font-semibold text-primary">适用场景</h2>
            <p className="leading-7 text-muted">{article.applicableScenarios}</p>
          </section>
        ) : null}
      </div>
    </article>
  );
}
