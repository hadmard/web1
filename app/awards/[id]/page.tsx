import { notFound } from "next/navigation";
import Image from "next/image";
import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { JsonLd } from "@/components/JsonLd";
import { RichContent } from "@/components/RichContent";

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
    title: `${award.title} | 中华整木网 · 整木评选`,
    description,
    openGraph: { title: award.title, description, type: "article" },
  };
}

export default async function AwardDetailPage({ params }: Props) {
  const { id } = await params;
  const award = await getAwardByIdOrSlug(id);
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

      <div className="mt-6 overflow-hidden rounded border border-[var(--color-border)]">
        {award.coverImage ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={award.coverImage} alt={award.title} className="w-full h-auto object-cover" />
        ) : (
          <Image src="/images/seedance2/picture_18.jpg" alt="" width={1600} height={900} className="w-full h-auto object-cover" />
        )}
      </div>

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
