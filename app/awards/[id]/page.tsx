import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { ContentHeroImage } from "@/components/ContentHeroImage";
import { prisma } from "@/lib/prisma";
import { JsonLd } from "@/components/JsonLd";
import { RichContent } from "@/components/RichContent";
import { getSiteVisualSettings } from "@/lib/site-visual-settings";
export const revalidate = 300;


type Props = { params: Promise<{ id: string }> };

async function getAwardByIdOrSlug(idOrSlug: string) {
  const byId = await prisma.award.findUnique({ where: { id: idOrSlug } });
  if (byId) return byId;
  return prisma.award.findUnique({ where: { slug: idOrSlug } });
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const award = await getAwardByIdOrSlug(id);
  if (!award) return { title: "评选未找到" };
  const description = award.description ?? award.title;
  return {
    title: `${award.title} | 整木网 · 整木评选`,
    description,
    openGraph: { title: award.title, description, type: "article" },
  };
}

export default async function AwardDetailPage({ params }: Props) {
  const { id } = await params;
  const [award, visualSettings] = await Promise.all([
    getAwardByIdOrSlug(id),
    getSiteVisualSettings(),
  ]);
  if (!award) notFound();

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "CreativeWork",
    name: award.title,
    description: award.description ?? award.title,
    dateModified: award.updatedAt,
    ...(award.year ? { datePublished: `${award.year}-01-01` } : {}),
  };

  return (
    <article className="max-w-3xl mx-auto px-4 py-10">
      <JsonLd data={jsonLd} />
      <h1 className="font-serif text-2xl font-semibold tracking-tight text-gray-900 dark:text-gray-100">
        {award.title}
      </h1>
      {award.year != null && <p className="text-[var(--color-muted)] mt-1">{award.year} 年</p>}

      <ContentHeroImage
        src={award.coverImage}
        alt={award.title}
        containerClassName="mt-6 aspect-[16/9]"
      />

      {award.description && (
        <section className="mt-6">
          <h2 className="font-serif text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">评选说明</h2>
          <RichContent
            html={award.description}
            className="prose prose-neutral dark:prose-invert max-w-none text-sm text-[var(--color-muted)]"
          />
        </section>
      )}

      {award.linkUrl && (
        <section className="mt-6 rounded border border-[var(--color-border)] p-4">
          <h2 className="font-serif text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">相关链接</h2>
          <a
            href={award.linkUrl}
            target="_blank"
            rel="noreferrer"
            className="text-sm text-[var(--color-accent)] hover:underline break-all"
          >
            {award.linkUrl}
          </a>
        </section>
      )}

      <div className="mt-8 flex items-center gap-4">
        <span className="text-sm text-[var(--color-muted)]">更新于 {award.updatedAt.toLocaleDateString("zh-CN")}</span>
      </div>
    </article>
  );
}
