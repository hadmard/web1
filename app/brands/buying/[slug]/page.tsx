import Link from "next/link";
import { notFound, permanentRedirect } from "next/navigation";
import type { Metadata } from "next";
import { ArticleViewTracker } from "@/components/ArticleViewTracker";
import { prisma } from "@/lib/prisma";
import { buildPageMetadata } from "@/lib/seo";
import { composeIntentTitle } from "@/lib/compose-intent-title";
import { RichContent } from "@/components/RichContent";
import { decodeEscapedUnicode, previewText } from "@/lib/text";
import { resolveUploadedImageUrl } from "@/lib/uploaded-image";
import {
  BUYING_SUMMARY_TITLE,
  findBuyingSummaryArticle,
  hasBuyingSummaryLink,
  isBuyingSummaryArticle,
} from "@/lib/buying-summary";
import { buildBuyingPath } from "@/lib/share-config";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type Props = {
  params: Promise<{ slug: string }>;
};

const BUYING_ARTICLE_SELECT = {
  id: true,
  title: true,
  slug: true,
  excerpt: true,
  content: true,
  coverImage: true,
  source: true,
  sourceUrl: true,
  sourceType: true,
  displayAuthor: true,
  tagSlugs: true,
  publishedAt: true,
  updatedAt: true,
} as const;

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

function normalizeBuyingSlugAlias(value?: string | null) {
  return normalizeSegment(value || "")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "")
    .toLowerCase();
}

async function findBuyingArticleBySegment(segment: string) {
  const s = normalizeSegment(segment);
  if (!s) return null;

  return prisma.article.findFirst({
    where: {
      status: "approved",
      OR: [{ categoryHref: { startsWith: "/brands/buying" } }, { subHref: { startsWith: "/brands/buying" } }],
      AND: [
        {
          OR: [
            { slug: { equals: s, mode: "insensitive" } },
            { title: { equals: s, mode: "insensitive" } },
          ],
        },
      ],
    },
    select: BUYING_ARTICLE_SELECT,
  });
}

async function findBuyingArticleByAlias(segment: string) {
  const normalizedAlias = normalizeBuyingSlugAlias(segment);
  if (!normalizedAlias) return null;

  const candidates = await prisma.article.findMany({
    where: {
      status: "approved",
      OR: [{ categoryHref: { startsWith: "/brands/buying" } }, { subHref: { startsWith: "/brands/buying" } }],
      slug: { startsWith: normalizedAlias, mode: "insensitive" },
    },
    orderBy: [{ publishedAt: "desc" }, { updatedAt: "desc" }],
    take: 8,
    select: BUYING_ARTICLE_SELECT,
  });

  const matches = candidates.filter((item) => normalizeBuyingSlugAlias(item.slug) === normalizedAlias);
  if (matches.length !== 1) return null;
  return matches[0];
}

async function resolveBuyingArticle(segment: string) {
  return (await findBuyingArticleBySegment(segment)) ?? findBuyingArticleByAlias(segment);
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const article = await resolveBuyingArticle(slug);
  if (!article) {
    return buildPageMetadata({
      title: "整木选购内容解析｜整木网",
      description: "整木选购内容详情页。",
      path: `/brands/buying/${encodeURIComponent(normalizeSegment(slug))}`,
      absoluteTitle: true,
    });
  }

  return buildPageMetadata({
    title: composeIntentTitle({
      keyword: decodeEscapedUnicode(article.title),
      suffix: "｜整木定制选购指南｜整木网",
    }),
    description: previewText(decodeEscapedUnicode(article.excerpt ?? article.content), 160),
    path: `/brands/buying/${encodeURIComponent(article.slug)}`,
    type: "article",
    image: article.coverImage ? resolveUploadedImageUrl(article.coverImage) : undefined,
    imageAlt: decodeEscapedUnicode(article.title),
    absoluteTitle: true,
  });
}

