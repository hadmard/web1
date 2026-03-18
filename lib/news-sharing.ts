import { articleOrderByPinnedLatest } from "@/lib/articles";
import { prisma } from "@/lib/prisma";
import { resolveUploadedImageShareUrl } from "@/lib/uploaded-image";

export const DEFAULT_NEWS_SHARE_IMAGE = "/api/og/news-default";

export function normalizeNewsSegment(raw: string) {
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

export async function findNewsArticleBySegment(segment: string) {
  const normalized = normalizeNewsSegment(segment);
  return prisma.article.findFirst({
    where: {
      status: "approved",
      OR: [{ categoryHref: { startsWith: "/news" } }, { subHref: { startsWith: "/news" } }],
      AND: [
        {
          OR: [
            { id: normalized },
            { slug: normalized },
            { title: normalized },
            { slug: { contains: normalized } },
            { title: { contains: normalized } },
          ],
        },
      ],
    },
    orderBy: articleOrderByPinnedLatest,
  });
}

export function extractFirstContentImage(html: string | null | undefined) {
  if (!html) return "";
  const match = html.match(/<img[^>]+src=["']([^"']+)["']/i);
  return match?.[1]?.trim() || "";
}

export function resolveArticleShareImage(article: { coverImage?: string | null; content?: string | null }) {
  const candidates = [
    resolveUploadedImageShareUrl(article.coverImage),
    resolveUploadedImageShareUrl(extractFirstContentImage(article.content)),
    DEFAULT_NEWS_SHARE_IMAGE,
  ];

  return candidates.find((value) => Boolean(value && value.trim())) || DEFAULT_NEWS_SHARE_IMAGE;
}
