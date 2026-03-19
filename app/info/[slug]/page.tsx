import { notFound, permanentRedirect } from "next/navigation";
import { findNewsArticleBySegment, normalizeNewsSegment } from "@/lib/news-sharing";
import { buildNewsPath } from "@/lib/share-config";

type Props = {
  params: Promise<{ slug: string }>;
};

function normalizeLegacyInfoSlug(slug: string) {
  const normalized = normalizeNewsSegment(slug);
  return normalized.replace(/\.html$/i, "").trim();
}

export default async function LegacyInfoPage({ params }: Props) {
  const { slug } = await params;
  const legacySlug = normalizeLegacyInfoSlug(slug);
  if (!legacySlug) notFound();

  const article = await findNewsArticleBySegment(legacySlug);
  if (!article || article.status !== "approved") notFound();

  permanentRedirect(buildNewsPath(article.id));
}
