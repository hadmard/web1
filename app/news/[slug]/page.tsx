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

        <section className="glass-panel overflow-hidden p-7 sm:p-9">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-3xl">
              <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-[#8c7650]">News Channel</p>
              <h1 className="mt-3 font-serif text-[2.2rem] font-semibold tracking-tight text-primary sm:text-[3rem]">
                {subMeta.title}
              </h1>
              <p className="mt-4 text-sm leading-7 text-muted sm:text-[15px]">
                {subMeta.description}
              </p>
            </div>

            <div className="inline-flex w-fit items-center rounded-full border border-[rgba(194,182,154,0.26)] bg-[linear-gradient(180deg,rgba(255,252,246,0.98),rgba(246,240,231,0.94))] px-4 py-2 text-sm text-[#7d6846] shadow-[0_10px_24px_rgba(15,23,42,0.05),inset_0_1px_0_rgba(255,255,255,0.92)]">
              共 {items.length} 篇资讯
            </div>
          </div>

          <div className="mt-7 flex flex-wrap items-center gap-2.5">
            {siblingLinks.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`rounded-full border px-3.5 py-1.5 text-sm transition-colors ${
                  item.active
                    ? "border-[rgba(180,154,107,0.42)] bg-[rgba(255,255,255,0.88)] text-[#8a734d] shadow-[0_8px_22px_rgba(180,154,107,0.12)]"
                    : "border-border bg-white/70 text-muted hover:text-primary"
                }`}
              >
                {item.title}
              </Link>
            ))}
            <Link
              href={`/news/all?sub=${encodeURIComponent(subHref)}`}
              className="ml-auto inline-flex items-center rounded-full border border-border bg-white/72 px-4 py-2 text-sm text-primary transition-colors hover:border-accent/45 hover:text-accent"
            >
              高级筛选
            </Link>
          </div>
        </section>

        <section className="mt-8 rounded-[28px] border border-border bg-[rgba(255,255,255,0.82)] p-5 sm:p-6">
          {items.length === 0 ? (
            <p className="text-sm text-muted">当前栏目还没有已发布内容。</p>
          ) : (
            <ul className="grid gap-4">
              {items.map((item) => (
                <li key={item.id} className="rounded-[22px] border border-border bg-surface-elevated p-5 sm:p-6">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-2 text-xs uppercase tracking-[0.08em] text-muted">
                      <span className="inline-block h-1.5 w-1.5 rounded-full bg-[rgba(180,154,107,0.86)]" />
                      <span>{subMeta.title}</span>
                    </div>
                    <span className="text-xs text-muted">
                      {(item.publishedAt ?? item.updatedAt).toLocaleDateString("zh-CN")}
                    </span>
                  </div>
                  <Link href={buildNewsPath(item.id)} className="mt-3 block text-[1.1rem] font-medium leading-8 text-primary hover:text-accent">
                    {item.title}
                  </Link>
                  {item.excerpt ? (
                    <p className="mt-3 line-clamp-3 text-sm leading-7 text-muted">
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
