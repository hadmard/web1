import { notFound, permanentRedirect } from "next/navigation";
import { findNewsArticleBySegment, normalizeNewsSegment } from "@/lib/news-sharing";
import { buildNewsPath } from "@/lib/share-config";
import { LEGACY_SITE_URL } from "@/lib/public-site-config";

type Props = {
  params: Promise<{ slug: string }>;
};

const LEGACY_INFO_TITLE_MAP: Record<string, string> = {
  "64789605-182584416": "FotileStyle2025产品回顾：洞庭、艾尔、班迪系列擘画智慧家居新蓝图",
};

function normalizeLegacyInfoSlug(slug: string) {
  const normalized = normalizeNewsSegment(slug);
  return normalized.replace(/\.html$/i, "").trim();
}

function buildLegacyInfoFallbackPath(slug: string) {
  return `${LEGACY_SITE_URL}/info/${encodeURIComponent(slug)}.html`;
}

export default async function LegacyInfoPage({ params }: Props) {
  const { slug } = await params;
  const legacySlug = normalizeLegacyInfoSlug(slug);
  if (!legacySlug) notFound();

  const mappedTitle = LEGACY_INFO_TITLE_MAP[legacySlug];
  const lookupValue = mappedTitle ?? legacySlug;
  const article = await findNewsArticleBySegment(lookupValue);
  if (article && article.status === "approved") {
    permanentRedirect(buildNewsPath(article.id));
  }

  if (mappedTitle) {
    permanentRedirect(`/search?q=${encodeURIComponent(mappedTitle)}`);
  }

  permanentRedirect(buildLegacyInfoFallbackPath(legacySlug));
}
