import { notFound, permanentRedirect } from "next/navigation";
import { findNewsArticleBySegment, normalizeNewsSegment } from "@/lib/news-sharing";
import { buildNewsPath, getArticleSegment } from "@/lib/share-config";
import { prisma } from "@/lib/prisma";
import { articleOrderByPinnedLatest } from "@/lib/articles";
import { LEGACY_SITE_URL } from "@/lib/public-site-config";

type Props = {
  params: Promise<{ slug: string }>;
};

function normalizeLegacyCompanyNewsSlug(slug: string) {
  const normalized = normalizeNewsSegment(slug);
  return normalized.replace(/\.html$/i, "").trim();
}

function buildLegacyCompanyNewsUrls(slug: string) {
  return [
    `https://cnzhengmu.com/companynews/${slug}.html`,
    `https://www.cnzhengmu.com/companynews/${slug}.html`,
    `http://cnzhengmu.com/companynews/${slug}.html`,
    `http://www.cnzhengmu.com/companynews/${slug}.html`,
    `https://jiu.cnzhengmu.com/companynews/${slug}.html`,
    `http://jiu.cnzhengmu.com/companynews/${slug}.html`,
  ];
}

function buildLegacyCompanyNewsFallbackPath(slug: string) {
  return `${LEGACY_SITE_URL}/companynews/${encodeURIComponent(slug)}.html`;
}

export default async function LegacyCompanyNewsPage({ params }: Props) {
  const { slug } = await params;
  const legacySlug = normalizeLegacyCompanyNewsSlug(slug);
  if (!legacySlug) notFound();

  const legacySourceUrls = buildLegacyCompanyNewsUrls(legacySlug);
  const article =
    (await findNewsArticleBySegment(legacySlug)) ??
    (await prisma.article.findFirst({
      where: {
        status: "approved",
        OR: [{ categoryHref: { startsWith: "/news" } }, { subHref: { startsWith: "/news" } }],
        AND: [
          {
            OR: [
              ...legacySourceUrls.map((sourceUrl) => ({ sourceUrl })),
            ],
          },
        ],
      },
      orderBy: articleOrderByPinnedLatest,
    }));

  if (!article || article.status !== "approved") {
    permanentRedirect(buildLegacyCompanyNewsFallbackPath(legacySlug));
  }

  permanentRedirect(buildNewsPath(getArticleSegment(article)));
}
