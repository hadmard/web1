import { notFound, permanentRedirect } from "next/navigation";
import type { Metadata } from "next";
import { findNewsArticleBySegment, resolveArticleShareImage } from "@/lib/news-sharing";
import { buildPageMetadata } from "@/lib/seo";
import { buildArticleShareVersion, buildNewsShareEntryUrl } from "@/lib/share-config";
import { previewText } from "@/lib/text";

export const revalidate = 300;
export const dynamic = "force-dynamic";

const SHARE_SITE_NAME = "中华整木网";

type Props = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const article = await findNewsArticleBySegment(slug);

  if (!article || article.status !== "approved") {
    return {
      title: "资讯分享",
      robots: { index: false, follow: false },
    };
  }

  const description = previewText(article.excerpt ?? article.content, 160);
  const image = resolveArticleShareImage(article);
  const shareVersion = buildArticleShareVersion(article.updatedAt ?? article.publishedAt ?? article.id);

  return {
    ...buildPageMetadata({
      title: article.title,
      description,
      path: `/share/news/${article.id}?sharev=${encodeURIComponent(shareVersion)}`,
      type: "article",
      siteName: SHARE_SITE_NAME,
      image,
    }),
    robots: { index: false, follow: false },
  };
}

export default async function ShareNewsPage({ params }: Props) {
  const { slug } = await params;
  const article = await findNewsArticleBySegment(slug);

  if (!article || article.status !== "approved") {
    notFound();
  }

  const shareVersion = buildArticleShareVersion(article.updatedAt ?? article.publishedAt ?? article.id);
  permanentRedirect(buildNewsShareEntryUrl(article.id, shareVersion));
}