export default async function BuyingArticleDetailPage({ params }: Props) {
  const { slug } = await params;
  const segment = normalizeSegment(slug);
  const article = await resolveBuyingArticle(segment);
  if (!article) notFound();

  if (segment !== article.slug) {
    permanentRedirect(`/brands/buying/${encodeURIComponent(article.slug)}`);
  }

  const displayTitle = decodeEscapedUnicode(article.title);
  const displayExcerpt = decodeEscapedUnicode(article.excerpt ?? "");
  const displayAuthor = decodeEscapedUnicode(article.displayAuthor ?? "");
  const shouldShowSource =
    article.sourceType !== "ai_generated" &&
    article.source !== "auto_dual_line_seo_generator" &&
    article.source !== "auto_seo_generator";
  const displaySource = shouldShowSource ? decodeEscapedUnicode(article.source ?? "") : "";
  const displayContent = decodeEscapedUnicode(article.content);
  const isSummaryPage = isBuyingSummaryArticle(article);
  const summaryArticle = isSummaryPage ? article : await findBuyingSummaryArticle();
  const summaryPath = summaryArticle ? buildBuyingPath(summaryArticle.slug) : null;
  const shouldShowSummaryBackLink =
    !isSummaryPage &&
    summaryArticle &&
    !hasBuyingSummaryLink(displayContent, summaryArticle.slug);

  return (
    <article className="mx-auto max-w-5xl px-4 py-10 sm:px-6 sm:py-12">
      <ArticleViewTracker articleId={article.id} />
      <style>{`
        .buying-article-content a,
        .buying-article-content a:link,
        .buying-article-content a:visited,
        .buying-article-content a:active {
          color: #ab8a5e !important;
          -webkit-text-fill-color: #ab8a5e !important;
          font-weight: 500;
          text-decoration: underline;
          text-decoration-color: rgba(171, 138, 94, 0.42);
          text-underline-offset: 4px;
          transition: color 0.2s ease;
        }

        .buying-article-content a:hover {
          color: #8b6d45 !important;
          -webkit-text-fill-color: #8b6d45 !important;
        }
      `}</style>

      <nav className="mb-6 flex flex-wrap items-center gap-x-2 gap-y-2 text-sm text-muted" aria-label="面包屑">
        <Link href="/" className="hover:text-accent">首页</Link>
        <span>/</span>
        <Link href="/brands" className="hover:text-accent">整木市场</Link>
        <span>/</span>
        <Link href="/brands/buying" className="hover:text-accent">整木选购</Link>
        <span>/</span>
        <span className="text-primary">{displayTitle}</span>
      </nav>

      <header className="rounded-[30px] border border-[rgba(181,157,121,0.16)] bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(247,242,235,0.92))] px-6 py-6 shadow-[0_18px_48px_rgba(15,23,42,0.06)] sm:px-8 sm:py-7">
        <h1 className="font-serif text-[2.1rem] leading-[1.18] text-primary sm:text-[2.8rem]">{displayTitle}</h1>
        {displayExcerpt ? <p className="mt-3 max-w-3xl text-[15px] leading-8 text-muted sm:text-base">{displayExcerpt}</p> : null}
        <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-primary/56">
          <span>{new Date(article.publishedAt ?? article.updatedAt).toLocaleDateString("zh-CN")}</span>
          {displayAuthor ? <span>作者：{displayAuthor}</span> : null}
          {displaySource ? (
            article.sourceUrl ? (
              <a href={article.sourceUrl} target="_blank" rel="noreferrer" className="transition-colors hover:text-accent">
                来源：{displaySource}
              </a>
            ) : (
              <span>来源：{displaySource}</span>
            )
          ) : null}
        </div>
      </header>

      {article.coverImage ? (
        <div className="mt-8 overflow-hidden rounded-[28px] border border-[rgba(15,23,42,0.08)] bg-white p-3 shadow-[0_24px_52px_-40px_rgba(15,23,42,0.16)]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={resolveUploadedImageUrl(article.coverImage)} alt={displayTitle} className="aspect-[16/9] w-full rounded-[22px] object-cover" />
        </div>
      ) : null}

      <section className="mt-8 rounded-[28px] border border-[rgba(15,23,42,0.06)] bg-[rgba(255,255,255,0.94)] px-6 py-7 shadow-[0_22px_44px_-38px_rgba(15,23,42,0.12)] sm:px-8 sm:py-9">
        <RichContent
          html={displayContent}
          className="buying-article-content prose prose-neutral max-w-none"
        />

        {shouldShowSummaryBackLink && summaryPath ? (
          <div className="mt-8 border-t border-[rgba(15,23,42,0.08)] pt-6 text-sm leading-7 text-muted sm:text-[15px]">
            更多整木定制选购问题，可以查看：
            <a
              href={summaryPath}
              className="ml-1 font-medium text-[#ab8a5e] underline decoration-[rgba(171,138,94,0.42)] underline-offset-4 transition-colors hover:text-[#8b6d45]"
            >
              {BUYING_SUMMARY_TITLE}
            </a>
          </div>
        ) : null}
      </section>
    </article>
  );
}

