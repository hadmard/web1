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
import { prisma } from "@/lib/prisma";
import { articleOrderByPinnedLatest } from "@/lib/articles";

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

const NEWS_SUBCATEGORY_HREFS: Record<string, string> = {
  trends: "/news/trends",
  enterprise: "/news/enterprise",
  tech: "/news/tech",
  events: "/news/events",
};

const NEWS_SECTION_LABELS: Record<string, string> = {
  "/news/trends": "行业趋势",
  "/news/enterprise": "企业动态",
  "/news/tech": "技术发展",
  "/news/events": "行业活动",
  "/news": "整木资讯",
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
    imageAlt: article.title,
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

function resolveNewsSectionLabel(subHref?: string | null, categoryHref?: string | null) {
  const href = (subHref || categoryHref || "").trim();
  return NEWS_SECTION_LABELS[href] ?? "整木资讯";
}

function parseKeywordList(tagSlugs?: string | null, title?: string | null) {
  const base = (tagSlugs || "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);

  if (title?.trim()) {
    base.unshift(title.trim());
  }

  return Array.from(new Set(base)).slice(0, 12);
}

export default async function ArticlePage({ params, searchParams }: Props) {
  const { slug } = await params;
  if (NEWS_SUB_SLUGS.has(slug)) {
    const subMeta = NEWS_SUBCATEGORY_META[slug];
    const subHref = NEWS_SUBCATEGORY_HREFS[slug];
    const siblingLinks = Object.entries(NEWS_SUBCATEGORY_META).map(([key, meta]) => ({
      href: `/news/${key}`,
      title: meta.title,
      active: key === slug,
    }));
    const items = await prisma.article.findMany({
      where: {
        status: "approved",
        OR: [{ subHref }, { categoryHref: subHref }],
      },
      orderBy: articleOrderByPinnedLatest,
      take: 24,
      select: {
        id: true,
        title: true,
        slug: true,
        excerpt: true,
        publishedAt: true,
        updatedAt: true,
      },
    });

    return (
      <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 sm:py-12">
        <nav className="mb-8 flex flex-wrap items-center gap-x-2 gap-y-2 text-sm text-muted" aria-label="面包屑">
          <Link href="/" className="hover:text-accent">首页</Link>
          <span>/</span>
          <Link href="/news" className="hover:text-accent">整木资讯</Link>
          <span>/</span>
          <span className="text-primary">{subMeta.title}</span>
        </nav>

        <section className="glass-panel relative overflow-hidden p-5 sm:p-7 lg:p-9">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(212,194,158,0.18),transparent_34%),radial-gradient(circle_at_bottom_right,rgba(207,221,236,0.18),transparent_30%)]" />
          <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-[linear-gradient(90deg,transparent,rgba(194,182,154,0.58),transparent)]" />
          <div className="relative">
            <div className="max-w-3xl">
              <h1 className="font-serif text-[2rem] font-semibold tracking-[-0.02em] text-primary sm:text-[2.7rem] lg:text-[3.3rem]">
                {subMeta.title}
              </h1>
              <p className="mt-3 max-w-[46rem] text-[15px] leading-8 text-muted sm:mt-4 sm:text-[15px]">
                {subMeta.description}
              </p>
              <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="text-xs font-medium uppercase tracking-[0.12em] text-[#9a8560]">
                  {"\u680f\u76ee\u5185\u641c\u7d22"}
                </div>
                <Link
                  href={`/news/all?sub=${encodeURIComponent(subHref)}&search=1`}
                  className="group inline-flex w-full items-center justify-center gap-2 rounded-full border border-[rgba(194,182,154,0.34)] bg-[linear-gradient(180deg,rgba(255,252,246,0.98),rgba(246,240,231,0.94))] px-4 py-3 text-sm font-medium text-primary shadow-[0_16px_34px_-26px_rgba(180,154,107,0.42),inset_0_1px_0_rgba(255,255,255,0.92)] transition-all duration-200 hover:-translate-y-0.5 hover:border-[rgba(170,154,122,0.46)] hover:text-accent sm:w-auto sm:px-5 sm:py-2.5"
                >
                  <svg viewBox="0 0 20 20" className="h-4 w-4 text-[#9a8256] transition-transform duration-200 group-hover:scale-105" fill="none" aria-hidden="true">
                    <circle cx="8.5" cy="8.5" r="4.75" stroke="currentColor" strokeWidth="1.5" />
                    <path d="M12.2 12.2 16 16" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                  </svg>
                  <span>{"\u641c\u7d22\u672c\u680f\u76ee"}</span>
                </Link>
              </div>
            </div>
          </div>

          <div className="relative mt-6 flex flex-wrap items-center gap-2.5 border-t border-[rgba(194,182,154,0.18)] pt-4 sm:mt-8 sm:pt-5">
            {siblingLinks.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`min-w-[calc(50%-0.3125rem)] justify-center rounded-full border px-3.5 py-2 text-sm transition-colors sm:min-w-0 sm:justify-start sm:px-3.5 sm:py-1.5 ${
                  item.active
                    ? "border-[rgba(180,154,107,0.42)] bg-[linear-gradient(180deg,rgba(255,252,246,0.96),rgba(246,240,231,0.94))] text-[#8a734d] shadow-[0_10px_22px_rgba(180,154,107,0.12)]"
                    : "border-border bg-white/72 text-muted hover:text-primary"
                }`}
              >
                {item.title}
              </Link>
            ))}
          </div>
        </section>

        <section className="mt-8 rounded-[28px] border border-border bg-[rgba(255,255,255,0.82)] p-5 sm:p-6">
          {items.length === 0 ? (
            <p className="text-sm text-muted">当前栏目还没有已发布内容。</p>
          ) : (
            <ul className="grid gap-4">
              {items.map((item) => (
                <li key={item.id} className="rounded-[22px] border border-border bg-surface-elevated p-4 sm:p-6">
                  <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between sm:gap-3">
                    <div className="flex items-center gap-2 text-xs uppercase tracking-[0.08em] text-muted">
                      <span className="inline-block h-1.5 w-1.5 rounded-full bg-[rgba(180,154,107,0.86)]" />
                      <span>{subMeta.title}</span>
                    </div>
                    <span className="text-xs text-muted">
                      {(item.publishedAt ?? item.updatedAt).toLocaleDateString("zh-CN")}
                    </span>
                  </div>
                  <Link href={buildNewsPath(item.id)} className="mt-2 block text-[1rem] font-medium leading-8 text-primary hover:text-accent sm:mt-3 sm:text-[1.1rem]">
                    {item.title}
                  </Link>
                  {item.excerpt ? (
                    <p className="mt-2 line-clamp-3 text-sm leading-7 text-muted sm:mt-3">
                      {item.excerpt}
                    </p>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    );
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
  const articleSection = resolveNewsSectionLabel(article.subHref, article.categoryHref);
  const keywords = parseKeywordList(article.tagSlugs, article.title);

  const articleSchema = {
    "@context": "https://schema.org",
    "@type": "Article",
    "@id": `${articleUrl}#article`,
    headline: article.title,
    description: previewText(article.excerpt ?? article.content, 200),
    author: article.displayAuthor ? [{ "@type": "Person", name: article.displayAuthor }] : undefined,
    datePublished: article.publishedAt ?? article.updatedAt,
    dateModified: article.updatedAt,
    inLanguage: "zh-CN",
    url: articleUrl,
    mainEntityOfPage: articleUrl,
    publisher: { "@id": `${publicBaseUrl}/#organization` },
    articleSection,
    keywords: keywords.length > 0 ? keywords.join(", ") : undefined,
    thumbnailUrl: articleShareImage.startsWith("http") ? articleShareImage : `${publicBaseUrl}${articleShareImage}`,
    isAccessibleForFree: true,
    image: [
      {
        "@type": "ImageObject",
        url: articleShareImage.startsWith("http") ? articleShareImage : `${publicBaseUrl}${articleShareImage}`,
        caption: article.title,
        representativeOfPage: true,
      },
    ],
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
          <span className="max-w-full truncate text-primary/72 sm:max-w-[36rem]">{article.title}</span>
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
            <span>发布时间：{new Date(article.publishedAt ?? article.updatedAt).toLocaleDateString("zh-CN")}</span>
            {article.displayAuthor ? <span>作者：{article.displayAuthor}</span> : null}
            {article.source ? (
              article.sourceUrl ? (
                <a href={article.sourceUrl} target="_blank" rel="noreferrer" className="transition-colors hover:text-accent">
                  来源：{article.source}
                </a>
              ) : (
                <span>来源：{article.source}</span>
              )
            ) : null}
            {article.updatedAt ? <span>更新：{new Date(article.updatedAt).toLocaleDateString("zh-CN")}</span> : null}
            {article.versionLabel ? <span>版本：{article.versionLabel}</span> : null}
          </div>
        </header>

        <div className="mt-8 sm:mt-9">
          <div className="overflow-hidden rounded-[30px] border border-[rgba(194,182,154,0.2)] bg-[linear-gradient(180deg,rgba(255,254,251,0.98),rgba(248,244,238,0.92))] shadow-[0_30px_60px_-42px_rgba(15,23,42,0.22)]">
            <ContentHeroImage
              src={article.coverImage}
              alt={article.title}
              containerClassName="aspect-[16/10] rounded-[30px] border-0 bg-transparent p-0 sm:aspect-[16/9]"
              imageClassName="rounded-[30px] object-cover object-center"
            />
          </div>
        </div>

        {article.excerpt ? (
          <blockquote className="mt-5 rounded-[26px] border border-[rgba(194,182,154,0.18)] bg-[linear-gradient(180deg,rgba(255,253,249,0.94),rgba(249,245,238,0.9))] px-6 py-5 text-[15px] leading-8 text-muted shadow-[0_18px_42px_-36px_rgba(15,23,42,0.16)] sm:px-7">
            {article.excerpt}
          </blockquote>
        ) : null}

        <div className="mt-8 rounded-[26px] border border-[rgba(194,182,154,0.22)] bg-[linear-gradient(180deg,rgba(255,253,249,0.98),rgba(248,244,237,0.95))] px-6 py-8 shadow-[0_24px_48px_-40px_rgba(15,23,42,0.2)] sm:px-8 sm:py-9">
          <RichContent html={article.content} className="prose prose-neutral dark:prose-invert max-w-none" />
          <div className="mt-5 pt-1 sm:mt-6 sm:pt-2">
            <ArticleShareActions
              title={article.title}
              shareUrl={shareEntryUrl}
              siteName={SHARE_SITE_NAME}
              className="mt-0"
            />
          </div>
        </div>

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
