import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { findNewsArticleBySegment, resolveArticleShareImage } from "@/lib/news-sharing";
import { buildPageMetadata } from "@/lib/seo";
import { buildNewsPath, SHARE_CACHE_VERSION } from "@/lib/share-config";
import { previewText } from "@/lib/text";

export const revalidate = 300;
export const dynamic = "force-dynamic";

const SHARE_SITE_NAME = "中华整木网";

type Props = {
  params: Promise<{ slug: string }>;
};

function buildArticleTargetPath(id: string) {
  return `${buildNewsPath(id)}?sharev=${encodeURIComponent(SHARE_CACHE_VERSION)}`;
}

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

  return {
    ...buildPageMetadata({
      title: article.title,
      description,
      path: `/share/news/${article.id}`,
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

  const targetPath = buildArticleTargetPath(article.id);

  return (
    <main className="mx-auto flex min-h-[60vh] max-w-xl items-center px-6 py-16">
      <section className="w-full rounded-[28px] border border-border bg-surface-elevated p-8 text-center shadow-sm">
        <p className="text-sm tracking-[0.08em] text-muted">分享页已准备好</p>
        <h1 className="mt-3 text-2xl font-semibold leading-tight text-primary">{article.title}</h1>
        <p className="mt-4 text-sm leading-7 text-muted">
          为了让微信等分享平台稳定读取封面图，这里会先展示分享页。点击下方按钮即可进入正文。
        </p>
        <div className="mt-6">
          <Link
            href={targetPath}
            className="inline-flex items-center justify-center rounded-full bg-primary px-5 py-3 text-sm font-medium text-white"
          >
            打开正文
          </Link>
        </div>
      </section>
    </main>
  );
}
