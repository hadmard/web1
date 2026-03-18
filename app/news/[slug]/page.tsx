import Link from "next/link";
import { notFound, permanentRedirect, redirect } from "next/navigation";
import type { Metadata } from "next";
import { ContentHeroImage } from "@/components/ContentHeroImage";
import { JsonLd } from "@/components/JsonLd";
import { previewText } from "@/lib/text";
import { RichContent } from "@/components/RichContent";
import { NewsViewTracker } from "./NewsViewTracker";
import { NewsUrlSync } from "./NewsUrlSync";
import { buildPageMetadata } from "@/lib/seo";
import { ArticleShareActions } from "@/components/ArticleShareActions";
import { buildNewsPath, buildNewsShareEntryUrl, buildPublicNewsUrl } from "@/lib/share-config";
import { resolveUploadedImageUrl } from "@/lib/uploaded-image";
import { DEFAULT_NEWS_SHARE_IMAGE, findNewsArticleBySegment, normalizeNewsSegment, resolveArticleShareImage } from "@/lib/news-sharing";

export const revalidate = 300;
export const dynamic = "force-dynamic";

const SHARE_SITE_NAME = "中华整木网";
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

function getHeadlineClass(title: string) {
  const length = title.trim().length;

  if (length >= 34) {
    return "max-w-none text-[1.68rem] leading-[1.34] tracking-[-0.008em] [text-wrap:balance] sm:max-w-[26ch] sm:text-[2.1rem]";
  }

  if (length >= 24) {
    return "max-w-none text-[1.76rem] leading-[1.31] tracking-[-0.01em] [text-wrap:balance] sm:max-w-[24ch] sm:text-[2.28rem]";
  }

  return "max-w-none text-[1.88rem] leading-[1.26] tracking-[-0.012em] [text-wrap:balance] sm:max-w-[22ch] sm:text-[2.6rem]";
}

export default async function ArticlePage({ params, searchParams }: Props) {
  const { slug } = await params;
  if (NEWS_SUB_SLUGS.has(slug)) {
    redirect(`/news/all?sub=${encodeURIComponent(`/news/${slug}`)}`);
  }

  const article = await findNewsArticleBySegment(slug);
  if (!article || article.status !== "approved") notFound();

  const currentSegment = normalizeNewsSegment(slug);
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
    <article id="news-reading-article" className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-12">
      <NewsUrlSync canonicalPath={buildNewsPath(article.id)} />
      <NewsViewTracker slug={article.slug} />
      <JsonLd data={articleSchema} />
      <JsonLd data={breadcrumbSchema} />

      <div className="mx-auto max-w-[860px]">
        <nav className="mb-8 flex flex-wrap items-center gap-x-2 gap-y-2 text-sm text-muted" aria-label="面包屑">
          <Link href="/" className="hover:text-accent">首页</Link>
          <span>/</span>
          <Link href="/news" className="hover:text-accent">整木资讯</Link>
          <span>/</span>
          <span className="line-clamp-1 text-primary">{article.title}</span>
        </nav>

        <header className="px-1 sm:px-0">
          <h1 className={`${getHeadlineClass(article.title)} font-serif font-semibold text-primary`}>
            {article.title}
          </h1>

          {article.conceptSummary ? (
            <p className="mt-5 max-w-[42rem] text-[15px] leading-7 text-muted sm:text-base">
              {article.conceptSummary}
            </p>
          ) : null}

          <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-muted">
            {article.updatedAt ? <span>更新时间：{new Date(article.updatedAt).toLocaleDateString("zh-CN")}</span> : null}
            {article.versionLabel ? <span>版本：{article.versionLabel}</span> : null}
          </div>
        </header>

        <div className="mt-8">
          <ContentHeroImage
            src={article.coverImage}
            alt={article.title}
            containerClassName="aspect-[16/10] rounded-[24px] border border-border bg-surface-elevated p-2 sm:aspect-[16/9]"
            imageClassName="rounded-[18px] object-cover object-center p-0"
          />
        </div>

        {article.excerpt ? (
          <blockquote className="mt-7 rounded-r-2xl border-l-[3px] border-accent/80 bg-surface px-5 py-4 text-[15px] leading-8 text-muted sm:px-6">
            {article.excerpt}
          </blockquote>
        ) : null}

        <div className="mt-8 rounded-[24px] border border-border bg-surface-elevated px-5 py-7 sm:px-7 sm:py-8">
          <RichContent html={article.content} className="prose prose-neutral dark:prose-invert max-w-none" />
        </div>

        <ArticleShareActions title={article.title} shareUrl={shareEntryUrl} siteName={SHARE_SITE_NAME} />

        {article.applicableScenarios ? (
          <section className="mt-10 rounded-[24px] border border-border bg-surface-elevated px-5 py-6 sm:px-7">
            <h2 className="mb-2 text-lg font-semibold text-primary">适用场景</h2>
            <p className="leading-7 text-muted">{article.applicableScenarios}</p>
          </section>
        ) : null}
      </div>
    </article>
  );
}
