import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import type { Metadata } from "next";
import { ContentHeroImage } from "@/components/ContentHeroImage";
import { prisma } from "@/lib/prisma";
import { articleOrderByPinnedLatest } from "@/lib/articles";
import { JsonLd } from "@/components/JsonLd";
import { previewText } from "@/lib/text";
import { RichContent } from "@/components/RichContent";
import { NewsViewTracker } from "./NewsViewTracker";
import { buildPageMetadata, getSiteUrl } from "@/lib/seo";
import { ArticleShareActions } from "@/components/ArticleShareActions";
export const revalidate = 300;

const SHARE_SITE_NAME = "中华整木网";

type Props = { params: Promise<{ slug: string }> };
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

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  if (NEWS_SUB_SLUGS.has(slug)) return { title: "整木资讯子栏目" };
  const article = await findNewsArticleBySegment(slug);
  if (!article || article.status !== "approved") return { title: "资讯" };
  const description = previewText(article.excerpt ?? article.content, 160);
  return buildPageMetadata({
    title: `${article.title} | ${SHARE_SITE_NAME}`,
    description,
    path: `/news/${article.slug}`,
    type: "article",
    siteName: SHARE_SITE_NAME,
  });
}

export default async function ArticlePage({ params }: Props) {
  const { slug } = await params;
  if (NEWS_SUB_SLUGS.has(slug)) {
    redirect(`/news/all?sub=${encodeURIComponent(`/news/${slug}`)}`);
  }
  const article = await findNewsArticleBySegment(slug);
  if (!article || article.status !== "approved") notFound();

  const baseUrl = getSiteUrl();
  const articleUrl = `${baseUrl}/news/${article.slug}`;

  const articleSchema = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: article.title,
    description: previewText(article.excerpt ?? article.content, 200),
    datePublished: article.publishedAt ?? article.updatedAt,
    dateModified: article.updatedAt,
    url: articleUrl,
  };

  const breadcrumbSchema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "首页", item: baseUrl },
      { "@type": "ListItem", position: 2, name: "整木资讯", item: `${baseUrl}/news` },
      { "@type": "ListItem", position: 3, name: article.title, item: articleUrl },
    ],
  };

  return (
    <article id="news-reading-article" className="max-w-3xl mx-auto px-4 py-10">
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
        <ArticleShareActions title={article.title} url={articleUrl} siteName={SHARE_SITE_NAME} />
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

