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
const DEFAULT_NEWS_SHARE_IMAGE = "/images/seedance2/picture_1.jpg";

type Props = {
  params: Promise<{ slug: string }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};
const NEWS_SUB_SLUGS = new Set(["trends", "enterprise", "tech", "events"]);

function normalizeSegment(raw: string) {
  let v = (raw || "").trim();
  // tolerate manually pasted encoded path segments
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
  if (NEWS_SUB_SLUGS.has(slug)) return { title: "整木资讯子栏目" };
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
    <article id="news-reading-article" className="max-w-3xl mx-auto px-4 py-10">
      <NewsUrlSync canonicalPath={buildNewsPath(article.id)} />
      <NewsViewTracker slug={article.slug} />
      <JsonLd data={articleSchema} />
      <JsonLd data={breadcrumbSchema} />

        <nav className="mb-6 text-sm text-muted" aria-label="面包屑">
          <Link href="/" className="hover:text-accent">首页</Link>
          <span className="mx-2">/</span>
          <Link href="/news" className="hover:text-accent">整木资讯</Link>
          <span className="mx-2">/</span>
          <span className="text-primary">{article.title}</span>
        </nav>

        <h1 className="font-serif text-2xl font-bold text-primary mb-2">{article.title}</h1>
        <ContentHeroImage src={article.coverImage} alt={article.title} containerClassName="mb-4 aspect-[16/9]" />
        {(article.conceptSummary || article.updatedAt) && (
          <p className="text-sm text-muted mb-4">
            {article.conceptSummary && <span>{article.conceptSummary}</span>}
            {article.updatedAt && (
              <span className="block mt-1">更新时间：{new Date(article.updatedAt).toLocaleDateString("zh-CN")}</span>
            )}
          </p>
        )}
        {article.excerpt && (
          <blockquote className="mb-5 rounded-r-lg border-l-4 border-accent bg-surface px-4 py-3 text-sm text-muted">
            {article.excerpt}
          </blockquote>
        )}
        <RichContent html={article.content} className="prose prose-neutral dark:prose-invert max-w-none" />
        <ArticleShareActions title={article.title} shareUrl={shareEntryUrl} siteName={SHARE_SITE_NAME} />
        {article.applicableScenarios && (
          <section className="mt-8 pt-6 border-t border-border">
            <h2 className="text-lg font-semibold text-primary mb-2">适用场景</h2>
            <p className="text-muted">{article.applicableScenarios}</p>
          </section>
        )}
        {article.versionLabel && <p className="mt-6 text-xs text-muted">版本：{article.versionLabel}</p>}
    </article>
  );
}

