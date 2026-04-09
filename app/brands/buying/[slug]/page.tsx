import Link from "next/link";
import { notFound, permanentRedirect } from "next/navigation";
import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { buildPageMetadata } from "@/lib/seo";
import { RichContent } from "@/components/RichContent";
import { previewText } from "@/lib/text";
import { resolveUploadedImageUrl } from "@/lib/uploaded-image";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type Props = {
  params: Promise<{ slug: string }>;
};

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
    select: {
      id: true,
      title: true,
      slug: true,
      excerpt: true,
      content: true,
      coverImage: true,
      source: true,
      sourceUrl: true,
      displayAuthor: true,
      tagSlugs: true,
      publishedAt: true,
      updatedAt: true,
    },
  });
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const article = await findBuyingArticleBySegment(slug);
  if (!article) {
    return buildPageMetadata({
      title: "整木选购内容",
      description: "整木选购内容详情页。",
      path: `/brands/buying/${encodeURIComponent(normalizeSegment(slug))}`,
    });
  }

  return buildPageMetadata({
    title: `${article.title} | 中华整木网 · 整木选购`,
    description: previewText(article.excerpt ?? article.content, 160),
    path: `/brands/buying/${encodeURIComponent(article.slug)}`,
    type: "article",
    image: article.coverImage ? resolveUploadedImageUrl(article.coverImage) : undefined,
    imageAlt: article.title,
  });
}

export default async function BuyingArticleDetailPage({ params }: Props) {
  const { slug } = await params;
  const segment = normalizeSegment(slug);
  const article = await findBuyingArticleBySegment(segment);
  if (!article) notFound();

  if (segment !== article.slug) {
    permanentRedirect(`/brands/buying/${encodeURIComponent(article.slug)}`);
  }

  return (
    <article className="mx-auto max-w-5xl px-4 py-10 sm:px-6 sm:py-12">
      <nav className="mb-6 flex flex-wrap items-center gap-x-2 gap-y-2 text-sm text-muted" aria-label="面包屑">
        <Link href="/" className="hover:text-accent">首页</Link>
        <span>/</span>
        <Link href="/brands" className="hover:text-accent">整木市场</Link>
        <span>/</span>
        <Link href="/brands/buying" className="hover:text-accent">整木选购</Link>
        <span>/</span>
        <span className="text-primary">{article.title}</span>
      </nav>

      <header className="rounded-[30px] border border-[rgba(181,157,121,0.16)] bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(247,242,235,0.92))] px-6 py-6 shadow-[0_18px_48px_rgba(15,23,42,0.06)] sm:px-8 sm:py-7">
        <h1 className="font-serif text-[2.1rem] leading-[1.18] text-primary sm:text-[2.8rem]">{article.title}</h1>
        {article.excerpt ? <p className="mt-3 max-w-3xl text-[15px] leading-8 text-muted sm:text-base">{article.excerpt}</p> : null}
        <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-primary/56">
          <span>{new Date(article.publishedAt ?? article.updatedAt).toLocaleDateString("zh-CN")}</span>
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
        </div>
      </header>

      {article.coverImage ? (
        <div className="mt-8 overflow-hidden rounded-[28px] border border-[rgba(15,23,42,0.08)] bg-white p-3 shadow-[0_24px_52px_-40px_rgba(15,23,42,0.16)]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={resolveUploadedImageUrl(article.coverImage)} alt={article.title} className="aspect-[16/9] w-full rounded-[22px] object-cover" />
        </div>
      ) : null}

      <section className="mt-8 rounded-[28px] border border-[rgba(15,23,42,0.06)] bg-[rgba(255,255,255,0.94)] px-6 py-7 shadow-[0_22px_44px_-38px_rgba(15,23,42,0.12)] sm:px-8 sm:py-9">
        <RichContent html={article.content} className="prose prose-neutral max-w-none" />
      </section>
    </article>
  );
}
