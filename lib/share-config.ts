import { PUBLIC_SITE_URL } from "@/lib/public-site-config";

const FALLBACK_SHARE_VERSION = "mobile-share-20260329-1";

export function buildNewsPath(segment: string) {
  return `/news/${encodeURIComponent(segment)}`;
}

export function buildPublicNewsUrl(segment: string) {
  return `${PUBLIC_SITE_URL}${buildNewsPath(segment)}`;
}

export function buildArticleShareVersion(value: string | number | Date | null | undefined) {
  if (value instanceof Date) {
    return `article-${value.getTime()}`;
  }

  if (typeof value === "number" && Number.isFinite(value)) {
    return `article-${Math.trunc(value)}`;
  }

  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) return FALLBACK_SHARE_VERSION;

    const timestamp = Date.parse(trimmed);
    if (!Number.isNaN(timestamp)) {
      return `article-${timestamp}`;
    }

    return `article-${trimmed.replace(/[^a-zA-Z0-9_-]+/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "") || "v1"}`;
  }

  return FALLBACK_SHARE_VERSION;
}

export function buildNewsShareEntryUrl(segment: string, shareVersion?: string | null) {
  const url = new URL(buildPublicNewsUrl(segment));
  url.searchParams.set("sharev", shareVersion?.trim() || FALLBACK_SHARE_VERSION);
  return url.toString();
}
