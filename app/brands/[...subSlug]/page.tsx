import Link from "next/link";
import Image from "next/image";
import { notFound, redirect } from "next/navigation";
import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { JsonLd } from "@/components/JsonLd";
import { previewText } from "@/lib/text";
import { RichContent } from "@/components/RichContent";
import { parseBrandStructuredHtml } from "@/lib/brand-structured";
export const dynamic = "force-dynamic";


type Props = {
  params: Promise<{ subSlug: string[] }>;
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

async function findBrandArticleBySegment(segment: string) {
  const s = normalizeSegment(segment);
  return prisma.article.findFirst({
    where: {
      status: "approved",
      OR: [{ categoryHref: { startsWith: "/brands" } }, { subHref: { startsWith: "/brands" } }],
      AND: [
        {
          OR: [{ slug: s }, { title: s }, { slug: { contains: s } }, { title: { contains: s } }],
        },
      ],
    },
    orderBy: [{ updatedAt: "desc" }],
  });
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { subSlug } = await params;
  if (!subSlug || subSlug.length !== 1) return { title: "整木品牌" };
  const segment = normalizeSegment(subSlug[0]);
  if (segment === "all") return { title: "整木品牌" };

  const article = await findBrandArticleBySegment(segment);
  if (!article) return { title: "品牌内容" };
  const description = previewText(article.excerpt ?? article.content, 160);
  return {
    title: `${article.title} | 中华整木网 · 整木品牌`,
    description,
    openGraph: { title: article.title, description, type: "article" },
  };
}

export default async function BrandDetailPage({ params }: Props) {
  const { subSlug } = await params;
  if (!subSlug || subSlug.length !== 1) notFound();

  const segment = normalizeSegment(subSlug[0]);
  if (segment === "all") {
    redirect("/brands/all");
  }

  const article = await findBrandArticleBySegment(segment);
  if (!article || article.status !== "approved") notFound();

  const profile = parseBrandStructuredHtml(article.content ?? "");
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://example.com";
  const articleUrl = `${baseUrl}/brands/${article.slug}`;
  const articleSchema = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: article.title,
    description: previewText(article.excerpt ?? article.content, 200),
    datePublished: article.publishedAt ?? article.updatedAt,
    dateModified: article.updatedAt,
    url: articleUrl,
  };

  return (
    <article className="max-w-4xl mx-auto px-4 py-10">
      <JsonLd data={articleSchema} />

      <nav className="mb-6 text-sm text-muted" aria-label="面包屑">
        <Link href="/" className="hover:text-accent">首页</Link>
        <span className="mx-2">/</span>
        <Link href="/brands/all" className="hover:text-accent">整木品牌</Link>
        <span className="mx-2">/</span>
        <span className="text-primary">{article.title}</span>
      </nav>

      <h1 className="font-serif text-2xl font-bold text-primary mb-2">{article.title}</h1>
      <div className="mb-4 overflow-hidden rounded-2xl border border-border">
        <Image
          src="/images/seedance2/picture_15.jpg"
          alt=""
          width={1600}
          height={900}
          className="h-44 sm:h-56 w-full object-cover"
        />
      </div>
      <p className="text-xs text-muted mb-4">更新于 {article.updatedAt.toLocaleDateString("zh-CN")}</p>

      {article.excerpt && (
        <blockquote className="mb-5 rounded-r-lg border-l-4 border-accent bg-surface px-4 py-3 text-sm text-muted whitespace-pre-line">
          {article.excerpt}
        </blockquote>
      )}

      {profile ? (
        <section className="space-y-5">
          <div className="rounded-2xl border border-border bg-surface-elevated p-5">
            <div className="flex flex-col md:flex-row md:items-start gap-4">
              {profile.logoUrl ? (
                <img src={profile.logoUrl} alt={`${article.title} logo`} className="w-28 h-28 rounded-xl border border-border object-contain bg-white p-2" />
              ) : (
                <div className="w-28 h-28 rounded-xl border border-dashed border-border bg-surface flex items-center justify-center text-xs text-muted">
                  暂无 Logo
                </div>
              )}
              <div className="min-w-0 flex-1">
                {profile.slogan && <p className="text-sm text-primary mb-3">{profile.slogan}</p>}
                <div className="grid sm:grid-cols-2 gap-2 text-sm">
                  {profile.foundedYear && <p className="text-muted"><span className="text-primary">成立时间：</span>{profile.foundedYear}</p>}
                  {profile.headquarters && <p className="text-muted"><span className="text-primary">总部地区：</span>{profile.headquarters}</p>}
                  {profile.serviceAreas && <p className="text-muted"><span className="text-primary">服务区域：</span>{profile.serviceAreas}</p>}
                  {profile.mainProducts && <p className="text-muted"><span className="text-primary">主营品类：</span>{profile.mainProducts}</p>}
                  {profile.website && <p className="text-muted"><span className="text-primary">官网：</span>{profile.website}</p>}
                  {profile.contactPhone && <p className="text-muted"><span className="text-primary">热线：</span>{profile.contactPhone}</p>}
                </div>
              </div>
            </div>
          </div>

          {profile.modules.length > 0 && (
            <div className="grid md:grid-cols-2 gap-3">
              {profile.modules.map((m) => (
                <section key={m.id} className="rounded-xl border border-border bg-surface-elevated p-4">
                  <h2 className="text-base font-semibold text-primary">{m.title || "未命名模块"}</h2>
                  <p className="mt-2 text-sm text-muted whitespace-pre-wrap">{m.body || "暂无说明"}</p>
                </section>
              ))}
            </div>
          )}
        </section>
      ) : (
        <RichContent html={article.content} className="prose prose-neutral dark:prose-invert max-w-none" />
      )}
    </article>
  );
}

