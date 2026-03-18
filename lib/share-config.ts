import { PUBLIC_SITE_URL } from "@/lib/public-site-config";

export const SHARE_CACHE_VERSION = "mobile-share-20260318";

export function buildPublicNewsUrl(slug: string) {
  return `${PUBLIC_SITE_URL}/news/${encodeURIComponent(slug)}`;
}

export function buildNewsShareEntryUrl(slug: string) {
  const url = new URL(`${PUBLIC_SITE_URL}/share/news/${encodeURIComponent(slug)}`);
  url.searchParams.set("sharev", SHARE_CACHE_VERSION);
  return url.toString();
}
