import { notFound, permanentRedirect } from "next/navigation";
import type { Metadata } from "next";
import { findNewsArticleBySegment, resolveArticleShareImage } from "@/lib/news-sharing";
import { absoluteUrl, buildPageMetadata } from "@/lib/seo";
import { buildArticleShareVersion, buildNewsPath, buildNewsShareEntryUrl } from "@/lib/share-config";
import { previewText } from "@/lib/text";
import {
  DEFAULT_NEWS_SHARE_IMAGE_HEIGHT,
  DEFAULT_NEWS_SHARE_IMAGE_TYPE,
  DEFAULT_NEWS_SHARE_IMAGE_WIDTH,
  isDefaultNewsShareImage,
} from "@/lib/news-sharing";

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
  const finalSharePath = `${buildNewsPath(article.id)}?sharev=${encodeURIComponent(shareVersion)}`;
  const metadata = buildPageMetadata({
    title: article.title,
    description,
    path: finalSharePath,
    type: "article",
    siteName: SHARE_SITE_NAME,
    image,
  });
  const imageUrl = absoluteUrl(image);
  const imageMeta = isDefaultNewsShareImage(image)
    ? [
        {
          url: imageUrl,
          secureUrl: imageUrl,
          alt: article.title,
          width: DEFAULT_NEWS_SHARE_IMAGE_WIDTH,
          height: DEFAULT_NEWS_SHARE_IMAGE_HEIGHT,
          type: DEFAULT_NEWS_SHARE_IMAGE_TYPE,
        },
      ]
    : [{ url: imageUrl, secureUrl: imageUrl, alt: article.title }];

  return {
    ...metadata,
    openGraph: {
      ...metadata.openGraph,
      url: absoluteUrl(finalSharePath),
      images: imageMeta,
    },
    twitter: {
      ...metadata.twitter,
      images: [imageUrl],
    },
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
